#!/usr/bin/env python3
"""JSON «hoy» del CrowPanel. Firestore epaper/{token}. Sin token en stdout."""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

ZONE = "Europe/Madrid"
PROJECT = "tablongo"
SA = Path.home() / ".hermes/gabinete/secrets/tablongo-firebase-adminsdk.json"
TOKEN_PATH = Path.home() / ".hermes/gabinete/secrets/epaper-token.txt"
CAL = Path.home() / ".hermes/scripts/cal_read"
REPO = Path(__file__).resolve().parent.parent
TIEMPO_URL = (
    "https://api.open-meteo.com/v1/forecast?latitude=40.4168&longitude=-3.7038"
    "&daily=temperature_2m_min,temperature_2m_max,precipitation_probability_max,weather_code"
    "&timezone=Europe%2FMadrid&forecast_days=14&past_days=6"
)
TIEMPO_FALTA = "Previsión no disponible."
HHMM = re.compile(r"^(\d{1,2}):(\d{2})")
YMD = re.compile(r"^\d{4}-\d{2}-\d{2}$")
SCOPES = ("https://www.googleapis.com/auth/datastore", "https://www.googleapis.com/auth/cloud-platform")
SPORT_MIN = 10 * 60
SPORT_MAX = 22 * 60 + 30
MANANA_ANTES = 14 * 60
ALLOW_CAL = {"Familia", "Casa"}
CASA_QUIEN = "garcia timon"
MELA_CENA_FROM = 16 * 60
COMEDOR_SKIP = ("pan", "fruta", "yogur", "ensalada")


def ymd_madrid(now: datetime | None = None) -> str:
    return (now or datetime.now(ZoneInfo(ZONE))).date().isoformat()


def next_ymd(ymd: str) -> str:
    if not YMD.match(ymd or ""):
        return ""
    return (datetime.strptime(ymd, "%Y-%m-%d") + timedelta(days=1)).date().isoformat()


def weekday_iso(ymd: str) -> int | None:
    if not YMD.match(ymd or ""):
        return None
    y, m, d = map(int, ymd.split("-"))
    return datetime(y, m, d).isoweekday()


def laborable(ymd: str) -> bool:
    wd = weekday_iso(ymd)
    return wd is not None and wd <= 5


def nacho_ropa(ymd: str) -> str:
    wd = weekday_iso(ymd)
    if wd is None or wd >= 6:
        return ""
    if wd in (2, 3):
        return "chándal"
    return "uniforme"


def minutes(hhmm: str) -> int | None:
    match = HHMM.match(str(hhmm or "").strip())
    if not match:
        return None
    return int(match.group(1)) * 60 + int(match.group(2))


def fold(text: str) -> str:
    nfd = unicodedata.normalize("NFD", (text or "").casefold())
    return "".join(ch for ch in nfd if unicodedata.category(ch) != "Mn")


def norm_title(text: str) -> str:
    return re.sub(r"\s+", " ", fold(text).strip())


def skip_aviso(title: str) -> str:
    folded = fold(title)
    if "ingles" in folded:
        name = "inglés"
    elif "futbol" in folded:
        name = "fútbol"
    elif "natacion" in folded:
        name = "natación"
    else:
        word = (title or "").split()
        name = word[0].lower() if word else ""
    return f"hoy no hay {name}" if name else ""


def events_from_reglas(payload: dict | None, ymd: str) -> list[dict]:
    if not payload or payload.get("schema_version") != 1 or payload.get("timezone") != ZONE:
        return []
    if not YMD.match(ymd or ""):
        return []
    wd = weekday_iso(ymd)
    items = payload.get("extraescolares")
    if not isinstance(items, list) or wd is None:
        return []
    out: list[dict] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "").strip()
        time = str(item.get("time") or "").strip()
        days = item.get("weekdays")
        if not title or not time or not isinstance(days, list) or wd not in days:
            continue
        start = item.get("from")
        until = item.get("until")
        if start and ymd < str(start):
            continue
        if until and ymd > str(until):
            continue
        skip = item.get("skip")
        if isinstance(skip, list) and ymd in {str(x) for x in skip}:
            aviso = skip_aviso(title)
            if aviso:
                out.append({"title": aviso, "_start": time, "_skip_aviso": True, "_skip_of": title})
            continue
        end = str(item.get("end") or "").strip()
        row = {"time": f"{time}–{end}" if end else time, "title": title, "_start": time}
        loc = item.get("location")
        if isinstance(loc, str) and loc.strip():
            row["location"] = loc.strip()
        out.append(row)
    out.sort(key=lambda e: e["_start"])
    return out


def split_extraescolares(rows: list[dict]) -> tuple[list[dict], list[dict]]:
    manana: list[dict] = []
    tarde: list[dict] = []
    for row in rows:
        mins = minutes(str(row.get("_start") or row.get("time") or ""))
        clean = {k: v for k, v in row.items() if not str(k).startswith("_")}
        if row.get("_allday"):
            manana.append(clean)
            tarde.append(clean)
            continue
        if mins is None:
            continue
        manana.append(clean)
        if mins >= MANANA_ANTES:
            tarde.append(clean)
    return manana, tarde


def covers_day(viaje: dict, day: str) -> bool:
    if not isinstance(viaje, dict) or not YMD.match(day or ""):
        return False
    inicio, fin = viaje.get("inicio"), viaje.get("fin")
    if isinstance(inicio, str) and isinstance(fin, str) and day >= inicio and day <= fin:
        return True
    for est in viaje.get("estancias") or []:
        if not isinstance(est, dict):
            continue
        desde, hasta = est.get("desde"), est.get("hasta")
        if isinstance(desde, str) and isinstance(hasta, str) and day >= desde and day <= hasta:
            return True
    for dia in viaje.get("dias") or []:
        if isinstance(dia, dict) and dia.get("fecha") == day:
            return True
    return False


def is_house_trip(viaje: dict) -> bool:
    quien = viaje.get("quien")
    if not isinstance(quien, str):
        return False
    return CASA_QUIEN in fold(quien)


def trip_on(viajes: list | dict | None, day: str) -> dict | None:
    if isinstance(viajes, dict):
        viajes = viajes.get("viajes")
    if not isinstance(viajes, list):
        return None
    for viaje in viajes:
        if isinstance(viaje, dict) and is_house_trip(viaje) and covers_day(viaje, day):
            return viaje
    return None


def trip_place(viaje: dict, day: str) -> str:
    for dia in viaje.get("dias") or []:
        if isinstance(dia, dict) and dia.get("fecha") == day:
            donde = dia.get("donde")
            if isinstance(donde, str) and donde.strip():
                return donde.strip()
    for est in viaje.get("estancias") or []:
        if not isinstance(est, dict):
            continue
        desde, hasta = est.get("desde"), est.get("hasta")
        if isinstance(desde, str) and isinstance(hasta, str) and day >= desde and day <= hasta:
            donde = est.get("donde")
            if isinstance(donde, str) and donde.strip():
                return donde.strip()
    label = (viaje.get("lugar_principal") or {}).get("label") if isinstance(viaje.get("lugar_principal"), dict) else None
    if isinstance(label, str) and label.strip():
        return label.strip()
    return ""


def trip_bits(viaje: dict | None, day: str) -> str:
    if not viaje or not covers_day(viaje, day):
        return ""
    bits: list[str] = []
    titulo = viaje.get("titulo")
    if isinstance(titulo, str) and titulo.strip():
        bits.append(titulo.strip())
    lugar = trip_place(viaje, day)
    if lugar and (not bits or fold(lugar) != fold(bits[0])):
        bits.append(lugar)
    return " · ".join(bits)


def trip_line(viaje: dict | None, day: str) -> str:
    if not viaje or not is_house_trip(viaje):
        return ""
    return trip_bits(viaje, day)


def trip_day_plan(viaje: dict | None, day: str) -> str:
    if not viaje or not is_house_trip(viaje) or not covers_day(viaje, day):
        return ""
    for dia in viaje.get("dias") or []:
        if not isinstance(dia, dict) or dia.get("fecha") != day:
            continue
        plan = dia.get("plan")
        if isinstance(plan, str) and plan.strip():
            return plan.strip()
    return ""


def trip_texto(viaje: dict | None, day: str) -> str:
    linea = trip_line(viaje, day)
    plan = trip_day_plan(viaje, day)
    if linea and plan:
        return f"{linea} · {plan}"
    return linea or plan


def trip_id(viaje: dict) -> str:
    vid = viaje.get("id")
    if isinstance(vid, str) and vid.strip():
        return vid.strip()
    titulo = str(viaje.get("titulo") or "") if isinstance(viaje.get("titulo"), str) else ""
    inicio = str(viaje.get("inicio") or "") if isinstance(viaje.get("inicio"), str) else ""
    return f"{fold(titulo)}|{inicio}"


def trip_bounds(viaje: dict) -> tuple[str, str]:
    dates: list[str] = []
    for key in ("inicio", "fin"):
        val = viaje.get(key)
        if isinstance(val, str) and YMD.match(val):
            dates.append(val)
    for est in viaje.get("estancias") or []:
        if not isinstance(est, dict):
            continue
        for key in ("desde", "hasta"):
            val = est.get(key)
            if isinstance(val, str) and YMD.match(val):
                dates.append(val)
    for dia in viaje.get("dias") or []:
        if not isinstance(dia, dict):
            continue
        val = dia.get("fecha")
        if isinstance(val, str) and YMD.match(val):
            dates.append(val)
    if not dates:
        return "", ""
    return min(dates), max(dates)


def house_trips(viajes) -> list[dict]:
    if isinstance(viajes, dict):
        viajes = viajes.get("viajes")
    if not isinstance(viajes, list):
        return []
    return [v for v in viajes if isinstance(v, dict) and is_house_trip(v)]


def fecha_corta_es(ymd: str) -> str:
    if not YMD.match(ymd or ""):
        return ""
    _y, m, d = map(int, ymd.split("-"))
    meses = ("ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic")
    if m < 1 or m > 12:
        return ""
    return f"{d} {meses[m - 1]}"


def trip_siguiente(viajes, day: str) -> dict | None:
    if not YMD.match(day or ""):
        return None
    today = trip_on(viajes, day)
    today_id = trip_id(today) if today else ""
    cands: list[tuple[str, dict]] = []
    for viaje in house_trips(viajes):
        if today_id and trip_id(viaje) == today_id:
            continue
        start, _end = trip_bounds(viaje)
        if start and start > day:
            cands.append((start, viaje))
    if not cands:
        return None
    cands.sort(key=lambda row: row[0])
    return cands[0][1]


def trip_card(viaje: dict | None, day: str, *, with_date: bool = False) -> str:
    if not viaje:
        return ""
    start, _end = trip_bounds(viaje)
    place_day = day if covers_day(viaje, day) else (start or day)
    linea = trip_texto(viaje, place_day) if not with_date else trip_line(viaje, place_day)
    if not linea:
        return ""
    if with_date:
        corta = fecha_corta_es(start or place_day)
        if corta:
            return f"{corta} · {linea}"
    return linea


def covering_other_trips(viajes, day: str) -> list[dict]:
    if isinstance(viajes, dict):
        viajes = viajes.get("viajes")
    if not isinstance(viajes, list) or not YMD.match(day or ""):
        return []
    return [v for v in viajes if isinstance(v, dict) and not is_house_trip(v) and covers_day(v, day)]


def trips_covering_inicio_fin(viajes, day: str) -> list[dict]:
    """Como la web Viajes: cubre el día si inicio/fin lo incluyen."""
    if isinstance(viajes, dict):
        viajes = viajes.get("viajes")
    if not isinstance(viajes, list) or not YMD.match(day or ""):
        return []
    out: list[dict] = []
    for viaje in viajes:
        if not isinstance(viaje, dict):
            continue
        inicio, fin = viaje.get("inicio"), viaje.get("fin")
        if isinstance(inicio, str) and isinstance(fin, str) and day >= inicio and day <= fin:
            out.append(viaje)
    return out


def _sin_url_precio(text: str) -> str:
    t = re.sub(r"https?://\S+", "", text or "")
    t = re.sub(r"\b\d+(?:[.,]\d+)?\s*€", "", t)
    return re.sub(r"\s+", " ", t).strip(" ·,;")


def _hhmm_iso(iso: str) -> str:
    match = re.search(r"T(\d{2}:\d{2})", iso or "")
    return match.group(1) if match else ""


def _dia_de(viaje: dict, day: str) -> dict | None:
    for dia in viaje.get("dias") or []:
        if isinstance(dia, dict) and dia.get("fecha") == day:
            return dia
    return None


def _item_corto(texto: str) -> str:
    t = _sin_url_precio(texto)
    t = re.sub(r"\s*\([^)]*\)", "", t)
    t = t.split(".")[0].strip()
    folded = fold(t)
    for skip in ("noche:", "cena ", "hotel"):
        if folded.startswith(skip) or folded == "hotel":
            return ""
    if "visita panoramica" in folded or folded.endswith("panoramica"):
        if folded.startswith("manana"):
            return "Mañana: visita panorámica"
        return "visita panorámica"
    if "acropolis" in folded:
        if folded.startswith("tarde"):
            return "Tarde: Acrópolis"
        return "Acrópolis"
    return t.strip(" :")


def _vuelo_eink(vuelo: dict) -> tuple[str, str, bool]:
    codigo = str(vuelo.get("codigo") or "").strip()
    origen = str(vuelo.get("origen") or "").strip()
    dest = str(vuelo.get("destino") or "").strip()
    ruta = str(vuelo.get("ruta") or "").strip()
    term = str(vuelo.get("terminal_salida") or "").strip()
    sal = _hhmm_iso(str(vuelo.get("salida") or ""))
    lle = _hhmm_iso(str(vuelo.get("llegada") or ""))
    off = vuelo.get("offset_llegada")
    bits: list[str] = []
    if codigo:
        bits.append(codigo)
    if origen and dest and sal:
        arr = lle
        if lle and off in (1, "1"):
            arr = f"{lle}+1"
        elif lle and isinstance(off, int) and off:
            arr = f"{lle}+{off}"
        bits.append(f"{origen} {sal} → {dest}" + (f" {arr}" if arr else ""))
    elif ruta:
        bits.append(re.sub(r"\s+\+", "+", ruta))
    nota = fold(str(vuelo.get("nota") or ""))
    missing = not vuelo.get("salida") or not vuelo.get("llegada")
    confirm = missing or "confirmar" in nota or bool(vuelo.get("confirmar"))
    return " ".join(b for b in bits if b), term, confirm


def trip_eink(viaje: dict | None, day: str) -> str:
    """Cara viaje e-ink: título, sitio, plan/vuelo de ESE día. Sin URLs ni precios."""
    if not isinstance(viaje, dict) or not YMD.match(day or ""):
        return ""
    dia = _dia_de(viaje, day)
    titulo = str(viaje.get("titulo") or "").strip()
    donde = ""
    if dia:
        donde = str(dia.get("donde") or "").strip()
    if not donde:
        donde = trip_place(viaje, day)
    vuelos = [v for v in (dia.get("vuelos") or []) if isinstance(v, dict)] if dia else []
    items = [it for it in (dia.get("items") or []) if isinstance(it, dict)] if dia else []
    if vuelos:
        sitio = f"{donde}/vuelo" if donde else "vuelo"
        head = " · ".join(x for x in (titulo, sitio) if x)
        codes = {str(v.get("codigo") or "").strip() for v in vuelos}
        term = ""
        confirm = False
        flights: list[str] = []
        for vuelo in vuelos:
            line, term_v, conf = _vuelo_eink(vuelo)
            if term_v:
                term = term_v
            if conf:
                confirm = True
            if line:
                flights.append(line)
        checkin = ""
        for item in items:
            texto = str(item.get("texto") or "")
            if item.get("confirmar"):
                confirm = True
            if any(c and c in texto for c in codes):
                continue
            hora = str(item.get("hora") or "").strip()
            folded = fold(texto)
            tag = "Tarde" if folded.startswith("tarde") else ("Mañana" if folded.startswith("manana") else "")
            bits = [b for b in (tag, hora, term) if b]
            if bits:
                checkin = " ".join(bits)
        body = ", ".join(x for x in (checkin, ", ".join(flights)) if x)
        if confirm and "confirmar en la app" not in fold(body):
            body = f"{body} (confirmar en la app)" if body else "Confirmar en la app"
        return _sin_url_precio(" · ".join(x for x in (head, body) if x))
    head_bits = [titulo]
    if donde and fold(donde) != fold(titulo):
        head_bits.append(donde)
    head = " · ".join(x for x in head_bits if x)
    shorts: list[str] = []
    for item in items:
        bit = _item_corto(str(item.get("texto") or ""))
        if not bit:
            continue
        shorts.append(bit)
        if len(shorts) >= 2:
            break
    if shorts:
        body = ". ".join(s.rstrip(".") for s in shorts) + "."
        return _sin_url_precio(f"{head} · {body}" if head else body)
    plan = _sin_url_precio(str(dia.get("plan") or "") if dia else "")
    if plan:
        return _sin_url_precio(f"{head} · {plan}" if head else plan)
    return trip_texto(viaje, day) if is_house_trip(viaje) else trip_bits(viaje, day)


def viaje_cuadro(viajes, calendario: list[dict] | None, ymd: str) -> str:
    """Cara viaje: plan/vuelo de ESE día (viajes.json). Vacío si no hay. No el próximo lejano."""
    del calendario
    trips = trips_covering_inicio_fin(viajes, ymd)
    parts: list[str] = []
    seen: set[str] = set()

    def add(text: str) -> None:
        t = (text or "").strip()
        if not t:
            return
        key = fold(t)
        if key in seen:
            return
        seen.add(key)
        parts.append(t)

    for viaje in trips:
        add(trip_eink(viaje, ymd))
    return " · ".join(parts)


def _same_visit(title: str, viaje: dict, day: str) -> bool:
    nt = norm_title(title)
    if not nt:
        return False
    blob = " ".join(
        [
            str(viaje.get("id") or ""),
            str(viaje.get("titulo") or ""),
            trip_place(viaje, day),
            str((viaje.get("lugar_principal") or {}).get("label") or "")
            if isinstance(viaje.get("lugar_principal"), dict)
            else "",
        ]
    )
    nb = fold(blob)
    if "abuelo" in nt and "abuelo" in nb:
        return True
    for token in nt.split():
        if len(token) < 4:
            continue
        if token in nb:
            return True
    return False


def calendar_visit_hoy(events: list[dict] | None, ymd: str, others: list[dict] | None = None) -> str:
    if not events or not YMD.match(ymd or ""):
        return ""
    others = others or []
    for event in events:
        if not isinstance(event, dict):
            continue
        if str(event.get("calendar") or "").strip() not in ALLOW_CAL:
            continue
        title = str(event.get("title") or "").strip()
        if not title:
            continue
        start = _parse_stamp(str(event.get("start") or ""))
        if start is None:
            continue
        end = _parse_stamp(str(event.get("end") or ""))
        if not event_on_day(start, end, ymd):
            continue
        if not is_allday(start, end):
            continue
        folded = fold(title)
        if "abuelo" in folded or any(_same_visit(title, v, ymd) for v in others):
            return title
    return ""


def visit_hoy_line(calendario: list[dict] | None, viajes, ymd: str) -> str:
    others = covering_other_trips(viajes, ymd)
    cal = calendar_visit_hoy(calendario, ymd, others)
    if cal:
        return cal
    if not others:
        return ""
    return trip_bits(others[0], ymd)


def as_int(value) -> int | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return int(round(value))


def cielo_word(code) -> str:
    if isinstance(code, bool) or not isinstance(code, (int, float)):
        return ""
    return "sol" if int(code) in (0, 1) else "nubes"


def parse_tiempo(payload: dict | None) -> dict | None:
    if not payload or payload.get("timezone") != ZONE:
        return None
    daily = payload.get("daily") or {}
    times = daily.get("time")
    if not isinstance(times, list):
        return None
    mins = daily.get("temperature_2m_min") if isinstance(daily.get("temperature_2m_min"), list) else []
    maxs = daily.get("temperature_2m_max") if isinstance(daily.get("temperature_2m_max"), list) else []
    rain = daily.get("precipitation_probability_max") if isinstance(daily.get("precipitation_probability_max"), list) else []
    codes = daily.get("weather_code") if isinstance(daily.get("weather_code"), list) else []
    if not isinstance(mins, list):
        mins = []
    if not isinstance(maxs, list):
        maxs = []
    if not isinstance(rain, list):
        rain = []
    if not isinstance(codes, list):
        codes = []
    out: dict = {}
    for i, date in enumerate(times):
        if not isinstance(date, str):
            continue
        min_raw = mins[i] if i < len(mins) else None
        max_raw = maxs[i] if i < len(maxs) else None
        rain_raw = rain[i] if i < len(rain) else None
        code_raw = codes[i] if i < len(codes) else None
        out[date] = {
            "min": min_raw if isinstance(min_raw, (int, float)) and not isinstance(min_raw, bool) else None,
            "max": max_raw if isinstance(max_raw, (int, float)) and not isinstance(max_raw, bool) else None,
            "rain_probability": rain_raw if isinstance(rain_raw, (int, float)) and not isinstance(rain_raw, bool) else None,
            "weather_code": int(code_raw) if isinstance(code_raw, (int, float)) and not isinstance(code_raw, bool) else None,
        }
    return out or None


def weather_copy(day: dict | None) -> str:
    if not day:
        return TIEMPO_FALTA
    lo, hi = as_int(day.get("min")), as_int(day.get("max"))
    if lo is None or hi is None:
        return TIEMPO_FALTA
    sky = cielo_word(day.get("weather_code"))
    base = f"{lo}–{hi}°"
    return f"{base} {sky}" if sky else base


def lluvia_line(day: dict | None) -> str:
    if not day:
        return ""
    rain = day.get("rain_probability")
    if isinstance(rain, bool) or not isinstance(rain, (int, float)):
        return ""
    n = int(round(rain))
    if n <= 0:
        return "sin lluvia"
    return f"lluvia {n} %"


def fetch_tiempo() -> dict | None:
    try:
        req = urllib.request.Request(TIEMPO_URL, headers={"User-Agent": "casa-epaper"})
        with urllib.request.urlopen(req, timeout=20) as res:
            payload = json.loads(res.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError):
        return None
    return parse_tiempo(payload)


def sports_on_day(payload: dict | None, ymd: str) -> list[dict]:
    if not payload or not ymd:
        return []
    doc_date = payload.get("comprobado") or payload.get("date") or ""
    rows = payload.get("eventos") or payload.get("events") or []
    if not isinstance(rows, list):
        return []
    kept: list[dict] = []
    for event in rows:
        if not isinstance(event, dict):
            continue
        day = event.get("fecha") or event.get("date")
        if YMD.match(str(day or "")):
            if day != ymd:
                continue
        elif str(doc_date) != ymd:
            continue
        mins = minutes(str(event.get("hora_madrid") or ""))
        if mins is None or mins < SPORT_MIN or mins > SPORT_MAX:
            continue
        kept.append(event)
    kept.sort(key=lambda e: minutes(str(e.get("hora_madrid") or "")) or 0)
    return kept


def sports_line(event: dict) -> str:
    name = re.sub(r"\s+vs\.?\s+", "–", str(event.get("evento") or ""), flags=re.I).strip()
    hora = str(event.get("hora_madrid") or "").strip()
    canal = event.get("canal")
    canal_s = canal.strip() if isinstance(canal, str) else ""
    if not name:
        return ""
    if not hora:
        return name
    return f"{name} a las {hora} en {canal_s}" if canal_s else f"{name} a las {hora}"


def sports_pick_line(events: list[dict]) -> str:
    if not events:
        return ""
    ranked = sorted(
        events,
        key=lambda e: (
            -(e["interes"] if isinstance(e.get("interes"), (int, float)) else 0),
            minutes(str(e.get("hora_madrid") or "")) or 0,
        ),
    )
    return sports_line(ranked[0])


def sports_events_for_day(daily: dict | None, week: dict | None, ymd: str) -> list[dict]:
    events = sports_on_day(daily, ymd)
    if not events:
        events = sports_on_day(week, ymd)
    return events


def sports_lines(daily: dict | None, week: dict | None, ymd: str) -> list[str]:
    out: list[str] = []
    for event in sports_events_for_day(daily, week, ymd):
        line = sports_line(event)
        if line:
            out.append(line)
    return out


def sports_for_day(daily: dict | None, week: dict | None, ymd: str) -> str:
    return sports_pick_line(sports_events_for_day(daily, week, ymd))


def _parse_stamp(stamp: str) -> datetime | None:
    stamp = (stamp or "").strip()
    for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(stamp, fmt)
        except ValueError:
            continue
    return None


def event_on_day(start: datetime, end: datetime | None, ymd: str) -> bool:
    day = datetime.strptime(ymd, "%Y-%m-%d").date()
    start_d = start.date()
    end_d = (end or start).date()
    if end is not None and end.hour == 0 and end.minute == 0 and end_d > start_d:
        end_d = (end - timedelta(minutes=1)).date()
    return start_d <= day <= end_d


def is_allday(start: datetime, end: datetime | None) -> bool:
    if start.hour != 0 or start.minute != 0:
        return False
    if end is None:
        return True
    if end.date() > start.date():
        return True
    return end.hour == 23 and end.minute >= 59


def duplicates_regla(title: str, extra_titles: set[str]) -> bool:
    nt = norm_title(title)
    if not nt:
        return False
    for other in extra_titles:
        if nt == other or nt in other or other in nt:
            return True
    return False


def calendar_rows(events: list[dict] | None, ymd: str, extra_titles: set[str]) -> list[dict]:
    if not events or not YMD.match(ymd or ""):
        return []
    out: list[dict] = []
    seen: set[str] = set()
    for event in events:
        if not isinstance(event, dict):
            continue
        cal = str(event.get("calendar") or "").strip()
        if cal not in ALLOW_CAL:
            continue
        title = str(event.get("title") or "").strip()
        if not title or duplicates_regla(title, extra_titles):
            continue
        start = _parse_stamp(str(event.get("start") or ""))
        if start is None:
            continue
        end = _parse_stamp(str(event.get("end") or ""))
        if not event_on_day(start, end, ymd):
            continue
        key = norm_title(title)
        if key in seen:
            continue
        seen.add(key)
        allday = is_allday(start, end)
        row: dict = {"title": title, "_start": "00:00" if allday else start.strftime("%H:%M")}
        if allday:
            row["_allday"] = True
        else:
            row["time"] = start.strftime("%H:%M")
        out.append(row)
    out.sort(key=lambda e: (0 if e.get("_allday") else 1, e.get("_start") or ""))
    return out


def short_dish(title: str) -> str:
    title = re.sub(r"\s+", " ", (title or "").strip())
    if "," in title:
        title = title.split(",", 1)[0].strip()
    return title


def mela_meals(events: list[dict] | None, ymd: str) -> tuple[str, str]:
    comida, cena = "", ""
    if not events or not YMD.match(ymd or ""):
        return "", ""
    for event in events:
        if not isinstance(event, dict):
            continue
        if str(event.get("calendar") or "").strip() != "Mela":
            continue
        title = short_dish(str(event.get("title") or ""))
        if not title:
            continue
        start = _parse_stamp(str(event.get("start") or ""))
        if start is None:
            continue
        end = _parse_stamp(str(event.get("end") or ""))
        if not event_on_day(start, end, ymd) or is_allday(start, end):
            continue
        mins = start.hour * 60 + start.minute
        if mins < MELA_CENA_FROM:
            if not comida:
                comida = title
        elif not cena:
            cena = title
    return comida, cena


def _comedor_skip(name: str) -> bool:
    folded = fold(name)
    for skip in COMEDOR_SKIP:
        if folded == skip or folded.startswith(skip + " "):
            return True
    return False


def comedor_line(payload: dict | None, ymd: str) -> str:
    if not payload or payload.get("schema_version") != 1 or payload.get("timezone") != ZONE:
        return ""
    if not YMD.match(ymd or ""):
        return ""
    dias = payload.get("dias")
    if not isinstance(dias, dict):
        return ""
    entry = dias.get(ymd)
    if not isinstance(entry, dict):
        return ""
    raw = entry.get("platos")
    if not isinstance(raw, list):
        return ""
    platos = [p.strip() for p in raw if isinstance(p, str) and p.strip()]
    if not platos:
        return ""
    mains = [p for p in platos if not _comedor_skip(p)]
    return " · ".join(mains)


def read_calendar() -> list[dict]:
    if not CAL.is_file():
        return []
    try:
        completed = subprocess.run([str(CAL)], capture_output=True, text=True, timeout=40)
    except (OSError, subprocess.TimeoutExpired):
        return []
    events: list[dict] = []
    for line in (completed.stdout or "").splitlines():
        if not line.startswith("EVT\t"):
            continue
        parts = line.split("\t")
        if len(parts) >= 6:
            events.append(
                {"start": parts[1], "end": parts[2], "title": parts[3], "location": parts[4], "calendar": parts[5]}
            )
    return events


def build_hoy(
    ymd: str,
    *,
    reglas: dict | None,
    viajes,
    sports_day: dict | None,
    sports_week: dict | None,
    tiempo: dict | None,
    calendario: list[dict] | None = None,
    comedor: dict | None = None,
    actualizado: str | None = None,
) -> dict:
    extras = events_from_reglas(reglas, ymd)
    extra_titles = {norm_title(e["title"]) for e in extras}
    extra_titles |= {norm_title(str(e.get("_skip_of") or "")) for e in extras if e.get("_skip_of")}
    extra_titles.discard("")
    extras = extras + calendar_rows(calendario, ymd, extra_titles)
    extras.sort(key=lambda e: (1 if e.get("_allday") else 0, e.get("_start") or "99:99"))
    manana_ex, tarde_ex = split_extraescolares(extras)
    casa = trip_on(viajes, ymd)
    viaje = trip_line(casa, ymd)
    viaje_txt = trip_texto(casa, ymd)
    manana_ymd = next_ymd(ymd)
    viaje_hoy = viaje_cuadro(viajes, calendario, ymd)
    viaje_man = viaje_cuadro(viajes, calendario, manana_ymd) if manana_ymd else ""
    day_w = (tiempo or {}).get(ymd) if isinstance(tiempo, dict) else None
    tiempo_txt = weather_copy(day_w)
    lluvia_txt = lluvia_line(day_w)
    rain_n = as_int(day_w.get("rain_probability")) if day_w else None
    deportes = sports_lines(sports_day, sports_week, ymd)
    deporte = sports_pick_line(sports_events_for_day(sports_day, sports_week, ymd))
    es_laborable = laborable(ymd)
    stamp = (actualizado or "").strip()
    ropa = nacho_ropa(ymd)
    ropa_tarde = nacho_ropa(manana_ymd) if manana_ymd else ""
    comida, cena = mela_meals(calendario, ymd)
    menu = comedor_line(comedor, ymd) if es_laborable else ""
    comida_txt = f"Comida {comida}" if comida else ""
    cena_txt = f"Cena {cena}" if cena else ""
    manana = {
        "tiempo": tiempo_txt,
        "lluvia": lluvia_txt,
        "rain_probability": rain_n,
        "nacho_ropa": ropa,
        "extraescolares": manana_ex,
        "viaje": viaje,
        "comedor": menu,
        "mela": "",
    }
    tarde = {
        "tiempo": tiempo_txt,
        "lluvia": lluvia_txt,
        "rain_probability": rain_n,
        "nacho_ropa": ropa_tarde,
        "extraescolares": tarde_ex,
        "viaje": viaje,
        "deporte": deporte,
        "mela": cena_txt,
    }
    finde = {
        "tiempo": tiempo_txt,
        "lluvia": lluvia_txt,
        "rain_probability": rain_n,
        "extraescolares": manana_ex + [e for e in tarde_ex if e not in manana_ex],
        "viaje": viaje,
        "deporte": deporte,
        "mela": comida_txt,
    }
    return {
        "schema_version": 1,
        "fecha": ymd,
        "timezone": ZONE,
        "laborable": es_laborable,
        "actualizado": stamp,
        "viaje_texto": viaje_txt,
        "viaje_hoy": viaje_hoy,
        "viaje_manana": viaje_man,
        "viaje_siguiente": viaje_man,
        "deportes": deportes,
        "manana": manana,
        "tarde": tarde,
        "finde": finde,
    }


def _token() -> str:
    raw = TOKEN_PATH.read_text(encoding="utf-8").strip()
    if not raw or "/" in raw or raw in {".", ".."} or re.fullmatch(r"__.*__", raw):
        raise SystemExit("token epaper no válido")
    return raw


def _creds():
    from google.auth.transport.requests import Request
    from google.oauth2 import service_account

    if not SA.is_file():
        raise SystemExit("falta la cuenta de servicio de tablongo (no git)")
    creds = service_account.Credentials.from_service_account_file(str(SA), scopes=SCOPES)
    creds.refresh(Request())
    return creds


def firestore_get_casa(doc: str, creds) -> dict | None:
    url = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents/casa_json/{doc}"
    req = urllib.request.Request(url, headers={"Authorization": "Bearer " + creds.token})
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            data = json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError:
        return None
    body = ((data.get("fields") or {}).get("body") or {}).get("stringValue")
    if not isinstance(body, str):
        return None
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        return None
    return payload if isinstance(payload, dict) else None


def _read_json(path: Path) -> dict | None:
    if not path.is_file():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None
    return payload if isinstance(payload, dict) else None


def load_sources() -> tuple[dict | None, dict | None, dict | None, dict | None, list[dict], dict | None]:
    creds = None
    if SA.is_file():
        creds = _creds()
    reglas = firestore_get_casa("go_reglas", creds) if creds else None
    viajes = firestore_get_casa("viajes", creds) if creds else None
    sports = firestore_get_casa("go_sports", creds) if creds else None
    week = firestore_get_casa("go_sports_week", creds) if creds else None
    comedor = firestore_get_casa("go_comedor", creds) if creds else None
    if reglas is None:
        reglas = _read_json(REPO / "go" / "reglas.json")
    if viajes is None:
        viajes = _read_json(REPO / "viajes" / "viajes.json")
    if sports is None:
        sports = _read_json(REPO / "go" / "sports.json")
    if week is None:
        week = _read_json(REPO / "go" / "sports_week.json")
    if comedor is None:
        comedor = _read_json(REPO / "go" / "comedor.json")
    return reglas, viajes, sports, week, read_calendar(), comedor


def put_epaper(body: str) -> None:
    token = _token()
    creds = _creds()
    payload = json.dumps({"fields": {"body": {"stringValue": body}}}).encode("utf-8")
    headers = {"Authorization": "Bearer " + creds.token, "Content-Type": "application/json"}
    encoded = urllib.parse.quote(token, safe="")
    base = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents/epaper"
    patch_url = f"{base}/{encoded}?updateMask.fieldPaths=body"
    req = urllib.request.Request(patch_url, data=payload, method="PATCH", headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            if res.status not in (200, 201):
                raise SystemExit(f"firestore HTTP {res.status}")
            return
    except urllib.error.HTTPError as err:
        if err.code != 404:
            raise SystemExit(f"firestore HTTP {err.code}") from err
    create = urllib.request.Request(
        f"{base}?documentId={encoded}",
        data=payload,
        method="POST",
        headers=headers,
    )
    try:
        with urllib.request.urlopen(create, timeout=30) as res:
            if res.status not in (200, 201):
                raise SystemExit(f"firestore HTTP {res.status}")
    except urllib.error.HTTPError as err:
        raise SystemExit(f"firestore HTTP {err.code}") from err


def rest_url_redacted() -> str:
    return f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents/epaper/***"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dump", action="store_true", help="pinta el JSON (sin token, sin subir)")
    parser.add_argument("--ymd", default="")
    args = parser.parse_args()
    ymd = args.ymd or ymd_madrid()
    reglas, viajes, sports, week, calendario, comedor = load_sources()
    tiempo = fetch_tiempo()
    ahora = datetime.now(ZoneInfo(ZONE)).strftime("%Y-%m-%d %H:%M")
    doc = build_hoy(
        ymd,
        reglas=reglas,
        viajes=viajes,
        sports_day=sports,
        sports_week=week,
        tiempo=tiempo,
        calendario=calendario,
        comedor=comedor,
        actualizado=ahora,
    )
    body = json.dumps(doc, ensure_ascii=False, separators=(",", ":"))
    if args.dump:
        print(body)
        return
    put_epaper(body)


if __name__ == "__main__":
    main()
