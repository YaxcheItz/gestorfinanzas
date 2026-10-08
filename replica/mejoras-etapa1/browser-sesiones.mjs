import { createServer } from 'node:http';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(new URL('../../frontend/package.json', import.meta.url));
const { chromium, expect } = require('@playwright/test');
const root = fileURLToPath(new URL('../../frontend/dist/frontend/browser/', import.meta.url));
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let archivo = resolve(root, '.' + pathname);
    if (archivo !== resolve(root) && !archivo.startsWith(resolve(root) + sep)) {
      response.writeHead(403).end(); return;
    }
    const datos = await stat(archivo).catch(() => null);
    if (!datos?.isFile()) archivo = resolve(root, 'index.html');
    response.writeHead(200, { 'Content-Type': mime[extname(archivo)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store' });
    response.end(await readFile(archivo));
  } catch { response.writeHead(500).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ serviceWorkers: 'block' });
const errores = [];
const usuario = { id: 991, nombre: 'Prueba sesiones', email: 'sesiones@example.test' };
const jwt = seconds => `e30.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds }))
  .toString('base64url')}.synthetic`;
const tokenNuevo = jwt(3600);
let renovaciones = 0;
try {
  await context.addInitScript(({ usuario, token }) => {
    if (!localStorage.getItem('finanzas_token')) {
      localStorage.setItem('finanzas_token', token);
      localStorage.setItem('finanzas_user', JSON.stringify(usuario));
    }
  }, { usuario, token: jwt(-60) });
  await context.route('**/runtime-config.js', route => route.fulfill({
    contentType: 'text/javascript', body: 'window.__API_BASE_URL__="/api";'
  }));
  await context.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let data = [];
    if (path === '/api/auth/refresh') {
      renovaciones++;
      // Da tiempo a que ambas pestañas intenten arrancar con el token vencido.
      await new Promise(resolve => setTimeout(resolve, 600));
      data = { ...usuario, token: tokenNuevo, tokenType: 'Bearer' };
    } else if (path === '/api/perfil') {
      data = { ...usuario, tema: 'CLARO', monedaPredeterminada: 'MXN', ocultarMontos: false };
    } else if (path === '/api/dashboard/resumen') {
      data = { resumenPorMoneda: [{ moneda: 'MXN', balanceTotal: 0, ingresosMes: 0, gastosMes: 0,
        balanceMes: 0, tasaAhorro: 0, totalCuentas: 0, dineroDisponible: 0, deudaTarjetas: 0 }],
        ultimosMovimientos: [], mes: 10, anio: 2026, totalCuentas: 0 };
    } else if (path === '/api/dashboard/analitica') {
      data = { gastosPorCategoria: [], ultimosSeisMeses: [] };
    } else if (path === '/api/presupuestos') {
      data = { presupuestos: [], resumenPorMoneda: [], totalPresupuestado: 0, totalGastado: 0,
        totalDisponible: 0, porcentajeConsumidoGlobal: 0 };
    } else if (path === '/api/auth/google/config') {
      data = { enabled: false, clientId: '' };
    } else if (path.startsWith('/api/transacciones')) {
      data = { content: [], totalPages: 0, totalElements: 0, number: 0 };
    }
    await route.fulfill({ json: { success: true, message: '', data } });
  });
  const paginas = await Promise.all([context.newPage(), context.newPage()]);
  for (const page of paginas) page.on('pageerror', error => errores.push(error.message));
  await Promise.all(paginas.map(page => page.goto(`${origin}/dashboard`)));
  for (const page of paginas) {
    assert.equal(await page.evaluate(() => typeof navigator.locks?.request), 'function');
    await expect(page.locator('.stable-bottom-nav')).toBeVisible();
    assert.equal(await page.evaluate(() => localStorage.getItem('finanzas_token')), tokenNuevo);
  }
  assert.equal(renovaciones, 1, 'Las dos pestañas deben compartir una sola rotación');
  // Cambiar el almacenamiento en una pestaña debe actualizar la identidad de la otra.
  await paginas[0].evaluate(() => {
    localStorage.removeItem('finanzas_token');
    localStorage.removeItem('finanzas_user');
  });
  await expect(paginas[1].locator('app-navbar')).toHaveCount(0);
  await expect(paginas[1]).toHaveURL(`${origin}/login`);
  assert.deepEqual(errores, []);
  const resultado = { fecha: new Date().toISOString(), navegador: 'Chromium', api: 'sintética',
    serviceWorkers: 'bloqueados', comprobaciones: { renovacionDosPestanas: true,
      unaSolaRotacion: true, cierreCompartido: true, erroresJavaScript: errores }, renovaciones };
  await writeFile(new URL('./browser-checks.json', import.meta.url), JSON.stringify(resultado, null, 2));
  console.log(JSON.stringify(resultado));
} finally {
  await context.close();
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
