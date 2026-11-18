import { expect, test } from '@playwright/test';
import { createSectionsFixture } from './secciones-fixture';

// Los estilos globales conservan transiciones de 0,01 ms con movimiento reducido.
async function settle(p: import('@playwright/test').Page) {
  await p.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

for (const dark of [false, true]) {
  test(`Reportes conserva cada cifra completa con texto ampliado · ${dark ? 'oscuro' : 'claro'}`, async ({ browser, baseURL }, info) => {
    const { c, p, writes, pageErrors } = await createSectionsFixture(browser, baseURL!);
    let amounts = [28000, 500, 27500];
    let currency = 'MXN';
    await p.route('**/api/dashboard/resumen?*', route => route.fulfill({ json: { success: true, data: {
      resumenPorMoneda: [{ moneda: currency, ingresosMes: amounts[0], gastosMes: amounts[1], balanceMes: amounts[2] }]
    } } }));
    try {
      await p.clock.setFixedTime(new Date('2026-11-14T18:00:00Z'));
      await p.emulateMedia({ reducedMotion: 'reduce' });
      for (const [width, scale] of [[320, 200], [320, 100], [390, 100], [390, 200], [1280, 100], [1280, 200]]) {
        await p.setViewportSize({ width, height: 844 });
        for (const large of [false, true]) {
          amounts = large ? [9876543.21, 0, -9876543.21] : [28000, 500, 27500];
          currency = large ? 'USD' : 'MXN';
          await p.goto('/reportes');
          const totals = p.locator('.reports-summary strong');
          await expect(totals).toHaveCount(3);
          if (large) await p.locator('.reports-filters select').selectOption(currency);
          await p.evaluate(({ dark, scale }) => {
            document.documentElement.classList.toggle('dark', dark);
            document.documentElement.style.fontSize = scale + '%';
          }, { dark, scale });
          await p.evaluate(() => document.fonts.ready);
          await settle(p);
          await expect(totals.first()).toHaveCSS('font-size', `${(width <= 639 ? 20 : 26.4) * scale / 100}px`);
          if (width !== 320 || scale !== 100) {
            await p.screenshot({ path: info.outputPath(`reportes-${width}-${scale}-${dark ? 'dark' : 'light'}-${large ? 'large' : 'ordinary'}.png`), fullPage: true });
          }
          for (const [index, total] of (await totals.all()).entries()) {
            const geometry = await total.evaluate(e => {
              const range = document.createRange(); range.selectNodeContents(e);
              return { lines: new Set([...range.getClientRects()].map(r => Math.round(r.top))).size,
                font: parseFloat(getComputedStyle(e).fontSize), scroll: e.scrollWidth, client: e.clientWidth };
            });
            expect(geometry.lines, `cifra ${amounts[index]} a ${width}px/${scale}%`).toBe(1);
            expect(geometry.scroll).toBeLessThanOrEqual(geometry.client + 1);
            await expect(total).toHaveText(new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amounts[index]));
            await expect(total.locator('..')).toContainText(currency);
            await p.evaluate(() => document.documentElement.style.fontSize = '100%');
            await settle(p);
            await expect(total).toHaveCSS('font-size', width <= 639 ? '20px' : '26.4px');
            const normal = await total.evaluate(e => parseFloat(getComputedStyle(e).fontSize));
            expect(geometry.font / normal, JSON.stringify({ index, width, scale, geometry, normal })).toBeCloseTo(scale / 100, 1);
            await p.evaluate(scale => document.documentElement.style.fontSize = scale + '%', scale);
            await settle(p);
            await expect(total).toHaveCSS('font-size', `${(width <= 639 ? 20 : 26.4) * scale / 100}px`);
          }
          if (width === 1280) {
            const columns = await p.locator('.reports-summary').evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length);
            expect(columns).toBe(scale === 100 ? 3 : 2);
          }
          expect(await p.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
        }
      }
      amounts = [999999999999.99, 0, -999999999999.99];
      await p.setViewportSize({ width: 320, height: 844 }); await p.goto('/reportes');
      await p.locator('.reports-filters select').selectOption(currency);
      await p.evaluate(() => document.documentElement.style.fontSize = '200%');
      await settle(p);
      const extreme = p.locator('.reports-summary strong').first();
      await expect(extreme).toHaveText('999,999,999,999.99');
      expect(await extreme.evaluate(e => e.scrollWidth > e.clientWidth)).toBe(true);
      await extreme.focus(); await expect(extreme).toBeFocused();
      await p.keyboard.press('ArrowRight');
      await expect.poll(() => extreme.evaluate(e => e.scrollLeft)).toBeGreaterThan(0);
      expect(await p.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
      expect(writes).toEqual([]); expect(pageErrors).toEqual([]);
    } finally { await c.close(); }
  });

  test(`Reportes oculta también el cero y el signo negativo · ${dark ? 'oscuro' : 'claro'}`, async ({ browser, baseURL }) => {
    const { c, p, writes, pageErrors } = await createSectionsFixture(browser, baseURL!);
    await p.route('**/api/perfil', route => route.fulfill({ json: { success: true, data: {
      id: 995, nombre: 'Persona ficticia', email: 'reportes@example.test', tema: dark ? 'OSCURO' : 'CLARO', ocultarMontos: true
    } } }));
    await p.route('**/api/dashboard/resumen?*', route => route.fulfill({ json: { success: true, data: {
      resumenPorMoneda: [{ moneda: 'MXN', ingresosMes: 9876543.21, gastosMes: 0, balanceMes: -9876543.21 }]
    } } }));
    try {
      await p.setViewportSize({ width: 320, height: 844 }); await p.goto('/reportes');
      await p.evaluate(() => document.documentElement.style.fontSize = '200%');
      await expect(p.locator('.reports-summary strong')).toHaveText(['•••', '•••', '•••']);
      await expect(p.locator('.reports-summary')).not.toContainText('9,876');
      await expect(p.locator('.reports-summary')).not.toContainText('-');
      expect(writes).toEqual([]); expect(pageErrors).toEqual([]);
    } finally { await c.close(); }
  });
}
