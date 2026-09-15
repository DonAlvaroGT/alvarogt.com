import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
JS = (ROOT / "app.js").read_text(encoding="utf-8")
MANIFEST = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))


class CasaShellTests(unittest.TestCase):
    def test_gate_copy_and_no_iframe_until_touch(self):
        self.assertIn('id="gate"', HTML)
        self.assertRegex(HTML, r'id="shell"[^>]*hidden')
        self.assertIn('id="scroller"', HTML)
        self.assertNotRegex(HTML, r"<iframe\b")
        self.assertIn("Continuar con Google", HTML)
        self.assertIn("Entra aquí, dentro del icono. Lo de Safari no vale.", HTML)
        self.assertIn('id="session-overlay"', HTML)
        self.assertIn("Sesión caducada · Entrar de nuevo", HTML)
        self.assertIn('id="session-reenter"', HTML)

    def test_tab_bar_and_viewport(self):
        self.assertIn("Go", HTML)
        self.assertIn("Tablón", HTML)
        self.assertIn("Viajes", HTML)
        self.assertIn('data-view="go"', HTML)
        self.assertIn('data-view="tablon"', HTML)
        self.assertIn('data-view="viajes"', HTML)
        self.assertIn("viewport-fit=cover", HTML)
        self.assertIn("apple-mobile-web-app-capable", HTML)
        self.assertIn("/casa/manifest.json", HTML)
        self.assertIn("/casa/apple-touch-icon.png", HTML)
        self.assertIn("env(safe-area-inset-bottom", HTML)
        self.assertIn("env(safe-area-inset-top", HTML)
        self.assertIn("aria-selected", HTML)

    def test_adult_allowlist_only(self):
        self.assertIn("'agarciatimon@gmail.com'", JS)
        self.assertIn("'luzolivas@gmail.com'", JS)
        self.assertNotIn("'isabelgarciatimon@gmail.com'", JS)
        self.assertNotIn("'garciatimon@gmail.com'", JS)
        self.assertNotIn("'agustingarciayperez@gmail.com'", JS)
        self.assertNotIn("'agustingarciatimon@gmail.com'", JS)
        self.assertNotIn("'alvarogt@alvarogt.com'", JS)

    def test_login_on_parent_not_iframe(self):
        self.assertIn("signInWithPopup", JS)
        self.assertIn("signInWithRedirect", JS)
        self.assertIn("getRedirectResult", JS)
        self.assertIn("browserLocalPersistence", JS)
        self.assertIn("showShell", JS)
        self.assertIn("'/go/'", JS)
        self.assertIn("'/tablon/'", JS)
        self.assertIn("'/viajes/'", JS)
        self.assertIn("window.__casaAuth", JS)
        self.assertIn("frame-size", JS)
        self.assertIn("-webkit-overflow-scrolling: touch", HTML)
        self.assertNotIn("run.app", JS)
        self.assertNotIn("run.app", HTML)
        self.assertNotIn("select_account", JS)
        self.assertIn("login_hint", JS)
        self.assertIn("navigator.standalone", JS)
        self.assertNotIn("authDomain", JS)

    def test_lazy_iframes_overlay_resume(self):
        self.assertIn("createElement('iframe')", JS)
        self.assertIn("display = 'none'", JS)
        self.assertIn("pageshow", JS)
        self.assertIn("visibilitychange", JS)
        self.assertIn("showExpiredOverlay", JS)
        self.assertIn("resumeActiveIfDead", JS)
        self.assertIn("about:blank", JS)
        self.assertNotIn("frame.src = 'about:blank'", JS)
        self.assertNotIn('frame.src = "about:blank"', JS)

    def test_does_not_copy_the_three_apps(self):
        self.assertNotIn("casaDoc", JS)
        self.assertNotIn("Agenda deportiva", HTML)
        self.assertNotIn("Tablón Familiar", HTML)
        self.assertNotIn("monthOffset", JS)
        self.assertNotIn("serviceWorker", JS)
        self.assertNotIn("service-worker", JS)
        self.assertNotIn("pushManager", JS)

    def test_manifest(self):
        self.assertEqual(MANIFEST["name"], "Casa")
        self.assertEqual(MANIFEST["display"], "standalone")
        self.assertEqual(MANIFEST["start_url"], "/casa/")
        self.assertEqual(MANIFEST["scope"], "/")
        srcs = {icon["src"] for icon in MANIFEST["icons"]}
        self.assertIn("/casa/icons/icon-192.png", srcs)
        self.assertIn("/casa/icons/icon-512.png", srcs)
        for rel in ("icons/icon-192.png", "icons/icon-512.png", "apple-touch-icon.png"):
            path = ROOT / rel
            self.assertTrue(path.is_file(), rel)
            self.assertGreater(path.stat().st_size, 100)


if __name__ == "__main__":
    unittest.main()
