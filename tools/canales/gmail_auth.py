"""Interactive installed-app OAuth. Run only after creating your Google client."""

import argparse
import base64
import hashlib
import json
import os
import secrets
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlsplit

from canales import request_json

SCOPE = "https://www.googleapis.com/auth/gmail.readonly"


def authorization_url(client_id, redirect, state, verifier):
    challenge = (
        base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest())
        .rstrip(b"=")
        .decode()
    )
    return "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(
        {
            "client_id": client_id,
            "redirect_uri": redirect,
            "response_type": "code",
            "scope": SCOPE,
            "access_type": "offline",
            "prompt": "consent",
            "state": state,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
        }
    )


def callback_code(path, state):
    parsed = urlsplit(path)
    query = parse_qs(parsed.query)
    if (
        parsed.path != "/callback"
        or query.get("state") != [state]
        or len(query.get("code", [])) != 1
    ):
        raise ValueError("Respuesta OAuth no valida")
    return query["code"][0]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--client", required=True, help="Google OAuth desktop client JSON"
    )
    parser.add_argument(
        "--output", required=True, help="Private path ending .private.json"
    )
    args = parser.parse_args()
    output = Path(args.output)
    if not output.name.endswith(".private.json") or output.exists():
        raise ValueError("Usa un archivo nuevo terminado en .private.json")
    client = json.loads(Path(args.client).read_text(encoding="utf-8"))["installed"]
    state, verifier = secrets.token_urlsafe(32), secrets.token_urlsafe(64)
    codes = []

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def do_GET(self):
            try:
                codes.append(callback_code(self.path, state))
                status = 200
            except ValueError:
                status = 400
            self.send_response(status)
            self.end_headers()
            self.wfile.write(b"Puedes cerrar esta ventana y volver a la terminal.")

    with HTTPServer(("127.0.0.1", 0), Handler) as server:
        server.timeout = 1
        redirect = f"http://127.0.0.1:{server.server_port}/callback"
        webbrowser.open(
            authorization_url(client["client_id"], redirect, state, verifier)
        )
        deadline = time.monotonic() + 180
        while not codes and time.monotonic() < deadline:
            server.handle_request()
    if not codes:
        raise ValueError("No se completo el consentimiento")
    response = request_json(
        "https://oauth2.googleapis.com/token",
        {
            "code": codes[0],
            "client_id": client["client_id"],
            "client_secret": client["client_secret"],
            "redirect_uri": redirect,
            "grant_type": "authorization_code",
            "code_verifier": verifier,
        },
        form=True,
    )
    if (
        not response.get("refresh_token")
        or SCOPE not in response.get("scope", "").split()
    ):
        raise ValueError("Google no concedio acceso offline de solo lectura")
    data = {
        "client_id": client["client_id"],
        "client_secret": client["client_secret"],
        "refresh_token": response["refresh_token"],
    }
    fd = os.open(output, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as target:
        json.dump(data, target)
    print(
        "Consentimiento guardado localmente. No compartas el archivo de credenciales."
    )


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError):
        raise SystemExit(
            "No se completo OAuth. Revisa cliente, permisos y ruta privada."
        )
