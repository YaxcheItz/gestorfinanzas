import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { registrarPrueba } from './registro-helper';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' });
test.setTimeout(180_000);

test('CSV y respaldo descargables, revisión accesible y restauración única conservan saldos e identidad', async ({ page, baseURL }) => {
  // This test creates and restores only synthetic local accounts, never a remote deployment.
  expect(['localhost', '127.0.0.1']).toContain(new URL(baseURL!).hostname);
  const password = 'Password123';
  const createUser = async (name: string) => {
    const email = `backup-${crypto.randomUUID()}@example.test`;
    const result = await registrarPrueba(page.request, { nombre: name, email, password });
    expect(result.ok()).toBeTruthy();
    const data = (await result.json()).data;
    return { email, id: data.id, headers: { Authorization: `Bearer ${data.token}` } };
  };
  const source = await createUser('Origen local');
  const target = await createUser('Destino local');
  const account = await page.request.post('/api/cuentas', {
    headers: source.headers, data: { nombre: 'Débito de ensayo', tipo: 'DEBITO', moneda: 'MXN', saldoInicial: 1500.01 },
  });
  expect(account.ok()).toBeTruthy();
  const accountId = (await account.json()).data.id;
  expect((await page.request.post('/api/cuentas', { headers: source.headers,
    data: { nombre: 'Ahorro USD', tipo: 'AHORRO', moneda: 'USD', saldoInicial: 12.34 } })).ok()).toBeTruthy();
  const list = await page.request.post('/api/listas', { headers: source.headers,
    data: { nombre: 'Ensayo privado', moneda: 'MXN', emoji: '📋' } });
  expect(list.ok()).toBeTruthy();
  const listId = (await list.json()).data.id;
  const description = '=SUM(1+1), café "local"';
  const movement = await page.request.post('/api/transacciones', { headers: source.headers, data: {
    cuentaId: accountId, listaId: listId, tipo: 'GASTO', monto: 123.45, fecha: '2026-10-24',
    descripcion: description, etiquetas: ['#ensayo'],
  } });
  expect(movement.ok()).toBeTruthy();
  const backupResponse = await page.request.get('/api/perfil/respaldo', { headers: source.headers });
  expect(backupResponse.ok()).toBeTruthy();
  expect(backupResponse.headers()['cache-control']).toContain('no-store');
  const backup = await backupResponse.json();
  expect(backup.transacciones).toHaveLength(3); // Two initial balances plus the purchase.
  expect(backup.libroDiario.length).toBeGreaterThan(0);
  expect(backup.historialMovimientos.length).toBeGreaterThan(0);
  const collectKeys = (value: unknown): string[] => value && typeof value === 'object'
    ? Object.entries(value).flatMap(([key, child]) => [key, ...collectKeys(child)]) : [];
  expect(collectKeys(backup).filter(key => /password|token|credential|secreto/i.test(key))).toEqual([]);

  await page.goto('/login');
  await page.getByLabel('Correo electrónico', { exact: true }).fill(source.email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto('/configuracion#backup');
  await expect(page.locator('#backup')).toHaveAttribute('open', '');
  const downloadBackup = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar respaldo', exact: true }).click();
  const downloaded = await downloadBackup;
  expect(downloaded.suggestedFilename()).toMatch(/^kaptal-respaldo-.*\.json$/);
  const downloadedBody = JSON.parse(await readFile((await downloaded.path())!, 'utf8'));
  expect(downloadedBody.transacciones).toEqual(backup.transacciones);
  await page.getByRole('button', { name: 'Cambiar lista', exact: true }).click();
  await page.getByRole('button', { name: 'Cambiar a Ensayo privado', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cambiar lista', exact: true })).toContainText('Ensayo privado');
  const downloadCsv = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar CSV', exact: true }).click();
  const csv = await readFile((await (await downloadCsv).path())!, 'utf8');
  expect(csv).toContain('ID,Fecha,Tipo,Descripción');
  expect(csv).toContain("'=SUM(1+1)");
  expect(csv).toContain('café ""local""');
  expect(csv).not.toContain('SALDO_INICIAL');

  // Change only this local browser's session; the source account remains untouched.
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto('/login');
  await page.locator('#email').fill(target.email); await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto('/configuracion#backup');
  await page.getByLabel('Archivo JSON de Kaptal (máximo 15 MB)', { exact: true }).setInputFiles({
    name: 'respaldo-local.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)),
  });
  const restore = page.getByRole('button', { name: 'Restaurar mis datos', exact: true });
  await expect(restore).toBeVisible(); await expect(restore).toBeDisabled();
  await expect.poll(() => page.evaluate(() => Array.from(document.querySelectorAll<HTMLLinkElement>('link[data-kaptal-style]')).every(link => link.sheet !== null))).toBe(true);
  for (const viewport of [{ width: 320, height: 740 }, { width: 740, height: 320 }]) {
    await page.setViewportSize(viewport);
    for (const dark of [false, true]) {
      await page.evaluate(dark => {
        document.documentElement.style.fontSize = '32px';
        document.documentElement.classList.toggle('dark', dark);
      }, dark);
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      expect((await restore.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('checkbox', { name: /Confirmo restaurar estos datos/ }).check();
  await expect(restore).toBeEnabled(); await restore.click();
  await expect(page).toHaveURL(/dashboard/);
  const restored = await (await page.request.get('/api/perfil/respaldo', { headers: target.headers })).json();
  const balances = (value: typeof backup) => value.cuentas.map((c: { nombre: string; moneda: string; saldoActual: number }) =>
    ({ nombre: c.nombre, moneda: c.moneda, saldoActual: c.saldoActual })).sort((a: { nombre: string }, b: { nombre: string }) => a.nombre.localeCompare(b.nombre));
  expect(balances(restored)).toEqual(balances(backup));
  expect(restored.transacciones).toHaveLength(backup.transacciones.length);
  const restoredPurchase = restored.transacciones.find((t: { tipo: string }) => t.tipo === 'GASTO');
  expect(restoredPurchase).toMatchObject({ descripcion: description, monto: 123.45, etiquetas: ['ensayo'], listaNombre: 'Ensayo privado' });
  expect(restoredPurchase.cuentaId).not.toBe(accountId);
  expect(restoredPurchase.listaId).not.toBe(listId);
  expect(restored.libroDiario).toHaveLength(backup.libroDiario.length);
  expect(restored.historialMovimientos).toHaveLength(backup.historialMovimientos.length);
  expect(restored.perfil).toMatchObject({ nombre: 'Destino local', email: target.email });
  const repeated = await page.request.post('/api/perfil/respaldo/restaurar', { headers: target.headers, data: backup });
  expect([400, 409]).toContain(repeated.status());
  const afterRejected = await (await page.request.get('/api/perfil/respaldo', { headers: target.headers })).json();
  expect(afterRejected.transacciones).toEqual(restored.transacciones);
  expect(balances(afterRejected)).toEqual(balances(restored));
  const sourceAfter = await (await page.request.get('/api/perfil/respaldo', { headers: source.headers })).json();
  expect(sourceAfter.transacciones).toEqual(backup.transacciones);
  expect(balances(sourceAfter)).toEqual(balances(backup));
});
