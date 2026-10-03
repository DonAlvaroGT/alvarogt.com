#!/usr/bin/env python3
"""Contrato CrowPanel: ropa laborable, Mela y comedor sin inventar, viaje de casa."""
from __future__ import annotations

import json
import unittest

from epaper_hoy import (
    TIEMPO_FALTA,
    build_hoy,
    events_from_reglas,
    festivo,
    is_favorito,
    laborable,
    lluvia_line,
    nacho_ropa,
    rest_url_redacted,
    skip_aviso,
    sports_ficha,
    sports_for_day,
    sports_lines,
)

REGLAS = {
    "schema_version": 1,
    "timezone": "Europe/Madrid",
    "extraescolares": [
        {"id": "futbol-nacho", "title": "Fútbol Nacho", "time": "16:30", "weekdays": [1, 3], "from": "2026-09-21"},
        {"id": "ingles-dom", "title": "Inglés con Dom", "time": "16:30", "weekdays": [2], "from": "2026-09-22"},
        {"id": "natacion-mollete", "title": "Natación Mollete", "time": "18:30", "end": "19:00", "weekdays": [3]},
        {"id": "piano-manana", "title": "Piano Luz", "time": "08:30", "weekdays": [1]},
    ],
}
VIAJES = {
    "viajes": [
        {
            "id": "disney-paris",
            "titulo": "Disney París",
            "quien": "García Timón",
            "inicio": "2026-09-11",
            "fin": "2026-09-14",
            "lugar_principal": {"label": "Disneyland Paris"},
            "estancias": [{"desde": "2026-09-11", "hasta": "2026-09-14", "donde": "Disneyland Paris"}],
            "dias": [
                {
                    "fecha": "2026-09-11",
                    "donde": "Disneyland Paris",
                    "plan": "Llegada. Disneyland desde ~15:00.",
                }
            ],
        },
        {
            "id": "abuelos-grecia",
            "titulo": "Abuelos Grecia",
            "quien": "Maribel y Agustín",
            "inicio": "2026-09-21",
            "fin": "2026-09-28",
            "lugar_principal": {"label": "Atenas"},
            "dias": [
                {
                    "fecha": "2026-09-21",
                    "donde": "Madrid",
                    "plan": "Tarde: 17:30 mostradores T4, IB839 MAD 20:00 → ATH 04:00+1.",
                    "vuelos": [
                        {
                            "codigo": "IB839",
                            "ruta": "MAD 20:00 → ATH 04:00 +1",
                            "origen": "MAD",
                            "destino": "ATH",
                            "salida": "2026-09-21T20:00:00+02:00",
                            "llegada": "2026-09-22T04:00:00+03:00",
                            "offset_llegada": 1,
                            "terminal_salida": "T4",
                            "nota": "Facturación 17:30 T4. Confirmar en la app.",
                        }
                    ],
                    "items": [
                        {"hora": "17:30", "texto": "Tarde: mostradores T4", "confirmar": True},
                        {"hora": "20:00", "texto": "IB839 MAD → ATH 04:00 +1", "confirmar": True},
                    ],
                },
                {
                    "fecha": "2026-09-22",
                    "donde": "Atenas",
                    "plan": "Mañana: visita panorámica Atenas (Syntagma, Jardín Nacional). Tarde: Acrópolis (Partenón). Noche: cena restaurante, hotel.",
                    "items": [
                        {
                            "hora": "",
                            "texto": "Mañana: visita panorámica Atenas (Syntagma, Jardín Nacional, Parlamento, Tumba del Soldado, Arco de Adriano, Templo de Zeus, Ágora). Almuerzo restaurante.",
                            "confirmar": False,
                        },
                        {
                            "hora": "",
                            "texto": "Tarde: Acrópolis (Partenón, Erecteion, Atenea Niké, Propileos).",
                            "confirmar": False,
                        },
                        {"hora": "", "texto": "Noche: cena restaurante, hotel.", "confirmar": False},
                    ],
                },
            ],
        },
    ]
}
TIEMPO = {
    "2026-09-11": {"min": 16.2, "max": 24.4, "weather_code": 0, "rain_probability": 10},
    "2026-09-18": {"min": 14.1, "max": 27.2, "weather_code": 1, "rain_probability": 5},
    "2026-09-19": {"min": 15, "max": 26, "weather_code": 3, "rain_probability": 20},
    "2026-09-21": {"min": 14.9, "max": 31.8, "weather_code": 2},
}
DEPORTE = {
    "schema_version": 1,
    "timezone": "Europe/Madrid",
    "partidos": [
        {"fecha_madrid": "2026-09-18", "hora_madrid": "08:59", "rival": "Malasia · Libres", "deporte": "f1"},
        {"fecha_madrid": "2026-09-18", "hora_madrid": "23:00", "rival": "Malasia · Noche", "deporte": "f1"},
        {
            "fecha_madrid": "2026-09-19",
            "hora_madrid": "21:00",
            "rival": "Sevilla – Barcelona",
            "deporte": "futbol",
        },
        {
            "fecha_madrid": "2026-09-19",
            "hora_madrid": "16:00",
            "rival": "Brewers – Cubs",
            "deporte": "mlb",
        },
        {
            "fecha_madrid": "2026-09-19",
            "hora_madrid": "21:00",
            "rival": "Miami Dolphins – Bills",
            "deporte": "nfl",
        },
        {
            "fecha_madrid": "2026-09-19",
            "hora_madrid": "18:00",
            "rival": "Detroit Red Wings – Bruins",
            "deporte": "nhl",
        },
        {
            "fecha_madrid": "2026-09-21",
            "hora_madrid": "21:00",
            "rival": "Real Madrid – Valencia",
            "deporte": "futbol",
        },
        {
            "fecha_madrid": "2026-09-21",
            "hora_madrid": "21:00",
            "rival": "Real Madrid – Barcelona",
            "deporte": "femenino",
        },
        {"fecha_madrid": "2026-10-03", "hora_madrid": "10:00", "rival": "Malasia · Qualy", "deporte": "f1"},
        {"fecha_madrid": "2026-10-04", "hora_madrid": "09:00", "rival": "Malasia · Carrera", "deporte": "f1"},
    ],
}
CAL = [
    {"start": "2026-09-21 00:00", "end": "2026-09-28 23:59", "title": "Abuelos GT en Atenas", "calendar": "Familia"},
    {"start": "2026-09-21 10:40", "end": "2026-09-21 11:00", "title": "Cita Hospital Viamed Santa Elena", "calendar": "Familia"},
    {"start": "2026-09-21 13:30", "end": "2026-09-21 14:30", "title": "Lentejas de la abuela, ensalada", "calendar": "Mela"},
    {"start": "2026-09-21 20:00", "end": "2026-09-21 21:00", "title": "Empanada de merluza, pisto y cottage", "calendar": "Mela"},
    {"start": "2026-09-21 16:30", "end": "2026-09-21 17:30", "title": "Fútbol Nacho", "calendar": "Familia"},
    {"start": "2026-09-21 09:00", "end": "2026-09-21 10:00", "title": "Reunión", "calendar": "Trabajo"},
    {"start": "2026-09-21 21:00", "end": "2026-09-21 23:00", "title": "Partido", "calendar": "Real Madrid"},
]
COMEDOR = {
    "schema_version": 1,
    "timezone": "Europe/Madrid",
    "dias": {
        "2026-09-18": {
            "platos": ["sopa de picadillo", "abadejo a la romana", "ensalada", "fruta fresca", "pan"]
        },
        "2026-09-21": {
            "platos": ["menestra de verduras", "escalopines en salsa", "puré", "fruta fresca", "pan"]
        },
        "2026-09-22": {
            "platos": [
                "pasta integral a la crema de queso",
                "albóndigas de garbanzos en salsa",
                "fruta fresca",
                "pan integral",
                "ensalada",
            ]
        },
    },
}


def doc(ymd, **kwargs):
    return build_hoy(
        ymd,
        reglas=kwargs.get("reglas", REGLAS),
        viajes=kwargs.get("viajes", VIAJES),
        deporte=kwargs.get("deporte", DEPORTE),
        sports_day=kwargs.get("sports_day"),
        sports_week=kwargs.get("sports_week"),
        tiempo=kwargs.get("tiempo", TIEMPO),
        calendario=kwargs.get("calendario", CAL),
        comedor=kwargs.get("comedor", COMEDOR),
    )


class EpaperHoyTests(unittest.TestCase):
    def test_comedor_manana_sin_inventar(self):
        lunes = doc("2026-09-21")
        self.assertEqual(lunes["manana"]["comedor"], "menestra de verduras · escalopines en salsa · puré")
        self.assertNotIn("comedor", lunes["tarde"])
        self.assertNotIn("comedor", lunes["finde"])
        self.assertNotIn("fruta fresca", lunes["manana"]["comedor"])
        viernes = doc("2026-09-18")
        self.assertEqual(viernes["manana"]["comedor"], "sopa de picadillo · abadejo a la romana")
        martes = doc("2026-09-22")
        self.assertEqual(
            martes["manana"]["comedor"],
            "pasta integral a la crema de queso · albóndigas de garbanzos en salsa",
        )
        self.assertNotIn("ensalada", martes["manana"]["comedor"])
        self.assertNotIn("pan integral", martes["manana"]["comedor"])
        sabado = doc("2026-09-19")
        self.assertNotIn("comedor", sabado["finde"])
        self.assertEqual(sabado["manana"]["comedor"], "")
        sin = doc("2026-09-21", comedor=None)
        self.assertEqual(sin["manana"]["comedor"], "")
        disney = doc("2026-09-11")
        self.assertEqual(disney["manana"]["comedor"], "")

    def test_viaje_casa_sin_dia_n_de_m(self):
        payload = doc("2026-09-11")
        linea = payload["manana"]["viaje"]
        self.assertEqual(linea, "Disney París · Disneyland Paris")
        self.assertEqual(linea, payload["tarde"]["viaje"])
        self.assertEqual(linea, payload["finde"]["viaje"])
        self.assertEqual(payload["viaje_texto"], "Disney París · Disneyland Paris · Llegada. Disneyland desde ~15:00.")
        self.assertNotIn("día ", linea)
        self.assertNotIn("último día", linea)
        self.assertNotIn("día n", payload["viaje_texto"])
        viernes_sin = doc("2026-09-18")
        self.assertEqual(viernes_sin["manana"]["viaje"], "")
        self.assertEqual(viernes_sin["tarde"]["viaje"], "")
        self.assertEqual(viernes_sin["finde"]["viaje"], "")
        self.assertEqual(viernes_sin["viaje_texto"], "")

    def test_viaje_todos_los_dias_del_tramo(self):
        for ymd in ("2026-09-11", "2026-09-12", "2026-09-13", "2026-09-14"):
            payload = doc(ymd)
            self.assertTrue(payload["manana"]["viaje"], ymd)
            self.assertTrue(payload["finde"]["viaje"], ymd)
        self.assertFalse(doc("2026-09-15")["manana"]["viaje"])

    def test_no_pinta_viaje_de_otros(self):
        lunes = doc("2026-09-21")
        self.assertEqual(lunes["manana"]["viaje"], "")
        self.assertEqual(lunes["tarde"]["viaje"], "")
        self.assertEqual(lunes["viaje_texto"], "")
        titles = [e["title"] for e in lunes["manana"]["extraescolares"]]
        self.assertIn("Abuelos GT en Atenas", titles)
        self.assertEqual(titles.count("Abuelos GT en Atenas"), 1)
        self.assertTrue(all(e["title"] == "Abuelos GT en Atenas" or "Abuelos GT en Atenas" not in e["title"] for e in lunes["manana"]["extraescolares"]))

    def test_viaje_texto_no_inventa_plan(self):
        viajes = {
            "viajes": [
                {
                    "id": "disney-paris",
                    "titulo": "Disney París",
                    "quien": "García Timón",
                    "inicio": "2026-09-11",
                    "fin": "2026-09-14",
                    "lugar_principal": {"label": "Disneyland Paris"},
                    "dias": [{"fecha": "2026-09-12", "donde": "Disneyland Paris"}],
                }
            ]
        }
        payload = doc("2026-09-12", viajes=viajes)
        self.assertEqual(payload["viaje_texto"], "Disney París · Disneyland Paris")
        self.assertNotIn("EMT", payload["viaje_texto"])

    def test_laborable_vs_finde(self):
        viernes = doc("2026-09-18")
        sabado = doc("2026-09-19")
        self.assertTrue(viernes["laborable"])
        self.assertFalse(sabado["laborable"])
        self.assertEqual(viernes["manana"]["nacho_ropa"], "chándal")
        self.assertEqual(viernes["tarde"]["nacho_ropa"], "")
        self.assertEqual(sabado["manana"]["nacho_ropa"], "")
        self.assertEqual(sabado["tarde"]["nacho_ropa"], "")
        self.assertEqual(nacho_ropa("2026-09-22"), "chándal")
        self.assertEqual(nacho_ropa("2026-09-23"), "uniforme")
        lunes = doc("2026-09-21")
        self.assertEqual(lunes["manana"]["nacho_ropa"], "chándal")
        self.assertEqual(lunes["tarde"]["nacho_ropa"], "chándal")
        martes = doc("2026-09-22")
        self.assertEqual(martes["manana"]["nacho_ropa"], "chándal")
        self.assertEqual(martes["tarde"]["nacho_ropa"], "uniforme")
        miercoles = doc("2026-09-23")
        self.assertEqual(miercoles["manana"]["nacho_ropa"], "uniforme")
        self.assertEqual(miercoles["tarde"]["nacho_ropa"], "uniforme")
        self.assertNotIn("nacho_ropa", viernes["finde"])
        self.assertNotIn("nacho_ropa", sabado["finde"])
        self.assertNotIn("uniforme", json.dumps(sabado["finde"], ensure_ascii=False))
        self.assertNotIn("cole", json.dumps(viernes, ensure_ascii=False).lower())
        self.assertNotIn("cole", json.dumps(sabado, ensure_ascii=False).lower())

    def test_extraescolares_manana_todo_el_dia_tarde_desde_14(self):
        lunes = doc("2026-09-21")
        titles_m = [e["title"] for e in lunes["manana"]["extraescolares"]]
        titles_t = [e["title"] for e in lunes["tarde"]["extraescolares"]]
        self.assertEqual(
            titles_m,
            ["Piano Luz", "Cita Hospital Viamed Santa Elena", "Fútbol Nacho", "* 21:00 · Real Madrid – Valencia", "Abuelos GT en Atenas"],
        )
        self.assertEqual(titles_t, ["Fútbol Nacho", "* 21:00 · Real Madrid – Valencia", "Abuelos GT en Atenas"])
        self.assertNotIn("Piano Luz", titles_t)
        martes = doc("2026-09-22")
        titles_m = [e["title"] for e in martes["manana"]["extraescolares"]]
        titles_t = [e["title"] for e in martes["tarde"]["extraescolares"]]
        self.assertIn("Inglés con Dom", titles_m)
        self.assertIn("Inglés con Dom", titles_t)
        self.assertEqual(lunes["finde"].get("extraescolares", []) and True, True)
        viernes = doc("2026-09-18")
        self.assertEqual(viernes["manana"]["extraescolares"], [])
        self.assertEqual(viernes["tarde"]["extraescolares"], [])

    def test_calendario_filtra_y_no_duplica(self):
        lunes = doc("2026-09-21")
        blob = json.dumps(lunes, ensure_ascii=False)
        self.assertNotIn("Reunión", blob)
        self.assertNotIn("Partido", blob)
        extras = json.dumps(lunes["manana"]["extraescolares"] + lunes["tarde"]["extraescolares"], ensure_ascii=False)
        self.assertNotIn("Empanada", extras)
        self.assertNotIn("Lentejas", extras)
        titles_t = [e["title"] for e in lunes["tarde"]["extraescolares"]]
        self.assertEqual(titles_t.count("Fútbol Nacho"), 1)
        cita = [e for e in lunes["manana"]["extraescolares"] if e["title"].startswith("Cita")][0]
        self.assertEqual(cita["time"], "10:40")
        abuelos = [e for e in lunes["manana"]["extraescolares"] if "Abuelos" in e["title"]][0]
        self.assertNotIn("time", abuelos)

    def test_mela_tarde_cena_finde_comida_sin_hora(self):
        lunes = doc("2026-09-21")
        self.assertEqual(lunes["manana"]["mela"], "")
        self.assertEqual(lunes["tarde"]["mela"], "Cena Empanada de merluza")
        self.assertNotIn("pisto", lunes["tarde"]["mela"])
        self.assertNotIn("20:00", lunes["tarde"]["mela"])
        self.assertNotIn("Lentejas", lunes["tarde"]["mela"])
        viernes = doc("2026-09-18")
        self.assertEqual(viernes["manana"]["mela"], "")
        self.assertEqual(viernes["tarde"]["mela"], "")
        sabado = doc("2026-09-19")
        self.assertEqual(sabado["finde"]["mela"], "")
        sin = doc("2026-09-21", calendario=[])
        self.assertEqual(sin["manana"]["mela"], "")
        self.assertEqual(sin["tarde"]["mela"], "")
        cal_finde = CAL + [
            {"start": "2026-09-19 14:00", "end": "2026-09-19 15:00", "title": "Paella", "calendar": "Mela"},
            {"start": "2026-09-19 21:00", "end": "2026-09-19 22:00", "title": "Pizza", "calendar": "Mela"},
        ]
        finde = doc("2026-09-19", calendario=cal_finde)
        self.assertEqual(finde["finde"]["mela"], "Comida Paella")
        self.assertNotIn("Pizza", finde["finde"]["mela"])
        self.assertNotIn("14:00", finde["finde"]["mela"])

    def test_deporte_ventana_sin_inventar(self):
        self.assertFalse(is_favorito({"deporte": "futbol", "rival": "Sevilla – Barcelona"}))
        self.assertTrue(is_favorito({"deporte": "futbol", "rival": "Real Madrid – Valencia"}))
        self.assertFalse(is_favorito({"deporte": "femenino", "rival": "Real Madrid – Barcelona"}))
        self.assertEqual(sports_for_day(None, "2026-09-18"), "")
        self.assertEqual(sports_for_day(DEPORTE, "2026-09-18"), "")
        self.assertNotIn("Sevilla", sports_for_day(DEPORTE, "2026-09-19"))
        vacio = doc("2026-09-18")
        self.assertEqual(vacio["tarde"]["deporte"], "")
        self.assertEqual(vacio["finde"]["deporte"], "")
        self.assertEqual(vacio["deportes"], [])
        self.assertFalse(any(str(e.get("title") or "").startswith("*") for e in vacio["manana"]["extraescolares"]))
        self.assertFalse(any(str(e.get("title") or "").startswith("*") for e in vacio["tarde"]["extraescolares"]))
        sabado = doc("2026-09-19")
        ficha = "* 16:00 · Brewers – Cubs · 18:00 · Detroit Red Wings – Bruins · 21:00 · Miami Dolphins – Bills"
        self.assertEqual(sports_ficha(DEPORTE, "2026-09-19"), ficha)
        self.assertEqual(
            sports_lines(DEPORTE, "2026-09-19"),
            [
                "16:00 · Brewers – Cubs",
                "18:00 · Detroit Red Wings – Bruins",
                "21:00 · Miami Dolphins – Bills",
            ],
        )
        titles_f = [e["title"] for e in sabado["finde"]["extraescolares"]]
        titles_t = [e["title"] for e in sabado["tarde"]["extraescolares"]]
        self.assertEqual(titles_f.count(ficha), 1)
        self.assertEqual(titles_t.count(ficha), 1)
        self.assertTrue(all("Sevilla" not in t for t in titles_f))
        self.assertNotIn("time", [e for e in sabado["finde"]["extraescolares"] if e["title"] == ficha][0])
        lunes = doc("2026-09-21")
        titles_m = [e["title"] for e in lunes["manana"]["extraescolares"]]
        titles_t = [e["title"] for e in lunes["tarde"]["extraescolares"]]
        rm = "* 21:00 · Real Madrid – Valencia"
        self.assertEqual(titles_m.count(rm), 1)
        self.assertEqual(titles_t.count(rm), 1)
        self.assertEqual(titles_t.count("Fútbol Nacho"), 1)
        self.assertTrue(all("femenino" not in t.lower() and "Barcelona" not in t for t in titles_m if t.startswith("*")))
        self.assertEqual(sports_ficha(DEPORTE, "2026-10-03"), "* 10:00 · Malasia · Qualy")
        self.assertEqual(sports_ficha(DEPORTE, "2026-10-04"), "* 09:00 · Malasia · Carrera")
        oct3 = doc("2026-10-03", reglas={"schema_version": 1, "timezone": "Europe/Madrid", "extraescolares": []}, calendario=[])
        titles_oct = [e["title"] for e in oct3["finde"]["extraescolares"]]
        self.assertEqual(titles_oct, ["* 10:00 · Malasia · Qualy"])
        self.assertEqual(sports_lines(None, "2026-09-18"), [])

    def test_actualizado_solo_si_viene(self):
        sin = doc("2026-09-21")
        self.assertEqual(sin["actualizado"], "")
        con = doc("2026-09-21")
        con = build_hoy(
            "2026-09-21",
            reglas=REGLAS,
            viajes=VIAJES,
            deporte=DEPORTE,
            tiempo=TIEMPO,
            calendario=CAL,
            actualizado="2026-09-21 19:04",
            comedor=COMEDOR,
        )
        self.assertEqual(con["actualizado"], "2026-09-21 19:04")

    def test_tiempo_enteros_y_cielo(self):
        sin = doc("2026-09-18", tiempo=None)
        self.assertEqual(sin["manana"]["tiempo"], TIEMPO_FALTA)
        self.assertNotIn("°", sin["manana"]["tiempo"][:3] + "")
        con = doc("2026-09-18")
        self.assertEqual(con["manana"]["tiempo"], "14–27° sol")
        self.assertEqual(con["manana"]["tiempo"], con["tarde"]["tiempo"])
        self.assertEqual(con["manana"]["tiempo"], con["finde"]["tiempo"])
        nubes = doc("2026-09-21")
        self.assertEqual(nubes["manana"]["tiempo"], "15–32° nubes")
        self.assertNotIn("lluvia", nubes["manana"]["tiempo"])
        agua = doc(
            "2026-09-18",
            tiempo={"2026-09-18": {"min": 14, "max": 27, "weather_code": 3, "rain_probability": 45}},
        )
        self.assertEqual(agua["manana"]["tiempo"], "14–27° lluvia")
        bajo = doc(
            "2026-09-18",
            tiempo={"2026-09-18": {"min": 14, "max": 27, "weather_code": 3, "rain_probability": 44}},
        )
        self.assertEqual(bajo["manana"]["tiempo"], "14–27° nubes")

    def test_lluvia_bajo_grados(self):
        self.assertEqual(lluvia_line({"rain_probability": 40}), "lluvia 40 %")
        self.assertEqual(lluvia_line({"rain_probability": 0}), "sin lluvia")
        self.assertEqual(lluvia_line({"rain_probability": None}), "")
        self.assertEqual(lluvia_line(None), "")
        con = doc("2026-09-18")
        self.assertEqual(con["manana"]["lluvia"], "lluvia 5 %")
        self.assertEqual(con["manana"]["rain_probability"], 5)
        self.assertEqual(con["tarde"]["lluvia"], "lluvia 5 %")
        self.assertEqual(con["finde"]["lluvia"], "lluvia 5 %")
        nubes = doc("2026-09-21")
        self.assertEqual(nubes["manana"]["lluvia"], "")
        self.assertIsNone(nubes["manana"]["rain_probability"])
        seco = doc("2026-09-18", tiempo={"2026-09-18": {"min": 14, "max": 27, "weather_code": 1, "rain_probability": 0}})
        self.assertEqual(seco["manana"]["lluvia"], "sin lluvia")
        self.assertEqual(seco["manana"]["rain_probability"], 0)
        self.assertNotIn("lluvia", seco["manana"]["tiempo"])

    def test_skip_extraescolar_linea_hoy_no_hay(self):
        self.assertEqual(skip_aviso("Inglés con Dom"), "hoy no hay inglés")
        self.assertEqual(skip_aviso("Fútbol Nacho"), "hoy no hay fútbol")
        self.assertEqual(skip_aviso("Natación Mollete"), "hoy no hay natación")
        reglas = {
            "schema_version": 1,
            "timezone": "Europe/Madrid",
            "extraescolares": [
                {"id": "futbol-nacho", "title": "Fútbol Nacho", "time": "16:30", "weekdays": [1, 3], "from": "2026-09-21", "skip": ["2026-09-21"]},
                {"id": "ingles-dom", "title": "Inglés con Dom", "time": "16:30", "weekdays": [2], "from": "2026-09-22", "skip": ["2026-09-22"]},
                {"id": "natacion-mollete", "title": "Natación Mollete", "time": "18:30", "end": "19:00", "weekdays": [3], "skip": ["2026-09-23"]},
            ],
        }
        self.assertEqual(events_from_reglas(reglas, "2026-09-16")[0]["title"], "Natación Mollete")
        titles_23 = [e["title"] for e in events_from_reglas(reglas, "2026-09-23")]
        self.assertEqual(titles_23, ["Fútbol Nacho", "hoy no hay natación"])
        cal_nat = CAL + [
            {"start": "2026-09-23 18:30", "end": "2026-09-23 19:00", "title": "Natación Mollete", "calendar": "Familia"},
        ]
        mie = doc("2026-09-23", reglas=reglas, calendario=cal_nat)
        titles_m = [e["title"] for e in mie["manana"]["extraescolares"]]
        titles_t = [e["title"] for e in mie["tarde"]["extraescolares"]]
        self.assertIn("hoy no hay natación", titles_m)
        self.assertIn("hoy no hay natación", titles_t)
        self.assertNotIn("Natación Mollete", titles_m)
        self.assertNotIn("Natación Mollete", titles_t)
        self.assertIn("Fútbol Nacho", titles_t)
        lun = doc("2026-09-21", reglas=reglas, calendario=[])
        titles_lun = [e["title"] for e in lun["tarde"]["extraescolares"]]
        self.assertEqual(titles_lun, ["hoy no hay fútbol", "* 21:00 · Real Madrid – Valencia"])
        self.assertNotIn("Fútbol Nacho", titles_lun)
        mar = doc("2026-09-22", reglas=reglas, calendario=[])
        titles_mar = [e["title"] for e in mar["tarde"]["extraescolares"]]
        self.assertEqual(titles_mar, ["hoy no hay inglés"])
        self.assertNotIn("time", mar["tarde"]["extraescolares"][0])

    def test_logopeda_sin_hora_pinta_titulo(self):
        reglas = {
            "schema_version": 1,
            "timezone": "Europe/Madrid",
            "extraescolares": [
                {
                    "id": "logopeda-nacho",
                    "title": "Logopeda Nacho",
                    "time": "sin hora",
                    "weekdays": [4],
                    "from": "2026-10-01",
                    "until": "2026-10-01",
                }
            ],
        }
        rows = events_from_reglas(reglas, "2026-10-01")
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["title"], "Logopeda Nacho")
        self.assertNotIn("time", rows[0])
        vacio = {
            "schema_version": 1,
            "timezone": "Europe/Madrid",
            "extraescolares": [{**reglas["extraescolares"][0], "time": ""}],
        }
        self.assertEqual(events_from_reglas(vacio, "2026-10-01")[0]["title"], "Logopeda Nacho")
        self.assertNotIn("time", events_from_reglas(vacio, "2026-10-01")[0])
        jue = doc("2026-10-01", reglas=reglas, calendario=[])
        titles_m = [e["title"] for e in jue["manana"]["extraescolares"]]
        titles_t = [e["title"] for e in jue["tarde"]["extraescolares"]]
        self.assertEqual(titles_m, ["Logopeda Nacho"])
        self.assertNotIn("time", jue["manana"]["extraescolares"][0])
        self.assertNotIn("Logopeda Nacho", titles_t)
        self.assertEqual(events_from_reglas(reglas, "2026-10-08"), [])
        self.assertEqual(events_from_reglas(reglas, "2026-09-24"), [])

    def test_festivo_12_oct_sin_menu_ni_extras(self):
        self.assertTrue(festivo("2026-10-12"))
        self.assertFalse(laborable("2026-10-12"))
        self.assertTrue(laborable("2026-10-13"))
        self.assertFalse(festivo("2026-10-13"))
        self.assertEqual(nacho_ropa("2026-10-12"), "")
        reglas = {
            "schema_version": 1,
            "timezone": "Europe/Madrid",
            "extraescolares": [
                {"id": "futbol-nacho", "title": "Fútbol Nacho", "time": "16:30", "weekdays": [1, 3], "from": "2026-09-21"},
            ],
        }
        self.assertEqual(events_from_reglas(reglas, "2026-10-12"), [])
        inventado = {
            "schema_version": 1,
            "timezone": "Europe/Madrid",
            "dias": {"2026-10-12": {"platos": ["paella inventada", "filete"]}},
        }
        payload = doc("2026-10-12", reglas=reglas, calendario=[], comedor=inventado)
        self.assertFalse(payload["laborable"])
        self.assertTrue(payload["festivo"])
        self.assertEqual(payload["manana"]["comedor"], "")
        self.assertEqual(payload["manana"]["extraescolares"], [])
        self.assertEqual(payload["tarde"]["extraescolares"], [])
        self.assertEqual(payload["manana"]["nacho_ropa"], "")
        blob = json.dumps(payload, ensure_ascii=False)
        self.assertNotIn("paella", blob)
        self.assertNotIn("Fútbol Nacho", blob)
        self.assertNotIn("filete", blob)
        vacio = doc("2026-10-12", reglas=reglas, calendario=[], comedor=COMEDOR)
        self.assertEqual(vacio["manana"]["comedor"], "")

    def test_viaje_hoy_y_manana_no_lejano(self):
        viajes = {
            "viajes": VIAJES["viajes"]
            + [
                {
                    "id": "lisboa-dic",
                    "titulo": "Lisboa",
                    "quien": "García Timón",
                    "inicio": "2026-12-25",
                    "fin": "2026-12-28",
                    "lugar_principal": {"label": "Lisboa"},
                }
            ]
        }
        disney = doc("2026-09-11", viajes=viajes)
        self.assertEqual(
            disney["viaje_hoy"],
            "Disney París · Disneyland Paris · Llegada. Disneyland desde ~15:00.",
        )
        self.assertEqual(disney["viaje_manana"], "Disney París · Disneyland Paris")
        self.assertEqual(disney["viaje_manana"], disney["viaje_siguiente"])
        self.assertNotIn("Lisboa", disney["viaje_hoy"])
        self.assertNotIn("Lisboa", disney["viaje_manana"])
        self.assertNotIn("Abuelos Grecia", disney["viaje_hoy"])
        self.assertNotIn("EMT", disney["viaje_manana"])
        viernes = doc("2026-09-18", viajes=viajes)
        self.assertEqual(viernes["viaje_hoy"], "")
        self.assertEqual(viernes["viaje_manana"], "")
        self.assertNotIn("Lisboa", json.dumps(viernes, ensure_ascii=False))
        lunes = doc("2026-09-21", viajes=viajes)
        self.assertEqual(
            lunes["viaje_hoy"],
            "Abuelos Grecia · Madrid/vuelo · Tarde 17:30 T4, IB839 MAD 20:00 → ATH 04:00+1 (confirmar en la app)",
        )
        self.assertEqual(
            lunes["viaje_manana"],
            "Abuelos Grecia · Atenas · Mañana: visita panorámica. Tarde: Acrópolis.",
        )
        self.assertNotIn("Lisboa", lunes["viaje_hoy"])
        self.assertNotIn("Lisboa", lunes["viaje_manana"])
        self.assertNotIn("http", lunes["viaje_hoy"].lower())
        self.assertNotIn("http", lunes["viaje_manana"].lower())
        self.assertNotIn("€", lunes["viaje_hoy"])
        self.assertNotIn("€", lunes["viaje_manana"])
        self.assertEqual(lunes["manana"]["viaje"], "")
        titles = [e["title"] for e in lunes["manana"]["extraescolares"]]
        self.assertIn("Abuelos GT en Atenas", titles)
        sin_cal = doc("2026-09-21", viajes=viajes, calendario=[])
        self.assertEqual(sin_cal["viaje_hoy"], lunes["viaje_hoy"])
        self.assertEqual(sin_cal["viaje_manana"], lunes["viaje_manana"])
        self.assertNotIn("Lisboa", sin_cal["viaje_manana"])
        ultimo = doc("2026-09-14", viajes=viajes)
        self.assertTrue(ultimo["viaje_hoy"])
        self.assertEqual(ultimo["viaje_manana"], "")
        self.assertNotIn("Lisboa", ultimo["viaje_manana"])

    def test_url_redactada(self):
        url = rest_url_redacted()
        self.assertIn("/epaper/***", url)
        self.assertIn("tablongo", url)
        self.assertNotIn("token", url.lower())


if __name__ == "__main__":
    unittest.main()
