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
        self.assertIn("Hasta tres puntos. Si hay 2 o 3 viajes, el número.", HTML)
        self.assertIn('class="month-legend"', HTML)
        self.assertIn('id="month-prev"', HTML)
        self.assertIn('id="month-next"', HTML)
        self.assertIn("›", HTML)
        self.assertIn("‹", HTML)
        self.assertIn("Este mes y el siguiente", HTML)
        self.assertIn('id="month-view"', HTML)

    def test_month_dots_cap_count_and_list(self):
        self.assertIn("hits.slice(0, 3)", HTML)
        self.assertIn("hits.length === 2 || hits.length === 3", HTML)
        self.assertIn('class="cal-n"', HTML)
        self.assertIn("flex-direction: row", HTML)
        self.assertIn('id="month-day-list"', HTML)
        self.assertIn("function showDayHits", HTML)
        self.assertIn("function hideDayHits", HTML)
        self.assertIn("${esc(h.quien)} · ${esc(h.titulo)}", HTML)
        self.assertIn("showDayHits(key, hits)", HTML)
        self.assertLess(HTML.index("showDayHits(key, hits)"), HTML.index("goToDay(key)"))
        self.assertIn("tripsCovering(data.viajes || [], key)", HTML)
        self.assertIn("pubTrips.filter(v => !esPrivado(v))", HTML)
        self.assertNotIn("@gmail.com", HTML)

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
        self.assertLess(HTML.index("showDayHits(key, hits)"), HTML.index("goToDay(key)"))

    def test_casa_merge_not_public_filter(self):
        self.assertIn("function mergeViajes", HTML)
        self.assertIn("function mergeQuien", HTML)
        self.assertIn("function loadViajesCasa", HTML)
        self.assertIn("function esPrivado", HTML)
        self.assertIn("casaDoc('viajes_casa')", HTML)
        self.assertIn("casaDoc('viajes')", HTML)
        self.assertIn("pubTrips.filter(v => !esPrivado(v))", HTML)
        self.assertNotIn("Mari Luz", HTML)
        self.assertNotIn("mariluz-vidal", HTML)
        self.assertNotIn("@gmail.com", HTML)
        start = HTML.index("async function startApp()")
        end = HTML.index("}", start)
        body = HTML[start:end]
        self.assertIn("await casaDoc('viajes')", body)
        self.assertIn("mergeViajes(payload, await loadViajesCasa())", body)

    def test_resumen_cronologico_y_marca_casa(self):
        self.assertIn("function tripChrono", HTML)
        self.assertIn("a.inicio", HTML)
        self.assertIn("a.fin", HTML)
        self.assertIn(".slice().sort(tripChrono)", HTML)
        self.assertGreaterEqual(HTML.count(".slice().sort(tripChrono)"), 2)
        self.assertIn('class="solo-casa"', HTML)
        self.assertIn("solo casa", HTML)
        start = HTML.index("async function renderTrips()")
        end = HTML.index("function quienPalette()", start)
        body = HTML[start:end]
        self.assertIn("esPrivado(v)", body)
        self.assertIn("casaMark", body)
        self.assertIn("tripChrono", body)
        self.assertLess(HTML.index("function tripChrono"), HTML.index("async function renderTrips()"))

    def test_pie_intacto(self):
        self.assertIn(
            "Fuente de datos: viajes.json · Tiempo: Open-Meteo · Mapa: OpenStreetMap · Vuelos: Flightradar24 y FlightAware (enlaces, sin seguimiento en vivo).",
            HTML,
        )
        self.assertIn("Creado por Álvaro GT y sus minions", HTML)
        self.assertIn("viajes-build: 20261001a", HTML)
        self.assertIn("function calQuienColor", HTML)
        self.assertIn("quien === 'Gugus'", HTML)
        cal = HTML[HTML.index("function calQuienColor") : HTML.index("function monthPairTitle")]
        self.assertIn("#b4bab6", cal)
        self.assertIn("#e6e8e6", cal)
        days = HTML[HTML.index("async function renderDays()") : HTML.index("function tripChrono")]
        trips = HTML[HTML.index("async function renderTrips()") : HTML.index("function quienPalette")]
        self.assertNotIn("calQuienColor", days)
        self.assertNotIn("calQuienColor", trips)


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
        self.assertIn("adult-1@example.com", casa_block)
        self.assertIn("adult-2@example.com", casa_block)
        self.assertNotIn("'adult-3@example.com'", casa_block)
        self.assertNotIn("'adult-4@example.com'", casa_block)
        self.assertNotIn("'adult-5@example.com'", casa_block)
        self.assertNotIn("'adult-6@example.com'", casa_block)

    def test_casa_put_both_docs(self):
        put = (self.repo / "go" / "casa_put_json.py").read_text(encoding="utf-8")
        self.assertIn('"viajes/viajes.json": "viajes"', put)
        self.assertIn('"viajes/viajes_casa.json": "viajes_casa"', put)
        self.assertIn("viajes.json tiene privado", put)
        self.assertIn("cada viaje lleva privado true", put)

    def test_json_publico_sin_mari_luz(self):
        pub = (self.root / "viajes.json").read_text(encoding="utf-8")
        self.assertNotIn("Mari Luz", pub)
        self.assertNotIn("mariluz-vidal", pub)
        self.assertNotIn("La Rioja", pub)
        payload = json.loads(pub)
        self.assertEqual(payload["schema_version"], 1)
        ids = [v["id"] for v in payload["viajes"]]
        self.assertNotIn("mariluz-vidal-malaga", ids)
        self.assertNotIn("mariluz-vidal-larioja", ids)
        self.assertNotIn("Mari Luz y Vidal", payload["quien"]["order"])
        self.assertNotIn("Mari Luz y Vidal", payload["quien"]["color"])
        self.assertNotIn("Mari Luz y Vidal", payload["quien"]["dot"])
        self.assertEqual(payload["quien"]["color"]["Gugus"], "#cde8d8")
        self.assertEqual(payload["quien"]["dot"]["Gugus"], "#2f7d5a")
        inicios = {v.get("inicio") for v in payload["viajes"]}
        self.assertNotIn("2026-09-30", inicios)
        self.assertNotIn("2026-11-07", inicios)
        self.assertFalse(any(v.get("privado") is True for v in payload["viajes"]))
        self.assertFalse(any(v.get("visible") in ("casa", "privado") for v in payload["viajes"]))

    def test_json_casa_flag_no_ids_hardcode(self):
        casa = json.loads((self.root / "viajes_casa.json").read_text(encoding="utf-8"))
        self.assertEqual(casa["schema_version"], 1)
        self.assertTrue(casa["viajes"])
        for v in casa["viajes"]:
            self.assertTrue(v.get("privado") is True or v.get("visible") in ("casa", "privado"))
        self.assertEqual(casa["quien"]["order"], ["Mari Luz y Vidal"])
        self.assertIn("Mari Luz y Vidal", casa["quien"]["color"])
        self.assertIn("Mari Luz y Vidal", casa["quien"]["dot"])
        malaga = next(v for v in casa["viajes"] if v["id"] == "mariluz-vidal-malaga")
        rioja = next(v for v in casa["viajes"] if v["id"] == "mariluz-vidal-larioja")
        self.assertEqual(malaga["inicio"], "2026-11-07")
        self.assertEqual(malaga["fin"], "2026-11-09")
        self.assertTrue(malaga["privado"])
        self.assertEqual(rioja["inicio"], "2026-09-30")
        self.assertEqual(rioja["fin"], "2026-10-01")
        self.assertTrue(rioja["privado"])

    def test_split_por_flag_sin_ids(self):
        from split_viajes import es_privado, split_doc

        src = (self.root / "split_viajes.py").read_text(encoding="utf-8")
        self.assertNotIn("mariluz", src)
        self.assertNotIn("Mari Luz", src)
        self.assertNotIn("larioja", src)
        self.assertNotIn("malaga", src)
        self.assertTrue(es_privado({"privado": True}))
        self.assertTrue(es_privado({"visible": "casa"}))
        self.assertFalse(es_privado({"id": "lisboa"}))
        doc = {
            "schema_version": 1,
            "actualizado": "2026-09-29",
            "fuente": "test",
            "zona_casa": "Europe/Madrid",
            "quien": {
                "order": ["Lucita y Álvaro", "SoloCasa"],
                "color": {"Lucita y Álvaro": "#f7d3b0", "SoloCasa": "#b7ddd8"},
                "dot": {"Lucita y Álvaro": "#c45c26", "SoloCasa": "#1f6f68"},
            },
            "viajes": [
                {"id": "publico-x", "quien": "Lucita y Álvaro", "titulo": "Lisboa"},
                {"id": "futuro-privado", "privado": True, "quien": "SoloCasa", "titulo": "X"},
                {"id": "futuro-visible", "visible": "casa", "quien": "SoloCasa", "titulo": "Y"},
            ],
        }
        pub, casa = split_doc(doc)
        self.assertEqual([v["id"] for v in pub["viajes"]], ["publico-x"])
        self.assertEqual({v["id"] for v in casa["viajes"]}, {"futuro-privado", "futuro-visible"})
        self.assertNotIn("SoloCasa", pub["quien"]["order"])
        self.assertNotIn("SoloCasa", pub["quien"]["color"])
        self.assertEqual(casa["quien"]["order"], ["SoloCasa"])
        self.assertIn("Lucita y Álvaro", pub["quien"]["order"])
        self.assertNotIn("Lucita y Álvaro", casa["quien"]["order"])


if __name__ == "__main__":
    unittest.main()
