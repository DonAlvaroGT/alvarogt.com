#!/usr/bin/env python3
from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
APP = (ROOT / "app.js").read_text(encoding="utf-8")
LOGIC = (ROOT / "logic.mjs").read_text(encoding="utf-8")
BLOB = HTML + APP + LOGIC
HOME = (REPO / "index.html").read_text(encoding="utf-8")
GO = (REPO / "go" / "index.html").read_text(encoding="utf-8")
DISNEY = (REPO / "disney" / "index.html").read_text(encoding="utf-8")
VIAJES = (REPO / "viajes" / "index.html").read_text(encoding="utf-8")
PLANTAS = (REPO / "plantas" / "index.html").read_text(encoding="utf-8")
CASA = (REPO / "casa" / "index.html").read_text(encoding="utf-8")
RULES = (REPO / "tablon" / "firestore.rules").read_text(encoding="utf-8")
PIE = "Creado por Álvaro GT y sus minions"


class MapaPageTests(unittest.TestCase):
    def test_gate_vacio(self):
        self.assertIn('id="gate"', HTML)
        self.assertIn("Inicia sesión", HTML)
        self.assertIn("Continuar con Google", HTML)
        self.assertRegex(HTML, r'id="app"[^>]*hidden')
        self.assertIn(PIE, HTML)
        self.assertIn("mapa-build:", HTML)
        self.assertIn("/pie.js?v=20260930a", HTML)

    def test_leaflet_osm_sin_key(self):
        self.assertIn("leaflet@1.9.4", HTML)
        self.assertIn("tile.openstreetmap.org", APP)
        self.assertNotIn("apiKey", APP)
        self.assertNotIn("access_token", APP)
        self.assertNotIn("mapbox", BLOB.lower())
        self.assertIn("dashArray", APP)
        self.assertIn("¡Estamos aquí!", LOGIC)
        self.assertIn("faltan", LOGIC)

    def test_auth_como_viajes(self):
        self.assertIn("casa_json", APP)
        self.assertIn("viajes_casa", APP)
        self.assertIn("casaDoc('viajes')", APP)
        self.assertIn("__casaAuth", APP)
        self.assertIn("parentIdToken", APP)
        self.assertIn("classList.add('embedded')", APP)
        self.assertNotIn("manageViajesCasa", APP)
        self.assertNotIn("@gmail.com", BLOB)
        self.assertNotIn("agarciatimon", BLOB)
        self.assertNotIn("Mari Luz", BLOB)
        self.assertNotIn("mariluz-vidal", BLOB)

    def test_no_toca_rules_ni_otras_paginas(self):
        self.assertIn("<h1>Álvaro<br>GT</h1>", HOME)
        self.assertIn("G.O.", GO)
        self.assertIn(PIE, DISNEY)
        self.assertIn("viajes-build:", VIAJES)
        self.assertIn("plantas-build:", PLANTAS)
        self.assertIn('data-view="plantas"', CASA)
        self.assertNotIn('data-view="mapa"', CASA)
        self.assertNotIn("/mapa/", CASA)
        self.assertNotIn("match /mapa", RULES)

    def test_filtros(self):
        self.assertIn("Todos", HTML)
        self.assertIn("Pasados", HTML)
        self.assertIn("Próximos", HTML)
        self.assertIn("data-filtro", HTML)
        self.assertIn("filtro-anio", HTML)


if __name__ == "__main__":
    unittest.main()
