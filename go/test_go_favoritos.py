#!/usr/bin/env python3
"""Favoritos de deporte en casa_json/go_favoritos, no en sports.json."""
from __future__ import annotations

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ZONE = "Europe/Madrid"
DEFAULT = ["Real Madrid", "Miami Dolphins", "Milwaukee Brewers"]


def parse_favoritos(payload: object) -> list[str]:
    if not isinstance(payload, dict):
        return list(DEFAULT)
    raw = payload.get("favoritos")
    if not isinstance(raw, list):
        return list(DEFAULT)
    names = [str(item).strip() for item in raw if str(item).strip()]
    return names or list(DEFAULT)


def fetch_go_favoritos() -> tuple[str, str]:
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
    url = "https://firestore.googleapis.com/v1/projects/tablongo/databases/(default)/documents/casa_json/go_favoritos"
    req = urllib.request.Request(url, headers={"Authorization": "Bearer " + creds.token})
    with urllib.request.urlopen(req, timeout=30) as res:
        doc = json.loads(res.read().decode("utf-8"))
    body = ((doc.get("fields") or {}).get("body") or {}).get("stringValue")
    if not isinstance(body, str):
        raise ValueError("body")
    return body, doc.get("updateTime") or ""


class FavoritosTests(unittest.TestCase):
    def test_local_json(self):
        payload = json.loads((ROOT / "favoritos.json").read_text(encoding="utf-8"))
        self.assertEqual(payload["schema_version"], 1)
        self.assertEqual(payload["timezone"], ZONE)
        self.assertEqual(parse_favoritos(payload), DEFAULT + ["Detroit Red Wings"])

    def test_fallback_if_missing(self):
        self.assertEqual(parse_favoritos(None), DEFAULT)
        self.assertEqual(parse_favoritos({}), DEFAULT)
        self.assertEqual(parse_favoritos({"favoritos": []}), DEFAULT)

    def test_html_reads_json_not_hardcoded_only(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        put = (ROOT / "casa_put_json.py").read_text(encoding="utf-8")
        self.assertIn("from './favoritos.mjs?v=", html)
        self.assertIn("parseFavoritos", html)
        self.assertIn("casaDocOpt('go_favoritos')", html)
        self.assertIn("houseFavs", html)
        self.assertIn("isHouseFav", html)
        self.assertIn("sports-fav", html)
        self.assertNotIn("/Real Madrid/i.test(name)", html)
        self.assertNotIn("/Miami Dolphins/i.test(name)", html)
        self.assertNotIn("/Milwaukee Brewers/i.test(name)", html)
        self.assertIn('"go/favoritos.json": "go_favoritos"', put)
        self.assertNotIn("go_favoritos", (ROOT / "sports.json").read_text(encoding="utf-8") if (ROOT / "sports.json").is_file() else "")

    def test_firestore_go_favoritos_real(self):
        body, updated = fetch_go_favoritos()
        payload = json.loads(body)
        names = parse_favoritos(payload)
        self.assertGreaterEqual(len(names), 1)
        self.assertEqual(payload.get("timezone"), ZONE)
        print(f"firestore go_favoritos ok update={updated} n={len(names)}", file=__import__("sys").stderr)


if __name__ == "__main__":
    unittest.main()
