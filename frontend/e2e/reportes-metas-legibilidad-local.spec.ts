import { test, expect } from '@playwright/test';
import { createSectionsFixture } from './secciones-fixture';

test('seis meses ampliados conservan etiquetas separadas de la tabla y cifras accesibles con teclado', async ({ browser, baseURL }, info) => {
  const { c, p, origin, writes, pageErrors } = await createSectionsFixture(browser, baseURL!);
  await p.route('**/api/dashboard/analitica?*', route => route.fulfill({ json: { success: true, data: { gastosPorCategoria: [], ultimosSeisMeses: Array.from({ length: 6 }, (_, i) => ({ anio: 2026, mes: i + 6, ingresos: i === 5 ? 28000 : 10000 + i * 2000, gastos: i === 5 ? 3456.78 : 2000 + i * 300, moneda: 'MXN' })) } } }));
  try {
    await p.emulateMedia({ reducedMotion: 'reduce' });
    for (const [width, font, dark] of [[320, '200%', true], [320, '200%', false], [390, '100%', true], [1280, '100%', true]] as const) {
      await p.setViewportSize({ width, height: 844 });
      await p.goto(origin + '/reportes');
      const chart = p.locator('.trend-chart');
      await expect(chart.locator('small')).toHaveCount(6);
      await p.evaluate(({ font, dark }) => { document.documentElement.style.fontSize = font; document.documentElement.classList.toggle('dark', dark); }, { font, dark });
      await p.evaluate(() => document.fonts.ready);
      await p.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      const geometry = await p.evaluate(() => {
        const chart = document.querySelector<HTMLElement>('.trend-chart')!;
        const range = (e: Element) => { const r = document.createRange(); r.selectNodeContents(e); return r.getBoundingClientRect().toJSON(); };
        return { labels: [...chart.querySelectorAll('small')].map(range), summary: range(document.querySelector('.report-table summary')!), scroll: chart.scrollWidth, client: chart.clientWidth };
      });
      expect(await p.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))).toBe(font === '200%' ? 32 : 16);
      expect(Math.max(...geometry.labels.map(label => label.bottom))).toBeLessThan(geometry.summary.top);
      if (font === '100%') expect(geometry.scroll).toBeLessThanOrEqual(geometry.client);
      if (font === '200%') {
        expect(geometry.scroll).toBeGreaterThan(geometry.client);
        await chart.evaluate(e => e.scrollLeft = e.scrollWidth);
        const last = await chart.locator('small').last().boundingBox();
        const box = await chart.boundingBox();
        expect(last!.x + last!.width).toBeLessThanOrEqual(box!.x + box!.width + 1);
      }
      const summary = p.locator('.report-table summary');
      await summary.focus();
      await summary.press('Shift+Tab');
      await expect(chart).not.toBeFocused();
      await summary.focus();
      await summary.press('Enter');
      await expect(p.locator('.report-table table')).toBeVisible();
      await expect(p.locator('.report-table tbody tr')).toHaveCount(6);
      expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await p.screenshot({ path: info.outputPath(`reportes-${width}-${font}-${dark}.png`) });
    }
    expect(writes).toEqual([]); expect(pageErrors).toEqual([]);
  } finally { await c.close(); }
});

test('metas amplía controles y conserva acciones breves con el nombre accesible completo', async ({ browser, baseURL }, info) => {
  const { c, p, origin, writes, pageErrors } = await createSectionsFixture(browser, baseURL!);
  const name = 'Meta ficticia para vacaciones familiares y gastos extraordinarios';
  await p.route('**/api/cuentas*', route => route.fulfill({ json: { success: true, data: [{ id: 11, nombre: 'Origen ficticio', tipo: 'DEBITO', saldoActual: 200000, moneda: 'MXN', activo: true, fechaCreacion: '2026-11-01' }, { id: 22, nombre: name, tipo: 'AHORRO', saldoActual: 98765.43, metaObjetivo: 123456.78, metaCancelada: false, moneda: 'MXN', activo: true, fechaCreacion: '2026-11-01' }] } }));
  try {
    for (const [width, font, dark] of [[320, '200%', true], [320, '200%', false], [390, '100%', true], [1280, '100%', true]] as const) {
      await p.setViewportSize({ width, height: 844 }); await p.goto(origin + '/metas');
      await expect(p.getByRole('heading', { name, exact: true })).toBeVisible();
      await p.evaluate(({ font, dark }) => { document.documentElement.style.fontSize = font; document.documentElement.classList.toggle('dark', dark); }, { font, dark });
      await p.evaluate(() => document.fonts.ready);
      const draft = p.locator('input[name=nombreMeta]'); await draft.fill('Meta ficticia sin enviar');
      const controls = p.locator('app-metas input,app-metas select,app-metas button');
      for (const control of await controls.all()) expect(await control.evaluate(e => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(font === '200%' ? 32 : 16);
      const contribute = p.getByRole('button', { name: 'Aportar a ' + name, exact: true });
      await expect(contribute).toHaveText('Aportar');
      await expect(p.getByRole('button', { name: 'Cancelar meta ' + name, exact: true })).toHaveText('Cancelar meta');
      for (const direction of ['aporte', 'retiro'] as const) {
        const trigger = direction === 'aporte' ? contribute : p.getByRole('button', { name: 'Retirar de ' + name, exact: true });
        await trigger.click();
        const select = p.getByRole('combobox', { name: direction === 'aporte' ? 'Cuenta de origen' : 'Cuenta de destino', exact: true });
        await expect(select).toBeVisible();
        expect(await select.evaluate(e => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(font === '200%' ? 32 : 16);
        const confirm = p.getByRole('button', { name: 'Confirmar ' + direction, exact: true });
        const rect = await confirm.boundingBox();
        expect(rect!.width).toBeGreaterThanOrEqual(44); expect(rect!.x).toBeGreaterThanOrEqual(0); expect(rect!.x + rect!.width).toBeLessThanOrEqual(width);
        await p.getByRole('button', { name: 'Cerrar', exact: true }).click();
      }
      await expect(draft).toHaveValue('Meta ficticia sin enviar');
      expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await p.screenshot({ path: info.outputPath(`metas-${width}-${font}-${dark}.png`), fullPage: true });
    }
    expect(writes).toEqual([]); expect(pageErrors).toEqual([]);
  } finally { await c.close(); }
});
