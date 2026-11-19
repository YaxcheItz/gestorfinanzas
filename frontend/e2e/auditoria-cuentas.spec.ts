import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 320, height: 740 }, timezoneId:'UTC', hasTouch: true, serviceWorkers: 'block' });

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-21T12:00:00-06:00'));
  await page.addInitScript(() => {
    localStorage.setItem('finanzas_token', `test.${btoa(JSON.stringify({exp:2000000000}))}.synthetic`);
    localStorage.setItem('finanzas_user', JSON.stringify({id:996,nombre:'Auditoría',email:'auditoria@example.test'}));
  });
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith('/perfil')) data = {id:996,nombre:'Auditoría',email:'auditoria@example.test',tema:'CLARO',monedaPredeterminada:'MXN'};
    if (path.endsWith('/cuentas')) data = [{
      id:1,nombre:'Cuenta'.repeat(16),descripcion:'Descripción'.repeat(20),tipo:'CREDITO',moneda:'MXN',
      saldoActual:-999999999.99,limiteCredito:9999999999.99,diaCorte:10,diaPago:15,activo:true,
    }];
    await route.fulfill({json:{success:true,data}});
  });
});

test('la tarjeta muestra el día de pago guardado y permite editarlo', async ({ page }) => {
  await page.goto('/cuentas');
  const card = page.locator('.account-card');
  await expect(card).toContainText('17 nov 2026');
  await expect(card).toContainText('Base: 15 nov 2026');
  await expect(card).toContainText('Ajustada por días inhábiles');
  await expect(card).not.toContainText('20 días naturales');
  await card.locator('summary').click();
  await card.getByRole('button',{name:'Editar',exact:true}).click();
  const day = page.getByRole('dialog').locator('#cuenta-dia-pago');
  await expect(day).toHaveValue('15');
  await expect(day).toBeEditable();
  await day.fill('17');
  const request = page.waitForRequest(r => r.method() === 'PUT' && new URL(r.url()).pathname === '/api/cuentas/1');
  await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();
  expect((await request).postDataJSON()).toMatchObject({diaCorte:10,diaPago:17});
});

test('cuentas mantiene importes completos y nombres largos dentro de la tarjeta con texto al 200 %', async ({ page }) => {
  await page.goto('/cuentas');
  await expect(page.locator('.account-card')).toBeVisible();
  for (const size of ['16px','32px']) {
    await page.evaluate(fontSize => document.documentElement.style.fontSize = fontSize, size);
    await expect.poll(() => page.locator('.account-card').evaluate(card => {
      const bounds = card.getBoundingClientRect();
      return Array.from(card.querySelectorAll('p')).every(p => {
        const rect = p.getBoundingClientRect();
        return p.scrollWidth <= p.clientWidth + 1 && rect.right <= bounds.right + 1 && rect.left >= bounds.left - 1;
      });
    })).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  await page.screenshot({path:test.info().outputPath('cuentas-texto-200.png'),fullPage:true});
});

test('un año sin calendario verificado pide confirmar la fecha con el banco', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-01-01T12:00:00-06:00'));
  await page.goto('/cuentas');
  await expect(page.locator('.account-card')).toContainText('15 ene 2027');
  await expect(page.locator('.account-card')).toContainText('Calendario bancario de este año sin verificar');
});

test('conserva el vencimiento pendiente según México aunque el navegador ya esté en el día siguiente', async ({page}) => {
  await page.clock.setFixedTime(new Date('2026-11-18T05:30:00Z'));
  await page.goto('/cuentas');
  await expect(page.locator('.account-card')).toContainText('17 nov 2026');
  await expect(page.locator('.account-card')).toContainText('Base: 15 nov 2026');
});

for (const dark of [false, true]) {
  test(`alta de cuenta con tipo y confirmación legibles a 320 px y 200 % · ${dark ? 'oscuro' : 'claro'}`, async ({ page, baseURL }, info) => {
    const origin = new URL(baseURL!);
    expect(origin.hostname).toBe('localhost');
    await page.route('**/*', route => new URL(route.request().url()).origin === origin.origin ? route.fallback() : route.abort());
    await page.goto('/cuentas');
    await page.getByRole('button', { name: /Agregar cuenta/ }).click();
    const form = page.getByRole('dialog', { name: 'Agregar cuenta' });
    await page.evaluate(darkTheme => {
      document.documentElement.style.fontSize = '200%';
      document.documentElement.classList.toggle('dark', darkTheme);
    }, dark);
    await page.evaluate(() => document.fonts.ready);
    const type = form.getByRole('combobox', { name: 'Tipo de cuenta' });
    const selected = form.locator('.account-type-value');
    await form.locator('#cuenta-nombre').focus();
    await page.keyboard.press('Tab');
    await expect(type).toBeFocused();
    await expect(selected).toHaveCSS('outline-style', 'solid');
    await type.selectOption({ label: 'Cuenta de Ahorro' });
    await expect(selected).toHaveText('Cuenta de Ahorro');
    await type.selectOption({ label: 'Tarjeta de Crédito' });
    await expect(form.locator('#cuenta-dia-pago')).toHaveAccessibleDescription(/Indica el día base de pago/);
    for (const help of ['nombre', 'dia-pago', 'cashback', 'saldo']) {
      await expect(form.locator(`#cuenta-${help}-ayuda`)).toHaveCSS('font-size', '24px');
    }
    await type.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath('tipo-320-200.png') });
    await expect(selected).toHaveText('Tarjeta de Crédito');
    const text = selected.locator('span').first();
    await expect(text).toHaveCSS('font-size', '28px');
    expect(await text.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await form.locator('#cuenta-nombre').fill('Tarjeta ficticia de prueba');
    await form.locator('#cuenta-limite-credito').fill('1200');
    await form.locator('#cuenta-dia-corte').fill('12');
    await form.locator('#cuenta-dia-pago').fill('29');
    const request = page.waitForRequest(r => r.method() === 'POST' && new URL(r.url()).pathname === '/api/cuentas');
    await form.getByRole('button', { name: 'Crear cuenta' }).click();
    expect((await request).postDataJSON()).toMatchObject({ tipo: 'CREDITO', diaCorte: 12, diaPago: 29 });
    await expect(form).toHaveCount(0);
    const toast = page.locator('.toast-notification').filter({ hasText: 'Cuenta creada correctamente.' });
    const message = toast.locator('.toast-notification__message');
    await expect(message).toHaveCSS('font-size', '24px');
    await page.screenshot({ path: info.outputPath('confirmacion-320-200.png') });
    const geometry = await message.evaluate(el => {
      const range = document.createRange();
      const node = el.firstChild!;
      range.setStart(node, node.textContent!.indexOf('correctamente'));
      range.setEnd(node, node.textContent!.length);
      const box = el.closest('.toast-notification')!.getBoundingClientRect();
      return { lines: range.getClientRects().length, fits: box.top >= 0 && box.bottom <= innerHeight };
    });
    expect(geometry).toEqual({ lines: 1, fits: true });
    await toast.getByRole('button', { name: 'Cerrar notificación' }).click();
    await expect(toast).toHaveCount(0);
  });
}
