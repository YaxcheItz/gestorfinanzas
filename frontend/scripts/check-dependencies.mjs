import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const known = 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm';
const chain = new Set(['braces', 'chokidar', 'micromatch', 'fast-glob', 'tailwindcss']);

export function revisar(report, production = false) {
  if (report.error || !report.vulnerabilities || report.auditReportVersion !== 2)
    throw new Error('La auditoría no devolvió un informe válido.');
  const entries = Object.entries(report.vulnerabilities);
  if (production && entries.length) throw new Error('Hay vulnerabilidades en dependencias de producción.');
  const accepted = (name, visited = new Set()) => {
    const item = report.vulnerabilities[name];
    if (!chain.has(name) || !item || visited.has(name) || !item.via?.length) return false;
    const next = new Set(visited).add(name);
    return item.via.every(via => typeof via === 'string'
      ? accepted(via, next) : via.url === known && via.dependency === 'braces');
  };
  if (entries.some(([name]) => !accepted(name)))
    throw new Error('La auditoría contiene vulnerabilidades nuevas o ajenas a la cadena conocida de braces.');
  return entries.length;
}

function audit(production) {
  let output;
  try { output = execSync(`npm audit --json${production ? ' --omit=dev' : ''}`, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (error) {
    if (error.status !== 1 || !error.stdout) throw new Error('No se pudo ejecutar npm audit.');
    output = error.stdout;
  }
  return revisar(JSON.parse(output), production);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    audit(true);
    const pending = audit(false);
    console.log('Producción: sin vulnerabilidades conocidas.');
    if (pending) console.warn(`${pending} alertas de desarrollo pendientes, sin parche publicado: ${known}`);
    else console.log('Desarrollo: sin vulnerabilidades conocidas.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
