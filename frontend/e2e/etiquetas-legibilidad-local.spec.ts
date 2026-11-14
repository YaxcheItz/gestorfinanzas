import { test, expect } from '@playwright/test';
import { createSectionsFixture } from './secciones-fixture';

test('etiquetas largas mantienen nombre, campo y acciones legibles al ampliar texto', async ({ browser, baseURL }, info) => {
  const { c, p, origin, writes, pageErrors } = await createSectionsFixture(browser, baseURL!);
  const nombres = ['etiqueta_ficticia_para_revision', 'familia', 'gastos_del_hogar_y_transporte'];
  await p.route('**/api/etiquetas', route => route.request().method() === 'GET'
    ? route.fulfill({ json: { success: true, data: nombres.map((nombre, index) => ({ id: index + 1, nombre })) } })
    : route.fallback());
  try {
    await p.emulateMedia({ reducedMotion: 'reduce' });
    for (const [width, font, dark] of [[390, '100%', true], [1280, '100%', true], [320, '200%', true], [320, '200%', false]] as const) {
      await p.setViewportSize({ width, height: 844 });
      await p.goto(origin + '/etiquetas');
      const rows = p.locator('#main-content li');
      await expect(rows).toHaveCount(3);
      await p.evaluate(({ font, dark }) => { document.documentElement.style.fontSize = font; document.documentElement.classList.toggle('dark', dark); }, { font, dark });
      await p.evaluate(() => document.fonts.ready);
      const input = p.getByRole('textbox', { name: 'Nombre de la etiqueta', exact: true });
      await input.fill('borrador_local_sin_enviar');
      if (font === '200%') {
        expect((await input.boundingBox())!.width).toBeGreaterThanOrEqual(200);
        expect(await input.evaluate(e => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(32);
      }
      for (let index = 0; index < nombres.length; index++) {
        const row = rows.nth(index);
        const name = row.locator('span').first();
        await expect(name).toHaveText('#' + nombres[index]);
        if (font === '200%') {
          const geometry = await name.evaluate(e => ({ width: e.getBoundingClientRect().width, lines: e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight) }));
          expect(geometry.width).toBeGreaterThanOrEqual(180);
          expect(geometry.lines).toBeLessThanOrEqual(5);
        }
        const button = row.getByRole('button', { name: 'Eliminar etiqueta ' + nombres[index], exact: true });
        const rect = await button.boundingBox();
        expect(rect!.height).toBeGreaterThanOrEqual(44);
        expect(rect!.x).toBeGreaterThanOrEqual(0);
        expect(rect!.x + rect!.width).toBeLessThanOrEqual(width);
        expect(await row.evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
      }
      await expect(input).toHaveValue('borrador_local_sin_enviar');
      expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await p.screenshot({ path: info.outputPath(`etiquetas-${width}-${font}-${dark}.png`), fullPage: true });
    }
    expect(writes).toEqual([]);
    expect(pageErrors).toEqual([]);
  } finally { await c.close(); }
});
