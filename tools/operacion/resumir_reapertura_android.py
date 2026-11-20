"""Resume las fases anonimas de una sola reapertura de Kaptal."""
import argparse
import json
import re
import sys
from itertools import combinations
from pathlib import Path

HITOS = re.compile(
    r"phase=(primer_plano|web_js|sesion_nativa|entrada|estructura|espera_sesion|"
    r"inicio|inicio_cargando|inicio_datos|inicio_error|apertura_error) elapsed_ms=([0-9]{1,6})"
)
PETICIONES = re.compile(
    r"phase=(renovacion|perfil|listas|resumen) elapsed_ms=([0-9]{1,6}) "
    r"http=(0|[1-5][0-9]{2}) request_ms=([0-9]{1,6})"
)
ARRANQUE = re.compile(r"(TotalTime|WaitTime): ([0-9]{1,8})")
ESTADO_ANDROID = re.compile(r"LaunchState: (COLD|WARM|HOT|UNKNOWN)")
DISPLAYED = re.compile(r"\+(?:([0-9]{1,5})s)?([0-9]{1,5})ms")
PRIMER_PLANO = "phase=primer_plano elapsed_ms=0"


def resumir(captura):
    eventos = captura.get("fases", captura.get("events"))
    if not isinstance(eventos, list) or not eventos or eventos[0] != PRIMER_PLANO:
        raise ValueError("Falta el inicio de la ventana de primer plano")
    if eventos.count(PRIMER_PLANO) != 1:
        raise ValueError("La captura contiene varias ventanas de primer plano")

    hitos = {}
    peticiones = []
    descartadas = 0
    for linea in eventos[1:]:
        hito = HITOS.fullmatch(linea) if isinstance(linea, str) else None
        peticion = PETICIONES.fullmatch(linea) if isinstance(linea, str) else None
        if hito and hito[1] != "primer_plano" and int(hito[2]) <= 300_000:
            hitos.setdefault(hito[1], int(hito[2]))
        elif peticion and int(peticion[4]) <= int(peticion[2]) <= 300_000:
            fin, codigo, duracion = map(int, peticion.groups()[1:])
            peticiones.append({
                "fase": peticion[1], "http": codigo, "duracionMs": duracion,
                "inicioEstimadoMs": fin - duracion, "finMs": fin,
            })
        else:
            descartadas += 1

    solapamientos = []
    for (a, primera), (b, segunda) in combinations(enumerate(peticiones, 1), 2):
        fin = min(primera["finMs"], segunda["finMs"])
        inicio = max(primera["inicioEstimadoMs"], segunda["inicioEstimadoMs"])
        if fin > inicio:
            solapamientos.append({"peticiones": [a, b], "duracionEstimadaMs": fin - inicio})

    visible = hitos.get("inicio_datos")
    respuestas_previas = [
        peticion["finMs"] for peticion in peticiones
        if peticion["fase"] == "resumen" and 200 <= peticion["http"] < 300
        and visible is not None and peticion["finMs"] <= visible
    ]
    return {
        "mismaInstalacionVerificada": (
            captura.get("mismoApkEnUltimoUso") is True
            and captura.get("instalacionVerificada") is True
        ),
        "android": resumir_android(captura),
        "hitosMs": hitos,
        "peticiones": peticiones,
        "solapamientos": solapamientos,
        "ultimoResumenExitosoADatosMs": visible - max(respuestas_previas) if respuestas_previas else None,
        "lineasDescartadas": descartadas,
    }


def resumir_android(captura):
    android = {}
    for linea in captura.get("arranqueAndroid", []):
        if not isinstance(linea, str):
            continue
        medida = ARRANQUE.fullmatch(linea)
        estado = ESTADO_ANDROID.fullmatch(linea)
        if medida:
            nombre = {"TotalTime": "totalMs", "WaitTime": "esperaMs"}[medida[1]]
            android[nombre] = int(medida[2])
        if estado:
            android["estado"] = estado[1]
    for linea in captura.get("displayedLog", []):
        medida = DISPLAYED.fullmatch(linea) if isinstance(linea, str) else None
        if medida:
            android["displayedMs"] = int(medida[1] or 0) * 1000 + int(medida[2])
            break
    return android


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("captura", type=Path, help="Archivo JSON de la reapertura")
    args = cli.parse_args()
    try:
        captura = json.loads(args.captura.read_text(encoding="utf-8-sig"))
        if not isinstance(captura, dict):
            raise ValueError("Se esperaba un objeto JSON")
        resumen = resumir(captura)
    except (OSError, ValueError, TypeError):
        print("No se pudo resumir una ventana valida de reapertura.", file=sys.stderr)
        return 1
    print(json.dumps(resumen, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
