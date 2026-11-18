import { expect, test } from '@playwright/test';
import { createSectionsFixture } from './secciones-fixture';

for (const dark of [false, true]) {
  test(`Metas conserva palabras completas y letra ampliada · ${dark ? 'oscuro' : 'claro'}`, async ({ browser, baseURL }, info) => {
    const { c, p, writes, pageErrors } = await createSectionsFixture(browser, baseURL!);
    let name = 'Meta ficticia de vacaciones';
    await p.route('**/api/cuentas*', route => route.fulfill({ json: { success: true, data: [
      { id: 11, nombre: 'Origen ficticio', tipo: 'AHORRO', saldoActual: 2000, moneda: 'MXN', activo: true },
      { id: 22, nombre: name, tipo: 'AHORRO', saldoActual: 125, metaObjetivo: 1000, metaCancelada: false, moneda: 'MXN', activo: true }
    ] } }));
    try {
      await p.clock.setFixedTime(new Date('2026-11-14T18:00:00Z'));
      await p.emulateMedia({ reducedMotion: 'reduce' });
      for (const [width, scale] of [[320, 200], [320, 100], [390, 100], [390, 200], [1280, 100], [1280, 200]]) {
        await p.setViewportSize({ width, height: 844 }); await p.goto('/metas');
        const heading = p.getByRole('heading', { name, exact: true });
        await expect(heading).toBeVisible();
        await p.evaluate(({ dark, scale }) => {
          document.documentElement.classList.toggle('dark', dark);
          document.documentElement.style.fontSize = scale + '%';
        }, { dark, scale });
        await p.evaluate(() => document.fonts.ready);
        await expect(heading).toHaveCSS('font-size', scale === 200 ? '40px' : '20px');
        await p.screenshot({ path: info.outputPath(`metas-${width}-${scale}-${dark ? 'dark' : 'light'}.png`), fullPage: true });
        const note = p.getByText('Los movimientos aparecen en tu historial como transferencias.', { exact: false });
        for (const [element, word] of [[heading, 'vacaciones'], [note, 'automáticamente']] as const) {
          const wordLines = await element.evaluate((e, word) => {
            const node = e.firstChild!, start = node.textContent!.indexOf(word);
            const range = document.createRange(); range.setStart(node, start); range.setEnd(node, start + word.length);
            return new Set([...range.getClientRects()].map(r => Math.round(r.top))).size;
          }, word);
          expect(wordLines, `${word} a ${width}px/${scale}%`).toBe(1);
        }
        expect(await p.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
        const draft = p.getByRole('textbox', { name: 'Nombre', exact: true });
        await draft.fill('Meta ficticia sin enviar');
        await p.getByRole('button', { name: 'Aportar a ' + name, exact: true }).click();
        await expect(p.getByRole('button', { name: 'Confirmar aporte', exact: true })).toBeVisible();
        await p.getByRole('button', { name: 'Cerrar', exact: true }).click();
        await expect(draft).toHaveValue('Meta ficticia sin enviar');
      }
      // Un nombre sin separadores conserva el ajuste de emergencia dentro de la tarjeta.
      name = 'NombreFicticio'.repeat(7);
      await p.setViewportSize({ width: 320, height: 844 }); await p.goto('/metas');
      await expect(p.getByRole('heading', { name, exact: true })).toBeVisible();
      await p.evaluate(() => document.documentElement.style.fontSize = '200%');
      await expect(p.getByRole('heading', { name, exact: true })).toHaveCSS('font-size', '40px');
      expect(await p.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
      expect(writes).toEqual([]); expect(pageErrors).toEqual([]);
    } finally { await c.close(); }
  });
}
