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

    def test_hoy_manana_cajas_letra_panel(self):
        self.assertIn("grid-template-columns: 1.65fr .9fr", HTML)
        self.assertIn("article.day.hoy", HTML)
        self.assertIn("article.day.manana", HTML)
        self.assertIn("function compactDayCard", HTML)
        self.assertIn("function panelLetter", HTML)
        self.assertIn("function stripUrlPrecio", HTML)
        self.assertIn("data-viajes-vista') === 'hoy'", HTML)
        self.assertIn("attributeFilter: ['data-viajes-vista']", HTML)
        self.assertIn("https?:\\/\\/\\S+", HTML)
        self.assertNotIn("run.app", HTML)

    def test_paleta_lucita_distinta_garcia_timon(self):
        self.assertIn("'Lucita y Álvaro': '#f7d3b0'", HTML)
        self.assertIn("'Lucita y Álvaro': '#c45c26'", HTML)
        self.assertIn("'García Timón': '#e4d0dc'", HTML)
        self.assertIn("'García Timón': '#8b4a6b'", HTML)
        self.assertNotEqual("#f7d3b0", "#e4d0dc")
        self.assertIn("'Lucita y Álvaro', 'García Timón'", HTML)

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
        self.assertIn('class="cal-dots"', HTML)
        self.assertIn("Dos puntos = dos viajes ese día", HTML)
        self.assertIn('class="month-legend"', HTML)
        self.assertIn('id="month-prev"', HTML)
        self.assertIn('id="month-next"', HTML)
        self.assertIn("›", HTML)
        self.assertIn("‹", HTML)
        self.assertIn("Este mes y el siguiente", HTML)
        self.assertIn('id="month-view"', HTML)

    def test_tap_trip_day_opens_hoy_of_that_date(self):
        self.assertIn("closest('.cal-day')", HTML)
        self.assertIn("getAttribute('data-day')", HTML)
        self.assertIn("if (!hits.length) return;", HTML)
        self.assertIn("setAttribute('data-viajes-vista', 'hoy')", HTML)
        self.assertIn("goToDay(key)", HTML)
        self.assertIn("cls.push('trip')", HTML)
        self.assertIn(".cal-day.trip { cursor: pointer; }", HTML)
        self.assertIn("scrollIntoView", HTML)
        self.assertLess(HTML.index("if (btn)"), HTML.index("closest('.cal-day')"))


if __name__ == "__main__":
    unittest.main()
