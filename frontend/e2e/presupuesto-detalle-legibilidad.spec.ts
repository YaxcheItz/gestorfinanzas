import { test, expect } from '@playwright/test';
import { createSectionsFixture } from './secciones-fixture';

test('presupuestos con importes largos y detalle ampliado conservan cierre y legibilidad', async ({ browser, baseURL }, info) => {
  const { c, p, origin, writes, pageErrors } = await createSectionsFixture(browser, baseURL!);
  const presupuesto = { id: 51, categoriaId: 1, categoriaNombre: 'Alimentación y compras del hogar de prueba', listaNombre: 'Hogar ficticio para compras familiares', montoLimite: 123456.78, montoGastado: 98765.43, montoDisponible: 24691.35, porcentajeConsumido: 80, moneda: 'MXN', mes: 11, anio: 2026, estado: 'ALERTA' };
  let limiteDetalle = presupuesto.montoLimite;
  await p.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (route.request().method() !== 'GET') return route.fallback();
    if (url.pathname === '/api/presupuestos') return route.fulfill({ json: { success: true, data: { mes: 11, anio: 2026, presupuestos: [presupuesto], resumenPorMoneda: [{ moneda: 'MXN', totalPresupuestado: 123456.78, totalGastado: 98765.43, totalDisponible: 24691.35, porcentajeConsumido: 80 }] } } });
    if (url.pathname === '/api/presupuestos/51/detalle') return route.fulfill({ json: { success: true, data: {
      presupuesto: { ...presupuesto, montoLimite: limiteDetalle }, movimientos: [],
    } } });
    return route.fallback();
  });
  try {
    await p.emulateMedia({ reducedMotion: 'reduce' });
    for (const [width, font, dark] of [[390, '100%', true], [1280, '100%', true], [320, '200%', true], [320, '200%', false]] as const) {
      await p.setViewportSize({ width, height: 844 });
      await p.goto(origin + '/presupuestos');
      await expect(p.locator('.budget-overview')).toBeVisible();
      await p.evaluate(({ font, dark }) => { document.documentElement.style.fontSize = font; document.documentElement.classList.toggle('dark', dark); }, { font, dark });
      await p.evaluate(() => document.fonts.ready);
      const totals = p.locator('.budget-overview__totals');
      if (font === '200%') {
        const cells = await totals.locator(':scope > div').evaluateAll(elements => elements.map(e => e.getBoundingClientRect().toJSON()));
        expect(cells[1].top).toBeGreaterThanOrEqual(cells[0].bottom);
      }
      await p.getByRole('button', { name: /Ver detalle y movimientos de/ }).click();
      const dialog = p.getByRole('dialog');
      await expect(dialog).toBeVisible();
      const close = p.getByRole('button', { name: 'Cerrar detalle', exact: true });
      const box = await close.boundingBox();
      const panel = await dialog.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.x).toBeGreaterThanOrEqual(panel!.x);
      expect(box!.x + box!.width).toBeLessThanOrEqual(panel!.x + panel!.width);
      expect(box!.y + box!.height).toBeLessThanOrEqual(844);
      expect(await dialog.evaluate(e => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
      await expect(dialog.locator('..')).toHaveCSS('background-color', dark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(15, 23, 42, 0.6)');
      const amount = dialog.locator('.budget-detail-totals > div').first().locator('p').last();
      await expect(amount).toHaveText('MX$123,456.78');
      await p.screenshot({ path: info.outputPath(`detalle-${width}-${font}-${dark}.png`) });
      expect(await amount.evaluate(el => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return new Set([...range.getClientRects()].filter(rect => rect.width > 0).map(rect => rect.top)).size;
      })).toBe(1);
      await close.click();
      await expect(dialog).toHaveCount(0);
      await expect(p.getByRole('button', { name: /Ver detalle y movimientos de/ })).toBeFocused();
    }
    limiteDetalle = 9999999999999.99;
    await p.getByRole('button', { name: /Ver detalle y movimientos de/ }).click();
    const dialog = p.getByRole('dialog');
    const amount = dialog.locator('.budget-detail-totals > div').first().locator('p').last();
    await expect(amount).toHaveText('MX$9,999,999,999,999.99');
    expect(await amount.evaluate(el => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const index = node.textContent!.lastIndexOf('999.99');
        if (index === -1) continue;
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + '999.99'.length);
        return range.getClientRects().length === 1 && el.scrollWidth <= el.clientWidth + 1;
      }
      return false;
    })).toBe(true);
    await amount.scrollIntoViewIfNeeded();
    await p.screenshot({ path: info.outputPath('detalle-importe-maximo.png') });
    await p.evaluate(() => localStorage.setItem('kaptal_ocultar_montos_995', 'true'));
    await p.reload();
    await p.getByRole('button', { name: /Ver detalle y movimientos de/ }).click();
    await expect(dialog.locator('.budget-detail-totals > div > p:last-child')).toHaveText(['•••', '•••', '•••']);
    expect(writes).toEqual([]);
    expect(pageErrors).toEqual([]);
  } finally { await c.close(); }
});

for (const dark of [false, true]) {
  test(`Presupuestos distingue categorías y monedas al ampliar texto · ${dark ? 'oscuro' : 'claro'}`, async ({ browser, baseURL }, info) => {
    const { c, p, writes, pageErrors } = await createSectionsFixture(browser, baseURL!);
    const names = ['Alimentación y compras del hogar de primera necesidad', 'Alimentación y compras del hogar para celebraciones'];
    await p.route('**/api/categorias', route => route.request().method() === 'GET' ? route.fulfill({ json: {
      success: true, data: names.map((nombre, index) => ({ id: index + 1, nombre, activo: true, tipo: 'GASTO' })),
    } }) : route.fallback());
    try {
      await p.setViewportSize({ width: 320, height: 844 });
      await p.goto('/presupuestos');
      await p.getByRole('button', { name: 'Fijar Presupuesto', exact: true }).first().click();
      const form = p.getByRole('dialog', { name: 'Fijar Presupuesto' });
      await p.evaluate(darkTheme => {
        document.documentElement.style.fontSize = '200%';
        document.documentElement.classList.toggle('dark', darkTheme);
      }, dark);
      await p.evaluate(() => document.fonts.ready);
      const category = form.getByRole('combobox', { name: 'Categoría', exact: true });
      const currency = form.getByRole('combobox', { name: 'Moneda del presupuesto' });
      const selectedCategory = form.locator('#modalCat + .budget-select-value');
      const selectedCurrency = form.locator('#modalMoneda + .budget-select-value');
      await expect(selectedCurrency).toHaveText('MXN — Peso mexicano');
      await category.selectOption({ label: names[0] });
      await currency.selectOption({ label: 'USD — Dólar estadounidense' });
      await category.scrollIntoViewIfNeeded();
      await p.screenshot({ path: info.outputPath('seleccion-320-200.png') });
      await expect(selectedCategory).toHaveText(names[0]);
      await expect(selectedCurrency).toHaveText('USD — Dólar estadounidense');
      await category.selectOption({ label: names[1] });
      await expect(selectedCategory).toHaveText(names[1]);
      const nativeStyle = await form.locator('#modalLista').evaluate(el => {
        const style = getComputedStyle(el);
        return { background: style.backgroundColor, border: style.borderTopColor };
      });
      for (const [selection, word] of [[selectedCategory, 'celebraciones'], [selectedCurrency, 'estadounidense']] as const) {
        const label = selection.locator('span').first();
        await expect(label).toHaveCSS('font-size', '28px');
        await expect(selection).toHaveCSS('background-color', nativeStyle.background);
        await expect(selection).toHaveCSS('border-top-color', nativeStyle.border);
        expect(await label.evaluate((el, word) => {
          const node = el.firstChild!;
          const start = node.textContent!.indexOf(word);
          if (start === -1) return false;
          const range = document.createRange();
          range.setStart(node, start);
          range.setEnd(node, start + word.length);
          return range.getClientRects().length === 1 && el.scrollWidth <= el.clientWidth + 1;
        }, word), `La palabra «${word}» queda en una línea y cabe en el selector`).toBe(true);
      }
      await currency.scrollIntoViewIfNeeded();
      await p.screenshot({ path: info.outputPath('moneda-320-200.png') });
      await form.getByRole('button', { name: 'Cerrar formulario de presupuesto' }).focus();
      await p.keyboard.press('Tab');
      await expect(category).toBeFocused();
      await expect(selectedCategory).toHaveCSS('outline-style', 'solid');
      await p.keyboard.press('Escape');
      await expect(form).toHaveCount(0);
      expect(writes).toEqual([]);
      expect(pageErrors).toEqual([]);
    } finally { await c.close(); }
  });
}
