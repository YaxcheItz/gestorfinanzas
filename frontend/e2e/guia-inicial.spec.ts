import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' });

test('guía omitible, persistencia, acceso desde ajustes y tamaños móviles sin permisos', async ({ page, baseURL }) => {
  expect(['localhost', '127.0.0.1']).toContain(new URL(baseURL!).hostname);
  await page.addInitScript(() => {
    localStorage.setItem('finanzas_token', `test.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.synthetic`);
    localStorage.setItem('finanzas_user', JSON.stringify({ id: 997, nombre: 'Guía', email: 'guia@example.test' }));
    Object.defineProperty(window, 'guiaMicRequests', { value: 0, writable: true });
    if (navigator.mediaDevices) Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: () => {
      (window as unknown as { guiaMicRequests: number }).guiaMicRequests++;
      return Promise.reject(new DOMException('Denied', 'NotAllowedError'));
    } });
  });
  const mutations: string[] = [];
  await page.route('**/api/**', async route => {
    if (route.request().method() !== 'GET') mutations.push(route.request().method());
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith('/perfil')) data = { id: 997, nombre: 'Guía', email: 'guia@example.test', tema: 'CLARO', monedaPredeterminada: 'MXN' };
    if (path.endsWith('/dashboard/resumen')) data = { totalCuentas: 0, resumenPorMoneda: [], ultimosMovimientos: [] };
    if (path.endsWith('/presupuestos')) data = { presupuestos: [], resumenPorMoneda: [] };
    if (path.endsWith('/dashboard/analitica')) data = { gastosPorCategoria: [], ultimosSeisMeses: [] };
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/dashboard');
  const guide = page.getByRole('region', { name: 'Tus primeros pasos en Kaptal' });
  await expect(guide).toBeVisible();
  for (const viewport of [{ width: 320, height: 640 }, { width: 568, height: 320 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await expect(guide).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const button = await guide.getByRole('button', { name: 'Omitir guía' }).boundingBox();
    expect(button!.height).toBeGreaterThanOrEqual(44);
  }
  for (const dark of [false, true]) {
    await page.evaluate(dark => {
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.style.fontSize = '24px';
    }, dark);
    expect(await guide.evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
    await guide.screenshot({ path: test.info().outputPath(`guia-${dark ? 'oscura' : 'clara'}-letra-grande.png`) });
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  await guide.getByRole('button', { name: 'Omitir guía' }).click();
  await expect(guide).toHaveCount(0);
  await expect(page.locator('#main-content')).toBeFocused();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Añadir movimiento', exact: true })).toBeVisible();
  await expect(guide).toHaveCount(0);
  await page.getByRole('link', { name: 'Configuración', exact: true }).click();
  await page.getByRole('button', { name: 'Ver primeros pasos', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\?guia=inicio$/);
  await expect(guide).toBeVisible();
  await expect(page.locator('#guia-inicial-titulo')).toBeFocused();
  expect((await page.locator('#guia-inicial-titulo').boundingBox())!.y).toBeGreaterThanOrEqual(100);
  await guide.getByRole('link', { name: 'Revisa tus avisos', exact: true }).click();
  await expect(page).toHaveURL(/\/avisos$/);
  expect(await page.evaluate(() => (window as unknown as { guiaMicRequests: number }).guiaMicRequests)).toBe(0);
  expect(mutations).toEqual([]);
});
