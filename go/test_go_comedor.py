#!/usr/bin/env python3
"""Comprueba go_comedor (local y Firestore): 18 días lectivos de septiembre, sin inventar."""
from __future__ import annotations

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ZONE = "Europe/Madrid"
MES = "2026-09"
EXPECTED = {
    "2026-09-07": ["arroz con verduras", "hamburguesa mixta en salsa con champiñón y patata", "ensalada", "fruta fresca", "pan"],
    "2026-09-08": ["lentejas guisadas", "boquerones en tempura", "ensalada", "fruta fresca", "pan integral"],
    "2026-09-09": ["crema de verduras", "tortilla española", "ensalada de lechuga y tomate", "yogur", "pan"],
    "2026-09-10": ["sopa de cocido", "garbanzos con ropa vieja", "fruta fresca", "pan integral"],
    "2026-09-11": ["ensaladilla rusa (patata, zanahoria, judía verde, atún y huevo)", "ragout de pollo con tomate y verduras", "fruta fresca", "pan"],
    "2026-09-14": ["arroz con tomate", "merluza al horno", "ensalada de lechuga y maíz", "fruta fresca", "pan"],
    "2026-09-15": ["judías verdes rehogada", "tortilla de chorizo", "ensalada de lechuga y aceitunas", "fruta fresca", "pan integral"],
    "2026-09-16": ["alubias blancas con verduras", "pollo asado con calabacín", "yogur", "pan"],
    "2026-09-17": ["crema de calabaza y zanahoria", "espirales con boloñesa vegetal", "fruta fresca", "pan integral"],
    "2026-09-18": ["sopa de picadillo", "abadejo a la romana", "ensalada", "fruta fresca", "pan"],
    "2026-09-21": ["menestra de verduras", "escalopines en salsa", "puré", "fruta fresca", "pan"],
    "2026-09-22": ["pasta integral a la crema de queso", "albóndigas de garbanzos en salsa", "fruta fresca", "pan integral", "ensalada"],
    "2026-09-23": ["crema de calabacín", "jamoncitos de pollo al horno con guisantes", "yogur", "pan"],
    "2026-09-24": ["lentejas guisadas", "tortilla francesa", "ensalada de lechuga y tomate", "fruta fresca", "pan integral"],
    "2026-09-25": ["arroz tres delicias", "palometa con salsa aurora", "ensalada de lechuga y zanahoria", "fruta fresca", "pan"],
    "2026-09-28": ["crema de boniato y verduras", "albóndigas en salsa", "pasta integral", "fruta fresca", "pan"],
    "2026-09-29": ["patatas en salsa verde", "merluza a la romana", "ensalada", "fruta fresca", "pan integral"],
    "2026-09-30": ["sopa de cocido", "garbanzos con ropa vieja", "yogur", "pan"],
}


def validate_comedor(payload: dict) -> dict:
    if (
        payload.get("schema_version") != 1
        or payload.get("timezone") != ZONE
        or payload.get("mes") != MES
        or payload.get("colegio") != "Santa María de Yermo / Basal"
        or payload.get("curso") != "2026/2027"
        or not isinstance(payload.get("dias"), dict)
    ):
        raise ValueError("comedor-schema")
    return payload


def fetch_go_comedor() -> tuple[str, str, str]:
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
    url = "https://firestore.googleapis.com/v1/projects/tablongo/databases/(default)/documents/casa_json/go_comedor"
    req = urllib.request.Request(url, headers={"Authorization": "Bearer " + creds.token})
    with urllib.request.urlopen(req, timeout=30) as res:
        doc = json.loads(res.read().decode("utf-8"))
    body = ((doc.get("fields") or {}).get("body") or {}).get("stringValue")
    if not isinstance(body, str):
        raise ValueError("body")
    return body, doc.get("name") or "", doc.get("updateTime") or ""


class ComedorSchemaTests(unittest.TestCase):
    def test_local_comedor_json_has_eighteen_pdf_days(self):
        path = ROOT / "comedor.json"
        if not path.is_file():
            self.skipTest("go/comedor.json no está en disco")
        payload = validate_comedor(json.loads(path.read_text(encoding="utf-8")))
        self.assertEqual(len(payload["dias"]), 18)
        self.assertEqual(set(payload["dias"]), set(EXPECTED))
        for day, platos in EXPECTED.items():
            self.assertEqual(payload["dias"][day]["platos"], platos)
        self.assertNotIn("2026-09-12", payload["dias"])
        self.assertNotIn("2026-09-13", payload["dias"])

    def test_firestore_go_comedor_real(self):
        body, name, updated = fetch_go_comedor()
        payload = validate_comedor(json.loads(body))
        self.assertEqual(len(payload["dias"]), 18)
        self.assertEqual(payload["dias"]["2026-09-15"]["platos"], EXPECTED["2026-09-15"])
        self.assertEqual(payload["dias"]["2026-09-16"]["platos"], EXPECTED["2026-09-16"])
        self.assertEqual(set(payload["dias"]), set(EXPECTED))
        print(f"firestore go_comedor ok name={name} update={updated} dias={len(payload['dias'])}", file=__import__("sys").stderr)


if __name__ == "__main__":
    unittest.main()
