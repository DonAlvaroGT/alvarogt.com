import json
import unittest
from datetime import date
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).parent))

from skinner_go import build_payload, filter_events, render_day, validate_payload


class GoFlowTests(unittest.TestCase):
    def test_schema_and_two_madrid_dates(self):
        payload = build_payload(date(2026, 9, 6), {"2026-09-06": {"min": 14, "max": 25, "rain_probability": 20}, "2026-09-07": {"min": 13, "max": 24, "rain_probability": None}}, [{"start": "2026-09-07T14:00:00+02:00", "end": "2026-09-07T15:00:00+02:00", "title": "Fútbol Nacho", "location": "Taberna", "calendar": "Familia"}])
        validate_payload(payload)
        self.assertEqual([d["date"] for d in payload["days"]], ["2026-09-06", "2026-09-07"])
        self.assertEqual(payload["timezone"], "Europe/Madrid")
        self.assertEqual(payload["days"][1]["events"][0]["title"], "Fútbol Nacho")

    def test_excludes_trabajo_and_unrelated_events(self):
        events = [{"start": "2026-09-07T08:00:00+02:00", "end": "2026-09-07T09:00:00+02:00", "title": "Reunión Nacho", "location": "", "calendar": "Trabajo"}, {"start": "2026-09-07T10:00:00+02:00", "end": "2026-09-07T11:00:00+02:00", "title": "Dentista", "location": "", "calendar": "Familia"}, {"start": "2026-09-07T12:00:00+02:00", "end": "2026-09-07T13:00:00+02:00", "title": "Fútbol Nacho", "location": "Campo", "calendar": "Familia"}]
        self.assertEqual([e["title"] for e in filter_events(events, {date(2026, 9, 7)})], ["Fútbol Nacho"])

    def test_render_escapes_calendar_text(self):
        html = render_day({"date": "2026-09-06", "min": 10, "max": 20, "rain_probability": 0, "clothes": "largo", "events": [{"title": "<img src=x onerror=alert(1)>", "time": "10:00", "location": "A&B"}]}, "Hoy")
        self.assertNotIn("<img", html)
        self.assertIn("&lt;img", html)
        self.assertIn("A&amp;B", html)

    def test_no_invented_activities_when_no_events(self):
        payload = build_payload(date(2026, 9, 6), {}, [])
        self.assertEqual(payload["days"][0]["events"], [])
        self.assertEqual(payload["days"][1]["events"], [])
        self.assertEqual(payload["days"][0]["empty_label"], "No hay extraescolares apuntadas")
        self.assertNotIn("fútbol", json.dumps(payload, ensure_ascii=False).lower())


if __name__ == "__main__": unittest.main()
