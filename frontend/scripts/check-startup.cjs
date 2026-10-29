// Ejecutar tras npm run build. Solo servidor local y respuestas ficticias.
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const port = '14323';
const origin = `http://localhost:${port}`;
const server = spawn(process.execPath, ['e2e/serve-production.mjs'], {
  cwd: path.resolve(__dirname, '..'),
  env: { ...process.env, E2E_FRONTEND_PORT: port }, stdio: 'ignore'
});
const token = exp => `test.${Buffer.from(JSON.stringify({exp})).toString('base64url')}.synthetic`;
const user = {id: 991, nombre: 'Sintetico', email: 'synthetic@example.test'};

async function run() {
  for (let i = 0; ; i++) {
    try { if ((await fetch(origin)).ok) break; } catch {}
    if (i === 59) throw new Error('El servidor local no arranco');
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  const browser = await chromium.launch({headless: true});
  const report = [];
  try {
    for (const status of [200, 401, 503]) {
      const context = await browser.newContext({serviceWorkers: 'block', viewport: {width: 390, height: 844}});
      let release;
      const gate = new Promise(resolve => { release = resolve; });
      let released = false;
      let refreshes = 0;
      let protectedBeforeRefresh = 0;
      let expiredRequests = 0;
      const fresh = token(Math.floor(Date.now()/1000) + 3600);
      await context.addInitScript(({user, access}) => {
        localStorage.setItem('finanzas_token', access);
        localStorage.setItem('finanzas_user', JSON.stringify(user));
      }, {user, access: token(1)});
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) return route.abort();
        if (!url.pathname.startsWith('/api/')) return route.continue();
        if (url.pathname.endsWith('/refresh')) {
          refreshes++;
          await gate;
          return route.fulfill({status, json: status === 200
            ? {success: true, data: {...user, token: fresh, tokenType: 'Bearer'}}
            : {success: false, message: 'Fallo sintetico'}});
        }
        if (!url.pathname.startsWith('/api/auth/')) {
          if (!released) protectedBeforeRefresh++;
          if (route.request().headers()['authorization'] !== `Bearer ${fresh}`) expiredRequests++;
        }
        let data = [];
        if (url.pathname.endsWith('/perfil')) data = {...user, tema: 'CLARO', monedaPredeterminada: 'MXN'};
        else if (url.pathname.endsWith('/dashboard/resumen')) data = {totalCuentas: 0, resumenPorMoneda: [], ultimosMovimientos: []};
        else if (url.pathname.endsWith('/dashboard/analitica')) data = {gastosPorCategoria: [], ultimosSeisMeses: []};
        else if (url.pathname.endsWith('/presupuestos')) data = {presupuestos: [], resumenPorMoneda: []};
        return route.fulfill({status: 200, json: {success: true, data}});
      });
      try {
        const page = await context.newPage();
        const start = performance.now();
        await page.goto(`${origin}/dashboard`, {waitUntil: 'domcontentloaded'});
        await page.locator('.app-shell').waitFor({state: 'visible', timeout: 5000});
        const shellMs = Math.round(performance.now() - start);
        await page.getByRole('status').filter({hasText: 'Preparando tu sesión'}).waitFor();
        assert.equal(await page.locator('app-dashboard').count(), 0, 'La ruta protegida espera');
        assert.equal(protectedBeforeRefresh, 0);
        assert.equal(refreshes, 1);
        released = true;
        release();
        if (status === 200) {
          await page.locator('app-dashboard').waitFor();
          await page.getByRole('link', {name: 'Movimientos', exact: true}).first().click();
          await page.locator('app-transacciones').waitFor();
          assert.equal(refreshes, 1);
        } else if (status === 401) {
          await page.waitForURL('**/login?**');
          assert.equal(await page.evaluate(() => localStorage.getItem('finanzas_token')), null);
        } else {
          await page.locator('app-dashboard').waitFor();
          assert.equal(await page.evaluate(() => localStorage.getItem('finanzas_token')), token(1));
        }
        assert.equal(expiredRequests, 0, 'Nunca envia datos protegidos con el token vencido');
        report.push({status, shellMs, protectedBeforeRefresh, expiredRequests, refreshes});
      } finally { release(); await context.close(); }
    }
    console.log(JSON.stringify({environment: 'local Chromium, synthetic responses, manually held refresh', report}));
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.kill());
