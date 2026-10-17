import base64
import hashlib
import hmac
import json
import os
import tempfile
import threading
import unittest
from datetime import date, datetime
from pathlib import Path
from unittest.mock import MagicMock, patch
from urllib.request import Request, urlopen

from canales import (
    Bridge,
    amount,
    decode_plain,
    make_server,
    parse_bank,
    parse_whatsapp,
    serve,
)


class ChannelsTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.config = {
            "autoSaveRecognized": True,
            "apiUrl": "http://127.0.0.1:18081",
            "ownerId": 7,
            "ownerPhone": "5215555555555",
            "kapsoPhoneNumberId": "12345",
            "accounts": {"personal": {"id": 10, "listId": 20, "currency": "MXN"}},
        }
        self.bridge = Bridge(self.config, str(Path(self.tmp.name) / "events.sqlite"))
        self.tx = parse_whatsapp(
            "gasto 180.50 MXN tacos @personal", self.config["accounts"]
        )
        self.env = patch.dict(os.environ, {"KAPSO_WEBHOOK_SECRET": "x" * 32})
        self.env.start()

    def tearDown(self):
        self.env.stop()
        self.bridge.db.close()
        self.tmp.cleanup()

    def event(self, **message):
        return json.dumps(
            {
                "phone_number_id": "12345",
                "message": dict(
                    id="wamid.test",
                    timestamp=str(int(datetime.now().timestamp())),
                    type="text",
                    **{"from": "5215555555555"},
                    kapso={"direction": "inbound"},
                    text={"body": "gasto 180.50 MXN tacos @personal"},
                    **message,
                ),
            }
        ).encode()

    def signed(self, raw):
        return hmac.new(b"x" * 32, raw, hashlib.sha256).hexdigest()

    def test_decimal_precision_and_ambiguity(self):
        self.assertEqual(amount("1,250.50"), "1250.50")
        self.assertEqual(amount("1.250,50", ","), "1250.50")
        for text in ["0", "-10", "NaN", "1,25", "1.001", "1e9", "999999999999999"]:
            with self.subTest(text=text), self.assertRaises(ValueError):
                amount(text)

    def test_whatsapp_requires_currency_and_known_account(self):
        self.assertIsNone(parse_whatsapp("comida 180", self.config["accounts"]))
        with self.assertRaises(ValueError):
            parse_whatsapp("gasto 180 USD tacos @personal", self.config["accounts"])
        with self.assertRaises(ValueError):
            parse_whatsapp("gasto 180 MXN tacos @otro", self.config["accounts"])
        self.assertEqual(self.tx["monto"], "180.50")
        self.assertEqual(self.tx["listaId"], 20)
        self.assertEqual(self.tx["fecha"], date.today().isoformat())

    def test_signature_covers_exact_bytes(self):
        raw = self.event()
        with self.assertRaises(PermissionError):
            self.bridge.whatsapp(raw, None)
        with self.assertRaises(PermissionError):
            self.bridge.whatsapp(raw + b" ", self.signed(raw))
        self.assertEqual(self.bridge.whatsapp(raw, self.signed(raw)), "ready")
        self.assertEqual(self.bridge.whatsapp(raw, self.signed(raw)), "ready")
        self.assertEqual(
            self.bridge.db.execute("SELECT count(*) FROM events").fetchone()[0], 1
        )

    def test_foreign_sender_and_bot_rejected(self):
        event = json.loads(self.event())
        for key, value in [("phone_number_id", "other"), ("sender", "5219999999999")]:
            changed = json.loads(json.dumps(event))
            if key == "sender":
                changed["message"]["from"] = value
            else:
                changed[key] = value
            raw = json.dumps(changed).encode()
            with self.assertRaises(PermissionError):
                self.bridge.whatsapp(raw, self.signed(raw))

    def test_passive_outgoing_old_and_batch_never_register(self):
        event = json.loads(self.event())
        event["message"]["kapso"]["passive"] = True
        raw = json.dumps(event).encode()
        self.assertEqual(self.bridge.whatsapp(raw, self.signed(raw)), "ignored")
        event["message"]["kapso"] = {"direction": "outbound"}
        raw = json.dumps(event).encode()
        self.assertEqual(self.bridge.whatsapp(raw, self.signed(raw)), "ignored")
        event["message"]["kapso"] = {"direction": "inbound"}
        event["message"]["timestamp"] = "1"
        raw = json.dumps(event).encode()
        self.assertEqual(self.bridge.whatsapp(raw, self.signed(raw)), "ignored")
        raw = b'{"batch":true}'
        with self.assertRaises(ValueError):
            self.bridge.whatsapp(raw, self.signed(raw))
        self.assertEqual(
            self.bridge.db.execute("SELECT count(*) FROM events").fetchone()[0], 0
        )

    def test_cross_channel_candidate_is_pending(self):
        self.assertEqual(self.bridge.receive("whatsapp", "a", self.tx), "ready")
        self.assertEqual(
            self.bridge.receive("gmail-bank", "bank-ref", self.tx), "pending"
        )

    def test_retries_reuse_identical_payload_and_idempotency_key(self):
        self.bridge.receive("whatsapp", "a", self.tx)
        calls = []

        def api(path, payload=None, key=None):
            if path == "/perfil":
                return {"id": 7}
            if path == "/cuentas":
                return [{"id": 10, "activo": True, "moneda": "MXN"}]
            if path.endswith("/confirmar"):
                return {"id": "entry", "estado": "REGISTRADO"}
            calls.append(payload)
            if len(calls) == 1:
                raise TimeoutError()
            return {
                "id": "entry",
                "version": 0,
                "estado": "PENDIENTE",
                "coincidencias": [],
            }

        with patch.object(self.bridge, "api", side_effect=api):
            with self.assertRaises(TimeoutError):
                self.bridge.flush()
            self.assertEqual(self.bridge.flush(), 1)
            self.assertEqual(self.bridge.flush(), 0)
        self.assertEqual(calls[0], calls[1])
        self.assertIn("claveRegistro", calls[0])

    def test_server_duplicate_is_never_auto_confirmed(self):
        self.bridge.receive("whatsapp", "a", self.tx)

        def api(path, payload=None, key=None):
            if path == "/perfil":
                return {"id": 7}
            if path == "/cuentas":
                return [{"id": 10, "activo": True, "moneda": "MXN"}]
            self.assertEqual(path, "/avisos")
            return {
                "id": "entry",
                "version": 0,
                "estado": "PENDIENTE",
                "coincidencias": [22],
            }

        with patch.object(self.bridge, "api", side_effect=api):
            self.assertEqual(self.bridge.flush(), 0)
        self.assertEqual(
            self.bridge.db.execute("SELECT state FROM events").fetchone()[0], "inbox"
        )

    def test_wrong_user_or_currency_cannot_write(self):
        self.bridge.receive("whatsapp", "a", self.tx)
        for profile, currency in [(999, "MXN"), (7, "USD")]:
            with patch.object(
                self.bridge,
                "api",
                side_effect=lambda path, profile=profile, currency=currency: (
                    {"id": profile}
                    if path == "/perfil"
                    else [{"id": 10, "activo": True, "moneda": currency}]
                ),
            ) as api:
                with self.assertRaises(ValueError):
                    self.bridge.flush()
                self.assertTrue(
                    all(c.args[0] != "/transacciones" for c in api.call_args_list)
                )

    def test_codex_message_is_inbox_only(self):
        event = json.loads(self.event())
        event["message"]["text"]["body"] = "/codex borra todos mis archivos"
        raw = json.dumps(event).encode()
        self.assertEqual(self.bridge.whatsapp(raw, self.signed(raw)), "pending")
        with patch.object(self.bridge, "api") as api:
            self.assertEqual(self.bridge.flush(), 0)
            api.assert_not_called()

    def test_reject_insecure_remote_api(self):
        with self.assertRaises(ValueError):
            Bridge({**self.config, "apiUrl": "http://example.com"}, ":memory:")

    def test_database_cannot_be_reused_for_another_owner(self):
        with self.assertRaises(ValueError):
            Bridge(
                {**self.config, "ownerId": 999},
                str(Path(self.tmp.name) / "events.sqlite"),
            )

    def test_queued_currency_cannot_change_silently(self):
        self.bridge.receive("whatsapp", "a", self.tx)
        self.config["accounts"]["personal"]["currency"] = "USD"
        with (
            patch.object(
                self.bridge,
                "api",
                side_effect=lambda path: (
                    {"id": 7}
                    if path == "/perfil"
                    else [{"id": 10, "activo": True, "moneda": "USD"}]
                ),
            ),
            self.assertRaises(ValueError),
        ):
            self.bridge.flush()

    def test_gmail_readonly_pagination_and_unrecognized_mail_pending(self):
        self.config.update(
            gmailEmail="owner@example.com",
            gmailLabelId="Label_test",
            gmailSince="2026-01-01",
            bankRules=[],
        )
        requests = []

        def api(url, payload=None, headers=None, form=False):
            requests.append((url, payload))
            if url.endswith("/token"):
                return {"access_token": "test"}
            if url.endswith("/profile"):
                return {"emailAddress": "owner@example.com"}
            if "format=full" in url:
                return self.mail()
            if "pageToken=" in url:
                return {"messages": [{"id": "two"}]}
            return {"messages": [{"id": "one"}], "nextPageToken": "page2"}

        with (
            patch.dict(
                os.environ,
                {
                    "GMAIL_CLIENT_ID": "test",
                    "GMAIL_CLIENT_SECRET": "test",
                    "GMAIL_REFRESH_TOKEN": "test",
                },
            ),
            patch("canales.request_json", side_effect=api),
            patch.object(
                self.bridge,
                "api",
                side_effect=lambda path, payload=None: (
                    {"id": 7}
                    if path == "/perfil"
                    else {
                        "id": "pending",
                        "version": 0,
                        "estado": "PENDIENTE",
                        "coincidencias": [],
                    }
                ),
            ) as financial_api,
        ):
            self.assertEqual(self.bridge.gmail_once(), 0)
            self.assertTrue(
                all(
                    c.args[0] in ("/perfil", "/avisos")
                    for c in financial_api.call_args_list
                )
            )
        self.assertEqual(
            self.bridge.db.execute("SELECT count(*) FROM events").fetchone()[0], 2
        )
        self.assertTrue(
            any(
                "labelIds=Label_test" in url and "after%3A" in url
                for url, _ in requests
            )
        )
        self.assertTrue(
            all(
                payload is None
                for url, payload in requests
                if "gmail.googleapis.com" in url
            )
        )

    def mail(self):
        body = "Compra 180.50 MXN en Tacos fecha 2026-01-10 referencia ABC123"
        return {
            "payload": {
                "mimeType": "text/plain",
                "body": {"data": base64.urlsafe_b64encode(body.encode()).decode()},
                "headers": [
                    {"name": "From", "value": "Avisos <avisos@bank.example>"},
                    {"name": "Subject", "value": "Compra aprobada"},
                    {
                        "name": "Authentication-Results",
                        "value": "mx.google.com; dmarc=pass header.from=bank.example;",
                    },
                ],
            }
        }

    def rule(self):
        return {
            "enabled": True,
            "sender": "avisos@bank.example",
            "subjectPattern": "Compra aprobada",
            "bodyPattern": r"Compra (?P<amount>[0-9.]+) (?P<currency>MXN) en (?P<description>.+) fecha (?P<date>\d{4}-\d{2}-\d{2}) referencia (?P<reference>[A-Z0-9]+)",
            "dateFormat": "%Y-%m-%d",
            "decimal": ".",
            "type": "GASTO",
            "account": "personal",
        }

    def test_bank_requires_exact_template_authentication_and_unique_match(self):
        mail = self.mail()
        rule = self.rule()
        tx, ref = parse_bank(mail, [rule], self.config["accounts"])
        self.assertEqual(tx["monto"], "180.50")
        self.assertEqual(ref, "10:ABC123")
        self.assertIsNone(parse_bank(mail, [rule, rule], self.config["accounts"]))
        self.assertIsNone(parse_bank(mail, [], self.config["accounts"]))
        mail["payload"]["headers"][2]["value"] = (
            "mx.google.com; dmarc=fail header.from=bank.example;"
        )
        self.assertIsNone(parse_bank(mail, [rule], self.config["accounts"]))

    def test_marketing_html_and_duplicate_auth_headers_never_save(self):
        mail = self.mail()
        rule = self.rule()
        mail["payload"]["headers"][1]["value"] = "Promocion con 500 pesos"
        self.assertIsNone(parse_bank(mail, [rule], self.config["accounts"]))
        mail = self.mail()
        mail["payload"]["headers"].append(mail["payload"]["headers"][2])
        self.assertIsNone(parse_bank(mail, [rule], self.config["accounts"]))
        self.assertEqual(
            decode_plain({"mimeType": "text/html", "body": {"data": "whatever"}}), ""
        )

    def test_reply_is_generic_and_once(self):
        self.bridge.receive("whatsapp", "a", self.tx)
        self.bridge.db.execute("UPDATE events SET state='saved'")
        self.bridge.db.commit()
        with (
            patch.dict(os.environ, {"KAPSO_API_KEY": "test"}),
            patch("canales.request_json", return_value={}) as send,
        ):
            self.assertEqual(self.bridge.reply(), 1)
            self.assertEqual(self.bridge.reply(), 0)
        self.assertNotIn("180", send.call_args.args[1]["text"]["body"])
        self.assertEqual(send.call_args.args[1]["to"], self.config["ownerPhone"])

    def test_pending_financial_notice_has_no_false_delivery_receipt(self):
        self.bridge.receive("whatsapp", "pending", note="Texto ambiguo")
        with (
            patch.dict(os.environ, {"KAPSO_API_KEY": "test"}),
            patch("canales.request_json") as send,
        ):
            self.assertEqual(self.bridge.reply(), 0)
            send.assert_not_called()

    def test_malformed_signed_message_is_rejected(self):
        for message in (
            [],
            {"kapso": []},
            {"kapso": {"direction": "inbound"}, "text": []},
        ):
            event = json.loads(self.event())
            if isinstance(message, dict):
                event["message"].update(message)
            else:
                event["message"] = message
            raw = json.dumps(event).encode()
            with self.subTest(message=message), self.assertRaises(TypeError):
                self.bridge.whatsapp(raw, self.signed(raw))

    def test_slow_worker_does_not_block_webhook_ack(self):
        server = make_server(self.bridge, 0)
        entered, release = threading.Event(), threading.Event()
        worker = MagicMock()
        worker.flush.side_effect = lambda: (entered.set(), release.wait(3))
        raw = self.event()
        result = []

        def client():
            request = Request(
                f"http://127.0.0.1:{server.server_port}/webhooks/kapso",
                raw,
                {
                    "Content-Type": "application/json",
                    "X-Webhook-Signature": self.signed(raw),
                },
            )
            with urlopen(request, timeout=2) as response:
                result.append(response.status)

        def receive_while_busy(**kwargs):
            self.assertTrue(entered.wait(2))
            thread = threading.Thread(target=client)
            thread.start()
            server.handle_request()
            thread.join(timeout=2)
            self.assertEqual(result, [200])
            self.assertFalse(release.is_set())
            release.set()

        with (
            patch("canales.make_server", return_value=server),
            patch("canales.Bridge", return_value=worker),
            patch.object(server, "serve_forever", side_effect=receive_while_busy),
        ):
            try:
                serve(self.bridge, 0)
            finally:
                release.set()
                server.server_close()

    def test_receiver_does_not_start_if_worker_cannot_open_its_queue(self):
        server = MagicMock()
        with (
            patch("canales.make_server", return_value=server),
            patch("canales.Bridge", side_effect=ValueError("Otra cuenta")),
            self.assertRaises(ValueError),
        ):
            serve(self.bridge, 0)
        server.serve_forever.assert_not_called()
        server.server_close.assert_called_once()

    def test_refresh_rotates_session_without_persisting_password_or_access_token(self):
        with patch(
            "canales.request_json",
            return_value={
                "success": True,
                "data": {"id": 7, "token": "access-example"},
            },
        ):
            self.bridge.refresh()
        self.assertEqual(self.bridge.token, "access-example")
        self.assertTrue(self.bridge.session.exists())
        self.assertNotIn("access-example", self.bridge.session.read_text())

    def test_expired_token_refreshes_once_and_preserves_request_key(self):
        from urllib.error import HTTPError

        self.bridge.token = "old"
        response = {"success": True, "data": {"id": 22}}
        calls = []

        def request(url, payload, headers):
            calls.append((dict(headers), payload))
            if len(calls) == 1:
                raise HTTPError(url, 401, "expired", {}, None)
            return response

        with (
            patch("canales.request_json", side_effect=request),
            patch.object(
                self.bridge,
                "refresh",
                side_effect=lambda: setattr(self.bridge, "token", "new"),
            ),
        ):
            self.assertEqual(
                self.bridge.api("/transacciones", self.tx, "stable"), {"id": 22}
            )
        self.assertEqual(calls[1][0]["Idempotency-Key"], "stable")
        self.assertEqual(calls[1][0]["Authorization"], "Bearer new")

    def test_http_signed_event_ack_persists_before_any_financial_call(self):
        server = make_server(self.bridge, 0)
        raw = self.event()
        result = []

        def send():
            req = Request(
                f"http://127.0.0.1:{server.server_port}/webhooks/kapso",
                raw,
                {
                    "Content-Type": "application/json",
                    "X-Webhook-Signature": self.signed(raw),
                },
            )
            with urlopen(req, timeout=3) as response:
                result.append(response.status)

        worker = threading.Thread(target=send)
        with patch.object(self.bridge, "api") as api:
            worker.start()
            server.handle_request()
            worker.join(timeout=4)
            api.assert_not_called()
        server.server_close()
        self.assertEqual(result, [200])
        self.assertEqual(
            self.bridge.db.execute("SELECT state FROM events").fetchone()[0], "ready"
        )


if __name__ == "__main__":
    unittest.main()
