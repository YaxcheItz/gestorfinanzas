import hashlib
import hmac
import json
import os
import tempfile
import threading
import time
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError
from urllib.request import urlopen

from canales import Bridge, make_server
from whatsapp_host import disconnect, prepare, queue_status, retry_response


class OperationsTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.directory = Path(self.tmp.name)
        self.config = {
            "apiUrl": "https://kaptal.example.test",
            "ownerId": 7,
            "ownerPhone": "5215555555555",
            "kapsoPhoneNumberId": "12345",
            "publicWebhookUrl": "https://bridge.example.test/webhooks/kapso",
            "allAccounts": True,
            "accounts": {},
            "autoSaveRecognized": True,
        }
        self.env = patch.dict(
            os.environ, {"KAPSO_API_KEY": "test", "KAPSO_WEBHOOK_SECRET": "x" * 32}
        )
        self.env.start()
        self.bridge = Bridge(self.config, str(self.directory / "inbox.sqlite"))
        self.bridge.api = MagicMock(return_value={"id": 7})

    def tearDown(self):
        self.bridge.db.close()
        self.env.stop()
        self.tmp.cleanup()

    def audio(self, text="gaste 25 en cafe con Nu", sender=None):
        event = {
            "phone_number_id": "12345",
            "message": {
                "id": "wamid.audio",
                "timestamp": str(int(time.time())),
                "type": "audio",
                "from": sender or self.config["ownerPhone"],
                "kapso": {"direction": "inbound", "transcript": {"text": text}},
            },
        }
        raw = json.dumps(event).encode()
        signature = hmac.new(b"x" * 32, raw, hashlib.sha256).hexdigest()
        return self.bridge.whatsapp(raw, signature)

    def test_audio_requires_confirmation_and_same_event_is_not_repeated(self):
        self.audio()
        self.audio()
        with patch("canales.request_json") as network:
            self.bridge.process_audio()
            self.assertEqual(self.bridge.flush(), 0)
        network.assert_not_called()
        self.bridge.api.assert_not_called()
        key, state, response = self.bridge.db.execute(
            "SELECT key,state,response FROM events"
        ).fetchone()
        self.assertEqual(state, "answered")
        self.assertIn("confirmar audio " + key[:8], response)
        self.assertEqual(
            self.bridge.db.execute("SELECT count(*) FROM events").fetchone()[0], 1
        )

    def test_audio_confirmation_freezes_text_through_api_failure_and_restart(self):
        self.audio()
        self.bridge.process_audio()
        key = self.bridge.db.execute("SELECT key FROM events").fetchone()[0]
        self.bridge.receive(
            "whatsapp-chat", "confirmation", note="confirmar audio " + key[:8]
        )
        self.bridge.api.side_effect = [{"id": 7}, OSError("offline")]
        with self.assertRaises(OSError):
            self.bridge.process_chats()
        self.bridge.db.close()
        self.bridge = Bridge(self.config, str(self.directory / "inbox.sqlite"))
        self.bridge.api = MagicMock(
            side_effect=[{"id": 7}, {"tipo": "CONSULTA", "respuesta": "ok"}]
        )
        self.bridge.process_chats()
        self.assertEqual(
            self.bridge.api.call_args.args,
            ("/canales/whatsapp/interpretar", {"texto": "gaste 25 en cafe con Nu"}),
        )
        self.assertEqual(
            self.bridge.db.execute(
                "SELECT state FROM events WHERE source='whatsapp-audio'"
            ).fetchone()[0],
            "confirmed",
        )

    def test_expired_or_cancelled_audio_cannot_be_confirmed(self):
        self.audio()
        self.bridge.process_audio()
        key, raw = self.bridge.db.execute("SELECT key,payload FROM events").fetchone()
        data = json.loads(raw)
        data["expires"] = 0
        with self.bridge.db:
            self.bridge.db.execute("UPDATE events SET payload=?", (json.dumps(data),))
        self.bridge.receive(
            "whatsapp-chat", "expired", note="confirmar audio " + key[:8]
        )
        self.bridge.process_chats()
        self.assertNotIn(
            "/canales/whatsapp/interpretar",
            [c.args[0] for c in self.bridge.api.call_args_list],
        )
        self.assertEqual(self.bridge.flush(), 0)

    def test_audio_from_another_sender_is_rejected_before_persisting(self):
        with self.assertRaises(PermissionError):
            self.audio(sender="5215555555556")
        self.assertEqual(
            self.bridge.db.execute("SELECT count(*) FROM events").fetchone()[0], 0
        )

    def test_cancel_invalidates_audio_without_financial_calls(self):
        self.audio()
        self.bridge.process_audio()
        self.bridge.receive("whatsapp-chat", "cancel", note="cancelar")
        self.bridge.process_chats()
        self.assertEqual(
            self.bridge.db.execute(
                "SELECT state FROM events WHERE source='whatsapp-audio'"
            ).fetchone()[0],
            "cancelled",
        )
        self.assertEqual(self.bridge.flush(), 0)

    def test_disconnect_revokes_remote_cookie_and_keeps_queue(self):
        self.audio()
        self.bridge.session.write_text(
            "# Netscape HTTP Cookie File\nkaptal.example.test\tFALSE\t/\tTRUE\t2147483647\tfinanzas_refresh\tsynthetic\n"
        )
        with patch(
            "whatsapp_host.request_json", return_value={"success": True}
        ) as logout:
            disconnect(self.bridge)
        self.assertEqual(
            logout.call_args.args[0], "https://kaptal.example.test/api/auth/logout"
        )
        self.assertEqual(logout.call_args.kwargs["headers"], {"X-Gestion-Sesion": "1"})
        self.assertFalse(self.bridge.session.exists())
        self.assertEqual(
            self.bridge.db.execute("SELECT count(*) FROM events").fetchone()[0], 1
        )

    def test_failed_revocation_does_not_remove_session(self):
        self.bridge.session.write_text(
            "# Netscape HTTP Cookie File\nkaptal.example.test\tFALSE\t/\tTRUE\t2147483647\tfinanzas_refresh\tsynthetic\n"
        )
        with (
            patch("whatsapp_host.request_json", side_effect=OSError),
            self.assertRaises(OSError),
        ):
            disconnect(self.bridge)
        self.assertTrue(self.bridge.session.exists())

    def test_delayed_transcript_is_polled_only_from_fixed_provider_and_throttled(self):
        self.audio(text=None)
        with patch(
            "canales.request_json",
            return_value={
                "id": "wamid.audio",
                "from": self.config["ownerPhone"],
                "type": "audio",
                "kapso": {"direction": "inbound"},
            },
        ) as network:
            self.bridge.process_audio()
            self.bridge.process_audio()
            self.assertEqual(network.call_count, 1)
            self.assertEqual(
                network.call_args.args[0],
                "https://api.kapso.ai/meta/whatsapp/v24.0/12345/messages/wamid.audio",
            )
        self.bridge.api.assert_not_called()

    def test_missing_transcript_expires_without_registering_money(self):
        self.audio(text=None)
        with (
            patch("canales.time.time", return_value=time.time() + 121),
            patch("canales.request_json") as network,
        ):
            self.bridge.process_audio()
        network.assert_not_called()
        self.assertIn(
            "No pude obtener",
            self.bridge.db.execute("SELECT response FROM events").fetchone()[0],
        )
        self.assertEqual(self.bridge.flush(), 0)

    def test_ambiguous_send_is_not_retried_or_reported_as_sent(self):
        self.audio()
        self.bridge.process_audio()
        with (
            patch("canales.request_json", side_effect=TimeoutError),
            self.assertRaises(TimeoutError),
        ):
            self.bridge.reply()
        self.assertEqual(queue_status(self.bridge)["responsesUncertain"], 1)
        with patch("canales.request_json") as network:
            self.assertEqual(self.bridge.reply(), 0)
        network.assert_not_called()
        key = self.bridge.db.execute("SELECT key FROM events").fetchone()[0]
        with self.assertRaises(ValueError):
            retry_response(self.bridge, key, False)
        retry_response(self.bridge, key, True)
        with patch("canales.request_json", return_value={}):
            self.assertEqual(self.bridge.reply(), 1)
        self.assertEqual(queue_status(self.bridge)["responsesUncertain"], 0)

    def test_reply_outside_service_window_is_not_sent(self):
        self.audio()
        self.bridge.process_audio()
        with (
            patch("canales.time.time", return_value=time.time() + 86401),
            patch("canales.request_json") as network,
        ):
            self.assertEqual(self.bridge.reply(), 0)
        network.assert_not_called()
        self.assertEqual(
            self.bridge.db.execute("SELECT replied FROM events").fetchone()[0], -2
        )

    def test_host_reuses_disk_and_rejects_other_owner(self):
        with patch.dict(os.environ, {"KAPTAL_BRIDGE_CONFIG": json.dumps(self.config)}):
            self.assertEqual(prepare(self.directory), self.config)
            self.assertEqual(prepare(self.directory), self.config)
        with (
            patch.dict(
                os.environ,
                {"KAPTAL_BRIDGE_CONFIG": json.dumps(dict(self.config, ownerId=8))},
            ),
            self.assertRaises(ValueError),
        ):
            prepare(self.directory)

    def test_health_distinguishes_live_worker_from_downstream_outage_without_details(
        self,
    ):
        server = make_server(self.bridge, 0)
        server.worker_alive, server.worker_healthy = True, False

        def get(path):
            result = []

            def client():
                try:
                    with urlopen(
                        f"http://127.0.0.1:{server.server_port}" + path, timeout=2
                    ) as response:
                        result.append((response.status, response.read()))
                except HTTPError as error:
                    result.append((error.code, error.read()))
                    error.close()

            thread = threading.Thread(target=client)
            thread.start()
            server.handle_request()
            thread.join(3)
            return result[0]

        try:
            self.assertEqual(get("/health"), (200, b'{"ok":true}'))
            self.assertEqual(get("/ready"), (503, b'{"ok":false}'))
            self.assertEqual(get("/inbox"), (404, b'{"ok":false}'))
        finally:
            server.server_close()


if __name__ == "__main__":
    unittest.main()
