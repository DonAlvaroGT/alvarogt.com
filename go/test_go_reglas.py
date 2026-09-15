#!/usr/bin/env python3
"""Comprueba go_reglas (local y Firestore): extraescolares fijos, sin inventar horas."""
from __future__ import annotations

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ZONE = "Europe/Madrid"
EXPECTED = [
    {"id": "futbol-nacho", "title": "Fútbol Nacho", "time": "16:30", "weekdays": [1, 3], "from": "2026-09-21"},
    {"id": "ingles-dom", "title": "Inglés con Dom", "time": "16:30", "weekdays": [4], "from": "2026-09-24"},
    {"id": "natacion-mollete", "title": "Natación Mollete", "time": "18:30", "end": "19:00", "weekdays": [3]},
]


def validate_reglas(payload: dict) -> dict:
    if payload.get("schema_version") != 1 or payload.get("timezone") != ZONE:
        raise ValueError("reglas-schema")
    items = payload.get("extraescolares")
    if not isinstance(items, list) or len(items) != 3:
        raise ValueError("reglas-schema")
    return payload


def fetch_go_reglas() -> tuple[str, str, str]:
    import urllib.request

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
    url = "https://firestore.googleapis.com/v1/projects/tablongo/databases/(default)/documents/casa_json/go_reglas"
    req = urllib.request.Request(url, headers={"Authorization": "Bearer " + creds.token})
    with urllib.request.urlopen(req, timeout=30) as res:
        doc = json.loads(res.read().decode("utf-8"))
    body = ((doc.get("fields") or {}).get("body") or {}).get("stringValue")
    if not isinstance(body, str):
        raise ValueError("body")
    return body, doc.get("name") or "", doc.get("updateTime") or ""


class ReglasSchemaTests(unittest.TestCase):
    def test_local_reglas_json(self):
        path = ROOT / "reglas.json"
        if not path.is_file():
            self.skipTest("go/reglas.json no está en disco")
        payload = validate_reglas(json.loads(path.read_text(encoding="utf-8")))
        self.assertEqual(payload["extraescolares"], EXPECTED)
        natacion = payload["extraescolares"][2]
        self.assertEqual(natacion["time"], "18:30")
        self.assertEqual(natacion["end"], "19:00")
        self.assertNotEqual(natacion["time"], "18:00")

    def test_firestore_go_reglas_real(self):
        body, name, updated = fetch_go_reglas()
        payload = validate_reglas(json.loads(body))
        self.assertEqual(payload["extraescolares"], EXPECTED)
        print(f"firestore go_reglas ok name={name} update={updated}", file=__import__("sys").stderr)


if __name__ == "__main__":
    unittest.main()
