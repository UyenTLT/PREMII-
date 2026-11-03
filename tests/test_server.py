import subprocess
import sys
import time
import unittest
from pathlib import Path
from urllib.request import urlopen

class ServerSmokeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.process = subprocess.Popen([sys.executable, str(Path(__file__).resolve().parents[1] / 'server.py'), '--host', '127.0.0.1', '--port', '3099'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(50):
            try:
                with urlopen('http://127.0.0.1:3099/', timeout=1):
                    return
            except OSError:
                time.sleep(.1)
        cls.process.terminate()
        raise RuntimeError('Server failed to start')

    @classmethod
    def tearDownClass(cls):
        cls.process.terminate()
        cls.process.wait(timeout=5)

    def test_questionnaire_and_local_assets_served(self):
        with urlopen('http://127.0.0.1:3099/') as r:
            html = r.read().decode()
            self.assertIn('assessment-form', html)
            self.assertIn('Thermoregulation', html)
            self.assertIn("frame-ancestors 'none'", r.headers['Content-Security-Policy'])
        for path, marker in [('documents.js', 'buildReport'), ('suggestions.js', 'extractSuggestions'), ('i18n.js', 'zh-Hant'), ('app.js', 'schemaVersion'), ('style.css', '.sidebar')]:
            with self.subTest(path=path), urlopen('http://127.0.0.1:3099/' + path) as r:
                self.assertEqual(r.status, 200)
                self.assertIn(marker, r.read().decode())
