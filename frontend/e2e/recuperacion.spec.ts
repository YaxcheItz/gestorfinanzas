import { expect, test, type Page } from '@playwright/test';

const password = 'Password123';

async function iniciar(page: Page) {
  const email = `e2e-${crypto.randomUUID()}@example.test`;
  const response = await page.request.post('/api/auth/registro', {
    data: { nombre: 'Prueba recuperación', email, password }
  });
  expect(response.ok()).toBeTruthy();
  const auth = (await response.json()).data;
  const headers = { Authorization: `Bearer ${auth.token}` };
  const cuentaResponse = await page.request.post('/api/cuentas', {
    headers, data: { nombre: 'Banco E2E', tipo: 'DEBITO', moneda: 'MXN', saldoInicial: 1000 }
  });
  expect(cuentaResponse.ok()).toBeTruthy();
  const cuenta = (await cuentaResponse.json()).data;
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  return { headers, cuenta };
}

async function abrirChat(page: Page) {
  await page.getByRole('button', { name: 'Añadir movimiento', exact: true }).click();
  await expect(page.locator('#quick-capture-text')).toBeVisible();
}

test('recupera propuesta tras recarga, confirma una vez y conserva saldo', async ({ page }) => {
  const errores: string[] = [];
  page.on('pageerror', error => errores.push(error.message));
  const { headers, cuenta } = await iniciar(page);
  await abrirChat(page);
  await page.locator('#quick-capture-text').fill('Gasté 25 en Banco E2E');
  await page.getByRole('button', { name: 'Enviar movimiento' }).click();
  await expect(page.getByRole('button', { name: /Guardar (sin categoría|movimiento)/ }).first()).toBeVisible();
  const pendientes = (await (await page.request.get('/api/asistente/acciones', { headers })).json()).data;
  expect(pendientes).toHaveLength(1);
  const antes = (await (await page.request.get('/api/cuentas', { headers })).json()).data;
  expect(antes.find((c: { id: number }) => c.id === cuenta.id).saldoActual).toBe(1000);
  await page.reload();
  await abrirChat(page);
  await expect(page.getByRole('button', { name: /Guardar (sin categoría|movimiento)/ }).first()).toBeVisible();
  await page.getByRole('button', { name: /Guardar (sin categoría|movimiento)/ }).first().click();
  await expect.poll(async () => {
    const cuentas = (await (await page.request.get('/api/cuentas', { headers })).json()).data;
    return cuentas.find((c: { id: number }) => c.id === cuenta.id).saldoActual;
  }).toBe(975);
  const reintento = await page.request.post(`/api/asistente/acciones/${pendientes[0].id}/confirmar`, {
    headers, data: { version: pendientes[0].version }
  });
  expect(reintento.ok()).toBeTruthy();
  const despues = (await (await page.request.get('/api/cuentas', { headers })).json()).data;
  expect(despues.find((c: { id: number }) => c.id === cuenta.id).saldoActual).toBe(975);
  const movimientos = (await (await page.request.get('/api/transacciones?size=100', { headers })).json()).data;
  expect(movimientos.content.filter((t: { tipo: string }) => t.tipo === 'GASTO')).toHaveLength(1);
  expect(errores).toEqual([]);
});

test('descartar propuesta no registra gasto ni modifica saldo', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { headers, cuenta } = await iniciar(page);
  await abrirChat(page);
  await page.locator('#quick-capture-text').fill('Recibí 50 en Banco E2E');
  await page.getByRole('button', { name: 'Enviar movimiento' }).click();
  await page.getByRole('button', { name: 'Salario', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Descartar', exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Descartar', exact: true }).first().click();
  await expect.poll(async () => (await (await page.request.get('/api/asistente/acciones', { headers })).json()).data.length).toBe(0);
  const cuentas = (await (await page.request.get('/api/cuentas', { headers })).json()).data;
  expect(cuentas.find((c: { id: number }) => c.id === cuenta.id).saldoActual).toBe(1000);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test('ingreso, transferencia y restauración financiera conservan importes y propietario', async ({ page }) => {
  const { headers, cuenta } = await iniciar(page);
  const ahorroResponse = await page.request.post('/api/cuentas', {
    headers, data: { nombre: 'Reserva', tipo: 'AHORRO', moneda: 'MXN', saldoInicial: 0 }
  });
  expect(ahorroResponse.ok()).toBeTruthy();
  const ahorro = (await ahorroResponse.json()).data;
  await abrirChat(page);
  await page.locator('#quick-capture-text').fill('Recibí 50 de salario en Banco E2E');
  await page.getByRole('button', { name: 'Enviar movimiento' }).click();
  await page.getByRole('button', { name: /Guardar (sin categoría|movimiento)/ }).first().click();
  await expect.poll(async () => {
    const cuentas = (await (await page.request.get('/api/cuentas', { headers })).json()).data;
    return cuentas.find((c: { id: number }) => c.id === cuenta.id).saldoActual;
  }).toBe(1050);
  await page.locator('#quick-capture-text').fill('Transferí 100 de Banco E2E a Reserva');
  await page.getByRole('button', { name: 'Enviar movimiento' }).click();
  await page.getByRole('button', { name: 'Guardar movimiento', exact: true }).first().click();
  await expect.poll(async () => {
    const cuentas = (await (await page.request.get('/api/cuentas', { headers })).json()).data;
    return cuentas.find((c: { id: number }) => c.id === ahorro.id).saldoActual;
  }).toBe(100);
  const archivoResponse = await page.request.get('/api/perfil/respaldo', { headers });
  expect(archivoResponse.ok()).toBeTruthy();
  const archivo = await archivoResponse.json();
  expect(archivo.version).toBe(3);
  const nuevoResponse = await page.request.post('/api/auth/registro', {
    data: { nombre: 'Destino respaldo', email: `restore-${crypto.randomUUID()}@example.test`, password }
  });
  expect(nuevoResponse.ok()).toBeTruthy();
  const nuevo = (await nuevoResponse.json()).data;
  const destinoHeaders = { Authorization: `Bearer ${nuevo.token}` };
  const preview = await page.request.post('/api/perfil/respaldo/previsualizar', { headers: destinoHeaders, data: archivo });
  expect(preview.ok()).toBeTruthy();
  const restauracion = await page.request.post('/api/perfil/respaldo/restaurar', { headers: destinoHeaders, data: archivo });
  expect(restauracion.ok()).toBeTruthy();
  const cuentasRestauradas = (await (await page.request.get('/api/cuentas', { headers: destinoHeaders })).json()).data;
  expect(cuentasRestauradas.find((c: { nombre: string }) => c.nombre === 'Banco E2E').saldoActual).toBe(950);
  expect(cuentasRestauradas.find((c: { nombre: string }) => c.nombre === 'Reserva').saldoActual).toBe(100);
  const perfil = (await (await page.request.get('/api/perfil', { headers: destinoHeaders })).json()).data;
  expect(perfil.id).toBe(nuevo.id);
  const propuestasRestauradas = (await (await page.request.get('/api/asistente/acciones', { headers: destinoHeaders })).json()).data;
  expect(propuestasRestauradas).toEqual([]);
});
