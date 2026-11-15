import { test, expect, Page } from '@playwright/test';
import { coherenceFixture } from './coherencia-fixture';

const layouts = [[390, 100], [1280, 100], [320, 200]] as const;
async function open(p: Page, path: string, width: number, scale: number, dark: boolean) {
  await p.setViewportSize({ width, height: 844 });
  await p.goto('/' + path);
  await expect(p.locator('#main-content h1').first()).toBeVisible();
  await p.evaluate(({ scale, dark }) => {
    document.documentElement.style.fontSize = `${scale}%`;
    document.documentElement.classList.toggle('dark', dark);
  }, { scale, dark });
  await p.evaluate(() => document.fonts.ready);
}
async function oneLine(p: Page, selector: string) {
  for (const element of await p.locator(selector).all()) {
    expect(await element.evaluate(e => {
      const range = document.createRange(); range.selectNodeContents(e);
      return new Set([...range.getClientRects()].filter(r => r.width > 0).map(r => Math.round(r.top))).size;
    }), selector).toBe(1);
    expect(await element.evaluate(e => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
  }
}
async function wordsWhole(p: Page, selector: string) {
  expect(await p.locator(selector).evaluate(e => {
    const walker = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      for (const match of node.textContent!.matchAll(/\S+/g)) {
        const range = document.createRange();
        range.setStart(node, match.index!); range.setEnd(node, match.index! + match[0].length);
        if ([...range.getClientRects()].filter(r => r.width > 0).length > 1) return false;
      }
    }
    return true;
  })).toBe(true);
}
async function contrast(p: Page, selector: string) {
  return p.locator(selector).evaluate(e => {
    const luminance = (color: string) => color.match(/[\d.]+/g)!.slice(0,3).map(Number).map(v => {
      v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
    }).reduce((sum, v, i) => sum + v * [.2126,.7152,.0722][i], 0);
    let parent: Element | null = e;
    while (parent && getComputedStyle(parent).backgroundColor === 'rgba(0, 0, 0, 0)') parent = parent.parentElement;
    const a = luminance(getComputedStyle(e).color), b = luminance(getComputedStyle(parent!).backgroundColor);
    return (Math.max(a,b) + .05) / (Math.min(a,b) + .05);
  });
}

for (const dark of [false, true]) {
  test(`ingreso y acciones de detalle contrastan en ${dark ? 'oscuro' : 'claro'}`, async ({ browser, baseURL }) => {
    const { c, p, writes, pageErrors } = await coherenceFixture(browser, baseURL!);
    await p.route('**/api/**', r => {
      if (r.request().method() !== 'GET' || new URL(r.request().url()).pathname !== '/api/transacciones') return r.fallback();
      return r.fulfill({ json: { success: true, data: { content: [{ id: 72, cuentaId: 11, cuentaNombre: 'Cuenta ficticia', tipo: 'INGRESO', monto: 28000, moneda: 'MXN', fecha: '2026-11-14', fechaCreacion: '2026-11-14T12:00:00Z', descripcion: 'Ingreso ficticio' }], totalPages: 1, totalElements: 1, number: 0, size: 20, first: true, last: true, empty: false } } });
    });
    try {
      await open(p, 'transacciones', 390, 100, dark);
      await expect(p.locator('.tx-item__amount.is-income strong')).toBeVisible();
      expect(await contrast(p, '.tx-item__amount.is-income strong')).toBeGreaterThanOrEqual(4.5);
      await p.getByRole('button', { name: 'Ver detalle de Ingreso ficticio', exact: true }).click();
      await expect(p.getByRole('dialog', { name: 'Detalle', exact: true })).toBeVisible();
      for (const selector of ['.ledger-detail-sheet__type', '.history-detail-currency', '.ledger-detail-sheet__edit']) {
        expect(await contrast(p, selector), selector).toBeGreaterThanOrEqual(4.5);
      }
      expect(writes).toEqual([]); expect(pageErrors).toEqual([]);
    } finally { await c.close(); }
  });

  test(`calendario mínimo y operable en ${dark ? 'oscuro' : 'claro'}`, async ({ browser, baseURL }, info) => {
    const { c, p, writes, pageErrors } = await coherenceFixture(browser, baseURL!);
    await p.clock.setFixedTime(new Date('2026-11-14T18:00:00Z'));
    try {
      for (const [width, scale] of layouts) {
        await open(p, 'dashboard', width, scale, dark);
        const trigger = p.getByRole('button', { name: /^Seleccionar periodo\. Actual:/ });
        await trigger.click();
        const dialog = p.getByRole('dialog', { name: 'Seleccionar periodo financiero', exact: true });
        await expect(dialog).toBeVisible();
        await expect(dialog.locator('.monai-month-btn')).toHaveCount(12);
        await expect(dialog.getByRole('button', { name: 'Diciembre de 2026', exact: true })).toBeDisabled();
        await expect(dialog.getByRole('button', { name: 'Año siguiente', exact: true })).toBeDisabled();
        for (const button of await dialog.locator('button:not(:disabled)').all()) {
          const box = await button.boundingBox();
          expect(box!.width).toBeGreaterThanOrEqual(44);
          expect(box!.height).toBeGreaterThanOrEqual(44);
        }
        expect(await dialog.locator('.monai-month-short').first().evaluate(e => parseFloat(getComputedStyle(e).fontSize))).toBe(14 * scale / 100);
        expect(await dialog.evaluate(e => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
        await p.screenshot({ path: info.outputPath(`calendario-${width}-${scale}.png`) });
        await dialog.getByRole('button', { name: 'Año anterior', exact: true }).click();
        await expect(dialog.getByRole('button', { name: 'Diciembre de 2025', exact: true })).toBeEnabled();
        await dialog.getByRole('button', { name: 'Año siguiente', exact: true }).click();
        await dialog.getByRole('button', { name: 'Octubre de 2026', exact: true }).click();
        await expect(dialog).toBeHidden();
        await expect(trigger).toHaveAttribute('aria-label', /octubre/i);
        await trigger.click();
        await dialog.getByRole('tab', { name: 'Frecuencias', exact: true }).click();
        await expect(dialog.getByRole('radio', { name: /Semana/ })).toBeVisible();
        await dialog.getByRole('tab', { name: 'Rango libre', exact: true }).click();
        await dialog.locator('input[name="desde"]').fill('2026-11-01');
        await dialog.locator('input[name="hasta"]').fill('2026-11-14');
        await dialog.getByRole('button', { name: 'Aplicar fechas libres', exact: true }).click();
        await expect(dialog).toBeHidden();
        await expect(trigger).toHaveAttribute('aria-label', /1.*14/);
        expect(await p.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      }
      expect(writes).toEqual([]); expect(pageErrors).toEqual([]);
    } finally { await c.close(); }
  });

  test(`historial legible con controles completos en ${dark ? 'oscuro' : 'claro'}`, async ({ browser, baseURL }, info) => {
    const { c, p, writes, pageErrors } = await coherenceFixture(browser, baseURL!);
    try {
      for (const [width, scale] of layouts) {
        await open(p, 'transacciones', width, scale, dark);
        const card = p.locator('.history-page .tx-item').first();
        await expect(card).toBeVisible();
        expect(await card.locator('.tx-item__title').evaluate(e => parseFloat(getComputedStyle(e).fontSize))).toBe(15 * scale / 100);
        expect(await card.locator('.tx-item__amount strong').evaluate(e => parseFloat(getComputedStyle(e).fontSize))).toBe(15 * scale / 100);
        const search = p.getByRole('searchbox', { name: 'Buscar movimientos', exact: true });
        expect((await search.boundingBox())!.width).toBeGreaterThan(width === 320 ? 190 : 100);
        const types = p.getByRole('group', { name: 'Tipo de movimiento', exact: true });
        for (const button of await types.getByRole('button').all()) {
          const box = (await button.boundingBox())!;
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(width);
          await Promise.all([p.waitForResponse(r => new URL(r.url()).pathname === '/api/transacciones'), button.click()]);
          await expect(p.locator('.history-results')).toHaveAttribute('aria-busy', 'false');
          await expect(button).toHaveAttribute('aria-pressed', 'true');
        }
        await Promise.all([p.waitForResponse(r => new URL(r.url()).pathname === '/api/transacciones'), types.getByRole('button', { name: 'Todos', exact: true }).click()]);
        await expect(p.locator('.history-results')).toHaveAttribute('aria-busy', 'false');
        await card.focus(); await p.keyboard.press('Enter');
        const detail = p.getByRole('dialog', { name: 'Detalle', exact: true });
        await expect(detail).toBeVisible(); await expect(detail).toContainText('125.40');
        await p.keyboard.press('Escape'); await expect(detail).toBeHidden(); await expect(card).toBeFocused();
        await p.screenshot({ path: info.outputPath(`historial-${width}-${scale}.png`), fullPage: true });
        expect(await p.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      }
      expect(writes).toEqual([]); expect(pageErrors).toEqual([]);
    } finally { await c.close(); }
  });

  test(`cifras completas, títulos y campo del chat en ${dark ? 'oscuro' : 'claro'}`, async ({ browser, baseURL }, info) => {
    const { c, p, writes, pageErrors } = await coherenceFixture(browser, baseURL!);
    try {
      await open(p, 'cuentas', 320, 200, dark);
      await oneLine(p, '.account-card p.text-xl');
      await expect(p.locator('.account-card').first()).toContainText('Saldo actual · MXN');
      await expect(p.locator('.account-card p.text-xl').first()).toHaveText('9,876,543.21');
      for (const path of ['presupuestos', 'categorias', 'configuracion']) {
        await open(p, path, 320, 200, dark);
        await wordsWhole(p, '#main-content h1');
        if (path === 'presupuestos') {
          await oneLine(p, '.budget-remaining strong, .budget-overview__totals p.text-xl');
          await expect(p.locator('.budget-remaining strong')).toHaveText('1,500.00');
        }
      }
      await open(p, 'dashboard', 320, 200, dark);
      await p.locator('.capture-dock__manual').click();
      const text = p.locator('#quick-capture-text');
      await expect(text).toBeVisible();
      expect((await text.boundingBox())!.width).toBeGreaterThanOrEqual(220);
      await text.fill('Texto ficticio para revisar el ancho del campo');
      await expect(text).toHaveValue('Texto ficticio para revisar el ancho del campo');
      await p.screenshot({ path: info.outputPath('chat-320-200.png') });
      expect(await p.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
      expect(writes).toEqual([]); expect(pageErrors).toEqual([]);
    } finally { await c.close(); }
  });
}
