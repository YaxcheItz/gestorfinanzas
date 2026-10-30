// Ejecutar tras npm run build. No usa backend ni datos de usuarios.
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const { mkdirSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const frontend = path.resolve(__dirname, '..');
const origin = 'http://localhost:14324';
const server = spawn(process.execPath, ['e2e/serve-production.mjs'], {
  cwd: frontend, env: { ...process.env, E2E_FRONTEND_PORT: '14324' }, stdio: 'ignore'
});
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const token = exp => `test.${Buffer.from(JSON.stringify({exp})).toString('base64url')}.synthetic`;
const user = {id: 992, nombre: 'Medicion QA', email: 'measurement@example.test'};
const lista = {id: 802, nombre: 'Personal QA', moneda: 'MXN', personal: true, rol: 'PROPIETARIO', miembros: [], archivada: false};
const cases = [
  {name: 'valid', refreshMs: 0, apiMs: 0, cachedList: true},
  {name: 'expired', refreshMs: 2000, apiMs: 0, cachedList: true},
  {name: 'slow-api-no-list-cache', refreshMs: 0, apiMs: 250, cachedList: false},
  {name: 'slow-api-cached-list', refreshMs: 0, apiMs: 250, cachedList: true},
  {name: 'populated-no-list-cache', refreshMs: 0, apiMs: 250, cachedList: false, populated: true}
];

const movements = Array.from({length: 50}, (_, i) => ({id: i + 1, cuentaId: 1,
  cuentaNombre: 'Cuenta ficticia', categoriaId: i % 8 + 1, categoriaNombre: `Categoria ${i % 8 + 1}`,
  tipo: 'GASTO', monto: 100 + i, moneda: 'MXN', fecha: '2026-01-15',
  descripcion: `Movimiento ficticio ${i + 1}`, fechaCreacion: '2026-01-15T12:00:00'}));

async function run() {
  for (let i = 0; ; i++) {
    try { if ((await fetch(origin)).ok) break; } catch {}
    if (i === 59) throw new Error('No arranco el servidor local');
    await pause(250);
  }
  const browser = await chromium.launch({headless: true});
  const groups = [];
  try {
    for (const scenario of cases) {
      const samples = [];
      for (let i = 0; i < 3; i++) {
        const context = await browser.newContext({serviceWorkers: 'block', viewport: {width: 390, height: 844}});
        const counts = {};
        let writes = 0, refreshes = 0;
        const errors = [];
        await context.addInitScript(({user, lista, access, cached}) => {
          localStorage.setItem('finanzas_token', access);
          localStorage.setItem('finanzas_user', JSON.stringify(user));
          if (cached) localStorage.setItem(`kaptal_listas_${user.id}`, JSON.stringify({activaId: lista.id, listas: [lista]}));
        }, {user, lista, access: token(scenario.refreshMs ? 1 : Math.floor(Date.now()/1000)+3600), cached: scenario.cachedList});
        await context.route('**/*', async route => {
          const request = route.request(), url = new URL(request.url());
          if (url.origin !== origin) return route.abort();
          if (!url.pathname.startsWith('/api/')) return route.continue();
          counts[url.pathname] = (counts[url.pathname] ?? 0) + 1;
          let data = [];
          if (url.pathname === '/api/auth/refresh') {
            refreshes++;
            await pause(scenario.refreshMs);
            data = {...user, token: token(Math.floor(Date.now()/1000)+3600), tokenType: 'Bearer'};
          } else {
            if (request.method() !== 'GET') { writes++; return route.abort(); }
            await pause(scenario.apiMs);
            if (url.pathname === '/api/perfil') data = {...user, tema: 'CLARO', monedaPredeterminada: 'MXN'};
            else if (url.pathname === '/api/listas') data = [lista];
            else if (url.pathname === '/api/dashboard/resumen') data = scenario.populated ? {
              totalCuentas: 2, resumenPorMoneda: [{moneda: 'MXN', balanceTotal: 10000, dineroDisponible: 10000,
                deudaTarjetas: 0, ingresosMes: 20000, gastosMes: 5000, balanceMes: 15000, tasaAhorro: 75, totalCuentas: 2}],
              ultimosMovimientos: movements.slice(0, 8)} : {totalCuentas: 0, resumenPorMoneda: [], ultimosMovimientos: []};
            else if (url.pathname === '/api/dashboard/analitica') data = {gastosPorCategoria: scenario.populated ?
              Array.from({length: 8}, (_, i) => ({categoriaId: i + 1, categoriaNombre: `Categoria ${i + 1}`, monto: 625, moneda: 'MXN'})) : [], ultimosSeisMeses: []};
            else if (url.pathname === '/api/presupuestos') data = {presupuestos: [], resumenPorMoneda: []};
            else if (url.pathname === '/api/transacciones') data = scenario.populated ? {content: movements, totalElements: 50,
              totalPages: 1, first: true, last: true, number: 0, size: 50} : {content: [], totalElements: 0, totalPages: 0, first: true, last: true};
          }
          await route.fulfill({status: 200, json: {success: true, data}});
        });
        try {
          const page = await context.newPage();
          page.on('pageerror', error => errors.push(error));
          const start = performance.now();
          await page.goto(`${origin}/dashboard`, {waitUntil: 'domcontentloaded'});
          await page.locator('.app-shell').waitFor({state: 'visible'});
          const shellMs = Math.round(performance.now()-start);
          await page.locator(scenario.populated ? 'app-dashboard .dashboard-screen__recent-list' : 'app-dashboard .home-empty').waitFor({state: 'visible'});
          if (scenario.populated) assert.ok(await page.getByText('Movimiento ficticio 1', {exact: true}).first().isVisible());
          await page.getByRole('status', {name: 'Cargando categorías', exact: true}).waitFor({state: 'hidden'});
          const dashboardDataMs = Math.round(performance.now()-start);
          await page.waitForLoadState('networkidle');
          const startupRequests = {...counts};
          const navigate = performance.now();
          await page.getByRole('link', {name: 'Movimientos', exact: true}).first().click();
          await page.locator('app-transacciones').waitFor({state: 'visible'});
          const navigationShellMs = Math.round(performance.now()-navigate);
          await page.locator('app-transacciones .history-results[aria-busy="false"]').waitFor();
          if (scenario.populated) {
            assert.ok(await page.getByText('Movimiento ficticio 1', {exact: true}).first().isVisible());
            assert.ok(await page.getByText('Movimiento ficticio 50', {exact: true}).first().isVisible());
          }
          const navigationDataMs = Math.round(performance.now()-navigate);
          await page.waitForLoadState('networkidle');
          assert.equal(refreshes, scenario.refreshMs ? 1 : 0);
          assert.equal(writes, 0);
          assert.equal(errors.length, 0, 'Errores JavaScript en la fixture');
          for (const endpoint of ['/api/dashboard/resumen', '/api/dashboard/analitica', '/api/presupuestos', '/api/recurrencias']) {
            assert.equal(startupRequests[endpoint], 1, `Carga inicial unica: ${endpoint}`);
          }
          assert.ok(counts['/api/transacciones'] >= 1);
          samples.push({shellMs, dashboardDataMs, navigationShellMs, navigationDataMs, refreshes, startupRequests, allRequests: {...counts}});
        } finally { await context.close(); }
      }
      groups.push({...scenario, samples});
    }
  } finally { await browser.close(); }
  const report = {format: 1, environment: 'local Chromium; synthetic data; no external requests', node: process.version, groups,
    limits: ['three fresh contexts per case', 'no production or Android measurement', 'no p95; synthetic volume not validated as representative', 'API and refresh delays are artificial', 'HTTP request counts are per page context, not SQL queries']};
  mkdirSync(path.join(frontend, 'test-results'), {recursive: true});
  writeFileSync(path.join(frontend, 'test-results/navigation-synthetic.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
}
run().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => server.kill());
