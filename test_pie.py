import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PIE_JS = (ROOT / "pie.js").read_text(encoding="utf-8")
HOME_HTML = (ROOT / "index.html").read_text(encoding="utf-8")
HOME_JS = (ROOT / "home.js").read_text(encoding="utf-8")
GO = (ROOT / "go" / "index.html").read_text(encoding="utf-8")
VIAJES = (ROOT / "viajes" / "index.html").read_text(encoding="utf-8")
TABLON = (ROOT / "tablon" / "index.html").read_text(encoding="utf-8")
PREMIOS = (ROOT / "tablon" / "premiosganados" / "index.html").read_text(encoding="utf-8")
CASA = (ROOT / "casa" / "index.html").read_text(encoding="utf-8")
DISNEY = (ROOT / "disney" / "index.html").read_text(encoding="utf-8")

PIE_NORMAL = "Creado por Álvaro GT y sus minions"
PIE_OSOS = "Creado por osos, no por pandas"
PIE_SRC = "/pie.js?v=20260930a"


def hash_ymd(ymd: str) -> int:
    h = 2166136261
    for ch in ymd.encode("ascii"):
        h ^= ch
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def node_pie(expr: str) -> str:
    return subprocess.check_output(
        ["node", "-e", f"require({str(ROOT / 'pie.js')!r}); process.stdout.write(String({expr}))"],
        text=True,
    )


class PieHashTests(unittest.TestCase):
    def test_python_y_node_iguales(self):
        for ymd in ("2026-09-30", "2026-01-01", "2026-12-31", "2027-03-08"):
            js = int(node_pie(f"globalThis.__pieCasa.hashYmd({ymd!r})"))
            self.assertEqual(js, hash_ymd(ymd), ymd)

    def test_mismo_ymd_mismo_texto(self):
        a = node_pie("globalThis.__pieCasa.textoPie('2026-09-30')")
        b = node_pie("globalThis.__pieCasa.textoPie('2026-09-30')")
        self.assertEqual(a, b)
        self.assertIn(a, (PIE_NORMAL, PIE_OSOS))

    def test_cinco_por_ciento(self):
        from datetime import date, timedelta

        n = 0
        day = date(2026, 1, 1)
        for _ in range(365):
            if hash_ymd(day.isoformat()) % 20 == 0:
                n += 1
            day += timedelta(days=1)
        self.assertGreaterEqual(n, 10)
        self.assertLessEqual(n, 28)

    def test_madrid_cruza_medianoche(self):
        ymd = node_pie(
            "globalThis.__pieCasa.ymdMadrid(new Date('2026-09-30T22:30:00Z'))"
        )
        self.assertEqual(ymd, "2026-10-01")
        ymd2 = node_pie(
            "globalThis.__pieCasa.ymdMadrid(new Date('2026-09-30T21:30:00Z'))"
        )
        self.assertEqual(ymd2, "2026-09-30")

    def test_osos_solo_si_mod_20(self):
        self.assertEqual(node_pie("globalThis.__pieCasa.PIE_OSOS"), PIE_OSOS)
        self.assertEqual(node_pie("globalThis.__pieCasa.PIE_NORMAL"), PIE_NORMAL)
        for ymd in ("2026-09-30", "2026-02-14", "2026-07-04"):
            want = PIE_OSOS if hash_ymd(ymd) % 20 == 0 else PIE_NORMAL
            self.assertEqual(node_pie(f"globalThis.__pieCasa.textoPie({ymd!r})"), want)


class PiePaginasTests(unittest.TestCase):
    def test_home_oso_y_casa(self):
        self.assertIn("<h1>Álvaro<br>GT</h1>", HOME_HTML)
        self.assertIn("Muerte a los pandas", HOME_HTML)
        self.assertIn('href="/casa/"', HOME_HTML)
        self.assertIn(">Casa</a>", HOME_HTML)
        self.assertIn(PIE_NORMAL, HOME_HTML)
        self.assertIn('id="oso-egg"', HOME_HTML)
        self.assertIn('fill="#7a4524"', HOME_HTML)
        self.assertNotIn("panda", HOME_HTML.lower().replace("pandas", ""))
        self.assertIn(PIE_SRC, HOME_HTML)
        self.assertIn("/home.js?v=20260930a", HOME_HTML)
        self.assertIn("home-build: 20260930a", HOME_HTML)
        self.assertNotIn("<audio", HOME_HTML)
        self.assertNotIn("speechSynthesis", HOME_HTML)
        self.assertNotIn("new Audio", HOME_HTML)

    def test_home_js_toque_largo(self):
        self.assertIn("600", HOME_JS)
        self.assertIn("oso-egg", HOME_JS)
        self.assertIn("pointerdown", HOME_JS)
        self.assertNotIn("Audio", HOME_JS)
        self.assertNotIn("speechSynthesis", HOME_JS)

    def test_pie_en_paginas_con_minions(self):
        for name, html in (("go", GO), ("viajes", VIAJES), ("tablon", TABLON), ("premios", PREMIOS)):
            with self.subTest(name=name):
                self.assertIn(PIE_NORMAL, html)
                self.assertIn(PIE_SRC, html)

    def test_casa_sin_pie_script(self):
        self.assertNotIn("pie.js", CASA)
        self.assertNotIn(PIE_NORMAL, CASA)

    def test_disney_intacto(self):
        self.assertIn(PIE_NORMAL, DISNEY)
        self.assertNotIn("pie.js", DISNEY)
        self.assertNotIn(PIE_OSOS, DISNEY)
        self.assertNotIn("oso-egg", DISNEY)

    def test_pie_js_sin_sonido_y_regla(self):
        self.assertIn("% 20", PIE_JS)
        self.assertIn("Europe/Madrid", PIE_JS)
        self.assertIn(PIE_OSOS, PIE_JS)
        self.assertNotIn("Audio", PIE_JS)
        self.assertNotIn("speechSynthesis", PIE_JS)


if __name__ == "__main__":
    unittest.main()
