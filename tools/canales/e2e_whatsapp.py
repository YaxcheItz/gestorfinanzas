"""Called by Playwright with synthetic fixtures against a loopback-only test API."""

import hashlib
import hmac
import json
import os
import tempfile
from datetime import datetime
from pathlib import Path
from unittest.mock import patch
from urllib.parse import urlsplit

from canales import Bridge, request_json


def main():
    fixture = json.loads(os.environ["KAPTAL_E2E_FIXTURE"])
    url = urlsplit(fixture["apiUrl"])
    assert url.scheme == "http" and url.hostname in ("localhost", "127.0.0.1")
    config = {
        "apiUrl": fixture["apiUrl"],
        "ownerId": fixture["ownerId"],
        "ownerPhone": "5215555555555",
        "kapsoPhoneNumberId": "synthetic-bot",
        "allAccounts": True,
        "autoSaveRecognized": True,
        "accounts": {},
    }
    with (
        tempfile.TemporaryDirectory() as directory,
        patch.dict(
            os.environ,
            {"KAPTAL_API_TOKEN": fixture["token"], "KAPSO_WEBHOOK_SECRET": "x" * 32},
        ),
    ):
        bridge = Bridge(config, str(Path(directory) / "queue.sqlite"))

        def message(identifier, text):
            raw = json.dumps(
                {
                    "phone_number_id": "synthetic-bot",
                    "message": {
                        "id": identifier,
                        "timestamp": str(int(datetime.now().timestamp())),
                        "type": "text",
                        "from": "5215555555555",
                        "kapso": {"direction": "inbound"},
                        "text": {"body": text},
                    },
                }
            ).encode()
            bridge.whatsapp(raw, hmac.new(b"x" * 32, raw, hashlib.sha256).hexdigest())
            bridge.process_chats()
            return bridge.flush()

        initial = bridge.api("/transacciones?size=100")["totalElements"]

        def count():
            return bridge.api("/transacciones?size=100")["totalElements"] - initial

        try:
            assert message("saldo", "saldo") == 0
            answer = bridge.db.execute(
                "SELECT response FROM events WHERE source='whatsapp-chat'"
            ).fetchone()[0]
            assert (
                "Nu prueba: 1000.00 MXN" in answer
                and "Dolares prueba: 20.00 USD" in answer
            )
            assert message("pregunta", "Gast\u00e9 25 en tacos") == 0 and count() == 0
            assert bridge.db.execute("SELECT text FROM chat_context").fetchone()
            assert message("cuenta", "Nu prueba") == 1 and count() == 1
            assert message("cuenta", "Nu prueba") == 0 and count() == 1
            assert (
                message("otra", "Gast\u00e9 25 en tacos con Nu prueba") == 0
                and count() == 1
            )
            assert (
                bridge.db.execute(
                    "SELECT count(*) FROM events WHERE state='inbox'"
                ).fetchone()[0]
                == 1
            )
            assert (
                message("resumen", "\u00bfCu\u00e1nto gast\u00e9 este mes?") == 0
                and count() == 1
            )
            answer = bridge.db.execute(
                "SELECT response FROM events WHERE key=(SELECT key FROM events ORDER BY rowid DESC LIMIT 1)"
            ).fetchone()[0]
            assert "25.00" in answer and "MXN" in answer

            # Only the delivery is mocked. Every financial request above used the real API.
            def delivery(url, *args, **kwargs):
                return (
                    {}
                    if url.startswith("https://api.kapso.ai/")
                    else request_json(url, *args, **kwargs)
                )

            with (
                patch.dict(os.environ, {"KAPSO_API_KEY": "synthetic"}),
                patch("canales.request_json", side_effect=delivery) as send,
            ):
                assert bridge.reply() == 5
                assert bridge.reply() == 0
                deliveries = [
                    c
                    for c in send.call_args_list
                    if c.args[0].startswith("https://api.kapso.ai/")
                ]
                assert len(deliveries) == 5
                assert all(c.args[1]["to"] == "5215555555555" for c in deliveries)

            audio = json.dumps(
                {
                    "phone_number_id": "synthetic-bot",
                    "message": {
                        "id": "audio",
                        "timestamp": str(int(datetime.now().timestamp())),
                        "type": "audio",
                        "from": "5215555555555",
                        "kapso": {
                            "direction": "inbound",
                            "transcript": {"text": "Gaste 7 en cafe con Nu prueba"},
                        },
                    },
                }
            ).encode()
            bridge.whatsapp(
                audio, hmac.new(b"x" * 32, audio, hashlib.sha256).hexdigest()
            )
            bridge.process_audio()
            assert bridge.flush() == 0 and count() == 1
            audio_key = bridge.db.execute(
                "SELECT key FROM events WHERE source='whatsapp-audio'"
            ).fetchone()[0]
            original_api = bridge.api

            def lost_ack(path, *args, **kwargs):
                result = original_api(path, *args, **kwargs)
                if path.endswith("/confirmar"):
                    raise OSError("Synthetic lost acknowledgement after server commit")
                return result

            bridge.api = lost_ack
            try:
                message("confirm-audio", "confirmar audio " + audio_key[:8])
                raise AssertionError("Expected interrupted acknowledgement")
            except OSError:
                pass
            bridge.db.close()
            bridge = Bridge(config, str(Path(directory) / "queue.sqlite"))
            bridge.process_chats()
            bridge.flush()
            assert count() == 2
            assert (
                message("confirm-audio", "confirmar audio " + audio_key[:8]) == 0
                and count() == 2
            )
            assert (
                message("confirm-again", "confirmar audio " + audio_key[:8]) == 0
                and count() == 2
            )
            print(
                json.dumps(
                    {
                        "queriesReadOnly": True,
                        "explicitAccountSavedOnce": True,
                        "duplicatePending": True,
                        "currenciesSeparated": True,
                        "providerSendMocked": True,
                        "audioConfirmedOnce": True,
                        "lostAcknowledgementRecovered": True,
                    }
                )
            )
        finally:
            bridge.db.close()


if __name__ == "__main__":
    main()
