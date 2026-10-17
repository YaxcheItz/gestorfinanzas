import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from whatsapp_setup import checks, initialize, load, online_checks


class SetupTest(unittest.TestCase):
    def test_init_does_not_overwrite_configuration_or_rotate_secret(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            initialize(directory)
            before = (directory / "secrets.private.json").read_bytes()
            initialize(directory)
            self.assertEqual(before, (directory / "secrets.private.json").read_bytes())
            with patch.dict(os.environ, {}, clear=True):
                config = load(directory)
                result = checks(config, directory)
                self.assertFalse(result["owner_id"])
                self.assertFalse(result["accounts"])
                self.assertFalse(result["kapso_key"])
                self.assertTrue(result["webhook_secret"])

    def test_no_arbitrary_environment_variables_loaded(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            initialize(directory)
            (directory / "secrets.private.json").write_text(
                json.dumps({"PATH": "untrusted", "KAPSO_API_KEY": "file"})
            )
            with patch.dict(
                os.environ,
                {"PATH": "original", "KAPSO_API_KEY": "environment"},
                clear=True,
            ):
                load(directory)
                self.assertEqual(os.environ["PATH"], "original")
                self.assertEqual(os.environ["KAPSO_API_KEY"], "environment")

    def test_online_rejects_wrong_owner_before_reading_accounts_or_provider(self):
        bridge = MagicMock()
        bridge.config = {"ownerId": 7}
        bridge.api.return_value = {"id": 8}
        with (
            patch("whatsapp_setup.request_json") as provider,
            self.assertRaises(ValueError),
        ):
            online_checks(bridge)
        provider.assert_not_called()
        bridge.api.assert_called_once_with("/perfil")

    def test_online_only_reads_and_checks_list_permission(self):
        bridge = MagicMock()
        bridge.config = {
            "ownerId": 7,
            "kapsoPhoneNumberId": "123",
            "accounts": {"personal": {"id": 10, "listId": 20, "currency": "MXN"}},
        }
        responses = {
            "/perfil": {"id": 7},
            "/cuentas": [{"id": 10, "activo": True, "moneda": "MXN"}],
            "/listas": [{"id": 20, "rol": "EDITOR", "archivada": False}],
            "/avisos?estado=PENDIENTE&page=0": {"content": []},
        }
        bridge.api.side_effect = lambda path: responses[path]
        with (
            patch.dict(os.environ, {"KAPSO_API_KEY": "test"}),
            patch(
                "whatsapp_setup.request_json", return_value={"id": "123"}
            ) as provider,
        ):
            online_checks(bridge)
        self.assertEqual(provider.call_args.kwargs.keys(), {"headers"})
        responses["/listas"][0]["rol"] = "LECTOR"
        with self.assertRaises(ValueError):
            online_checks(bridge)


if __name__ == "__main__":
    unittest.main()
