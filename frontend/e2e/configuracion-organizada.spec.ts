import { expect, test } from '@playwright/test';
import { registrarPrueba } from './registro-helper';

test('configuración organiza opciones y conserva enlaces directos en móvil', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const email = `ajustes-${crypto.randomUUID()}@example.test`, password = 'Password123';
  expect((await registrarPrueba(page.request, { nombre: 'Persona ficticia', email, password })).ok()).toBeTruthy();
  await page.goto('/login');
  await page.locator('#email').fill(email); await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto('/configuracion');
  for (const label of ['Tu cuenta', 'Preferencias y avisos', 'Organiza tus finanzas', 'Tus datos']) {
    await expect(page.getByRole('heading', { name: label, exact: true })).toBeVisible();
  }
  await expect(page.locator('#profile')).not.toHaveAttribute('open', '');
  await page.locator('#profile summary').click();
  await expect(page.getByLabel('Nombre', { exact: true })).toBeVisible();
  await page.locator('#security summary').click();
  await expect(page.getByLabel('Contraseña actual')).toBeVisible();
  await expect(page.locator('#profile')).not.toHaveAttribute('open', '');
  await page.goto('/configuracion#appearance');
  await expect(page.getByRole('button', { name: 'Guardar preferencias' })).toBeVisible();
  await page.goto('/configuracion#backup');
  await expect(page.getByRole('button', { name: 'Descargar respaldo' })).toBeVisible();
  await page.goto('/configuracion#recurring');
  await expect(page.getByRole('button', { name: 'Actualizar movimientos recurrentes' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/configuracion');
  await page.screenshot({ path: testInfo.outputPath('configuracion-movil.png'), fullPage: true });
});
