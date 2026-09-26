import { expect, test, type Locator, type Page } from '@playwright/test';

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type Cuenta = {
  id: number;
  nombre: string;
  saldoActual: number;
  moneda: string;
  activo: boolean;
};

type Transaccion = {
  id: number;
  cuentaId: number;
  cuentaDestinoId: number | null;
  tipo: string;
  monto: number;
  montoDestino: number | null;
  tasaCambio: number | null;
  moneda: string;
  monedaDestino: string | null;
  descripcion: string;
};

async function apiGet<T>(page: Page, path: string): Promise<T> {
  const token = await page.evaluate(() => localStorage.getItem('finanzas_token'));
  expect(token).not.toBeNull();
  const response = await page.request.get(`http://localhost:18080/api${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  expect(response.ok(), `GET ${path} should succeed`).toBeTruthy();
  const body = (await response.json()) as ApiResponse<T>;
  expect(body.success, body.message).toBeTruthy();
  return body.data;
}

async function selectOptionContaining(select: Locator, fragment: string): Promise<void> {
  const options = await select.locator('option').all();
  for (const option of options) {
    const text = (await option.textContent()) ?? '';
    if (text.includes(fragment)) {
      const value = await option.getAttribute('value');
      if (value !== null) {
        await select.selectOption(value);
        return;
      }
    }
  }
  throw new Error(`No option containing "${fragment}" was found.`);
}

function budgetCard(page: Page, category: string): Locator {
  return page.getByRole('heading', { name: category, exact: true })
    .locator('xpath=ancestor::div[contains(@class, "bg-white")][1]');
}

test('auth, cuentas, monedas, movimientos, presupuestos, categorías y analítica', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.route('http://localhost:8080/api/**', async route => {
    const backendUrl = new URL(route.request().url());
    backendUrl.port = '18080';
    await route.continue({ url: backendUrl.toString() });
  });

  await page.goto('/cuentas');
  await expect(page).toHaveURL(/\/login$/);

  await page.goto('/registro');
  const email = `e2e-${Date.now()}@example.test`;
  await page.getByLabel('Nombre Completo').fill('Usuario E2E');
  await page.getByLabel('Correo Electrónico').fill(email);
  await page.getByLabel(/Contraseña/).fill('Pruebas123');
  await page.getByRole('button', { name: 'Crear mi Cuenta' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Resumen Financiero' })).toBeVisible();
  await expect(page.getByText('Hola, Usuario E2E.')).toBeVisible();

  let cuentas = await apiGet<Cuenta[]>(page, '/cuentas?incluirInactivas=true');
  expect(cuentas.some(cuenta => cuenta.nombre === 'Billetera / Efectivo' && cuenta.moneda === 'MXN')).toBeTruthy();

  await page.getByRole('link', { name: 'Cuentas' }).click();
  await page.getByRole('button', { name: '+ Agregar cuenta' }).click();
  await page.getByLabel('Nombre').fill('E2E Ahorro USD');
  await selectOptionContaining(page.getByLabel('Tipo de cuenta'), 'Ahorro');
  await page.getByLabel('Saldo inicial').fill('100');
  await selectOptionContaining(page.getByLabel('Moneda'), 'USD');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByRole('article').filter({ hasText: 'E2E Ahorro USD' })).toBeVisible();

  await page.getByRole('button', { name: '+ Agregar cuenta' }).click();
  await page.getByLabel('Nombre').fill('E2E Cuenta MXN');
  await selectOptionContaining(page.getByLabel('Tipo de cuenta'), 'Débito');
  await page.getByLabel('Saldo inicial').fill('50');
  await selectOptionContaining(page.getByLabel('Moneda'), 'MXN');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByRole('article').filter({ hasText: 'E2E Cuenta MXN' })).toBeVisible();

  cuentas = await apiGet<Cuenta[]>(page, '/cuentas?incluirInactivas=true');
  const cuentaUsd = cuentas.find(cuenta => cuenta.nombre === 'E2E Ahorro USD');
  const cuentaMxn = cuentas.find(cuenta => cuenta.nombre === 'E2E Cuenta MXN');
  expect(cuentaUsd?.saldoActual).toBe(100);
  expect(cuentaMxn?.saldoActual).toBe(50);

  const cuentaUsdCard = page.getByRole('article').filter({ hasText: 'E2E Ahorro USD' });
  await cuentaUsdCard.getByRole('button', { name: 'Editar' }).click();
  await selectOptionContaining(page.getByLabel('Moneda'), 'CAD');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByRole('alert')).toContainText('No se puede cambiar la moneda');
  await selectOptionContaining(page.getByLabel('Moneda'), 'USD');
  await page.getByLabel('Descripción (opcional)').fill('Cuenta de prueba E2E');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Cuenta de prueba E2E')).toBeVisible();

  const movimientosIniciales = await apiGet<Transaccion[]>(page, '/transacciones/recientes');
  expect(movimientosIniciales).toContainEqual(expect.objectContaining({
    tipo: 'SALDO_INICIAL',
    monto: 100,
    moneda: 'USD',
    descripcion: 'Saldo inicial'
  }));

  await page.getByRole('link', { name: 'Categorías' }).click();
  await page.getByRole('button', { name: '+ Nueva categoría' }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('E2E Pruebas');
  await page.getByLabel('Tipo', { exact: true }).selectOption('GASTO');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('heading', { name: 'E2E Pruebas' })).toBeVisible();

  await page.getByRole('link', { name: 'Movimientos' }).click();
  await page.getByRole('button', { name: 'Nuevo Movimiento' }).click();
  await page.getByLabel(/Monto \(/).fill('15');
  await page.getByLabel('Concepto / Descripción').fill('E2E gasto MXN');
  await selectOptionContaining(page.locator('#cuentaId'), 'E2E Cuenta MXN');
  await expect(page.getByLabel('Monto (MXN)')).toBeVisible();
  await selectOptionContaining(page.locator('#categoriaId'), 'E2E Pruebas');
  await page.getByRole('button', { name: 'Registrar', exact: true }).click();
  await expect(page.getByText('E2E gasto MXN')).toBeVisible();

  await page.getByRole('button', { name: 'Nuevo Movimiento' }).click();
  await page.getByRole('button', { name: 'Ingreso', exact: true }).click();
  await page.getByLabel(/Monto \(/).fill('20');
  await page.getByLabel('Concepto / Descripción').fill('E2E ingreso USD');
  await selectOptionContaining(page.locator('#cuentaId'), 'E2E Ahorro USD');
  await expect(page.getByLabel('Monto (USD)')).toBeVisible();
  await selectOptionContaining(page.locator('#categoriaId'), 'Salario');
  await page.getByRole('button', { name: 'Registrar', exact: true }).click();
  await expect(page.getByText('E2E ingreso USD')).toBeVisible();

  await page.getByRole('button', { name: 'Nuevo Movimiento' }).click();
  await page.getByRole('button', { name: 'Transferencia', exact: true }).click();
  await page.getByLabel(/Monto \(/).fill('10');
  await page.getByLabel('Concepto / Descripción').fill('E2E cambio USD a MXN');
  await selectOptionContaining(page.locator('#cuentaId'), 'E2E Ahorro USD');
  await expect(page.getByLabel('Monto (USD)')).toBeVisible();
  await selectOptionContaining(page.locator('#cuentaDestinoId'), 'E2E Cuenta MXN');
  await expect(page.getByLabel(/Tasa de cambio/)).toBeVisible();
  await page.getByLabel(/Tasa de cambio/).fill('17.5');
  await page.getByRole('button', { name: 'Registrar', exact: true }).click();
  await expect(page.getByText('E2E cambio USD a MXN')).toBeVisible();

  await page.getByRole('button', { name: 'Nuevo Movimiento' }).click();
  await page.getByRole('button', { name: 'Transferencia', exact: true }).click();
  await page.getByLabel(/Monto \(/).fill('5');
  await page.getByLabel('Concepto / Descripción').fill('E2E transferencia misma moneda');
  await selectOptionContaining(page.locator('#cuentaId'), 'E2E Cuenta MXN');
  await selectOptionContaining(page.locator('#cuentaDestinoId'), 'Billetera / Efectivo');
  await expect(page.getByLabel(/Tasa de cambio/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Registrar', exact: true }).click();
  await expect(page.getByText('E2E transferencia misma moneda')).toBeVisible();

  const transacciones = await apiGet<Transaccion[]>(page, '/transacciones/recientes');
  const transferencia = transacciones.find(item => item.descripcion === 'E2E cambio USD a MXN');
  expect(transferencia).toMatchObject({
    tipo: 'TRANSFERENCIA',
    monto: 10,
    montoDestino: 175,
    tasaCambio: 17.5,
    moneda: 'USD',
    monedaDestino: 'MXN'
  });
  const transferenciaMismaMoneda = transacciones.find(item => item.descripcion === 'E2E transferencia misma moneda');
  expect(transferenciaMismaMoneda).toMatchObject({
    tipo: 'TRANSFERENCIA',
    monto: 5,
    montoDestino: 5,
    tasaCambio: 1,
    moneda: 'MXN',
    monedaDestino: 'MXN'
  });
  expect(transferenciaMismaMoneda?.cuentaDestinoId).not.toBe(transferenciaMismaMoneda?.cuentaId);
  cuentas = await apiGet<Cuenta[]>(page, '/cuentas?incluirInactivas=true');
  expect(cuentas.find(cuenta => cuenta.nombre === 'E2E Cuenta MXN')?.saldoActual).toBe(205);
  expect(cuentas.find(cuenta => cuenta.nombre === 'Billetera / Efectivo')?.saldoActual).toBe(5);

  await page.getByRole('button', { name: 'Gastos', exact: true }).click();
  await expect(page.getByText('E2E gasto MXN')).toBeVisible();
  await expect(page.getByText('E2E ingreso USD')).toHaveCount(0);
  const search = page.getByPlaceholder('Buscar por concepto o notas...');
  await search.fill('E2E gasto MXN');
  await expect(page.getByRole('row').filter({ hasText: 'E2E gasto MXN' })).toBeVisible();
  await search.fill('no existe');
  await expect(page.getByText('No se encontraron movimientos')).toBeVisible();
  await search.fill('');
  await page.getByRole('button', { name: 'Todos', exact: true }).click();
  await page.getByRole('button', { name: 'Mes anterior', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(0);
  await page.getByRole('button', { name: 'Este mes', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'E2E gasto MXN' })).toBeVisible();
  await page.getByRole('button', { name: 'Últimos 30 días', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'E2E ingreso USD' })).toBeVisible();
  await page.getByRole('button', { name: 'Todo el historial', exact: true }).click();
  await page.getByRole('button', { name: 'Todos', exact: true }).click();
  await selectOptionContaining(page.locator('select').nth(0), 'E2E Ahorro USD');
  await expect(page.getByRole('row').filter({ hasText: 'E2E ingreso USD' })).toBeVisible();
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();
  await page.locator('select').nth(1).selectOption({ label: 'E2E Pruebas' });
  await expect(page.getByRole('row').filter({ hasText: 'E2E gasto MXN' })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'E2E ingreso USD' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();

  let summary = await apiGet<{
    resumenPorMoneda: Array<{ moneda: string; balanceTotal: number; ingresosMes: number; gastosMes: number }>;
  }>(page, '/dashboard/resumen');
  expect(summary.resumenPorMoneda.find(item => item.moneda === 'USD')).toMatchObject({
    balanceTotal: 110,
    ingresosMes: 20
  });
  expect(summary.resumenPorMoneda.find(item => item.moneda === 'MXN')).toMatchObject({
    balanceTotal: 210,
    gastosMes: 15
  });

  const analytics = await apiGet<{
    gastosPorCategoria: Array<{ categoriaNombre: string; monto: number; moneda: string }>;
  }>(page, '/dashboard/analitica');
  expect(analytics.gastosPorCategoria).toContainEqual(
    expect.objectContaining({ categoriaNombre: 'E2E Pruebas', monto: 15, moneda: 'MXN' })
  );

  await page.getByRole('link', { name: 'Panel General' }).click();
  await expect(page.getByRole('img', { name: /Distribución de gastos en MXN/ })).toBeVisible();
  await page.getByLabel('Moneda de la analítica').selectOption('USD');
  await expect(page.getByText('No hay gastos registrados este mes.')).toBeVisible();
  await page.getByLabel('Moneda de la analítica').selectOption('MXN');
  await expect(page.locator('[aria-label*="ingresos"]')).toHaveCount(6);
  await page.screenshot({ path: 'test-results/capturas/dashboard-analitica.png', fullPage: true });

  await page.getByRole('link', { name: 'Presupuestos' }).click();
  await page.getByRole('button', { name: 'Fijar Presupuesto' }).click();
  await selectOptionContaining(page.getByLabel('Categoría'), 'E2E Pruebas');
  await selectOptionContaining(page.getByLabel('Moneda del presupuesto'), 'MXN');
  await page.getByLabel(/Monto límite mensual/).fill('100');
  await page.getByRole('button', { name: 'Guardar Presupuesto' }).click();
  await expect(page.getByText('E2E Pruebas')).toBeVisible();
  const budgetSummary = await apiGet<{
    presupuestos: Array<{ moneda: string; montoLimite: number; montoGastado: number }>;
  }>(
    page,
    `/presupuestos?mes=${new Date().getMonth() + 1}&anio=${new Date().getFullYear()}`
  );
  expect(budgetSummary.presupuestos.find(item => item.moneda === 'MXN')).toMatchObject({
    moneda: 'MXN',
    montoLimite: 100,
    montoGastado: 15
  });
  await budgetCard(page, 'E2E Pruebas').getByTitle('Modificar límite').click();
  await page.getByLabel(/Monto límite mensual/).fill('120');
  await page.getByRole('button', { name: 'Actualizar Meta' }).click();
  await expect.poll(async () => {
    const updated = await apiGet<{ presupuestos: Array<{ montoLimite: number }> }>(
      page,
      `/presupuestos?mes=${new Date().getMonth() + 1}&anio=${new Date().getFullYear()}`
    );
    return updated.presupuestos[0]?.montoLimite;
  }).toBe(120);
  await page.getByRole('button', { name: 'Fijar Presupuesto' }).click();
  await page.getByLabel('Categoría').selectOption({ label: 'Transporte' });
  await selectOptionContaining(page.getByLabel('Moneda del presupuesto'), 'USD');
  await page.getByLabel(/Monto límite mensual/).fill('50');
  await page.getByRole('button', { name: 'Guardar Presupuesto' }).click();
  const mixedCurrencyBudgetSummary = await apiGet<{
    presupuestos: Array<{ categoriaNombre: string; moneda: string; montoGastado: number }>;
    resumenPorMoneda: Array<{ moneda: string; totalPresupuestado: number; totalGastado: number }>;
  }>(
    page,
    `/presupuestos?mes=${new Date().getMonth() + 1}&anio=${new Date().getFullYear()}`
  );
  expect(mixedCurrencyBudgetSummary.presupuestos.find(item => item.categoriaNombre === 'Transporte'))
    .toMatchObject({ moneda: 'USD', montoGastado: 0 });
  expect(mixedCurrencyBudgetSummary.resumenPorMoneda).toContainEqual(
    expect.objectContaining({ moneda: 'MXN', totalPresupuestado: 120, totalGastado: 15 })
  );
  expect(mixedCurrencyBudgetSummary.resumenPorMoneda).toContainEqual(
    expect.objectContaining({ moneda: 'USD', totalPresupuestado: 50, totalGastado: 0 })
  );

  await page.getByRole('link', { name: 'Categorías' }).click();
  const categoryCard = page.getByRole('article').filter({ hasText: 'E2E Pruebas' });
  await categoryCard.getByRole('button', { name: 'Editar E2E Pruebas' }).click();
  await page.getByLabel('Tipo', { exact: true }).selectOption('INGRESO');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('alert')).toContainText('No se puede cambiar el tipo');
  await page.getByLabel('Tipo', { exact: true }).selectOption('GASTO');
  await page.getByLabel('Nombre', { exact: true }).fill('E2E Categoría editada');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('heading', { name: 'E2E Categoría editada' })).toBeVisible();
  await page.getByRole('button', { name: 'Archivar E2E Categoría editada' }).click();
  await page.getByRole('button', { name: 'Archivadas' }).click();
  await expect(page.getByRole('heading', { name: 'E2E Categoría editada' })).toBeVisible();
  await page.getByRole('button', { name: 'Restaurar' }).click();
  await page.getByRole('button', { name: 'Activas', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'E2E Categoría editada' })).toBeVisible();

  await page.getByRole('link', { name: 'Cuentas' }).click();
  const inactiveAccountCard = page.getByRole('article').filter({ hasText: 'E2E Ahorro USD' });
  await inactiveAccountCard.getByRole('button', { name: 'Desactivar' }).click();
  await page.getByRole('button', { name: 'Desactivar', exact: true }).last().click();
  await page.getByRole('button', { name: 'Inactivas' }).click();
  const archivedAccount = page.getByRole('article').filter({ hasText: 'E2E Ahorro USD' });
  await expect(archivedAccount).toBeVisible();
  await archivedAccount.getByRole('button', { name: 'Reactivar' }).click();
  await page.getByRole('button', { name: 'Activas', exact: true }).click();
  await expect(page.getByRole('article').filter({ hasText: 'E2E Ahorro USD' })).toBeVisible();

  await page.getByRole('link', { name: 'Movimientos' }).click();
  await page.getByRole('button', { name: 'Gastos', exact: true }).click();
  await expect(page.getByText('E2E gasto MXN')).toBeVisible();
  await expect(page.getByText('E2E ingreso USD')).toHaveCount(0);
  await page.getByRole('button', { name: 'Todos', exact: true }).click();
  await page.getByRole('button', { name: 'Transferencias' }).click();
  const transferRow = page.getByRole('row').filter({ hasText: 'E2E cambio USD a MXN' });
  await expect(transferRow).toBeVisible();
  await transferRow.getByTitle('Eliminar movimiento').click({ force: true });
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByText('E2E cambio USD a MXN')).toHaveCount(0);
  const sameCurrencyRow = page.getByRole('row').filter({ hasText: 'E2E transferencia misma moneda' });
  await sameCurrencyRow.getByTitle('Eliminar movimiento').click({ force: true });
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByText('E2E transferencia misma moneda')).toHaveCount(0);

  cuentas = await apiGet<Cuenta[]>(page, '/cuentas?incluirInactivas=true');
  expect(cuentas.find(cuenta => cuenta.nombre === 'E2E Ahorro USD')?.saldoActual).toBe(120);
  expect(cuentas.find(cuenta => cuenta.nombre === 'E2E Cuenta MXN')?.saldoActual).toBe(35);
  summary = await apiGet(page, '/dashboard/resumen');
  expect(summary.resumenPorMoneda.find(item => item.moneda === 'USD')?.balanceTotal).toBe(120);

  await page.getByRole('button', { name: 'Ingresos', exact: true }).click();
  const incomeRow = page.getByRole('row').filter({ hasText: 'E2E ingreso USD' });
  await incomeRow.getByTitle('Eliminar movimiento').click({ force: true });
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByText('E2E ingreso USD')).toHaveCount(0);
  cuentas = await apiGet<Cuenta[]>(page, '/cuentas?incluirInactivas=true');
  expect(cuentas.find(cuenta => cuenta.nombre === 'E2E Ahorro USD')?.saldoActual).toBe(100);

  await page.getByRole('link', { name: 'Presupuestos' }).click();
  await budgetCard(page, 'E2E Categoría editada').getByTitle('Eliminar meta de presupuesto').click();
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByRole('heading', { name: 'E2E Categoría editada', exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Salir' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Correo Electrónico').fill(email);
  await page.getByLabel('Contraseña').fill('Pruebas123');
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Hola, Usuario E2E.')).toBeVisible();
  expect(pageErrors).toEqual([]);
});
