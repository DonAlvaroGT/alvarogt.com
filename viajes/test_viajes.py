import unittest
from pathlib import Path

HTML = (Path(__file__).resolve().parent / "index.html").read_text(encoding="utf-8")


class ViajesEmbeddedTests(unittest.TestCase):
    def test_embedded_hides_salir_and_inherits_casa(self):
        self.assertIn("html.embedded", HTML)
        self.assertIn("parentAdult", HTML)
        self.assertIn("__casaAuth", HTML)
        self.assertIn("enterFromParent", HTML)
        self.assertIn("parentIdToken", HTML)
        self.assertIn('id="google-sign-out"', HTML)
        self.assertIn(">Salir</button>", HTML)
        self.assertIn("html.embedded .access-row", HTML)
        self.assertIn("Continuar con Google", HTML)
        self.assertIn("'isabelgarciatimon@gmail.com'", HTML)
        self.assertIn("'agarciatimon@gmail.com'", HTML)
        self.assertIn("viajes-build:", HTML)
        self.assertIn('html[data-viajes-vista="hoy"]', HTML)
        self.assertIn("#clocks", HTML)
        self.assertIn("#month-view", HTML)
        self.assertIn("#days", HTML)
        self.assertNotIn("Notification", HTML)
        self.assertNotIn("setAppBadge", HTML)

    def test_standalone_google_still_there(self):
        self.assertIn("signInWithPopup", HTML)
        self.assertIn('id="gate"', HTML)
        self.assertIn('id="google-sign-in"', HTML)
        self.assertNotIn("run.app", HTML)

    def test_hoy_hides_clocks_not_month(self):
        self.assertIn('html[data-viajes-vista="hoy"] #clocks { display: none; }', HTML)
        self.assertNotIn('html[data-viajes-vista="hoy"] #month-view', HTML)
        self.assertNotRegex(
            HTML,
            r'html\[data-viajes-vista="hoy"\][^{}]*#month-view[^{]*\{\s*display:\s*none',
        )

    def test_render_months_after_load(self):
        start = HTML.index("async function startApp()")
        end = HTML.index("}", start)
        body = HTML[start:end]
        self.assertIn("data = payload", body)
        self.assertIn("renderMonths();", body)
        self.assertLess(body.index("data = payload"), body.index("renderMonths();"))

    def test_month_calendar_keeps_grid_legend_nav(self):
        self.assertIn("while (cells.length < 42)", HTML)
        self.assertIn("covers(v.inicio, v.fin, key)", HTML)
        self.assertNotIn("dias[]", HTML)
        self.assertIn("class=\"cal-dots\"", HTML)
        self.assertIn("Dos puntos = dos viajes ese día", HTML)
        self.assertIn("class=\"month-legend\"", HTML)
        self.assertIn("id=\"month-prev\"", HTML)
        self.assertIn("id=\"month-next\"", HTML)
        self.assertIn("›", HTML)
        self.assertIn("‹", HTML)
        self.assertIn("Este mes y el siguiente", HTML)
        self.assertIn('id="month-view"', HTML)


if __name__ == "__main__":
    unittest.main()
