"""Build the test image first; uses only synthetic data and a temporary Docker volume."""

import json
import subprocess
import time
import urllib.error
import urllib.request
import uuid

name = "kaptal-wa-test-" + uuid.uuid4().hex[:8]
port = None
volume = name + "-data"


def docker(*args):
    r = subprocess.run(["docker", *args], check=False, capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(r.stderr[:1000])
    return r.stdout.strip()


config = {
    "apiUrl": "https://kaptal.example.test",
    "ownerId": 7,
    "ownerPhone": "5215555555555",
    "kapsoPhoneNumberId": "12345",
    "publicWebhookUrl": "https://bridge.example.test/webhooks/kapso",
    "allAccounts": True,
    "accounts": {},
    "autoSaveRecognized": True,
}


def health():
    for _ in range(30):
        try:
            with urllib.request.urlopen(
                "http://127.0.0.1:" + port + "/health", timeout=1
            ) as r:
                if r.status == 200:
                    return
        except (OSError, urllib.error.URLError):
            pass
        time.sleep(0.2)
    raise AssertionError("health did not start")


try:
    docker("volume", "create", volume)
    docker(
        "run",
        "-d",
        "--name",
        name,
        "-p",
        "127.0.0.1::10000",
        "--mount",
        "type=volume,src=" + volume + ",dst=/data",
        "-e",
        "KAPTAL_BRIDGE_CONFIG=" + json.dumps(config),
        "-e",
        "KAPSO_API_KEY=synthetic",
        "-e",
        "KAPSO_WEBHOOK_SECRET=" + "x" * 32,
        "kaptal-whatsapp:test",
    )
    port = docker("port", name, "10000/tcp").rsplit(":", 1)[1]
    health()
    docker("exec", name, "python", "-c", "import os;assert os.getuid()==10001")
    docker(
        "exec",
        name,
        "python",
        "-c",
        "import json;from canales import Bridge;b=Bridge(json.load(open('/data/config.private.json')),'/data/inbox.sqlite');b.receive('test','persistent',note='synthetic');b.db.close()",
    )
    docker("restart", name)
    port = docker("port", name, "10000/tcp").rsplit(":", 1)[1]
    health()
    result = json.loads(docker("exec", name, "python", "whatsapp_host.py", "status"))
    assert result["events"] == {"pending": 1}, result
    print(
        json.dumps(
            {
                "nonRoot": True,
                "health": True,
                "persistentRestart": True,
                "syntheticOnly": True,
            }
        )
    )
finally:
    subprocess.run(["docker", "rm", "-f", name], check=False, capture_output=True)
    subprocess.run(["docker", "volume", "rm", volume], check=False, capture_output=True)
