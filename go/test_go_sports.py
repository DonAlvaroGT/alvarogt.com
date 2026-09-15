#!/usr/bin/env python3
"""Carga go_sports (local y Firestore real) y aplica la validación de /go/."""
from __future__ import annotations

import json
import re
import sys
import unittest
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ZONE = "Europe/Madrid"
WINDOW_START = "10:00"
WINDOW_END = "22:30"
AGENDA_TIME = re.compile(r"^(\d{1,2}):(\d{2})$")


def parse_body(body: str) -> dict:
    if not isinstance(body, str):
        raise ValueError("body")
    payload = json.loads(body)
    if not isinstance(payload, dict):
        raise ValueError("sports-schema")
    return payload


def validate_sports(payload: dict) -> dict:
    raw_window = payload.get("window")
    window = raw_window if isinstance(raw_window, dict) else {}
    if (
        payload.get("timezone") != ZONE
        or window.get("start") != WINDOW_START
        or window.get("end") != WINDOW_END
        or not isinstance(payload.get("events"), list)
    ):
        raise ValueError("sports-schema")
    return payload


def visible_events(payload: dict) -> list:
    kept = []
    for event in payload.get("events") or payload.get("eventos") or []:
        match = AGENDA_TIME.match(str(event.get("hora_madrid") or ""))
        if not match:
            continue
        mins = int(match.group(1)) * 60 + int(match.group(2))
        if 600 <= mins <= 1350:
            kept.append(event)
    return kept


def fetch_go_sports() -> tuple[str, str]:
    from google.auth.transport.requests import Request
    from google.oauth2 import service_account

    sa = Path.home() / ".hermes/gabinete/secrets/tablongo-firebase-adminsdk.json"
    if not sa.is_file():
        raise FileNotFoundError("falta la cuenta de servicio de tablongo")
    creds = service_account.Credentials.from_service_account_file(
        str(sa),
        scopes=("https://www.googleapis.com/auth/datastore", "https://www.googleapis.com/auth/cloud-platform"),
    )
    creds.refresh(Request())
    url = "https://firestore.googleapis.com/v1/projects/tablongo/databases/(default)/documents/casa_json/go_sports"
    req = urllib.request.Request(url, headers={"Authorization": "Bearer " + creds.token})
    with urllib.request.urlopen(req, timeout=30) as res:
        doc = json.loads(res.read().decode("utf-8"))
    body = ((doc.get("fields") or {}).get("body") or {}).get("stringValue")
    if not isinstance(body, str):
        raise ValueError("body")
    return body, doc.get("updateTime") or ""


class SportsSchemaTests(unittest.TestCase):
    def test_local_sports_json_passes_and_keeps_optional_canal(self):
        path = ROOT / "sports.json"
        if not path.is_file():
            self.skipTest("go/sports.json no está en disco")
        payload = validate_sports(parse_body(path.read_text(encoding="utf-8")))
        events = visible_events(payload)
        self.assertEqual(payload["timezone"], ZONE)
        self.assertEqual(payload["window"]["start"], WINDOW_START)
        self.assertEqual(payload["window"]["end"], WINDOW_END)
        self.assertIsInstance(payload["events"], list)
        for event in events:
            self.assertRegex(str(event.get("hora_madrid") or ""), AGENDA_TIME)

    def test_canal_optional_does_not_break_schema(self):
        payload = validate_sports({
            "date": "2026-09-15",
            "timezone": ZONE,
            "window": {"start": WINDOW_START, "end": WINDOW_END},
            "events": [{
                "deporte": "fútbol",
                "competicion": "LALIGA EA SPORTS",
                "evento": "Elche CF vs Real Madrid",
                "hora_madrid": "21:30",
                "interes": 5,
                "fuente": "https://www.laliga.com/",
                "canal": "DAZN",
            }],
        })
        events = visible_events(payload)
        self.assertEqual(events[0]["canal"], "DAZN")

    def test_1530_and_2130_stay_inside_window(self):
        payload = validate_sports({
            "timezone": ZONE,
            "window": {"start": WINDOW_START, "end": WINDOW_END},
            "events": [
                {"hora_madrid": "15:30", "evento": "tarde"},
                {"hora_madrid": "21:30", "evento": "noche"},
                {"hora_madrid": "09:59", "evento": "antes"},
                {"hora_madrid": "22:31", "evento": "despues"},
            ],
        })
        self.assertEqual([e["hora_madrid"] for e in visible_events(payload)], ["15:30", "21:30"])

    def test_old_spanish_keys_fail_schema(self):
        with self.assertRaises(ValueError) as err:
            validate_sports({
                "fecha": "2026-09-15",
                "zona": ZONE,
                "ventana": "10:00-22:30",
                "eventos": [],
            })
        self.assertEqual(str(err.exception), "sports-schema")

    def test_firestore_go_sports_real(self):
        body, updated = fetch_go_sports()
        payload = validate_sports(parse_body(body))
        events = visible_events(payload)
        self.assertEqual(payload["timezone"], ZONE)
        self.assertEqual(payload["window"]["start"], WINDOW_START)
        self.assertEqual(payload["window"]["end"], WINDOW_END)
        self.assertIsInstance(payload["events"], list)
        for event in events:
            self.assertRegex(str(event.get("hora_madrid") or ""), AGENDA_TIME)
            if "canal" in event:
                self.assertIsInstance(event["canal"], str)
        print(f"firestore go_sports ok update={updated} events={len(payload['events'])} visible={len(events)}", file=sys.stderr)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--live":
        body, updated = fetch_go_sports()
        payload = validate_sports(parse_body(body))
        events = visible_events(payload)
        print(json.dumps({
            "updateTime": updated,
            "timezone": payload["timezone"],
            "window": payload["window"],
            "events": len(payload["events"]),
            "visible": [{"hora_madrid": e.get("hora_madrid"), "evento": e.get("evento"), "canal": e.get("canal")} for e in events],
        }, ensure_ascii=False, indent=2))
        raise SystemExit(0)
    unittest.main()
