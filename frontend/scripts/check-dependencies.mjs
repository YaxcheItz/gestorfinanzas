import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { verifyPatchedPicomatch } from './patch-picomatch.mjs';

const known = 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm';
const chain = new Set(['braces', 'chokidar', 'micromatch', 'fast-glob', 'tailwindcss']);
const picomatchAdvisory = 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf';

export function revisar(report, production = false, patchedPicomatch = false) {
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
  const coveredByPatchedPicomatch = (name, visited = new Set()) => {
    const item = report.vulnerabilities[name];
    if (!patchedPicomatch || !item || visited.has(name) || !item.via?.length) return false;
    const next = new Set(visited).add(name);
    return item.via.every(via => typeof via === 'string'
      ? coveredByPatchedPicomatch(via, next)
      : name === 'picomatch' && via.dependency === 'picomatch' && via.url === picomatchAdvisory);
  };
  if (entries.some(([name]) => !accepted(name) && !coveredByPatchedPicomatch(name)))
    throw new Error('La auditoría contiene vulnerabilidades nuevas o sin mitigación verificada.');
  return entries.length;
}

function audit(production) {
  let output;
  try { output = execSync(`npm audit --json${production ? ' --omit=dev' : ''}`, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (error) {
    if (error.status !== 1 || !error.stdout) throw new Error('No se pudo ejecutar npm audit.');
    output = error.stdout;
  }
  const patched = !production && verifyPatchedPicomatch() > 0;
  return revisar(JSON.parse(output), production, patched);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    audit(true);
    const pending = audit(false);
    console.log('Producción: sin vulnerabilidades conocidas.');
    if (pending) console.warn(`${pending} entradas de desarrollo admitidas por el control: braces conocido o picomatch con backport verificado. npm audit conserva los avisos del registro.`);
    else console.log('Desarrollo: sin vulnerabilidades conocidas.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
