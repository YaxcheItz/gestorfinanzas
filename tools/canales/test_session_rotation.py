import http.cookiejar
import tempfile
import threading
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch
from urllib.request import HTTPCookieProcessor

from canales import Bridge


def cookie(value):
    return http.cookiejar.Cookie(
        version=0,
        name="finanzas_refresh",
        value=value,
        port=None,
        port_specified=False,
        domain="127.0.0.1",
        domain_specified=False,
        domain_initial_dot=False,
        path="/api/auth",
        path_specified=True,
        secure=False,
        expires=int(time.time()) + 3600,
        discard=False,
        comment=None,
        comment_url=None,
        rest={},
        rfc2109=False,
    )


class SessionRotationTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.database = str(Path(self.tmp.name) / "queue.sqlite")
        self.config = {"apiUrl": "http://127.0.0.1:18081", "ownerId": 7}
        self.bridge = Bridge(self.config, self.database)
        self.addCleanup(self.bridge.db.close)
        self.current = "refresh-0"
        self.bridge.cookies.set_cookie(cookie(self.current))
        self.bridge.save_session()
        self.server_lock = threading.Lock()
        self.rotations = 0

    def rotate(self, url, payload, *, headers, opener):
        jar = next(
            h.cookiejar for h in opener.handlers if isinstance(h, HTTPCookieProcessor)
        )
        presented = next(c.value for c in jar if c.name == "finanzas_refresh")
        time.sleep(0.02)
        with self.server_lock:
            if presented != self.current:
                raise ValueError(
                    "Reutilizacion de cookie anterior: se revocarian las sesiones"
                )
            self.rotations += 1
            self.current = "refresh-" + str(self.rotations)
            jar.set_cookie(cookie(self.current))
        return {"success": True, "data": {"id": 7, "token": "synthetic-access"}}

    def test_idle_worker_reloads_cookie_rotated_by_doctor(self):
        worker = Bridge(self.config, self.database)
        self.addCleanup(worker.db.close)
        with patch("canales.request_json", side_effect=self.rotate):
            self.bridge.refresh()
            worker.refresh()
        self.assertEqual(self.rotations, 2)
        self.assertEqual(next(iter(worker.cookies)).value, "refresh-2")

    def test_simultaneous_clients_serialize_and_use_latest_cookie(self):
        ready = threading.Barrier(2)

        def refresh_client():
            bridge = Bridge(self.config, self.database)
            try:
                ready.wait(timeout=5)
                bridge.refresh()
            finally:
                bridge.db.close()

        with (
            patch("canales.request_json", side_effect=self.rotate),
            ThreadPoolExecutor(max_workers=2) as executor,
        ):
            futures = [executor.submit(refresh_client) for _ in range(2)]
            for future in futures:
                future.result(timeout=15)
        self.assertEqual(self.rotations, 2)

    def test_new_browser_authorization_does_not_load_revoked_saved_cookie(self):
        self.current = "new-browser-session"
        self.bridge.cookies.set_cookie(cookie(self.current))
        with patch("canales.request_json", side_effect=self.rotate):
            self.bridge.refresh(reload_saved=False)
        loaded = http.cookiejar.MozillaCookieJar()
        loaded.load(str(self.bridge.session), ignore_discard=True)
        self.assertEqual(next(iter(loaded)).value, self.current)

    def test_failed_refresh_releases_lock_and_preserves_saved_cookie(self):
        previous = self.bridge.session.read_bytes()
        with (
            patch("canales.request_json", side_effect=OSError("offline")),
            self.assertRaises(OSError),
        ):
            self.bridge.refresh()
        self.assertEqual(self.bridge.session.read_bytes(), previous)
        with patch("canales.request_json", side_effect=self.rotate):
            self.bridge.refresh()
        self.assertEqual(self.rotations, 1)


if __name__ == "__main__":
    unittest.main()
