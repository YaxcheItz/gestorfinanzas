import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const require = createRequire(new URL('../../frontend/package.json', import.meta.url));
const { chromium, expect } = require('@playwright/test');
const browser = await chromium.launch({ headless: true });
const checks = [];
try {
  for (const settings of [
    { width: 390, height: 844, colorScheme: 'light', hasTouch: true },
    { width: 390, height: 844, colorScheme: 'dark', hasTouch: true },
    { width: 1280, height: 900, colorScheme: 'light', hasTouch: false }
  ]) {
    const context = await browser.newContext({ viewport: settings, colorScheme: settings.colorScheme, hasTouch: settings.hasTouch });
    const page = await context.newPage();
    const errors = [];
    const requests = [];
    page.on('pageerror', error => errors.push(error.message));
    const token = `e30.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.synthetic`;
    await page.addInitScript(({ token, scheme }) => {
      localStorage.setItem('finanzas_token', token);
      localStorage.setItem('finanzas_user', JSON.stringify({ id: 991, nombre: 'Prueba', email: 'prueba@example.test' }));
      localStorage.setItem('kaptal_tema_modo_991', 'AUTO');
    }, { token, scheme: settings.colorScheme });
    const categories = [50, 20, 10, 10, 10].map((monto, index) => ({ id: index + 1, nombre: `Cat ${index}`, tipo: 'GASTO', activo: true, esPersonalizada: true, color: '#10b981', icono: 'food', monto }));
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      requests.push({ path: url.pathname, params: Object.fromEntries(url.searchParams) });
      let data = [];
      if (url.pathname === '/api/perfil') data = { id: 991, nombre: 'Prueba', email: 'prueba@example.test', tema: settings.colorScheme === 'dark' ? 'OSCURO' : 'CLARO', monedaPredeterminada: 'MXN' };
      else if (url.pathname === '/api/dashboard/resumen') data = {
        resumenPorMoneda: [{ moneda: 'MXN', balanceTotal: 5000, ingresosMes: 200, gastosMes: 100, balanceMes: 100, tasaAhorro: 50, totalCuentas: 1, dineroDisponible: 5000, deudaTarjetas: 0 }],
        ultimosMovimientos: [], mes: 10, anio: 2026, totalCuentas: 1
      };
      else if (url.pathname === '/api/dashboard/analitica') data = {
        gastosPorCategoria: categories.map(item => ({ categoriaId: item.id, categoriaNombre: item.nombre, categoriaColor: item.color, monto: item.monto, moneda: 'MXN' })), ultimosSeisMeses: []
      };
      else if (url.pathname === '/api/presupuestos') data = { presupuestos: [], resumenPorMoneda: [], totalPresupuestado: 0, totalGastado: 0, totalDisponible: 0, porcentajeConsumidoGlobal: 0 };
      else if (url.pathname.startsWith('/api/categorias')) data = categories;
      else if (url.pathname === '/api/cuentas') data = [{ id: 1, nombre: 'Efectivo', tipo: 'EFECTIVO', moneda: 'MXN', saldoActual: 5000, activo: true }];
      else if (url.pathname.startsWith('/api/transacciones')) data = { content: [], totalPages: 0, totalElements: 0, number: 0 };
      await route.fulfill({ json: { success: true, message: '', data } });
    });
    await page.goto('http://127.0.0.1:14201/dashboard');
    await page.locator('.donut-legend-item').first().waitFor();
    assert.equal(await page.locator('.donut-legend-item').count(), 5);
    assert.match(await page.locator('.donut-widget__center-val').innerText(), /100/);
    await page.locator('.donut-widget__segment').first().focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.donut-widget__center-sub')).toContainText('50%');
    await page.locator('.time-dropdown-btn').click();
    await Promise.all([
      page.waitForResponse(response => new URL(response.url()).pathname === '/api/dashboard/resumen'),
      page.getByRole('button', { name: 'Hoy Movimientos de la fecha' }).click()
    ]);
    const latest = requests.filter(item => item.path === '/api/dashboard/resumen').at(-1);
    assert.equal(latest.params.desde, latest.params.hasta);
    await page.locator('.time-dropdown-btn').click();
    await page.getByRole('button', { name: 'Personalizado Elegir fechas de inicio y fin' }).click();
    await page.locator('input[name="desde"]').fill('2025-12-29');
    await page.locator('input[name="hasta"]').fill('2026-01-04');
    await Promise.all([
      page.waitForResponse(response => new URL(response.url()).pathname === '/api/dashboard/resumen'),
      page.getByRole('button', { name: 'Aplicar fechas' }).click()
    ]);
    assert.deepEqual(requests.filter(item => item.path === '/api/dashboard/resumen').at(-1).params,
      { mes: '1', anio: '2026', desde: '2025-12-29', hasta: '2026-01-04' });
    await page.locator('.capture-launch').click();
    await page.getByRole('dialog').waitFor();
    assert.match(page.url(), /\/transacciones/);
    assert.equal(await page.locator('#monto').count(), 1);
    await expect(page.getByRole('dialog').getByRole('combobox', { name: 'Cuenta', exact: true })).toContainText('Efectivo');
    const submit = page.getByRole('dialog').getByRole('button', { name: 'Registrar', exact: true });
    await expect(submit).toBeVisible();
    const colors = await submit.evaluate(element => {
      const style = getComputedStyle(element);
      return { text: style.color, background: style.backgroundColor };
    });
    const luminance = rgb => {
      const channels = rgb.match(/\d+/g).slice(0, 3).map(Number).map(value => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    const [light, dark] = [luminance(colors.text), luminance(colors.background)].sort((a, b) => b - a);
    assert.ok((light + 0.05) / (dark + 0.05) >= 4.5, `Unreadable primary button: ${JSON.stringify(colors)}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: fileURLToPath(new URL(`manual-${settings.width}-${settings.colorScheme}.png`, import.meta.url)), fullPage: true });
    checks.push({ ...settings, status: 'passed', checked: ['donut total and keyboard', 'today dates', 'custom dates', 'manual FAB and loaded account', 'primary button contrast >= 4.5', 'no overflow', 'no page errors'], mockedApi: true });
    await context.close();
  }
  await writeFile(new URL('browser-checks.json', import.meta.url), JSON.stringify(checks, null, 2));
  console.log(JSON.stringify(checks));
} finally { await browser.close(); }
