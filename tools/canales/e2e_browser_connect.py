"""Synthetic loopback-only browser-code exchange; never uses personal config."""

import contextlib
import http.cookiejar
import io
import json
import os
import tempfile
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.parse import urlsplit

from canales import Bridge
from whatsapp_host import disconnect
from whatsapp_setup import connect


def main():
    fixture = json.loads(os.environ["KAPTAL_E2E_FIXTURE"])
    if urlsplit(fixture["apiUrl"]).hostname not in {"localhost", "127.0.0.1"}:
        raise ValueError("Only a synthetic loopback test is allowed")
    config = {
        "apiUrl": fixture["apiUrl"],
        "ownerEmail": fixture["email"],
        "ownerId": 0,
        "ownerPhone": "5215555555555",
        "kapsoPhoneNumberId": "12345",
        "allAccounts": True,
        "accounts": {},
    }
    original_policy = http.cookiejar.DefaultCookiePolicy
    # Chromium trusts HTTP localhost for Secure cookies. Match that test transport only here.
    # The guard above forbids using this exception for a remote/personal API.
    with (
        tempfile.TemporaryDirectory() as directory,
        patch(
            "http.cookiejar.DefaultCookiePolicy",
            side_effect=lambda: original_policy(secure_protocols=("https", "http")),
        ),
    ):
        path = Path(directory)
        with (
            patch("whatsapp_setup.webbrowser.open", return_value=True),
            patch("whatsapp_setup.getpass.getpass", return_value=fixture["code"]),
            patch(
                "whatsapp_setup.secrets.token_urlsafe", return_value=fixture["verifier"]
            ),
            contextlib.redirect_stdout(io.StringIO()),
        ):
            connect(config, path)
        saved = json.loads((path / "config.private.json").read_text())
        assert saved["ownerId"] == fixture["ownerId"]
        session = (path / "inbox.sqlite.session").read_text()
        assert "finanzas_refresh" in session
        assert fixture["code"] not in session
        assert fixture["verifier"] not in session
        # Reload exactly as the real worker does; refresh uses the saved cookie, not a password.
        with patch.dict(os.environ):
            os.environ.pop("KAPTAL_API_TOKEN", None)
            bridge = Bridge(saved, str(path / "inbox.sqlite"))
            doctor = Bridge(saved, str(path / "inbox.sqlite"))
            try:
                # A doctor runs after an idle worker has loaded the previous cookie.
                # Both must keep working without revoking each other's session.
                assert doctor.api("/perfil")["id"] == fixture["ownerId"]
                assert all(cookie.secure for cookie in bridge.cookies)
                profile = bridge.api("/perfil")
                assert profile["id"] == fixture["ownerId"]
                assert profile["email"] == fixture["email"]
                observer = Bridge(saved, str(path / "inbox.sqlite"))
                try:
                    disconnect(bridge)
                    assert not bridge.session.exists()
                    try:
                        observer.refresh(reload_saved=False)
                        raise AssertionError(
                            "Disconnected cookie must be revoked on the server"
                        )
                    except HTTPError as error:
                        assert error.code == 401
                        error.close()
                finally:
                    observer.db.close()
            finally:
                bridge.db.close()
                doctor.db.close()
    print(
        json.dumps(
            {"browserApproved": True, "sessionReloaded": True, "passwordUsed": False}
        )
    )


if __name__ == "__main__":
    main()
