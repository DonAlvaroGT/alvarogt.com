#!/usr/bin/env python3
from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
APP = (ROOT / "app.js").read_text(encoding="utf-8")
LOGIC = (ROOT / "logic.mjs").read_text(encoding="utf-8")
RULES = (REPO / "tablon" / "firestore.rules").read_text(encoding="utf-8")
HOME = (REPO / "index.html").read_text(encoding="utf-8")
GO = (REPO / "go" / "index.html").read_text(encoding="utf-8")
DISNEY = (REPO / "disney" / "index.html").read_text(encoding="utf-8")
VIAJES = (REPO / "viajes" / "index.html").read_text(encoding="utf-8")
PIE = "Creado por Álvaro GT y sus minions"


class PlantasPageTests(unittest.TestCase):
    def test_gate_sin_plantas(self):
        self.assertIn('id="gate"', HTML)
        self.assertIn('id="app"', HTML)
        self.assertRegex(HTML, r'id="app"[^>]*hidden')
        self.assertNotIn("Tronco del Brasil", HTML)
        self.assertNotIn("Dracaena", HTML)
        self.assertNotIn("tronco-brasil", HTML)
        self.assertNotIn("Tronco del Brasil", APP)
        self.assertIn("Sin sesión no hay plantas", HTML)
        self.assertIn("Continuar con Google", HTML)

    def test_ui_pedida(self):
        self.assertIn("💧 Regada", APP)
        self.assertIn("deshacer", APP)
        self.assertIn("Terraza", HTML)
        self.assertIn("Salón", HTML)
        self.assertIn("Añadir planta", HTML)
        self.assertIn(PIE, HTML)
        self.assertIn("/pie.js?v=20260930a", HTML)
        self.assertIn("plantas-build:", HTML)
        self.assertIn("¡tengo sed!", APP + LOGIC)
        self.assertIn("sin registrar", APP + LOGIC)

    def test_sin_emails(self):
        blob = HTML + APP + LOGIC
        self.assertNotIn("@gmail.com", blob)
        self.assertNotIn("agarciatimon", blob)
        self.assertNotIn("luzolivas", blob)
        self.assertIn("plantas_casa", APP)
        self.assertIn("houseAllowed", APP)
        self.assertIn("__casaAuth", APP)
        self.assertIn("parentIdToken", APP)
        self.assertIn("classList.add('embedded')", APP)
        self.assertIn("html.embedded", HTML)
        self.assertIn("html.embedded .access", HTML)
        self.assertIn("#f4f0e8", HTML)

    def test_rules_solo_plantas(self):
        self.assertIn("match /plantas_casa/{id}", RULES)
        self.assertIn("casaReader()", RULES)
        self.assertIn("allow write: if false;", RULES)
        self.assertIn("adult-1@example.com", RULES)
        self.assertNotIn("agarciatimon", RULES)
        idx = RULES.index("match /plantas_casa/{id}")
        block = RULES[idx : idx + 180]
        self.assertIn("casaReader()", block)
        self.assertNotIn("firebase deploy", APP)
        self.assertNotIn("firebase deploy", HTML)

    def test_otras_paginas_intactas(self):
        self.assertIn("<h1>Álvaro<br>GT</h1>", HOME)
        self.assertIn("G.O.", GO)
        self.assertIn(PIE, DISNEY)
        self.assertIn("viajes", VIAJES.lower())


if __name__ == "__main__":
    unittest.main()
