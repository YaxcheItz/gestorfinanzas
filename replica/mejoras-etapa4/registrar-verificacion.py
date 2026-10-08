"""Resume evidencias locales ya ejecutadas; no modifica datos financieros."""
import json
import re
import subprocess
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

artifacts = Path(__file__).resolve().parent
root = artifacts.parents[1]
def log(name):
    raw=(artifacts/name).read_bytes()
    return raw.decode('utf-16' if raw.startswith((b'\xff\xfe',b'\xfe\xff')) else 'utf-8-sig',errors='replace')
def git(*args):
    return subprocess.check_output(['git',*args],cwd=root,text=True).strip()

suites=[ET.parse(path).getroot() for path in (root/'backend/target/surefire-reports').glob('TEST-*.xml')]
backend={key:sum(int(s.attrib[key]) for s in suites) for key in ('tests','failures','errors','skipped')}
backend['suites']=len(suites)
assert backend==dict(tests=296,failures=0,errors=0,skipped=0,suites=41),backend
assert 'BUILD SUCCESS' in log('backend-final.log')
assert 'Tests run: 281, Failures: 0, Errors: 0' in log('backend-inicial.log')
front=log('frontend-final.log')
assert re.search(r'Test Files\s+24 passed',front)
assert re.search(r'Tests\s+204 passed',front)
assert log('frontend-exit.txt').strip()=='0'
build=log('frontend-build.log')
assert 'Application bundle generation complete.' in build and 'Output location:' in build
assert log('build-exit.txt').strip()=='0'
size=float(re.search(r'Initial total\s*\|\s*([\d.]+) kB',build).group(1))
browser=json.loads(log('browser-checks.json'))
assert log('browser-exit.txt').strip()=='0' and len(browser['resultados'])==4
for result in browser['resultados']:
    assert all(result[key] for key in ('recarga','edicionSinRegistro','reintentoSinDuplicados','descartePersistente','consentimiento','reporteLocal'))
    assert not result['errores'] and not result['overflow']
ci=json.loads(log('ci-remoto.json'))
head=git('rev-parse','HEAD')
assert head==git('rev-parse','origin/develop')=='2f28f3ed105d0c496a69aae704d909962816a921'
assert git('rev-list','--left-right','--count','HEAD...origin/develop')=='0\t0'
assert git('diff','--name-only','origin/main','origin/develop')==''
actual=[run for run in ci if run['head_sha']==head]
assert actual and all(run['conclusion']=='success' for run in actual)
verification=dict(fecha=datetime.now(timezone.utc).isoformat(),
    baseline=dict(branch='develop',head=head,remoteHead=head,initialClean=True,
        main=git('rev-parse','origin/main'),sameFilesMainDevelop=True,ci=actual,backendTests=281),
    backend=backend,frontend=dict(tests=204,files=24,failed=0,exitCode=0),
    build=dict(exitCode=0,initialKB=size,budgetKB=500,loginCSSExcessBytes=1),
    browser=dict(scenarios=4,api='synthetic',serviceWorkers='blocked',reducedMotion=True),
    limits=['H2; PostgreSQL no probado','IA real no llamada','Sin cobertura porcentual medida',
        'Límites de IA por proceso, no distribuidos','Pendientes fuera de respaldo financiero',
        'Retención de resultados por definir; se limpian al borrar cuenta','Cambios nuevos locales, sin commit/push/despliegue'],
    caveman=dict(active=True,restartRequired=False))
(artifacts/'verification.json').write_text(json.dumps(verification,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(verification,ensure_ascii=False))
