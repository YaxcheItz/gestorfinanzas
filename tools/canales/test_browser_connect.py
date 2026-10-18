import base64
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError

from canales import Bridge
from whatsapp_setup import connect


class BrowserConnectTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.directory = Path(self.tmp.name)
        self.config = {
            "apiUrl": "https://kaptal.example.test",
            "ownerEmail": "owner@example.test",
            "ownerId": 0,
            "ownerPhone": "5215555555555",
            "kapsoPhoneNumberId": "12345",
            "accounts": {},
            "allAccounts": True,
        }
        self.auth = {
            "success": True,
            "data": {
                "id": 7,
                "email": "owner@example.test",
                "token": "access-not-persisted",
            },
        }

    def test_browser_binds_expected_owner_with_pkce_without_password(self):
        verifier = "v" * 43
        challenge = (
            base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest())
            .decode()
            .rstrip("=")
        )
        with (
            patch("whatsapp_setup.secrets.token_urlsafe", return_value=verifier),
            patch("whatsapp_setup.webbrowser.open") as browser,
            patch("whatsapp_setup.getpass.getpass", return_value="c" * 43) as prompt,
            patch(
                "whatsapp_setup.request_json",
                side_effect=[{"data": True}, self.auth],
            ) as request,
            patch("canales.request_json", return_value=self.auth),
            patch.object(
                Bridge, "api", return_value={"id": 7, "email": "owner@example.test"}
            ),
        ):
            connect(self.config, self.directory)
        browser.assert_called_once_with(
            "https://kaptal.example.test/vincular-canal#challenge=" + challenge
        )
        self.assertNotIn(verifier, browser.call_args.args[0])
        self.assertIn("codigo", prompt.call_args.args[0])
        self.assertEqual(
            request.call_args_list[1].args[1],
            {"codigo": "c" * 43, "verifier": verifier, "email": "owner@example.test"},
        )
        saved = (self.directory / "config.private.json").read_text()
        self.assertEqual(json.loads(saved)["ownerId"], 7)
        session = (self.directory / "inbox.sqlite.session").read_text()
        for secret in [verifier, "c" * 43, "access-not-persisted"]:
            self.assertNotIn(secret, saved + session)

    def test_wrong_browser_account_never_creates_local_binding(self):
        self.auth["data"]["email"] = "other@example.test"
        with (
            patch("whatsapp_setup.webbrowser.open"),
            patch("whatsapp_setup.getpass.getpass", return_value="c" * 43),
            patch(
                "whatsapp_setup.request_json", side_effect=[{"data": True}, self.auth]
            ),
            self.assertRaises(ValueError),
        ):
            connect(self.config, self.directory)
        self.assertFalse((self.directory / "config.private.json").exists())
        self.assertFalse((self.directory / "inbox.sqlite").exists())

    def test_incomplete_code_cannot_be_sent_as_password(self):
        with (
            patch("whatsapp_setup.webbrowser.open"),
            patch("whatsapp_setup.getpass.getpass", return_value="a-password"),
            patch(
                "whatsapp_setup.request_json", return_value={"data": True}
            ) as request,
            self.assertRaises(ValueError),
        ):
            connect(self.config, self.directory)
        self.assertEqual(request.call_count, 1)
        self.assertFalse((self.directory / "inbox.sqlite").exists())

    def test_unpublished_server_does_not_open_browser_or_prompt(self):
        with (
            patch("whatsapp_setup.webbrowser.open") as browser,
            patch("whatsapp_setup.getpass.getpass") as prompt,
            patch("whatsapp_setup.request_json", return_value={"data": False}),
            self.assertRaises(ValueError),
        ):
            connect(self.config, self.directory)
        browser.assert_not_called()
        prompt.assert_not_called()

    def test_legacy_server_error_explains_deployment_without_prompting(self):
        error = HTTPError("https://test", 500, "Legacy", {}, None)
        self.addCleanup(error.close)
        with (
            patch("whatsapp_setup.webbrowser.open") as browser,
            patch("whatsapp_setup.getpass.getpass") as prompt,
            patch("whatsapp_setup.request_json", side_effect=error),
            self.assertRaisesRegex(ValueError, "frontend y backend"),
        ):
            connect(self.config, self.directory)
        browser.assert_not_called()
        prompt.assert_not_called()

    def test_missing_refresh_cookie_never_reports_a_saved_connection(self):
        error = HTTPError("https://test", 401, "Unauthorized", {}, None)
        self.addCleanup(error.close)
        with (
            patch("whatsapp_setup.webbrowser.open"),
            patch("whatsapp_setup.getpass.getpass", return_value="c" * 43),
            patch(
                "whatsapp_setup.request_json", side_effect=[{"data": True}, self.auth]
            ),
            patch.object(
                Bridge, "api", return_value={"id": 7, "email": "owner@example.test"}
            ),
            patch(
                "canales.request_json",
                side_effect=error,
            ),
            self.assertRaises(HTTPError),
        ):
            connect(self.config, self.directory)
        self.assertFalse((self.directory / "config.private.json").exists())
        self.assertFalse((self.directory / "inbox.sqlite.session").exists())


if __name__ == "__main__":
    unittest.main()
