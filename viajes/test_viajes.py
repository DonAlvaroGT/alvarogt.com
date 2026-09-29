import json
import unittest
from pathlib import Path

HTML = (Path(__file__).resolve().parent / "index.html").read_text(encoding="utf-8")


class ViajesEmbeddedTests(unittest.TestCase):
    def test_embedded_hides_salir_and_inherits_casa(self):
        self.assertIn("html.embedded", HTML)
        self.assertIn("parentOk", HTML)
        self.assertIn("__casaAuth", HTML)
        self.assertIn("enterFromParent", HTML)
        self.assertIn("parentIdToken", HTML)
        self.assertIn('id="google-sign-out"', HTML)
        self.assertIn(">Salir</button>", HTML)
        self.assertIn("html.embedded .access-row", HTML)
        self.assertIn("Continuar con Google", HTML)
        self.assertNotIn("@gmail.com", HTML)
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

    def test_paleta_sale_del_json(self):
        self.assertIn("function quienPalette", HTML)
        self.assertIn("data.quien", HTML)
        self.assertNotIn("const QUIEN_ORDER", HTML)
        self.assertNotIn("const QUIEN_COLOR", HTML)
        self.assertNotIn("const QUIEN_DOT", HTML)

    def test_render_months_after_load(self):
        start = HTML.index("async function startApp()")
        end = HTML.index("}", start)
        body = HTML[start:end]
        self.assertIn("data = mergeViajes(payload, await loadViajesCasa())", body)
        self.assertIn("renderMonths();", body)
        self.assertLess(body.index("data = mergeViajes"), body.index("renderMonths();"))

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

    def test_casa_merge_not_public_filter(self):
        self.assertIn("function mergeViajes", HTML)
        self.assertIn("function mergeQuien", HTML)
        self.assertIn("function loadViajesCasa", HTML)
        self.assertIn("casaDoc('viajes_casa')", HTML)
        self.assertIn("casaDoc('viajes')", HTML)
        self.assertNotIn("Mari Luz", HTML)
        self.assertNotIn("@gmail.com", HTML)
        start = HTML.index("async function startApp()")
        end = HTML.index("}", start)
        body = HTML[start:end]
        self.assertIn("await casaDoc('viajes')", body)
        self.assertIn("mergeViajes(payload, await loadViajesCasa())", body)


class ViajesPrivadosTests(unittest.TestCase):
    root = Path(__file__).resolve().parent
    repo = root.parent

    def test_rules_viajes_casa_solo_casa(self):
        rules = (self.repo / "tablon" / "firestore.rules").read_text(encoding="utf-8")
        self.assertIn("function casaReader()", rules)
        self.assertIn("id == 'viajes_casa' && casaReader()", rules)
        self.assertIn("id == 'viajes' && viajesReader()", rules)
        self.assertIn("id != 'viajes' && id != 'viajes_casa' && casaReader()", rules)
        self.assertIn("allow write: if false;", rules)
        casa_block = rules[rules.index("function casaReader()") : rules.index("function viajesReader()")]
        self.assertIn("agarciatimon@gmail.com", casa_block)
        self.assertIn("luzolivas@gmail.com", casa_block)
        self.assertNotIn("'isabelgarciatimon@gmail.com'", casa_block)
        self.assertNotIn("'garciatimon@gmail.com'", casa_block)
        self.assertNotIn("'agustingarciayperez@gmail.com'", casa_block)
        self.assertNotIn("'agustingarciatimon@gmail.com'", casa_block)

    def test_casa_put_both_docs(self):
        put = (self.repo / "go" / "casa_put_json.py").read_text(encoding="utf-8")
        self.assertIn('"viajes/viajes.json": "viajes"', put)
        self.assertIn('"viajes/viajes_casa.json": "viajes_casa"', put)

    def test_json_publico_sin_mari_luz(self):
        pub = (self.root / "viajes.json").read_text(encoding="utf-8")
        self.assertNotIn("Mari Luz", pub)
        self.assertNotIn("mariluz-vidal", pub)
        self.assertNotIn("2026-09-30", pub)
        self.assertNotIn("2026-11-07", pub)
        self.assertNotIn("La Rioja", pub)
        payload = json.loads(pub)
        self.assertEqual(payload["schema_version"], 1)
        ids = [v["id"] for v in payload["viajes"]]
        self.assertNotIn("mariluz-vidal-malaga", ids)
        self.assertNotIn("mariluz-vidal-larioja", ids)
        self.assertNotIn("Mari Luz y Vidal", payload["quien"]["order"])
        self.assertNotIn("Mari Luz y Vidal", payload["quien"]["color"])
        self.assertNotIn("Mari Luz y Vidal", payload["quien"]["dot"])

    def test_json_casa_solo_mari_luz(self):
        casa = json.loads((self.root / "viajes_casa.json").read_text(encoding="utf-8"))
        self.assertEqual(casa["schema_version"], 1)
        ids = [v["id"] for v in casa["viajes"]]
        self.assertEqual(set(ids), {"mariluz-vidal-malaga", "mariluz-vidal-larioja"})
        self.assertEqual(casa["quien"]["order"], ["Mari Luz y Vidal"])
        self.assertIn("Mari Luz y Vidal", casa["quien"]["color"])
        self.assertIn("Mari Luz y Vidal", casa["quien"]["dot"])
        for v in casa["viajes"]:
            self.assertEqual(v["quien"], "Mari Luz y Vidal")
        malaga = next(v for v in casa["viajes"] if v["id"] == "mariluz-vidal-malaga")
        rioja = next(v for v in casa["viajes"] if v["id"] == "mariluz-vidal-larioja")
        self.assertEqual(malaga["inicio"], "2026-11-07")
        self.assertEqual(malaga["fin"], "2026-11-09")
        self.assertEqual(rioja["inicio"], "2026-09-30")
        self.assertEqual(rioja["fin"], "2026-10-01")


if __name__ == "__main__":
    unittest.main()
