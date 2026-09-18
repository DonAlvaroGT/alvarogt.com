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
        self.assertIn("id=\"google-sign-out\"", HTML)
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
        self.assertIn("id=\"gate\"", HTML)
        self.assertIn("id=\"google-sign-in\"", HTML)
        self.assertNotIn("run.app", HTML)


if __name__ == "__main__":
    unittest.main()
