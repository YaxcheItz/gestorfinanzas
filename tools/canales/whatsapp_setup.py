"""Local WhatsApp setup and read-only diagnostics. Never prints credentials."""

import argparse
import getpass
import http.cookiejar
import json
import os
import re
import secrets
import sys
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import HTTPCookieProcessor, build_opener

from canales import Bridge, NoRedirect, phone, request_json, serve


def initialize(directory):
    directory.mkdir(parents=True, exist_ok=True)
    config = {
        "apiUrl": "http://127.0.0.1:18081",
        "ownerId": 0,
        "ownerPhone": "",
        "kapsoPhoneNumberId": "",
        "publicWebhookUrl": "",
        "accounts": {},
        "bankRules": [],
        "autoSaveRecognized": True,
        "allAccounts": False,
    }
    values = {
        "config.private.json": config,
        "secrets.private.json": {
            "KAPSO_API_KEY": "",
            "KAPSO_WEBHOOK_SECRET": secrets.token_urlsafe(48),
        },
    }
    for name, value in values.items():
        path = directory / name
        try:
            fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        except FileExistsError:
            continue  # Never replace an existing secret, session or configuration.
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            json.dump(value, stream, indent=2)
            stream.write("\n")


def load(directory):
    config = json.loads(
        (directory / "config.private.json").read_text(encoding="utf-8-sig")
    )
    path = directory / "secrets.private.json"
    if path.exists():
        values = json.loads(path.read_text(encoding="utf-8-sig"))
        for key in ("KAPSO_API_KEY", "KAPSO_WEBHOOK_SECRET"):
            if values.get(key) and not os.environ.get(key):
                os.environ[key] = values[key]
    return config


def checks(config, directory):
    url = urlsplit(config.get("apiUrl", ""))
    target = urlsplit(config.get("publicWebhookUrl", ""))
    accounts = config.get("accounts", {})
    return {
        "api_url": url.scheme in ("http", "https")
        and bool(url.hostname)
        and not any((url.username, url.password, url.query, url.fragment))
        and url.path in ("", "/")
        and (url.scheme == "https" or url.hostname in ("localhost", "127.0.0.1")),
        "owner_id": type(config.get("ownerId")) is int and config["ownerId"] > 0,
        "owner_phone": bool(
            re.fullmatch(r"[1-9]\d{7,14}", phone(config.get("ownerPhone")))
        ),
        "kapso_number": bool(
            re.fullmatch(r"\d+", str(config.get("kapsoPhoneNumberId", "")))
        ),
        "accounts": config.get("allAccounts") is True
        or isinstance(accounts, dict)
        and bool(accounts)
        and all(
            re.fullmatch(r"[a-z0-9_-]+", alias)
            and isinstance(a, dict)
            and type(a.get("id")) is int
            and a["id"] > 0
            and type(a.get("listId")) is int
            and a["listId"] > 0
            and re.fullmatch(r"[A-Z]{3}", str(a.get("currency", "")))
            for alias, a in accounts.items()
        ),
        "auto_save_explicit": type(config.get("autoSaveRecognized")) is bool,
        "kapso_key": bool(os.environ.get("KAPSO_API_KEY")),
        "webhook_secret": len(os.environ.get("KAPSO_WEBHOOK_SECRET", "")) >= 32,
        "kaptal_session": bool(os.environ.get("KAPTAL_API_TOKEN"))
        or (directory / "inbox.sqlite.session").exists(),
        "https_webhook": target.scheme == "https"
        and bool(target.hostname)
        and not any((target.username, target.password, target.query, target.fragment))
        and target.path == "/webhooks/kapso",
    }


def online_checks(bridge):
    profile = bridge.api("/perfil")
    if profile["id"] != bridge.config["ownerId"]:
        raise ValueError("La sesion no pertenece al propietario")
    accounts = {a["id"]: a for a in bridge.api("/cuentas")}
    lists = {a["id"]: a for a in bridge.api("/listas")}
    for a in bridge.config["accounts"].values():
        actual = accounts.get(a["id"], {})
        selected = lists.get(a["listId"], {})
        if not actual.get("activo") or actual.get("moneda") != a["currency"]:
            raise ValueError("Revisa cuenta activa y moneda")
        if (
            not selected
            or selected.get("archivada")
            or selected.get("rol") not in ("PROPIETARIO", "EDITOR")
        ):
            raise ValueError("Revisa lista y permisos de escritura")
    # Provider GET only: no message sends, webhook edits or phone provisioning.
    number = request_json(
        "https://api.kapso.ai/meta/whatsapp/v24.0/"
        + bridge.config["kapsoPhoneNumberId"]
        + "?fields=id",
        headers={"X-API-Key": os.environ["KAPSO_API_KEY"]},
    )
    if str(number.get("id")) != bridge.config["kapsoPhoneNumberId"]:
        raise ValueError("El numero Kapso no coincide")
    bridge.api("/avisos?estado=PENDIENTE&page=0")
    if bridge.config.get("allAccounts"):
        bridge.api("/canales/whatsapp/interpretar", {"texto": "ayuda"})


def connect(config, directory):
    """Bind only the identity proven by a successful local password login."""
    if not checks(config, directory)["api_url"]:
        raise ValueError("URL de Kaptal no valida")
    expected = config.get("ownerEmail", "").strip().casefold()
    if not expected:
        expected = input("Correo de tu cuenta Kaptal: ").strip().casefold()
    password = getpass.getpass("Contrasena de Kaptal (no se guarda): ")
    cookies = http.cookiejar.MozillaCookieJar()
    opener = build_opener(NoRedirect, HTTPCookieProcessor(cookies))
    result = request_json(
        config["apiUrl"].rstrip("/") + "/api/auth/login",
        {"email": expected, "password": password},
        opener=opener,
    )
    data = result.get("data") or {}
    if (
        not result.get("success")
        or data.get("email", "").casefold() != expected
        or type(data.get("id")) is not int
        or data["id"] <= 0
    ):
        raise ValueError("No se pudo verificar tu cuenta")
    if config.get("ownerId") not in (None, 0, data["id"]):
        raise ValueError("La configuracion pertenece a otra cuenta")
    updated = dict(config, ownerId=data["id"], ownerEmail=expected)
    bridge = Bridge(updated, str(directory / "inbox.sqlite"))
    try:
        bridge.cookies, bridge.opener, bridge.token = cookies, opener, data["token"]
        profile = bridge.api("/perfil")
        if (
            profile["id"] != updated["ownerId"]
            or profile["email"].casefold() != expected
        ):
            raise ValueError("La sesion no coincide con tu cuenta")
        temporary = directory / "config.private.tmp"
        fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            json.dump(updated, stream, indent=2)
            stream.write("\n")
        bridge.save_session()
        temporary.replace(directory / "config.private.json")
    finally:
        bridge.db.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "command",
        choices=("init", "key", "doctor", "connect", "login", "serve", "flush"),
    )
    parser.add_argument("--directory", type=Path, default=Path(".local/canales"))
    parser.add_argument("--online", action="store_true")
    parser.add_argument("--port", type=int, default=18765)
    args = parser.parse_args()
    directory = args.directory.resolve()
    if args.command == "init":
        initialize(directory)
        print("Archivos privados preparados; no se reemplazaron valores existentes.")
        return 0
    if args.command == "key":
        path = directory / "secrets.private.json"
        values = json.loads(path.read_text(encoding="utf-8-sig"))
        value = getpass.getpass("Clave del proyecto Kapso (entrada oculta): ").strip()
        if not value:
            raise ValueError("Clave vacia; no se modifico el archivo")
        values["KAPSO_API_KEY"] = value
        path.write_text(json.dumps(values, indent=2) + "\n", encoding="utf-8")
        print("Clave guardada localmente. No se probo ni envio ningun mensaje.")
        return 0
    config = load(directory)
    if args.command == "connect":
        connect(config, directory)
        print(
            "Tu cuenta quedo vinculada. No se guardo la contrasena ni se registro dinero."
        )
        return 0
    status = checks(config, directory)
    if args.command == "doctor":
        for name, valid in status.items():
            print(("OK " if valid else "FALTA ") + name)
        if not all(status.values()):
            return 1
        if not args.online:
            print("Solo comprobacion local; proveedor y entrega HTTPS sin verificar.")
            return 0
    required = ("api_url", "owner_id") if args.command == "login" else tuple(status)
    if not all(status[k] for k in required):
        raise ValueError("Configuracion incompleta; ejecuta doctor antes de continuar")
    bridge = Bridge(config, str(directory / "inbox.sqlite"))
    try:
        if args.command == "login":
            bridge.login()
        elif args.command == "doctor":
            online_checks(bridge)
            print(
                "Lecturas Kaptal/Kapso correctas. Falta validar entrega real del webhook."
            )
        elif args.command == "serve":
            online_checks(bridge)
            serve(bridge, args.port)
        else:
            bridge.process_chats()
            print("Movimientos registrados:", bridge.flush())
    finally:
        bridge.db.close()
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError, KeyError, TypeError):
        print(
            "No se completo la configuracion. Revisa archivos privados, sesion y conectividad; no compartas claves ni logs bancarios.",
            file=sys.stderr,
        )
        sys.exit(1)
