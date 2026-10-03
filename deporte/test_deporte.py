#!/usr/bin/env python3
from __future__ import annotations

import json
import unittest
from datetime import datetime
from pathlib import Path
from email.message import EmailMessage
from urllib.error import HTTPError
from io import BytesIO

HDRS = EmailMessage()
from zoneinfo import ZoneInfo

import deporte_job as job

ROOT = Path(__file__).resolve().parent
ZONE = ZoneInfo("Europe/Madrid")


def ev(eid, date, away, home, broadcasts=None, status="STATUS_SCHEDULED", tid_away="1", tid_home="2"):
    return {
        "id": eid,
        "date": date,
        "name": f"{away} at {home}",
        "status": {"type": {"name": status}},
        "competitions": [{
            "broadcasts": broadcasts or [],
            "competitors": [
                {"homeAway": "away", "team": {"id": tid_away, "displayName": away}},
                {"homeAway": "home", "team": {"id": tid_home, "displayName": home}},
            ],
        }],
    }


class FakeGet:
    def __init__(self, mapping, status=None):
        self.mapping = mapping
        self.status = status or {}

    def __call__(self, url: str):
        if url in self.status:
            raise HTTPError(url, self.status[url], "no", hdrs=HDRS, fp=BytesIO())
        for key, val in self.mapping.items():
            if key in url:
                return val
        return {"events": []}


class JobTests(unittest.TestCase):
    def test_horizon_is_62_days_from_clock(self):
        now = datetime(2026, 10, 6, 7, 0, tzinfo=ZONE)
        days = job.horizon(now)
        self.assertEqual(days[0], "2026-10-06")
        self.assertEqual(days[-1], "2026-12-06")
        self.assertEqual(len(days), 62)

    def test_madrid_from_utc(self):
        hora, fecha = job.madrid_from_utc("2026-10-10T19:00:00Z")
        self.assertEqual(hora, "21:00")
        self.assertEqual(fecha, "2026-10-10")

    def test_soccer_keeps_rm_barca_not_femenino(self):
        days = ["2026-10-10"]
        getter = FakeGet({
            "soccer/esp.1/scoreboard": {"events": [
                ev("1", "2026-10-10T19:00Z", "Villarreal", "Real Madrid", [{"names": ["ESPN+"]}]),
                ev("2", "2026-10-10T16:00Z", "Getafe", "Barcelona"),
                ev("3", "2026-10-10T14:00Z", "Sevilla", "Betis"),
            ]},
            "soccer/esp.w.1/scoreboard": {"events": [
                ev("9", "2026-10-10T17:00Z", "Real Madrid", "Atlético Madrid"),
            ]},
        })
        men = job.collect_soccer(getter, days)
        self.assertEqual({p["rival"] for p in men}, {"Villarreal – Real Madrid", "Getafe – Barcelona"})
        self.assertEqual(men[0]["deporte"], "futbol")
        self.assertTrue(all(p["deporte"] != "femenino" for p in men))
        self.assertEqual(job.tv_espana("DAZN LaLiga"), "DAZN LaLiga")
        self.assertEqual(job.tv_espana("Movistar Plus+"), "Movistar Plus+")
        self.assertEqual(job.tv_espana("Disney+"), "Disney+")
        self.assertEqual(job.tv_espana("ESPN+"), "")
        self.assertEqual(men[0]["tv"], "")

    def test_nhl_drops_overnight(self):
        days = ["2026-10-06"]
        getter = FakeGet({
            "hockey/nhl/scoreboard": {"events": [
                ev("n1", "2026-10-06T00:30Z", "Rangers", "Red Wings"),  # 02:30 Madrid
                ev("n2", "2026-10-06T18:00Z", "Bruins", "Leafs"),  # 20:00
            ]},
        })
        out = job.collect_nhl(getter, days)
        self.assertEqual(len(out), 1)
        self.assertIn("Bruins", out[0]["rival"])

    def test_ncaa_only_top25_in_14_days(self):
        days = ["2026-10-10", "2026-10-11"]
        getter = FakeGet({
            "college-football/rankings": {"rankings": [{"name": "AP Top 25", "ranks": [{"team": {"id": "251", "nickname": "Texas"}}]}]},
            "college-football/scoreboard?dates=20261010": {"events": [
                ev("c1", "2026-10-10T19:00Z", "Texas", "Oklahoma", tid_away="251", tid_home="9"),
                ev("c2", "2026-10-10T16:00Z", "Rice", "Navy", tid_away="242", tid_home="2426"),
            ]},
            "college-football/scoreboard?dates=20261011": {"events": []},
        })
        out = job.collect_ncaa(getter, days)
        self.assertEqual(len(out), 1)
        self.assertIn("Texas", out[0]["rival"])

    def test_mlb_national_tv_not_radio(self):
        days = ["2026-10-06"]
        getter = FakeGet({
            "statsapi.mlb.com": {"dates": [{"date": "2026-10-06", "games": [{
                "gamePk": 77,
                "gameDate": "2026-10-06T17:10:00Z",
                "status": {"detailedState": "Scheduled"},
                "teams": {
                    "away": {"team": {"name": "Milwaukee Brewers"}},
                    "home": {"team": {"name": "New York Mets"}},
                },
                "broadcasts": [
                    {"type": "AM", "isNational": True, "name": "ESPN Radio"},
                    {"type": "TV", "isNational": False, "name": "Bally"},
                    {"type": "TV", "isNational": True, "name": "TBS/HBO MAX"},
                ],
            }]}]},
        })
        out = job.collect_mlb(getter, days)
        self.assertEqual(out[0]["tv"], "")
        self.assertIn("Brewers", out[0]["rival"])

    def test_espn_403_does_not_raise(self):
        now = datetime(2026, 10, 6, 7, 0, tzinfo=ZONE)
        getter = FakeGet({}, status={
            "https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard?dates=20261006": 403,
        })
        # FakeGet status is exact url; easier: raise on soccer
        class Boom(FakeGet):
            def __call__(self, url: str):
                if "esp.1" in url and "esp.w" not in url:
                    raise HTTPError(url, 403, "no", hdrs=HDRS, fp=BytesIO())
                if "rankings" in url:
                    return {"rankings": []}
                if "mlb.com" in url:
                    return {"dates": []}
                return {"events": []}
        payload = job.build_payload(now, Boom({}))
        self.assertEqual(payload["fuentes"]["esp.1"], "403")
        self.assertNotIn("esp.w.1", payload["fuentes"])
        self.assertEqual(payload["fuentes"]["wec"], "omitido")
        self.assertEqual(payload["partidos"], [])
        self.assertEqual(payload["schema_version"], 1)
        self.assertNotIn("hoy", payload)

    def test_html_gate_and_no_emails(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        js = (ROOT / "app.js").read_text(encoding="utf-8")
        py = (ROOT / "deporte_job.py").read_text(encoding="utf-8")
        self.assertIn("deporte-build: 20261003c", html)
        self.assertIn("casa-star", html)
        self.assertIn("★", html)
        self.assertIn("En ventana", html)
        self.assertIn("Fuera de ventana", html)
        self.assertIn("Sin sesión no hay partidos", html)
        self.assertIn('id="app"', html)
        self.assertIn("Creado por Álvaro GT y sus minions", html)
        self.assertNotIn("@gmail.com", html)
        self.assertNotIn("@gmail.com", js)
        self.assertNotIn("Homer", py)
        self.assertNotIn("go_sports", py)
        self.assertNotIn("esp.w.1", py)
        self.assertNotIn("femenino", py)


if __name__ == "__main__":
    unittest.main()
