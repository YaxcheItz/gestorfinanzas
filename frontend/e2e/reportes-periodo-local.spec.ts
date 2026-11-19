import { expect, test } from '@playwright/test';
import { createSectionsFixture } from './secciones-fixture';

test('Reportes permite seleccionar el mes solo con el teclado y muestra el foco', async ({ browser, baseURL }) => {
  const { c, p, writes, pageErrors } = await createSectionsFixture(browser, baseURL!);
  const month = p.getByLabel('Mes', { exact: true });
  const period = p.locator('#reports-current-period');

  try {
    await p.setViewportSize({ width: 320, height: 844 });
    await p.goto('/reportes?periodo=2026-09');
    await p.evaluate(() => document.documentElement.style.fontSize = '200%');
    await p.keyboard.press('Tab');
    await expect(p.getByRole('link', { name: 'Ir al contenido', exact: true })).toBeFocused();
    await p.keyboard.press('Enter');
    await expect(p.locator('#main-content')).toBeFocused();
    await p.keyboard.press('Tab');
    await p.keyboard.press('Tab');
    await expect(month).toBeFocused();
    await expect(month).toHaveCSS('opacity', '1');
    await expect(month).toHaveCSS('outline-style', 'solid');
    await expect(period).toHaveText('septiembre de 2026');

    await p.keyboard.press('Space');
    await p.keyboard.press('ArrowRight');
    await p.keyboard.press('Enter');
    await expect(month).toHaveValue('2026-10');
    await expect(period).toHaveText('octubre de 2026');
    await expect(p).toHaveURL(/periodo=2026-10/);
    expect(pageErrors).toEqual([]);
    expect(writes).toEqual([]);
  } finally {
    await c.close();
  }
});

test('Reportes conserva el mes elegido en su enlace al salir de un rango', async ({ browser, baseURL }, info) => {
  const { c, p, writes, pageErrors } = await createSectionsFixture(browser, baseURL!);
  const month = p.getByLabel('Mes', { exact: true });
  const range = p.getByText('Del 2026-11-02 al 2026-11-08 · fechas incluidas');
  const income = p.locator('.reports-summary strong').first();
  const start = new URLSearchParams({
    desde: '2026-11-02', hasta: '2026-11-08',
    desdeAnterior: '2026-10-26', hastaAnterior: '2026-11-01',
    sinComparacion: 'true', listaId: '21', foco: 'reporte',
  });
  await p.route('**/api/dashboard/resumen?*', route => {
    const params = new URL(route.request().url()).searchParams;
    const total = params.has('desde') ? 12000 : 14000;
    return route.fulfill({ json: { success: true, data: { resumenPorMoneda: [
      { moneda: 'MXN', ingresosMes: total, gastosMes: 0, balanceMes: total },
    ] } } });
  });

  try {
    await p.goto('/reportes?' + start);
    await expect(range).toBeVisible();
    await expect(income).toHaveText('12,000.00');

    await month.fill('2026-09');
    await expect(range).toHaveCount(0);
    await expect(income).toHaveText('14,000.00');
    await expect(p).toHaveURL(url => {
      const params = url.searchParams;
      return params.get('periodo') === '2026-09' && params.get('listaId') === '21'
        && params.get('foco') === 'reporte'
        && ['desde', 'hasta', 'desdeAnterior', 'hastaAnterior', 'sinComparacion'].every(key => !params.has(key));
    });
    const reloadedRequest = p.waitForRequest(request => new URL(request.url()).pathname === '/api/dashboard/resumen');
    await p.reload();
    const params = new URL((await reloadedRequest).url()).searchParams;
    expect(Object.fromEntries(params)).toMatchObject({ mes: '9', anio: '2026', listaId: '21' });
    expect(params.has('desde')).toBe(false);
    await expect(month).toHaveValue('2026-09');
    await expect(range).toHaveCount(0);
    await expect(income).toHaveText('14,000.00');
    await expect(month).toHaveAccessibleDescription('septiembre de 2026');
    await p.screenshot({ path: info.outputPath('mes-septiembre-despues-recarga.png') });
    expect(writes).toEqual([]);
    expect(pageErrors).toEqual([]);
  } finally {
    await c.close();
  }
});

test('Reportes describe un mes vacío aunque otros meses tengan movimientos', async ({ browser, baseURL }, info) => {
  const { c, p, writes, pageErrors } = await createSectionsFixture(browser, baseURL!);
  await p.clock.setFixedTime(new Date('2026-11-18T18:00:00Z'));
  await p.route('**/api/dashboard/resumen?*', route => {
    const month = new URL(route.request().url()).searchParams.get('mes');
    if (month !== '10') return route.fallback();
    return route.fulfill({ json: { success: true, data: { resumenPorMoneda: [] } } });
  });

  try {
    await p.goto('/reportes');
    await expect(p.locator('.reports-summary')).toBeVisible();
    await p.getByLabel('Mes', { exact: true }).fill('2026-10');
    await expect(p.getByRole('heading', { name: 'No hay movimientos en octubre de 2026' })).toBeVisible();
    await expect(p.getByRole('alert')).toHaveCount(0);
    await expect(p.getByRole('link', { name: 'Ir a Actividad' })).toBeVisible();
    await p.reload();
    await expect(p.getByRole('heading', { name: 'No hay movimientos en octubre de 2026' })).toBeVisible();
    await p.screenshot({ path: info.outputPath('octubre-vacio.png') });

    await p.goto('/reportes?desde=2026-10-03&hasta=2026-10-09');
    await expect(p.getByRole('heading', { name: 'No hay movimientos en este periodo' })).toBeVisible();
    await expect(p.getByText('Del 2026-10-03 al 2026-10-09 · fechas incluidas')).toBeVisible();
    expect(writes).toEqual([]);
    expect(pageErrors).toEqual([]);
  } finally {
    await c.close();
  }
});
