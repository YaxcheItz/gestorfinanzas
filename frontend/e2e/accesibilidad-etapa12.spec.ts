import { expect, test } from '@playwright/test';
import { registrarPrueba } from './registro-helper';
import { readPageGeometry } from './geometry-helper';

test.use({ viewport: { width: 320, height: 740 }, hasTouch: true, serviceWorkers: 'block' });
test.setTimeout(180_000);

test('pantallas principales conservan nombres accesibles, foco y geometría con letra grande', async ({ page, baseURL }) => {
  expect(['localhost', '127.0.0.1']).toContain(new URL(baseURL!).hostname);
  const email = `a11y-${crypto.randomUUID()}@example.test`, password = 'Password123';
  const registered = await registrarPrueba(page.request, { nombre: 'Accesibilidad local', email, password });
  expect(registered.ok()).toBeTruthy();
  const headers = { Authorization: `Bearer ${(await registered.json()).data.token}` };
  expect((await page.request.post('/api/cuentas', { headers,
    data: { nombre: 'Cuenta de ensayo', tipo: 'DEBITO', moneda: 'MXN', saldoInicial: 12345.67 } })).ok()).toBeTruthy();
  await page.goto('/login');
  await page.locator('#email').fill(email); await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.name));
  const accessibility = await page.context().newCDPSession(page);
  for (const path of ['/dashboard', '/cuentas', '/transacciones', '/presupuestos', '/categorias', '/metas', '/configuracion', '/avisos']) {
    await page.goto(path);
    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect.poll(() => page.evaluate(() => Array.from(document.querySelectorAll<HTMLLinkElement>('link[data-kaptal-style]')).every(link => link.sheet !== null))).toBe(true);
    if (path === '/presupuestos') await expect(page.getByRole('heading', { name: 'Tus categorías', exact: true })).toBeVisible();
    if (path === '/cuentas') await expect(page.locator('.account-card').filter({ hasText: 'Cuenta de ensayo' })).toBeVisible();
    if (path === '/categorias') await expect(page.getByRole('region', { name: 'Categorías personalizadas', exact: true })).toBeVisible();
    if (path === '/categorias') {
      const filters = page.getByRole('group', { name: 'Filtrar categorías', exact: true });
      await expect(filters.getByRole('button', { name: 'Activas', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect(filters.getByRole('button', { name: 'Archivadas', exact: true })).toHaveAttribute('aria-pressed', 'false');
    }
    for (const viewport of [{ width: 320, height: 740 }, { width: 740, height: 320 }]) {
      await page.setViewportSize(viewport);
      for (const appearance of [{ dark: false, font: '' }, { dark: true, font: '' }, { dark: false, font: 'Arial, sans-serif' }, { dark: true, font: 'Arial, sans-serif' }]) {
        const { dark, font } = appearance;
        await page.evaluate(({ dark, font }) => {
          document.documentElement.style.fontSize = '32px';
          document.documentElement.classList.toggle('dark', dark);
          document.querySelector<HTMLElement>('.monai-theme')!.style.fontFamily = font;
        }, appearance);
        await page.evaluate(async () => {
          await document.fonts.ready;
          await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        });
        await expect.poll(() => page.evaluate(readPageGeometry),
          { message: `${path} ${viewport.width} ${dark ? 'dark' : 'light'} ${font || 'system'}` }).toMatchObject({ fits: true });
      }
    }
    const tree = await accessibility.send('Accessibility.getFullAXTree');
    const unnamed = tree.nodes.filter(node => !node.ignored && ['button', 'link', 'textbox', 'searchbox', 'combobox', 'checkbox', 'switch'].includes(node.role?.value)
      && !String(node.name?.value ?? '').trim());
    expect(unnamed.map(node => node.role?.value), path).toEqual([]);
    await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
    await page.setViewportSize({ width: 320, height: 740 });
    const skip = page.getByRole('link', { name: 'Ir al contenido', exact: true });
    await skip.focus(); await skip.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  }
  await page.goto('/cuentas');
  await expect(page.locator('.account-card').filter({ hasText: 'Cuenta de ensayo' })).toContainText(/12[,.]?345[,.]67/);
  await page.goto('/configuracion#appearance');
  const saved = page.waitForResponse(response => new URL(response.url()).pathname === '/api/perfil' && response.request().method() === 'PUT');
  await page.locator('#ocultar-montos').check(); await saved;
  await expect(page.locator('#ocultar-montos')).toBeChecked();
  await page.goto('/cuentas');
  await expect(page.locator('.account-card').filter({ hasText: 'Cuenta de ensayo' })).toBeVisible();
  const hidden = await accessibility.send('Accessibility.getFullAXTree');
  expect(hidden.nodes.filter(node => !node.ignored).map(node => String(node.name?.value ?? '')).join(' ')).not.toMatch(/12[,.]?345[,.]67/);
  expect(errors).toEqual([]);
});
