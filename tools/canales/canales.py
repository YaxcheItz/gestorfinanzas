"""Personal Kapso/Gmail bridge. Only explicit, validated records reach Kaptal.

No shell execution, LLM calls, account passwords or third-party dependencies.
Run behind an HTTPS reverse proxy; the listener itself is loopback-only.
"""

import argparse
import base64
import getpass
import hashlib
import hmac
import http.cookiejar
import json
import os
import re
import sqlite3
import sys
import threading
import time
import unicodedata
import uuid
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from email.utils import parseaddr
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode, urlsplit
from urllib.request import (
    HTTPCookieProcessor,
    HTTPRedirectHandler,
    Request,
    build_opener,
)

MAX_BODY = 65536


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None  # Never forward bearer tokens to a redirect target.


def request_json(url, payload=None, headers=None, form=False, opener=None):
    data = (
        None
        if payload is None
        else (urlencode(payload).encode() if form else json.dumps(payload).encode())
    )
    headers = dict(headers or {})
    if data is not None:
        headers["Content-Type"] = (
            "application/x-www-form-urlencoded" if form else "application/json"
        )
    with (opener or build_opener(NoRedirect)).open(
        Request(url, data, headers), timeout=20
    ) as response:
        raw = response.read(2_000_001)
        if len(raw) > 2_000_000:
            raise ValueError("Respuesta demasiado grande")
        return json.loads(raw)


def amount(value, decimal="."):
    grouping = "," if decimal == "." else "."
    if decimal not in (".", ","):
        raise ValueError("Separador decimal no valido")
    if not re.fullmatch(
        r"\d+(?:"
        + re.escape(grouping)
        + r"\d{3})*(?:"
        + re.escape(decimal)
        + r"\d{1,2})?",
        value,
    ):
        raise ValueError("Importe ambiguo")
    try:
        result = Decimal(value.replace(grouping, "").replace(decimal, "."))
    except InvalidOperation as error:
        raise ValueError("Importe no valido") from error
    if not Decimal("0.01") <= result <= Decimal("9999999999999.99"):
        raise ValueError("Importe fuera de rango")
    return format(result, ".2f")


def phone(value):
    return str(value or "").removeprefix("+")


def normalized(value):
    return " ".join(
        "".join(
            c
            for c in unicodedata.normalize("NFD", value.casefold())
            if not unicodedata.combining(c)
        )
        .strip()
        .split()
    )


def transaction(fields, account, currency, source):
    if currency != account["currency"] or fields["type"] not in ("GASTO", "INGRESO"):
        raise ValueError("Moneda o tipo incompatible")
    day = date.fromisoformat(fields["date"])
    if day > date.today():
        raise ValueError("Fecha futura: revisar")
    description = fields["description"].strip()
    if not 1 <= len(description) <= 200:
        raise ValueError("Descripcion no valida")
    return {
        "cuentaId": account["id"],
        "listaId": account["listId"],
        "categoriaId": account.get("categoryId"),
        "tipo": fields["type"],
        "monto": fields["amount"],
        "fecha": day.isoformat(),
        "descripcion": description,
        "notas": "Origen externo: " + source,
        "_currency": currency,
    }


def parse_whatsapp(text, accounts):
    """Currency and account alias are mandatory; never infer a target account."""
    match = re.fullmatch(
        r"(gasto|ingreso) ([0-9.,]+) ([A-Z]{3}) (.{1,200}?) @([a-z0-9_-]+)"
        r"(?: fecha (\d{4}-\d{2}-\d{2}))?",
        text.strip(),
    )
    if not match:
        return None
    kind, value, currency, description, alias, day = match.groups()
    if alias not in accounts:
        raise ValueError("Cuenta desconocida")
    return transaction(
        {
            "type": "GASTO" if kind == "gasto" else "INGRESO",
            "amount": amount(value),
            "date": day or date.today().isoformat(),
            "description": description,
        },
        accounts[alias],
        currency,
        "WhatsApp",
    )


def decode_plain(part):
    """Ignore HTML, attachments and URLs. Do not fetch any mail content remotely."""
    if part.get("filename"):
        return ""
    if part.get("mimeType") == "text/plain":
        raw = part.get("body", {}).get("data", "")
        if len(raw) > MAX_BODY:
            raise ValueError("Correo demasiado grande")
        return base64.urlsafe_b64decode(raw + "=" * (-len(raw) % 4)).decode(
            "utf-8", errors="strict"
        )
    return "\n".join(decode_plain(child) for child in part.get("parts", []))[:MAX_BODY]


def parse_bank(mail, rules, accounts):
    payload = mail.get("payload", {})
    headers = payload.get("headers", [])

    def values(name):
        return [h["value"] for h in headers if h["name"].lower() == name.lower()]

    senders = values("from")
    if len(senders) != 1:
        return None
    sender = parseaddr(senders[0])[1].lower()
    domain = sender.rpartition("@")[2]
    # Gmail adds its result. Ambiguous or duplicated Google auth headers fail closed.
    auth = [
        v for v in values("authentication-results") if v.startswith("mx.google.com;")
    ]
    if len(auth) != 1 or not re.search(r"\bdmarc=pass\b", auth[0]):
        return None
    if not re.search(r"\bheader\.from=" + re.escape(domain) + r"(?=[;\s]|$)", auth[0]):
        return None
    subjects = values("subject")
    if len(subjects) != 1:
        return None
    text = decode_plain(payload).strip()
    matches = []
    for rule in rules:
        if not rule.get("enabled") or sender != rule["sender"].lower():
            continue
        if not re.fullmatch(rule["subjectPattern"], subjects[0]):
            continue
        match = re.fullmatch(rule["bodyPattern"], text, re.DOTALL)
        if not match:
            continue
        data = match.groupdict()
        # A stable bank reference is required to deduplicate separate emails.
        if not data.get("reference") or not data.get("date"):
            continue
        day = datetime.strptime(data["date"], rule["dateFormat"]).date().isoformat()
        tx = transaction(
            {
                "type": rule["type"],
                "amount": amount(data["amount"], rule["decimal"]),
                "date": day,
                "description": data["description"],
            },
            accounts[rule["account"]],
            data["currency"],
            "Gmail",
        )
        matches.append((tx, str(tx["cuentaId"]) + ":" + data["reference"]))
    return matches[0] if len(matches) == 1 else None


class Bridge:
    def __init__(self, config, database):
        if type(config.get("ownerId")) is not int or config["ownerId"] <= 0:
            raise ValueError("Vincula tu cuenta antes de abrir la bandeja")
        self.config = config
        self.database = database
        self.token = os.environ.get("KAPTAL_API_TOKEN")
        self.session = Path(database + ".session")
        self.cookies = http.cookiejar.MozillaCookieJar()
        if self.session.exists():
            self.cookies.load(str(self.session), ignore_discard=True)
        self.opener = build_opener(NoRedirect, HTTPCookieProcessor(self.cookies))
        parsed = urlsplit(config["apiUrl"])
        if parsed.scheme != "https" and not (
            parsed.scheme == "http" and parsed.hostname in ("localhost", "127.0.0.1")
        ):
            raise ValueError("La API requiere HTTPS o loopback")
        if parsed.username or parsed.password or parsed.query or parsed.fragment:
            raise ValueError("URL de API no valida")
        self.db = sqlite3.connect(database)
        self.db.execute(
            "CREATE TABLE IF NOT EXISTS events (key TEXT PRIMARY KEY, source TEXT NOT NULL, "
            "state TEXT NOT NULL, payload TEXT, fingerprint TEXT, result TEXT, replied INTEGER NOT NULL DEFAULT 0)"
        )
        self.db.execute("CREATE TABLE IF NOT EXISTS owner (identity TEXT PRIMARY KEY)")
        if "response" not in {
            c[1] for c in self.db.execute("PRAGMA table_info(events)")
        }:
            self.db.execute("ALTER TABLE events ADD COLUMN response TEXT")
        self.db.execute(
            "CREATE TABLE IF NOT EXISTS chat_context (id INTEGER PRIMARY KEY CHECK(id=1),text TEXT NOT NULL,expires INTEGER NOT NULL)"
        )
        self.db.execute(
            "CREATE TABLE IF NOT EXISTS channel_owner (identity TEXT PRIMARY KEY)"
        )
        if config.get("ownerPhone") and config.get("kapsoPhoneNumberId"):
            binding = json.dumps(
                [phone(config["ownerPhone"]), config["kapsoPhoneNumberId"]]
            )
            old_binding = self.db.execute(
                "SELECT identity FROM channel_owner"
            ).fetchone()
            if old_binding and old_binding[0] != binding:
                self.db.close()
                raise ValueError("Esta cola pertenece a otro telefono o numero Kapso")
            self.db.execute(
                "INSERT OR IGNORE INTO channel_owner VALUES (?)", (binding,)
            )
        identity = json.dumps([config["apiUrl"], config["ownerId"]])
        previous = self.db.execute("SELECT identity FROM owner").fetchone()
        if previous and previous[0] != identity:
            self.db.close()
            raise ValueError("Esta bandeja pertenece a otra cuenta o servidor")
        self.db.execute("INSERT OR IGNORE INTO owner VALUES (?)", (identity,))
        self.db.commit()

    def save_session(self):
        temporary = self.session.with_suffix(".session.tmp")
        # Create with restrictive permissions before writing credential contents.
        fd = os.open(temporary, os.O_CREAT | os.O_WRONLY | os.O_TRUNC, 0o600)
        os.close(fd)
        self.cookies.save(str(temporary), ignore_discard=True)
        temporary.replace(self.session)

    def refresh(self):
        result = request_json(
            self.config["apiUrl"].rstrip("/") + "/api/auth/refresh",
            {},
            headers={"X-Gestion-Sesion": "1"},
            opener=self.opener,
        )
        if not result.get("success") or result["data"]["id"] != self.config["ownerId"]:
            raise ValueError("Sesion no valida para este usuario")
        self.token = result["data"]["token"]
        self.save_session()

    def login(self):
        email = input("Correo de Kaptal: ").strip()
        password = getpass.getpass("Contrasena de Kaptal (no se guarda): ")
        result = request_json(
            self.config["apiUrl"].rstrip("/") + "/api/auth/login",
            {"email": email, "password": password},
            opener=self.opener,
        )
        if not result.get("success") or result["data"]["id"] != self.config["ownerId"]:
            raise ValueError("Cuenta distinta al propietario configurado")
        self.token = result["data"]["token"]
        self.save_session()

    def api(self, path, payload=None, key=None):
        if not self.token:
            self.refresh()
        headers = {"Authorization": "Bearer " + self.token}
        if key:
            headers["Idempotency-Key"] = key
        url = self.config["apiUrl"].rstrip("/") + "/api" + path
        try:
            result = request_json(url, payload, headers)
        except HTTPError as error:
            if error.code != 401:
                raise
            error.close()
            self.refresh()
            headers["Authorization"] = "Bearer " + self.token
            result = request_json(url, payload, headers)
        if not result.get("success"):
            raise ValueError("La API rechazo la operacion")
        return result["data"]

    def receive(self, source, event_id, tx=None, note=None):
        if not event_id or len(event_id) > 512:
            raise ValueError("Identificador externo no valido")
        # Namespace includes the local owner's ID; changing users never reuses a key.
        key = str(
            uuid.uuid5(
                uuid.NAMESPACE_URL,
                f"kaptal:{self.config['ownerId']}:{source}:{event_id}",
            )
        )
        old = self.db.execute("SELECT state FROM events WHERE key=?", (key,)).fetchone()
        if old:
            return old[0]
        fingerprint = None
        state = "pending"
        if tx:
            fingerprint = hashlib.sha256(
                json.dumps(
                    [tx[k] for k in ("cuentaId", "tipo", "monto", "fecha", "_currency")]
                ).encode()
            ).hexdigest()
            duplicate = self.db.execute(
                "SELECT 1 FROM events WHERE fingerprint=?", (fingerprint,)
            ).fetchone()
            state = "pending" if duplicate else "ready"
        payload = json.dumps(
            tx if tx else {"note": str(note or "")[:1200]}, ensure_ascii=False
        )
        # Persist before network I/O. An interrupted send is retried with identical bytes/key.
        with self.db:
            self.db.execute(
                "INSERT INTO events (key,source,state,payload,fingerprint) VALUES (?,?,?,?,?)",
                (key, source, state, payload, fingerprint),
            )
        return state

    def flush(self):
        saved = 0
        rows = self.db.execute(
            "SELECT key,source,state,payload FROM events WHERE state IN ('ready','pending') AND source IN ('whatsapp','whatsapp-chat','gmail-bank','gmail-review') ORDER BY rowid"
        ).fetchall()
        for key, source, state, raw in rows:
            original = json.loads(raw)
            tx = original if "cuentaId" in original else None
            if source == "whatsapp-chat" and tx is None:
                continue
            profile = self.api("/perfil")
            if profile["id"] != self.config["ownerId"]:
                raise ValueError("El token pertenece a otro usuario")
            if tx:
                accounts = self.api("/cuentas")
                actual = next(
                    (a for a in accounts if a["id"] == tx["cuentaId"] and a["activo"]),
                    None,
                )
                expected = (
                    {"currency": actual["moneda"]}
                    if actual
                    and self.config.get("allAccounts")
                    and source == "whatsapp-chat"
                    else next(
                        (
                            a
                            for a in self.config["accounts"].values()
                            if a["id"] == tx["cuentaId"]
                        ),
                        None,
                    )
                )
                if (
                    actual is None
                    or expected is None
                    or actual["moneda"] != expected["currency"]
                    or actual["moneda"] != tx["_currency"]
                ):
                    if source == "whatsapp-chat":
                        with self.db:
                            self.db.execute(
                                "UPDATE events SET state='answered',response=? WHERE key=?",
                                (
                                    "La cuenta ya no esta disponible o cambio de moneda. No se registro dinero; envia el movimiento corregido.",
                                    key,
                                ),
                            )
                        continue
                    raise ValueError("La cuenta cambio: revisar configuracion")
            origen = "WHATSAPP" if source in ("whatsapp", "whatsapp-chat") else "GMAIL"
            body = {
                "origen": origen,
                "identificador": key,
                "claveRegistro": key,
                "resumen": tx["descripcion"]
                if tx
                else "Aviso por revisar desde " + origen,
                "clase": {
                    "GASTO": "COMPRA",
                    "INGRESO": "INGRESO",
                    "TRANSFERENCIA": "TRANSFERENCIA",
                }[tx["tipo"]]
                if tx
                else "SIN_CLASIFICAR",
                "moneda": tx["_currency"]
                if tx
                else profile.get("monedaPredeterminada", "MXN"),
                "datos": {k: v for k, v in tx.items() if not k.startswith("_")}
                if tx
                else None,
            }
            # Keep the original key/payload through retries; the server owns deduplication.
            aviso = self.api("/avisos", body)
            if (
                state == "ready"
                and self.config.get("autoSaveRecognized", False)
                and not aviso["coincidencias"]
                and aviso["estado"] == "PENDIENTE"
            ):
                try:
                    aviso = self.api(
                        "/avisos/" + aviso["id"] + "/confirmar",
                        {"version": aviso["version"], "aceptarPosibleDuplicado": False},
                    )
                except HTTPError as error:
                    if error.code not in (400, 409, 422):
                        raise
                    error.close()  # A rejected confirmation remains a reviewable notice.
            registered = aviso["estado"] == "REGISTRADO"
            with self.db:
                response = None
                if source == "whatsapp-chat":
                    response = (
                        "Movimiento registrado en Kaptal."
                        if registered
                        else "Aviso pendiente en Kaptal; revisalo antes de guardar. Si hay movimientos parecidos, confirma en la app si es otra operacion."
                    )
                self.db.execute(
                    "UPDATE events SET state=?,result=?,response=? WHERE key=?",
                    ("saved" if registered else "inbox", aviso["id"], response, key),
                )
            saved += int(registered)
        return saved

    def process_chats(self):
        """Interpret once, freeze the candidate, then use the existing notices flow."""
        rows = self.db.execute(
            "SELECT key,payload FROM events WHERE source='whatsapp-chat' AND state='pending' ORDER BY rowid"
        ).fetchall()
        for key, raw in rows:
            original = json.loads(raw)
            if "cuentaId" in original:
                continue
            profile = self.api("/perfil")
            if profile["id"] != self.config["ownerId"]:
                raise ValueError("El token pertenece a otro usuario")
            text = original["note"]
            if normalized(text) == "cancelar":
                with self.db:
                    self.db.execute("DELETE FROM chat_context")
                    self.db.execute(
                        "UPDATE events SET state='answered',response=? WHERE key=?",
                        ("Borrador cancelado. No se registro dinero.", key),
                    )
                continue
            context = self.db.execute(
                "SELECT text FROM chat_context WHERE expires>?", (int(time.time()),)
            ).fetchone()
            if context:
                accounts = self.api("/cuentas")
                names = {
                    normalized(a["nombre"]): a["nombre"]
                    for a in accounts
                    if a["activo"]
                }
                selection = normalized(text)
                for prefix in ("con ", "desde ", "cuenta "):
                    selection = selection.removeprefix(prefix)
                if selection in names:
                    text = context[0] + " desde " + names[selection]
            if len(text) > 1200:
                text = original["note"]
            result = self.api("/canales/whatsapp/interpretar", {"texto": text})
            if not isinstance(result, dict) or result.get("tipo") not in {
                "CONSULTA",
                "ACLARACION",
                "PROPUESTA",
            }:
                raise ValueError("La interpretacion no tiene un formato valido")
            proposal = result.get("propuesta")
            with self.db:
                self.db.execute("DELETE FROM chat_context")
                if result.get("contexto"):
                    self.db.execute(
                        "INSERT INTO chat_context VALUES (1,?,?)",
                        (result["contexto"], int(time.time()) + 900),
                    )
                if result["tipo"] == "PROPUESTA" and proposal:
                    proposal["_currency"] = result["moneda"]
                    fingerprint = hashlib.sha256(
                        json.dumps(
                            [
                                proposal[k]
                                for k in (
                                    "cuentaId",
                                    "tipo",
                                    "monto",
                                    "fecha",
                                    "_currency",
                                )
                            ]
                        ).encode()
                    ).hexdigest()
                    duplicate = self.db.execute(
                        "SELECT 1 FROM events WHERE fingerprint=? AND key<>?",
                        (fingerprint, key),
                    ).fetchone()
                    self.db.execute(
                        "UPDATE events SET payload=?,fingerprint=?,state=? WHERE key=?",
                        (
                            json.dumps(proposal),
                            fingerprint,
                            "pending" if duplicate else "ready",
                            key,
                        ),
                    )
                else:
                    response = result["respuesta"]
                    if result.get("sugerencias"):
                        response += "\n" + "\n".join(
                            str(s)[:100] for s in result["sugerencias"][:8]
                        )
                    if result.get("contexto"):
                        response += "\nSi falta la cuenta, responde con su nombre. Tambien puedes enviar el movimiento completo o escribir cancelar. El borrador dura 15 minutos."
                    if len(response) > 3800:
                        response = (
                            response[:3700]
                            + "\nRespuesta abreviada. Consulta el detalle en Kaptal."
                        )
                    self.db.execute(
                        "UPDATE events SET state='answered',response=? WHERE key=?",
                        (response[:3800], key),
                    )

    def reply(self):
        if not os.environ.get("KAPSO_API_KEY"):
            return 0
        sent = 0
        verified = False
        for key, source, state, response in self.db.execute(
            "SELECT key,source,state,response FROM events WHERE replied=0 AND ("
            "(source='whatsapp' AND state IN ('saved','inbox')) OR "
            "(source='whatsapp-chat' AND state IN ('saved','inbox','answered')) OR "
            "(source='codex' AND state='pending'))"
        ).fetchall():
            if source == "whatsapp-chat" and not verified:
                if self.api("/perfil")["id"] != self.config["ownerId"]:
                    raise ValueError("La sesion no pertenece al propietario")
                verified = True
            body = (
                response
                if source == "whatsapp-chat"
                else (
                    "Movimiento registrado en Kaptal."
                    if state == "saved"
                    else "Solicitud recibida para Codex; requiere revisar la bandeja local."
                    if source == "codex"
                    else "Aviso pendiente en la bandeja de Kaptal. Formato automatico: gasto 180.00 MXN comida @personal"
                )
            )
            # At-most-once attempt: an ambiguous send timeout must not spam the user.
            with self.db:
                self.db.execute("UPDATE events SET replied=1 WHERE key=?", (key,))
            request_json(
                "https://api.kapso.ai/meta/whatsapp/v24.0/"
                + self.config["kapsoPhoneNumberId"]
                + "/messages",
                {
                    "messaging_product": "whatsapp",
                    "to": phone(self.config["ownerPhone"]),
                    "type": "text",
                    "text": {"body": body},
                },
                {"X-API-Key": os.environ["KAPSO_API_KEY"]},
            )
            sent += 1
        return sent

    def whatsapp(self, raw, signature):
        secret = os.environ["KAPSO_WEBHOOK_SECRET"]
        if len(secret) < 32:
            raise ValueError(
                "Se requiere un secreto de webhook de al menos 32 caracteres"
            )
        expected = hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
        if (
            not isinstance(signature, str)
            or not re.fullmatch("[a-f0-9]{64}", signature)
            or not hmac.compare_digest(signature, expected)
        ):
            raise PermissionError("Firma no valida")
        event = json.loads(raw)
        if not isinstance(event, dict) or event.get("batch"):
            raise ValueError("Desactiva buffering: se requiere evento individual v2")
        message = event.get("message", {})
        if not isinstance(message, dict) or not isinstance(
            message.get("kapso", {}), dict
        ):
            raise TypeError("Mensaje no valido")
        sender = phone(message.get("from"))
        if event.get("phone_number_id") != self.config["kapsoPhoneNumberId"]:
            raise PermissionError("Numero del bot no permitido")
        if not sender or sender != phone(self.config["ownerPhone"]):
            raise PermissionError("Remitente no permitido")
        if message.get("kapso", {}).get("direction") != "inbound" or message.get(
            "kapso", {}
        ).get("passive"):
            return "ignored"
        timestamp = int(message.get("timestamp", "0"))
        age = datetime.now().timestamp() - timestamp
        if age < -300 or age > 86400:
            return "ignored"  # Do not send replies outside the customer-service window.
        if message.get("type") != "text":
            return self.receive(
                "whatsapp",
                message.get("id"),
                note="Audio u otro medio: revisar en Kapso",
            )
        if not isinstance(message.get("text", {}), dict):
            raise TypeError("Texto no valido")
        text = message.get("text", {}).get("body", "")
        if not isinstance(text, str) or len(text) > 1200:
            raise ValueError("Texto demasiado largo")
        if text.startswith("/codex "):
            return self.receive("codex", message.get("id"), note=text[7:])
        if self.config.get("allAccounts"):
            return self.receive("whatsapp-chat", message.get("id"), note=text)
        try:
            tx = parse_whatsapp(text, self.config["accounts"])
        except ValueError:
            tx = None
        return self.receive(
            "whatsapp", message.get("id"), tx, text if tx is None else None
        )

    def gmail_once(self):
        credentials = {}
        if self.config.get("gmailCredentialsFile"):
            credentials = json.loads(
                Path(self.config["gmailCredentialsFile"]).read_text(encoding="utf-8")
            )
        token = request_json(
            "https://oauth2.googleapis.com/token",
            {
                "client_id": credentials.get("client_id")
                or os.environ["GMAIL_CLIENT_ID"],
                "client_secret": credentials.get("client_secret")
                or os.environ["GMAIL_CLIENT_SECRET"],
                "refresh_token": credentials.get("refresh_token")
                or os.environ["GMAIL_REFRESH_TOKEN"],
                "grant_type": "refresh_token",
            },
            form=True,
        )["access_token"]

        def gmail(path):
            return request_json(
                "https://gmail.googleapis.com/gmail/v1/users/me/" + path,
                headers={"Authorization": "Bearer " + token},
            )

        if (
            gmail("profile")["emailAddress"].lower()
            != self.config["gmailEmail"].lower()
        ):
            raise ValueError("La cuenta Gmail no coincide")
        label = self.config["gmailLabelId"]
        if not label or label in ("INBOX", "UNREAD", "IMPORTANT"):
            raise ValueError("Selecciona una etiqueta exclusiva para avisos bancarios")
        page = None
        since = date.fromisoformat(self.config["gmailSince"]).strftime("%Y/%m/%d")
        while True:
            params = {"labelIds": label, "maxResults": 100, "q": "after:" + since}
            if page:
                params["pageToken"] = page
            result = gmail("messages?" + urlencode(params))
            for item in result.get("messages", []):
                mail = gmail("messages/" + item["id"] + "?format=full")
                try:
                    match = parse_bank(
                        mail, self.config["bankRules"], self.config["accounts"]
                    )
                except (ValueError, KeyError):
                    match = None
                if match:
                    tx, reference = match
                    self.receive("gmail-bank", reference, tx)
                else:
                    self.receive(
                        "gmail-review",
                        item["id"],
                        note="Aviso sin regla validada: revisar en Gmail",
                    )
            page = result.get("nextPageToken")
            if not page:
                break
        return self.flush()


def make_server(bridge, port):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass  # No bodies, headers, phone numbers, tokens or financial details in access logs.

        def do_POST(self):
            status = 200
            self.connection.settimeout(5)
            try:
                if self.path != "/webhooks/kapso":
                    status = 404
                elif (
                    self.headers.get("Transfer-Encoding")
                    or self.headers.get("Content-Type", "").split(";")[0]
                    != "application/json"
                ):
                    status = 415
                else:
                    size = int(self.headers.get("Content-Length", "0"))
                    if not 0 < size <= MAX_BODY:
                        status = 413
                    else:
                        raw = self.rfile.read(size)
                        if len(raw) != size:
                            raise ValueError("Cuerpo incompleto")
                        bridge.whatsapp(raw, self.headers.get("X-Webhook-Signature"))
            except PermissionError:
                status = 401
            except (ValueError, TypeError, KeyError):
                status = 400
            except (OSError, sqlite3.Error):
                status = 503
            self.send_response(status)
            self.end_headers()

    return HTTPServer(("127.0.0.1", port), Handler)


def serve(bridge, port):
    # The receiver persists first; slow provider/API calls cannot block the next ack.
    if len(os.environ.get("KAPSO_WEBHOOK_SECRET", "")) < 32:
        raise ValueError("Configura el secreto de webhook antes de iniciar")
    server = make_server(bridge, port)
    stop = threading.Event()
    ready = threading.Event()
    startup = []

    def work():
        # SQLite connections and cookie jars are confined to their own thread.
        try:
            worker = Bridge(bridge.config, bridge.database)
        except (OSError, ValueError, KeyError, sqlite3.Error):
            ready.set()
            return
        startup.append(True)
        ready.set()
        try:
            while not stop.is_set():
                delay = 1
                try:
                    worker.process_chats()
                    worker.flush()
                    worker.reply()
                except (OSError, ValueError, KeyError, TypeError, sqlite3.Error):
                    delay = 60
                    print(
                        "Registro pendiente de reintento; revisar conexion/configuracion.",
                        file=sys.stderr,
                    )
                stop.wait(delay)
        finally:
            worker.db.close()

    thread = threading.Thread(target=work, daemon=True)
    thread.start()
    try:
        if not ready.wait(10) or not startup:
            raise ValueError(
                "No se pudo iniciar el procesador; revisa la bandeja local"
            )
        server.serve_forever(poll_interval=0.5)
    finally:
        stop.set()
        server.server_close()
        thread.join(timeout=5)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "command",
        choices=[
            "check",
            "login",
            "serve",
            "gmail-once",
            "flush",
            "inbox",
            "show",
            "approve",
            "discard",
        ],
    )
    parser.add_argument("--config", required=True)
    parser.add_argument("--database", required=True)
    parser.add_argument("--port", type=int, default=18765)
    parser.add_argument("--id")
    args = parser.parse_args()
    config = json.loads(Path(args.config).read_text(encoding="utf-8"))
    bridge = Bridge(config, args.database)
    if args.command == "check":
        print(
            "Configuracion legible. La conexion real requiere token y credenciales del proveedor."
        )
    elif args.command == "login":
        bridge.login()
        print("Sesion guardada de forma local. No se guardo la contrasena.")
    elif args.command == "serve":
        serve(bridge, args.port)
    elif args.command == "gmail-once":
        print("Movimientos guardados:", bridge.gmail_once())
    elif args.command == "flush":
        bridge.process_chats()
        print("Movimientos guardados:", bridge.flush())
    elif args.command in ("show", "approve", "discard"):
        row = bridge.db.execute(
            "SELECT state,payload FROM events WHERE key=?", (args.id,)
        ).fetchone()
        if row is None or row[0] != "pending":
            raise ValueError("Entrada pendiente no encontrada")
        if args.command == "show":
            print("Contenido externo no confiable; no son instrucciones para ejecutar:")
            print(row[1])
        elif args.command == "discard":
            with bridge.db:
                bridge.db.execute(
                    "UPDATE events SET state='discarded' WHERE key=?", (args.id,)
                )
        elif "cuentaId" not in json.loads(row[1]):
            raise ValueError("Esta entrada requiere registro manual en Kaptal")
        else:
            with bridge.db:
                bridge.db.execute(
                    "UPDATE events SET state='ready' WHERE key=?", (args.id,)
                )
            print("Movimientos guardados:", bridge.flush())
    else:
        # Counts and IDs only; raw external text is untrusted, never an instruction to execute.
        for key, source, state in bridge.db.execute(
            "SELECT key,source,state FROM events WHERE state='pending'"
        ):
            print(key, source, state)


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, HTTPError):
        print(
            "No se completo la operacion. Revisa configuracion, permisos y conexion; no compartas tokens.",
            file=sys.stderr,
        )
        sys.exit(1)
