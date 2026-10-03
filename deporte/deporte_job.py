#!/usr/bin/env python3
"""14 días de partidos → Firestore casa_json/deporte. Sin IA. Sin WEC inventado."""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo
from typing import Any, Callable

ZONE = ZoneInfo("Europe/Madrid")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"
DAYS = 14
WIN_START = 9 * 60
WIN_END = 22 * 60 + 30
PUT = Path.home() / ".hermes/gabinete/alvarogt.com/go/casa_put_json.py"
PY = Path.home() / ".hermes/hermes-agent/venv/bin/python"
REPO = Path(__file__).resolve().parent


def now_madrid(now: datetime | None = None) -> datetime:
    if now is None:
        return datetime.now(ZONE)
    if now.tzinfo is None:
        return now.replace(tzinfo=ZONE)
    return now.astimezone(ZONE)


def ymd_madrid(now: datetime | None = None) -> str:
    return now_madrid(now).date().isoformat()


def horizon(now: datetime | None = None) -> list[str]:
    start = now_madrid(now).date()
    return [(start + timedelta(days=i)).isoformat() for i in range(DAYS)]


def to_utc_iso(raw: str) -> str:
    text = (raw or "").strip()
    if not text:
        return ""
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(text)
    except ValueError:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=ZoneInfo("UTC"))
    return dt.astimezone(ZoneInfo("UTC")).strftime("%Y-%m-%dT%H:%M:%SZ")


def madrid_from_utc(utc: str) -> tuple[str, str]:
    if not utc:
        return "", ""
    text = utc[:-1] + "+00:00" if utc.endswith("Z") else utc
    try:
        dt = datetime.fromisoformat(text).astimezone(ZONE)
    except ValueError:
        return "", ""
    return dt.strftime("%H:%M"), dt.date().isoformat()


def minutes(hhmm: str) -> int | None:
    parts = (hhmm or "").split(":")
    if len(parts) != 2 or not parts[0].isdigit() or not parts[1].isdigit():
        return None
    return int(parts[0]) * 60 + int(parts[1])


def in_window(hora: str) -> bool:
    mins = minutes(hora)
    return mins is not None and WIN_START <= mins <= WIN_END


def fold(text: str) -> str:
    return " ".join((text or "").casefold().split())


def as_dict(value: Any) -> dict:
    return value if isinstance(value, dict) else {}


Fetcher = Callable[[str], Any]


def http_json(url: str, timeout: int = 25) -> Any:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return json.loads(res.read().decode("utf-8"))


def catch_fuente(name: str, fn, fuentes: dict[str, str], partidos: list[dict]) -> None:
    try:
        extra = fn()
        if extra:
            partidos.extend(extra)
        fuentes[name] = "ok"
    except urllib.error.HTTPError as err:
        fuentes[name] = str(err.code)
    except Exception:
        fuentes[name] = "error"


def partido(
    pid: str,
    deporte: str,
    utc: str,
    rival: str,
    tv: str = "",
    estado: str = "scheduled",
    fecha_hint: str = "",
) -> dict | None:
    utc_iso = to_utc_iso(utc)
    hora, fecha = madrid_from_utc(utc_iso) if utc_iso else ("", fecha_hint)
    if not fecha:
        fecha = fecha_hint
    rival = " ".join((rival or "").split())
    if not rival:
        return None
    tv = " ".join((tv or "").split())
    return {
        "id": pid,
        "deporte": deporte,
        "utc": utc_iso,
        "hora_madrid": hora,
        "fecha_madrid": fecha,
        "rival": rival,
        "tv": tv,
        "estado": estado or "scheduled",
    }


def espn_tv(event: dict) -> str:
    comps = event.get("competitions") or []
    if not comps or not isinstance(comps[0], dict):
        return ""
    comp = comps[0]
    for b in comp.get("broadcasts") or []:
        if not isinstance(b, dict):
            continue
        names = b.get("names")
        if isinstance(names, list) and names:
            text = str(names[0]).strip()
            if text:
                return text
        media = b.get("media")
        if not isinstance(media, dict):
            media = {}
        text = str(media.get("shortName") or media.get("name") or "").strip()
        if text:
            return text
    for g in comp.get("geoBroadcasts") or []:
        if not isinstance(g, dict):
            continue
        media = g.get("media")
        if not isinstance(media, dict):
            media = {}
        text = str(media.get("shortName") or media.get("name") or "").strip()
        if text:
            return text
    return ""


def espn_estado(event: dict) -> str:
    name = str(((event.get("status") or {}).get("type") or {}).get("name") or "").upper()
    if "POSTPONE" in name:
        return "postponed"
    if name in ("STATUS_FINAL", "STATUS_FULL_TIME") or "FINAL" in name:
        return "final"
    if "CANCEL" in name:
        return "cancelled"
    return "scheduled"


def espn_teams(event: dict) -> tuple[str, str]:
    comps = event.get("competitions") or []
    if not comps or not isinstance(comps[0], dict):
        return "", ""
    home = away = ""
    for c in comps[0].get("competitors") or []:
        if not isinstance(c, dict):
            continue
        team = c.get("team")
        if not isinstance(team, dict):
            team = {}
        name = str(team.get("displayName") or team.get("shortDisplayName") or "").strip()
        if c.get("homeAway") == "home":
            home = name
        elif c.get("homeAway") == "away":
            away = name
    return away, home


def espn_ids(event: dict) -> set[str]:
    out: set[str] = set()
    comps = event.get("competitions") or []
    if not comps or not isinstance(comps[0], dict):
        return out
    for c in comps[0].get("competitors") or []:
        if not isinstance(c, dict):
            continue
        team = c.get("team")
        if not isinstance(team, dict):
            team = {}
        tid = str(team.get("id") or "").strip()
        if tid:
            out.add(tid)
    return out


def rival_line(away: str, home: str, fallback: str = "") -> str:
    if away and home:
        return f"{away} – {home}"
    return " ".join((fallback or "").split())


def espn_scoreboard(get: Fetcher, path: str, ymd: str) -> list[dict]:
    stamp = ymd.replace("-", "")
    url = f"https://site.api.espn.com/apis/site/v2/sports/{path}/scoreboard?dates={stamp}"
    data = get(url)
    events = data.get("events") if isinstance(data, dict) else None
    return events if isinstance(events, list) else []


def keep_soccer(away: str, home: str, femenino: bool) -> bool:
    names = {fold(away), fold(home)}
    if femenino:
        return "real madrid" in names
    return "real madrid" in names or "barcelona" in names


def collect_soccer(get: Fetcher, days: list[str], femenino: bool) -> list[dict]:
    path = "soccer/esp.w.1" if femenino else "soccer/esp.1"
    deporte = "femenino" if femenino else "futbol"
    prefix = "ligaf" if femenino else "laliga"
    out: list[dict] = []
    for ymd in days:
        for ev in espn_scoreboard(get, path, ymd):
            if not isinstance(ev, dict):
                continue
            away, home = espn_teams(ev)
            if not keep_soccer(away, home, femenino):
                continue
            p = partido(
                f"{prefix}-{ev.get('id')}",
                deporte,
                str(ev.get("date") or ""),
                rival_line(away, home, str(ev.get("name") or "")),
                espn_tv(ev),
                espn_estado(ev),
                ymd,
            )
            if p:
                out.append(p)
    return out


def collect_nfl(get: Fetcher, days: list[str]) -> list[dict]:
    wanted = set(days)
    out: list[dict] = []
    seen: set[str] = set()
    for ymd in days:
        for ev in espn_scoreboard(get, "football/nfl", ymd):
            if not isinstance(ev, dict):
                continue
            pid = f"nfl-{ev.get('id')}"
            if pid in seen:
                continue
            away, home = espn_teams(ev)
            p = partido(pid, "nfl", str(ev.get("date") or ""), rival_line(away, home, str(ev.get("name") or "")), espn_tv(ev), espn_estado(ev), ymd)
            if p and (p["fecha_madrid"] in wanted or not p["fecha_madrid"]):
                seen.add(pid)
                out.append(p)
    return out


def ap_top25_ids(get: Fetcher) -> set[str]:
    data = get("https://site.api.espn.com/apis/site/v2/sports/football/college-football/rankings")
    rankings = data.get("rankings") if isinstance(data, dict) else None
    if not isinstance(rankings, list):
        return set()
    poll = None
    for item in rankings:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or item.get("shortName") or "")
        if "AP" in name.upper() and "25" in name:
            poll = item
            break
    if poll is None and rankings:
        poll = rankings[0] if isinstance(rankings[0], dict) else None
    if not poll:
        return set()
    ids: set[str] = set()
    for row in poll.get("ranks") or []:
        if not isinstance(row, dict):
            continue
        team = row.get("team") if isinstance(row.get("team"), dict) else {}
        tid = str(team.get("id") or "").strip()
        if tid:
            ids.add(tid)
    return ids


def collect_ncaa(get: Fetcher, days: list[str]) -> list[dict]:
    ids = ap_top25_ids(get)
    wanted = set(days)
    out: list[dict] = []
    seen: set[str] = set()
    for ymd in days:
        url = f"https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?dates={ymd.replace('-', '')}&groups=80"
        data = get(url)
        events = data.get("events") if isinstance(data, dict) else None
        if not isinstance(events, list):
            continue
        for ev in events:
            if not isinstance(ev, dict):
                continue
            if ids and not (espn_ids(ev) & ids):
                continue
            pid = f"ncaa-{ev.get('id')}"
            if pid in seen:
                continue
            away, home = espn_teams(ev)
            p = partido(pid, "ncaa", str(ev.get("date") or ""), rival_line(away, home, str(ev.get("name") or "")), espn_tv(ev), espn_estado(ev), ymd)
            if p and p["fecha_madrid"] in wanted:
                seen.add(pid)
                out.append(p)
    return out


def collect_nhl(get: Fetcher, days: list[str]) -> list[dict]:
    wanted = set(days)
    out: list[dict] = []
    seen: set[str] = set()
    for ymd in days:
        for ev in espn_scoreboard(get, "hockey/nhl", ymd):
            if not isinstance(ev, dict):
                continue
            pid = f"nhl-{ev.get('id')}"
            if pid in seen:
                continue
            away, home = espn_teams(ev)
            p = partido(pid, "nhl", str(ev.get("date") or ""), rival_line(away, home, str(ev.get("name") or "")), espn_tv(ev), espn_estado(ev), ymd)
            if not p or p["fecha_madrid"] not in wanted:
                continue
            if not in_window(p["hora_madrid"]):
                continue
            seen.add(pid)
            out.append(p)
    return out


def collect_f1(get: Fetcher, days: list[str]) -> list[dict]:
    wanted = set(days)
    months = sorted({d[:7].replace("-", "") for d in days})
    out: list[dict] = []
    seen: set[str] = set()
    for month in months:
        data = get(f"https://site.api.espn.com/apis/site/v2/sports/racing/f1/scoreboard?dates={month}")
        events = data.get("events") if isinstance(data, dict) else None
        if not isinstance(events, list):
            continue
        for ev in events:
            if not isinstance(ev, dict):
                continue
            pid = f"f1-{ev.get('id')}"
            if pid in seen:
                continue
            name = str(ev.get("shortName") or ev.get("name") or "").strip()
            p = partido(pid, "f1", str(ev.get("date") or ""), name, espn_tv(ev), espn_estado(ev))
            if p and p["fecha_madrid"] in wanted:
                seen.add(pid)
                out.append(p)
    return out


def mlb_tv(game: dict) -> str:
    names: list[str] = []
    for b in game.get("broadcasts") or []:
        if not isinstance(b, dict):
            continue
        if str(b.get("type") or "").upper() != "TV":
            continue
        if not b.get("isNational"):
            continue
        name = str(b.get("name") or b.get("callSign") or "").strip()
        if name and name not in names:
            names.append(name)
    return names[0] if names else ""


def mlb_estado(game: dict) -> str:
    detailed = str((game.get("status") or {}).get("detailedState") or "").casefold()
    if "postpon" in detailed:
        return "postponed"
    if "cancel" in detailed:
        return "cancelled"
    if "final" in detailed:
        return "final"
    return "scheduled"


def collect_mlb(get: Fetcher, days: list[str]) -> list[dict]:
    start, end = days[0], days[-1]
    url = (
        "https://statsapi.mlb.com/api/v1/schedule?sportId=1"
        f"&startDate={start}&endDate={end}&hydrate=team,broadcasts"
    )
    data = get(url)
    out: list[dict] = []
    for day in data.get("dates") or []:
        if not isinstance(day, dict):
            continue
        for game in day.get("games") or []:
            if not isinstance(game, dict):
                continue
            teams = as_dict(game.get("teams"))
            away_team = as_dict(as_dict(teams.get("away")).get("team"))
            home_team = as_dict(as_dict(teams.get("home")).get("team"))
            away = str(away_team.get("name") or "").strip()
            home = str(home_team.get("name") or "").strip()
            p = partido(
                f"mlb-{game.get('gamePk')}",
                "mlb",
                str(game.get("gameDate") or ""),
                rival_line(away, home),
                mlb_tv(game),
                mlb_estado(game),
                str(day.get("date") or ""),
            )
            if p:
                out.append(p)
    return out


def build_payload(now: datetime | None = None, get: Fetcher | None = None) -> dict:
    getter = get or http_json
    days = horizon(now)
    fuentes: dict[str, str] = {}
    partidos: list[dict] = []
    catch_fuente("mlb", lambda: collect_mlb(getter, days), fuentes, partidos)
    catch_fuente("esp.1", lambda: collect_soccer(getter, days, False), fuentes, partidos)
    catch_fuente("esp.w.1", lambda: collect_soccer(getter, days, True), fuentes, partidos)
    catch_fuente("nfl", lambda: collect_nfl(getter, days), fuentes, partidos)
    catch_fuente("ncaa", lambda: collect_ncaa(getter, days), fuentes, partidos)
    catch_fuente("nhl", lambda: collect_nhl(getter, days), fuentes, partidos)
    catch_fuente("f1", lambda: collect_f1(getter, days), fuentes, partidos)
    fuentes["wec"] = "omitido"
    uniq: dict[str, dict] = {}
    for p in partidos:
        uniq[p["id"]] = p
    stamp = now_madrid(now).strftime("%Y-%m-%dT%H:%M:%S%z")
    return {
        "schema_version": 1,
        "timezone": "Europe/Madrid",
        "actualizado": stamp,
        "fuentes": fuentes,
        "partidos": list(uniq.values()),
    }


def write_local(payload: dict, path: Path | None = None) -> Path:
    dest = path or (REPO / "deporte.json")
    dest.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return dest


def put_firestore(path: Path) -> None:
    import subprocess

    py = str(PY) if PY.is_file() else sys.executable
    completed = subprocess.run(
        [py, str(PUT), "--name", "deporte/deporte.json", "--file", str(path)],
        check=False,
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        err = (completed.stderr or completed.stdout or "put falló").strip()
        raise SystemExit(err[-2000:])


def main() -> None:
    payload = build_payload()
    dest = write_local(payload)
    put_firestore(dest)


if __name__ == "__main__":
    main()
