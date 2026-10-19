"""Single-owner persistent WhatsApp service. Secrets come from the host environment."""

import argparse
import http.cookiejar
import json
import os
import sqlite3
import sys
from pathlib import Path
from urllib.request import HTTPCookieProcessor, build_opener

from canales import Bridge, NoRedirect, request_json, serve, session_lock
from whatsapp_setup import checks, connect, load


def prepare(directory):
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    path = directory / "config.private.json"
    supplied = os.environ.get("KAPTAL_BRIDGE_CONFIG")
    config = json.loads(supplied) if supplied else load(directory)
    if not isinstance(config, dict):
        raise TypeError("La configuracion debe ser un objeto JSON")
    if path.exists():
        saved = json.loads(path.read_text(encoding="utf-8"))
        for field in ("apiUrl", "ownerId", "ownerPhone", "kapsoPhoneNumberId"):
            if saved.get(field) != config.get(field):
                raise ValueError(
                    "La configuracion no coincide con el propietario del disco"
                )
    status = checks(config, directory)
    if not all(valid for name, valid in status.items() if name != "kaptal_session"):
        raise ValueError("Configuracion del servicio incompleta")
    if not path.exists():
        fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            json.dump(config, stream)
    return config


def queue_status(bridge):
    return {
        "events": dict(
            bridge.db.execute("SELECT state,count(*) FROM events GROUP BY state")
        ),
        "responsesUncertain": bridge.db.execute(
            "SELECT count(*) FROM events WHERE replied=-1"
        ).fetchone()[0],
        "sessionFilePresent": bridge.session.exists(),
    }


def retry_response(bridge, key, acknowledge):
    if not acknowledge:
        raise ValueError(
            "Comprueba la entrega en Kapso y acepta el riesgo de repetir la respuesta"
        )
    with session_lock(Path(bridge.database + ".worker")), bridge.db:
        changed = bridge.db.execute(
            "UPDATE events SET replied=0 WHERE key=? AND replied=-1", (key,)
        ).rowcount
    if changed != 1:
        raise ValueError("No existe una respuesta incierta con esa clave")


def disconnect(bridge):
    # Refuse while a receiver owns the queue; do not revoke a live worker's session.
    with session_lock(Path(bridge.database + ".worker")), session_lock(bridge.session):
        cookies = http.cookiejar.MozillaCookieJar()
        cookies.load(str(bridge.session), ignore_discard=True)
        if not list(cookies):
            raise ValueError("No hay una cookie de sesion para revocar")
        result = request_json(
            bridge.config["apiUrl"].rstrip("/") + "/api/auth/logout",
            {},
            headers={"X-Gestion-Sesion": "1"},
            opener=build_opener(NoRedirect, HTTPCookieProcessor(cookies)),
        )
        if not result.get("success"):
            raise ValueError("No se pudo confirmar la revocacion")
        bridge.session.unlink()
        bridge.cookies.clear()
        bridge.token = None


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "command",
        choices=("serve", "connect", "disconnect", "status", "retry-response"),
    )
    parser.add_argument(
        "--directory",
        type=Path,
        default=Path(os.environ.get("KAPTAL_DATA_DIR", "/data")),
    )
    parser.add_argument("--id")
    parser.add_argument("--accept-duplicate-risk", action="store_true")
    args = parser.parse_args()
    directory = args.directory.resolve()
    config = prepare(directory)
    if args.command == "connect":
        connect(config, directory)
        print("Tu cuenta quedo vinculada.")
        return
    bridge = Bridge(config, str(directory / "inbox.sqlite"))
    try:
        if args.command == "serve":
            # The hosting proxy terminates TLS; local setup remains loopback-only.
            serve(bridge, int(os.environ.get("PORT", "10000")), host="0.0.0.0")
        elif args.command == "status":
            print(json.dumps(queue_status(bridge)))
        elif args.command == "disconnect":
            disconnect(bridge)
            print(
                "Sesion del canal revocada. La cola se conserva; desactiva tambien el webhook en Kapso."
            )
        else:
            retry_response(bridge, args.id, args.accept_duplicate_risk)
            print(
                "Respuesta preparada para reintento. No se repite el movimiento financiero."
            )
    finally:
        bridge.db.close()


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, TypeError, sqlite3.Error):
        print(
            "No se pudo iniciar la operacion. Revisa configuracion, disco y autorizacion; no compartas secretos.",
            file=sys.stderr,
        )
        sys.exit(1)
