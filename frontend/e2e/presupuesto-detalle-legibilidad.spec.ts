import { test, expect } from '@playwright/test';
import { createSectionsFixture } from './secciones-fixture';

test('presupuestos con importes largos y detalle ampliado conservan cierre y legibilidad', async ({ browser, baseURL }, info) => {
  const { c, p, origin, writes, pageErrors } = await createSectionsFixture(browser, baseURL!);
  const presupuesto = { id: 51, categoriaId: 1, categoriaNombre: 'Alimentación y compras del hogar de prueba', listaNombre: 'Hogar ficticio para compras familiares', montoLimite: 123456.78, montoGastado: 98765.43, montoDisponible: 24691.35, porcentajeConsumido: 80, moneda: 'MXN', mes: 11, anio: 2026, estado: 'ALERTA' };
  await p.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (route.request().method() !== 'GET') return route.fallback();
    if (url.pathname === '/api/presupuestos') return route.fulfill({ json: { success: true, data: { mes: 11, anio: 2026, presupuestos: [presupuesto], resumenPorMoneda: [{ moneda: 'MXN', totalPresupuestado: 123456.78, totalGastado: 98765.43, totalDisponible: 24691.35, porcentajeConsumido: 80 }] } } });
    if (url.pathname === '/api/presupuestos/51/detalle') return route.fulfill({ json: { success: true, data: { presupuesto, movimientos: [] } } });
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
      await p.screenshot({ path: info.outputPath(`detalle-${width}-${font}-${dark}.png`) });
      await close.click();
      await expect(dialog).toHaveCount(0);
      await expect(p.getByRole('button', { name: /Ver detalle y movimientos de/ })).toBeFocused();
    }
    expect(writes).toEqual([]);
    expect(pageErrors).toEqual([]);
  } finally { await c.close(); }
});
