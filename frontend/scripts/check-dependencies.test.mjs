import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revisar } from './check-dependencies.mjs';

const via = { url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm', dependency: 'braces' };
const report = vulnerabilities => ({ auditReportVersion: 2, vulnerabilities });
test('acepta informes limpios y muestra la cadena conocida solo en desarrollo', () => {
  assert.equal(revisar(report({}), true), 0);
  assert.equal(revisar(report({ braces: { via: [via] }, micromatch: { via: ['braces'] } })), 2);
});
test('rechaza la alerta conocida si llega a producción', () => {
  assert.throws(() => revisar(report({ braces: { via: [via] } }), true));
});
test('rechaza nuevos avisos incluso dentro de un paquete conocido', () => {
  assert.throws(() => revisar(report({ braces: { via: [via, { ...via, url: 'https://github.com/advisories/nuevo' }] } })));
  assert.throws(() => revisar(report({ paquete: { via: [via] } })));
});
test('rechaza errores, cadenas incompletas y ciclos', () => {
  for (const item of [{}, { error: 'network' }, report({ micromatch: { via: ['braces'] } }), report({ braces: { via: ['micromatch'] }, micromatch: { via: ['braces'] } })])
    assert.throws(() => revisar(item));
});
