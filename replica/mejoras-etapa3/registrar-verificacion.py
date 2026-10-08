"""Registra evidencia local ya generada; no ejecuta operaciones sobre datos reales."""
import json
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

root = Path(__file__).resolve().parents[2]
artifacts = Path(__file__).resolve().parent

def log(name):
    data = (artifacts / name).read_bytes()
    return data.decode('utf-16' if data.startswith((b'\xff\xfe', b'\xfe\xff')) else 'utf-8', errors='replace')

suites = [ET.parse(path).getroot() for path in (root / 'backend/target/surefire-reports').glob('TEST-*.xml')]
backend = {key: sum(int(suite.attrib[key]) for suite in suites) for key in ('tests', 'failures', 'errors', 'skipped')}
backend['suites'] = len(suites)
assert backend == dict(tests=281, failures=0, errors=0, skipped=0, suites=39), backend
assert 'BUILD SUCCESS' in log('backend-final.log')
frontend = log('frontend-final.log')
assert re.search(r'Test Files\s+24 passed', frontend)
assert re.search(r'Tests\s+198 passed', frontend)
build = log('frontend-build.log')
assert 'Output location:' in build and 'Application bundle generation complete.' in build
size = float(re.search(r'Initial total\s*\|\s*([\d.]+) kB', build).group(1))
browser = json.loads((artifacts / 'browser-checks.json').read_text(encoding='utf-8'))
assert len(browser['resultados']) == 4
for scenario in browser['resultados']:
    assert not scenario['overflow'] and not scenario['errores'] and not scenario['escriturasPersonales']
    assert all(scenario[key] for key in ('invitacionSinVinculo', 'aceptacionConfirmada', 'cancelarNoAcepta',
        'permisosBorrado', 'pagoDirigidoCorrectamente', 'historialConservado', 'historialSoloLectura'))
verification = dict(
    fecha=datetime.now(timezone.utc).isoformat(), backend=backend,
    frontend=dict(tests=198, files=24, failed=0),
    build=dict(success=True, initialKB=size, budgetKB=500, loginCSSExcessBytes=1),
    browser=dict(scenarios=4, api='synthetic', serviceWorkers='blocked', reducedMotion=True),
    limits=['H2; PostgreSQL real no probado', 'Sin cobertura porcentual medida',
        'Consentimiento de vínculos activos anteriores por revisar',
        'Pagos históricos sin autor de solo lectura',
        'UUID de idempotencia para movimientos compartidos pendiente',
        'Sin commit, despliegue ni cambios en producción'],
    caveman=dict(active=True, installed=True, restartRequired=False))
(artifacts / 'verification.json').write_text(json.dumps(verification, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps(verification, ensure_ascii=False))
