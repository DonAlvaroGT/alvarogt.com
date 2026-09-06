#!/usr/bin/env python3
"""Genera go/data.json: calendario real filtrado y Open-Meteo para hoy/mañana."""
from __future__ import annotations

import argparse
import html
import json
import subprocess
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Europe/Madrid")
CAL = Path.home() / ".hermes/scripts/cal_read"
WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
MADRID = {"latitude": 40.4168, "longitude": -3.7038}
KEYS = ("nacho", "luz", "molletito", "mollete")
SKIP_CAL = {"Trabajo"}


def clothes(low, high):
    if low < 8: return "ropa larga y abrigo"
    if low < 14: return "ropa larga y chaqueta"
    if high < 22: return "ropa larga y cortavientos"
    if high < 28: return "ropa corta y una capa fina"
    return "ropa fresca y gorra"


def filter_events(events, dates):
    result = []
    for event in events:
        if event.get("calendar", "").strip() in SKIP_CAL:
            continue
        start = event.get("start", "")
        if not start:
            continue
        try:
            local = datetime.fromisoformat(start).astimezone(TZ)
        except ValueError:
            continue
        blob = (event.get("title", "") + " " + event.get("location", "")).lower()
        if local.date() not in dates or not any(key in blob for key in KEYS):
            continue
        result.append({
            "start": local.isoformat(),
            "end": event.get("end", ""),
            "title": event.get("title", ""),
            "location": event.get("location", "").replace("\n", ", ").strip(),
        })
    return sorted(result, key=lambda e: e["start"])


def read_calendar():
    try:
        completed = subprocess.run([str(CAL)], capture_output=True, text=True, timeout=40)
    except (OSError, subprocess.TimeoutExpired):
        return []
    text = (completed.stdout or "")
    events = []
    for line in text.splitlines():
        if not line.startswith("EVT\t"):
            continue
        parts = line.split("\t")
        if len(parts) >= 6:
            events.append({"start": parts[1], "end": parts[2], "title": parts[3], "location": parts[4], "calendar": parts[5]})
    return events


def fetch_weather(start, opener=urllib.request.urlopen):
    params = {**MADRID, "daily": "temperature_2m_min,temperature_2m_max,precipitation_probability_max", "timezone": "Europe/Madrid", "start_date": start.isoformat(), "end_date": (start + timedelta(days=1)).isoformat()}
    url = WEATHER_URL + "?" + urllib.parse.urlencode(params)
    with opener(urllib.request.Request(url, headers={"User-Agent": "Hermes-Skinner/1.0"}), timeout=15) as response:
        daily = json.load(response)["daily"]
    return {day: {"min": daily["temperature_2m_min"][i], "max": daily["temperature_2m_max"][i], "rain_probability": (daily.get("precipitation_probability_max") or [None, None])[i]} for i, day in enumerate(daily["time"])}


def build_payload(today, weather, events):
    dates = [today, today + timedelta(days=1)]
    selected = filter_events(events, set(dates))
    days = []
    for day in dates:
        values = weather.get(day.isoformat(), {})
        day_events = [e for e in selected if e["start"].startswith(day.isoformat())]
        item = {"date": day.isoformat(), "min": values.get("min"), "max": values.get("max"), "rain_probability": values.get("rain_probability"), "clothes": clothes(values["min"], values["max"]) if "min" in values and "max" in values else None, "events": []}
        for event in day_events:
            start = datetime.fromisoformat(event["start"])
            item["events"].append({"time": start.strftime("%H:%M"), "title": event["title"], "location": event["location"]})
        item["empty_label"] = "No hay extraescolares apuntadas" if not item["events"] else None
        days.append(item)
    return {"schema_version": 1, "generated_at": datetime.now(TZ).isoformat(), "timezone": "Europe/Madrid", "source": {"calendar": "EventKit", "weather": "Open-Meteo", "filters": ["Nacho", "Luz", "Molletito", "Mollete"], "excluded_calendars": ["Trabajo"]}, "days": days}


def validate_payload(payload):
    assert payload["schema_version"] == 1 and payload["timezone"] == "Europe/Madrid"
    assert len(payload["days"]) == 2
    assert payload["days"][1]["date"] == (date.fromisoformat(payload["days"][0]["date"]) + timedelta(days=1)).isoformat()
    for day in payload["days"]:
        assert isinstance(day["events"], list)
        for event in day["events"]:
            assert set(event) == {"time", "title", "location"}


def render_day(day, label):
    def esc(value): return html.escape(str(value), quote=True)
    weather = "Previsión no disponible." if day.get("min") is None else f"{esc(day['min'])}–{esc(day['max'])} °C · {esc(day['clothes'])}"
    rain = "" if day.get("rain_probability") is None else f" · lluvia {esc(day['rain_probability'])}%"
    events = "".join(f"<li><strong>{esc(e['time'])}</strong> {esc(e['title'])}{(' · ' + esc(e['location'])) if e['location'] else ''}</li>" for e in day["events"])
    activity_html = "<ul>" + events + "</ul>" if events else '<span class="empty">No hay extraescolares apuntadas</span>'
    return f'<article><div class="date">{esc(label)} · {esc(day["date"])}</div><h2 class="day-name">{esc(label)}</h2><p class="copy">{weather}{rain}.</p><div class="activities">{activity_html}</div></article>'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path(__file__).with_name("data.json"))
    parser.add_argument("--date", type=date.fromisoformat)
    args = parser.parse_args()
    today = args.date or datetime.now(TZ).date()
    try: weather = fetch_weather(today)
    except Exception: weather = {}
    payload = build_payload(today, weather, read_calendar())
    validate_payload(payload)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

if __name__ == "__main__": main()
