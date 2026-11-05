const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const frontend = path.resolve(__dirname, '..');
function list(database) {
  const env = { ...process.env };
  delete env.E2E_DATABASE_URL;
  if (database !== undefined) env.E2E_DATABASE_URL = database;
  return spawnSync(process.execPath, [path.join(frontend, 'node_modules/@playwright/test/cli.js'),
    'test', 'rendimiento-local.spec.ts', '--list'], { cwd: frontend, env, encoding: 'utf8', timeout: 30000 });
}

test('permite H2 y PostgreSQL local de pruebas sin iniciar servidores', () => {
  for (const url of [undefined, 'jdbc:postgresql://127.0.0.1:5432/kaptal_ci_e2e', 'jdbc:postgresql://localhost/kaptal_ci_e2e']) {
    const result = list(url);
    assert.equal(result.status, 0, result.stderr);
  }
});

test('rechaza destinos no aislados antes de iniciar servidores y no reproduce la URL', () => {
  for (const url of ['jdbc:postgresql://example.invalid:5432/kaptal_ci_e2e',
    'jdbc:postgresql://127.0.0.1:5432/produccion',
    'jdbc:postgresql://127.0.0.1:5432/kaptal_ci_e2e?password=synthetic-secret',
    'jdbc:postgresql://localhost:70000/kaptal_ci_e2e']) {
    const result = list(url);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /E2E_DATABASE_URL/);
    assert.doesNotMatch(result.stderr, /synthetic-secret/);
  }
});
