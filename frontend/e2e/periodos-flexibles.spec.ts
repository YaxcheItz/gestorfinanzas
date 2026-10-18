import { expect, test } from '@playwright/test';
import { registrarPrueba } from './registro-helper';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' });
test.setTimeout(90_000);

test('periodos: preferencia persistida, rangos coherentes, comparacion e historial movil', async ({ page }, testInfo) => {
  const email = `periodos-${crypto.randomUUID()}@example.test`, password = 'Password123';
  const registro = await registrarPrueba(page.request, { nombre: 'QA periodos', email, password });
  expect(registro.ok()).toBeTruthy();
  const headers = { Authorization: `Bearer ${(await registro.json()).data.token}` };
  const config = { tipo: 'MES', ancla: '2026-01-05', diaInicio: 20, diaQuincena: 16 };
  expect((await page.request.put('/api/perfil/periodo', { headers, data: config })).ok()).toBeTruthy();
  const invalida = await page.request.put('/api/perfil/periodo', { headers, data: { ...config, tipo: 'QUINCENA', diaInicio: 28, diaQuincena: 31 } });
  expect(invalida.status()).toBe(400);
  const sinSesion = await page.request.put('/api/perfil/periodo', { data: config });
  expect(sinSesion.status()).toBe(401);
  const perfil = (await (await page.request.get('/api/perfil', { headers })).json()).data;
  expect(perfil.periodoPredeterminado).toEqual(config);
  const calendario = await page.request.get('/api/dashboard/periodo?tipo=CATORCENA&ancla=2024-02-26&referencia=2024-02-29', { headers });
  expect((await calendario.json()).data).toEqual({ desde: '2024-02-26', hasta: '2024-03-10' });
  const cuenta = await page.request.post('/api/cuentas', { headers, data: { nombre: 'Cuenta periodos', tipo: 'DEBITO', moneda: 'MXN', saldoInicial: 1000 } });
  expect(cuenta.ok()).toBeTruthy();
  const cuentaId = (await cuenta.json()).data.id;
  const categorias = (await (await page.request.get('/api/categorias', { headers })).json()).data;
  for (const [fecha, monto, descripcion] of [['2025-12-31', 25, 'Dentro del ciclo'], ['2026-01-20', 35, 'Fuera del ciclo']] as const) {
    const movimiento = await page.request.post('/api/transacciones', { headers, data: { tipo: 'GASTO', monto, descripcion, fecha, cuentaId, categoriaId: categorias.find((c: { tipo: string }) => c.tipo === 'GASTO').id } });
    expect(movimiento.ok()).toBeTruthy();
  }
  await page.goto('/login');
  await page.locator('#email').fill(email); await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.locator('.time-dropdown-btn').click();
  const dialog = page.getByRole('dialog', { name: 'Seleccionar rango de tiempo' });
  await expect(dialog.getByLabel('Día de inicio', { exact: true })).toHaveValue('20');
  await dialog.getByRole('button', { name: 'Rango personalizado', exact: true }).click();
  await dialog.getByLabel('Desde', { exact: true }).fill('2025-12-20');
  await dialog.getByLabel('Hasta', { exact: true }).fill('2026-01-19');
  await dialog.getByRole('button', { name: 'Aplicar fechas', exact: true }).click();
  await expect(page.locator('.dashboard-screen__amount')).toContainText('25.00');
  await expect(page.locator('.home-category__bar-button strong').first()).toContainText('25');
  await expect(page.getByRole('button', { name: 'Periodo siguiente', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Detallada', exact: true }).click();
  await page.getByRole('button', { name: 'Informe del periodo', exact: true }).click();
  await expect(page).toHaveURL(/reportes\?/);
  await expect(page.locator('.reports-summary')).toContainText('25.00');
  await expect(page.locator('.reports-comparison').first()).toContainText('2025-12-20');
  await page.goBack();
  // La consulta temporal no modifica la preferencia: al volver se recupera el ciclo guardado.
  await page.locator('.time-dropdown-btn').click();
  await expect(dialog.getByLabel('Día de inicio', { exact: true })).toHaveValue('20');
  await dialog.getByLabel('Cada 14 días', { exact: false }).check();
  await dialog.getByLabel('Fecha de anclaje').fill('2024-02-26');
  await dialog.getByLabel('Usar al abrir Inicio').check();
  await dialog.getByRole('button', { name: 'Aplicar periodo', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  let liberarPerfil!: () => void;
  const perfilPendiente = new Promise<void>(resolve => { liberarPerfil = resolve; });
  await page.route('**/api/perfil', async route => { await perfilPendiente; await route.continue(); });
  try {
    await page.reload();
    await expect(page.locator('.time-dropdown-btn')).toBeDisabled();
  } finally {
    liberarPerfil();
  }
  await expect(page.locator('.time-dropdown-btn')).toBeEnabled();
  await page.unroute('**/api/perfil');
  await page.locator('.time-dropdown-btn').click();
  await expect(dialog.getByLabel('Cada 14 días', { exact: false })).toBeChecked();
  await expect(dialog.getByLabel('Fecha de anclaje')).toHaveValue('2024-02-26');
  await page.screenshot({ path: testInfo.outputPath('periodo-catorcena.png'), fullPage: true, animations: 'disabled' });
  await dialog.getByRole('button', { name: 'Rango personalizado', exact: true }).click();
  await dialog.getByLabel('Desde', { exact: true }).fill('2025-12-20');
  await dialog.getByLabel('Hasta', { exact: true }).fill('2026-01-19');
  await dialog.getByRole('button', { name: 'Aplicar fechas', exact: true }).click();
  await page.getByRole('button', { name: 'Ver todos', exact: true }).last().click();
  await expect(page).toHaveURL(/fechaInicio=2025-12-20.*fechaFin=2026-01-19/);
  await expect(page.locator('app-movimiento-mobile-card')).toHaveCount(1);
  await expect(page.locator('app-movimiento-mobile-card')).toContainText('Dentro del ciclo');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('historial-rango.png'), fullPage: true, animations: 'disabled' });
});
