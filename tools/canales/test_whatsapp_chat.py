import os
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

from canales import Bridge
from whatsapp_setup import checks, connect


class ChatTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.directory = Path(self.tmp.name)
        self.config = {
            "apiUrl": "http://127.0.0.1:18081",
            "ownerId": 7,
            "ownerPhone": "5215555555555",
            "kapsoPhoneNumberId": "12345",
            "allAccounts": True,
            "autoSaveRecognized": True,
            "accounts": {},
        }
        self.bridge = Bridge(self.config, str(self.directory / "inbox.sqlite"))
        self.calls = []
        self.result = {
            "tipo": "CONSULTA",
            "respuesta": "Nu: 1000.00 MXN\nUSD: 20.00 USD",
            "propuesta": None,
            "contexto": None,
            "sugerencias": [],
        }
        self.tx = {
            "cuentaId": 10,
            "tipo": "GASTO",
            "monto": 180.50,
            "fecha": "2026-10-17",
            "descripcion": "tacos",
            "listaId": None,
        }
        self.accounts = [
            {"id": 10, "nombre": "Nu", "moneda": "MXN", "activo": True},
            {"id": 11, "nombre": "USD", "moneda": "USD", "activo": True},
        ]
        self.duplicates = []
        self.bridge.api = self.api

    def tearDown(self):
        self.bridge.db.close()
        self.tmp.cleanup()

    def api(self, path, payload=None, key=None):
        self.calls.append((path, payload))
        if path == "/perfil":
            return {"id": 7}
        if path == "/cuentas":
            return self.accounts
        if path == "/canales/whatsapp/interpretar":
            return self.result
        if path == "/avisos":
            return {
                "id": "aviso",
                "estado": "PENDIENTE",
                "coincidencias": self.duplicates,
                "version": 0,
            }
        if path == "/avisos/aviso/confirmar":
            return {"id": "aviso", "estado": "REGISTRADO"}
        raise AssertionError(path)

    def receive(self, identifier, text):
        self.bridge.receive("whatsapp-chat", identifier, note=text)

    def proposal(self):
        self.result = {
            "tipo": "PROPUESTA",
            "propuesta": dict(self.tx),
            "moneda": "MXN",
            "contexto": None,
        }

    def test_query_is_read_only_and_replay_does_not_recalculate_or_resend(self):
        self.receive("a", "saldo")
        self.bridge.process_chats()
        self.assertEqual(self.bridge.flush(), 0)
        self.receive("a", "saldo")
        self.bridge.process_chats()
        self.assertEqual(
            sum(p == "/canales/whatsapp/interpretar" for p, _ in self.calls), 1
        )
        self.assertFalse(any(p.startswith("/avisos") for p, _ in self.calls))
        with (
            patch.dict(os.environ, {"KAPSO_API_KEY": "test"}),
            patch("canales.request_json", return_value={}) as send,
        ):
            self.assertEqual(self.bridge.reply(), 1)
            self.assertEqual(self.bridge.reply(), 0)
        self.assertIn("1000.00 MXN", send.call_args.args[1]["text"]["body"])
        self.assertEqual(send.call_args.args[1]["to"], "5215555555555")

    def test_clarification_then_account_reply_survives_reload(self):
        self.result = {
            "tipo": "ACLARACION",
            "respuesta": "De que cuenta?",
            "contexto": "Gaste 180 tacos 2026-10-17",
            "propuesta": None,
            "sugerencias": ["Nu", "USD"],
        }
        self.receive("a", "Gaste 180 tacos")
        self.bridge.process_chats()
        self.assertEqual(self.bridge.flush(), 0)
        self.bridge.db.close()
        self.bridge = Bridge(self.config, str(self.directory / "inbox.sqlite"))
        self.bridge.api = self.api
        self.proposal()
        self.receive("b", "Nu")
        self.bridge.process_chats()
        self.assertEqual(
            self.calls[-1],
            (
                "/canales/whatsapp/interpretar",
                {"texto": "Gaste 180 tacos 2026-10-17 desde Nu"},
            ),
        )
        self.assertEqual(self.bridge.flush(), 1)
        self.assertEqual(self.bridge.flush(), 0)
        self.assertEqual(
            next(body for p, body in self.calls if p == "/avisos")["origen"], "WHATSAPP"
        )

    def test_resolved_candidate_is_frozen_across_network_failure(self):
        self.proposal()
        self.receive("a", "Gaste 180 tacos con Nu")
        self.bridge.process_chats()
        with (
            patch.object(self.bridge, "api", side_effect=OSError("offline")),
            self.assertRaises(OSError),
        ):
            self.bridge.flush()
        self.result = {"tipo": "CONSULTA", "respuesta": "changed"}
        self.bridge.process_chats()
        self.bridge.flush()
        self.assertEqual(
            sum(p == "/canales/whatsapp/interpretar" for p, _ in self.calls), 1
        )
        self.assertEqual(
            next(body for p, body in self.calls if p == "/avisos")["datos"]["monto"],
            180.50,
        )

    def test_server_duplicate_requires_review(self):
        self.proposal()
        self.duplicates = [99]
        self.receive("a", "Gaste 180 tacos con Nu")
        self.bridge.process_chats()
        self.assertEqual(self.bridge.flush(), 0)
        self.assertFalse(any(p.endswith("/confirmar") for p, _ in self.calls))
        self.assertEqual(
            self.bridge.db.execute("SELECT state FROM events").fetchone()[0], "inbox"
        )

    def test_local_equal_purchase_also_requires_review(self):
        self.proposal()
        self.receive("a", "Gaste 180 tacos con Nu")
        self.bridge.process_chats()
        self.bridge.flush()
        self.receive("b", "Gaste 180 tacos con Nu")
        self.bridge.process_chats()
        self.assertEqual(self.bridge.flush(), 0)
        self.assertEqual(sum(p.endswith("/confirmar") for p, _ in self.calls), 1)

    def test_expired_context_is_not_combined(self):
        self.bridge.db.execute(
            "INSERT INTO chat_context VALUES (1,?,?)",
            ("old purchase", int(time.time()) - 1),
        )
        self.bridge.db.commit()
        self.receive("a", "Nu")
        self.bridge.process_chats()
        self.assertEqual(
            self.calls[-1], ("/canales/whatsapp/interpretar", {"texto": "Nu"})
        )

    def test_cancel_drops_draft_without_writing_money(self):
        self.bridge.db.execute(
            "INSERT INTO chat_context VALUES (1,?,?)",
            ("old purchase", int(time.time()) + 900),
        )
        self.bridge.db.commit()
        self.receive("a", "cancelar")
        self.bridge.process_chats()
        self.assertEqual(self.bridge.flush(), 0)
        self.assertIsNone(
            self.bridge.db.execute("SELECT * FROM chat_context").fetchone()
        )
        self.assertEqual(self.calls, [("/perfil", None)])

    def test_changed_phone_cannot_reuse_financial_outbox(self):
        with self.assertRaises(ValueError):
            Bridge(
                dict(self.config, ownerPhone="5219999999999"),
                str(self.directory / "inbox.sqlite"),
            )

    def test_dynamic_account_removed_or_currency_changed_blocks_write(self):
        for account in [
            {"id": 10, "nombre": "Nu", "moneda": "USD", "activo": True},
            {"id": 10, "nombre": "Nu", "moneda": "MXN", "activo": False},
        ]:
            self.proposal()
            self.receive(str(account), "Gaste 180 con Nu")
            self.bridge.process_chats()
            self.accounts = [account]
            self.assertEqual(self.bridge.flush(), 0)
        self.assertFalse(any(p == "/avisos" for p, _ in self.calls))

    def test_rejected_confirmation_remains_reviewable_without_blocking_queries(self):
        from urllib.error import HTTPError

        self.proposal()
        self.receive("a", "Gasto 180 con Nu")
        self.bridge.process_chats()
        original = self.bridge.api

        def reject(path, payload=None, key=None):
            if path.endswith("/confirmar"):
                raise HTTPError("http://test", 400, "Review", {}, None)
            return original(path, payload, key)

        self.bridge.api = reject
        self.assertEqual(self.bridge.flush(), 0)
        self.assertEqual(
            self.bridge.db.execute("SELECT state,result FROM events").fetchone(),
            ("inbox", "aviso"),
        )
        self.assertEqual(self.bridge.flush(), 0)

    def test_profile_identity_checked_before_financial_context(self):
        self.receive("a", "saldo")
        with (
            patch.object(self.bridge, "api", return_value={"id": 8}) as api,
            self.assertRaises(ValueError),
        ):
            self.bridge.process_chats()
        api.assert_called_once_with("/perfil")

    def test_cached_financial_answer_is_not_sent_without_valid_owner_session(self):
        self.receive("a", "saldo")
        self.bridge.process_chats()
        with (
            patch.dict(os.environ, {"KAPSO_API_KEY": "test"}),
            patch.object(self.bridge, "api", return_value={"id": 8}),
            patch("canales.request_json") as send,
            self.assertRaises(ValueError),
        ):
            self.bridge.reply()
        send.assert_not_called()
        self.assertEqual(
            self.bridge.db.execute("SELECT replied FROM events").fetchone()[0], 0
        )

    def test_no_candidate_can_bypass_interpretation(self):
        self.receive("a", "Gaste 180")
        self.assertEqual(self.bridge.flush(), 0)
        self.assertEqual(self.calls, [])

    def test_malformed_interpretation_stays_pending_without_financial_write(self):
        self.result = []
        self.receive("a", "saldo")
        with self.assertRaises(ValueError):
            self.bridge.process_chats()
        self.assertEqual(
            self.bridge.db.execute("SELECT state FROM events").fetchone()[0], "pending"
        )
        self.assertFalse(any(path.startswith("/avisos") for path, _ in self.calls))

    def test_dynamic_mode_does_not_require_manual_account_mapping(self):
        self.assertTrue(checks(self.config, self.directory)["accounts"])
        self.assertFalse(
            checks(dict(self.config, allAccounts=False), self.directory)["accounts"]
        )

    def test_unconfigured_owner_cannot_create_a_queue(self):
        target = self.directory / "unconfigured.sqlite"
        with self.assertRaises(ValueError):
            Bridge(dict(self.config, ownerId=0), str(target))
        self.assertFalse(target.exists())

    def test_connect_proves_email_and_does_not_persist_password_or_bearer(self):
        self.bridge.db.close()
        self.config.update(ownerEmail="owner@example.test")
        with (
            patch(
                "canales.request_json",
                return_value={
                    "success": True,
                    "data": {"id": 7, "token": "refreshed-access"},
                },
            ),
            patch("whatsapp_setup.getpass.getpass", return_value="private-password"),
            patch(
                "whatsapp_setup.request_json",
                return_value={
                    "success": True,
                    "data": {
                        "id": 7,
                        "email": "owner@example.test",
                        "token": "secret-access",
                    },
                },
            ),
            patch.object(
                Bridge, "api", return_value={"id": 7, "email": "owner@example.test"}
            ),
        ):
            connect(self.config, self.directory, password_login=True)
        saved = (self.directory / "config.private.json").read_text() + (
            self.directory / "inbox.sqlite.session"
        ).read_text()
        self.assertNotIn("private-password", saved)
        self.assertNotIn("secret-access", saved)
        self.bridge = Bridge(self.config, str(self.directory / "inbox.sqlite"))

    def test_wrong_login_email_never_replaces_binding(self):
        self.config.update(ownerEmail="owner@example.test")
        with (
            patch("whatsapp_setup.getpass.getpass", return_value="private-password"),
            patch(
                "whatsapp_setup.request_json",
                return_value={
                    "success": True,
                    "data": {
                        "id": 8,
                        "email": "other@example.test",
                        "token": "secret-access",
                    },
                },
            ),
            self.assertRaises(ValueError),
        ):
            connect(self.config, self.directory, password_login=True)
        self.assertFalse((self.directory / "config.private.json").exists())


if __name__ == "__main__":
    unittest.main()
