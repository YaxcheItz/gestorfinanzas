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

const picomatchVia = {
  url: 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf', dependency: 'picomatch',
};
test('solo admite el aviso exacto y sus propagaciones con el backport verificado', () => {
  const affected = report({picomatch:{via:[picomatchVia]},vite:{via:['picomatch']}});
  assert.throws(() => revisar(affected));
  assert.equal(revisar(affected, false, true), 2);
  assert.throws(() => revisar(affected, true, true));
  assert.throws(() => revisar(report({picomatch:{via:[{...picomatchVia,url:'https://github.com/advisories/nuevo'}]}}), false, true));
  assert.throws(() => revisar(report({otro:{via:[picomatchVia]}}), false, true));
  assert.throws(() => revisar(report({vite:{via:['ausente']}}), false, true));
  assert.throws(() => revisar(report({picomatch:{via:['vite']},vite:{via:['picomatch']}}), false, true));
});
test('un segundo aviso en una dependencia cubierta sigue bloqueando', () => {
  assert.throws(() => revisar(report({
    picomatch:{via:[picomatchVia]},
    vite:{via:['picomatch',{url:'https://github.com/advisories/nuevo',dependency:'vite'}]},
  }), false, true));
  assert.throws(() => revisar(report({paquete:{via:[via]}}), false, true));
});
