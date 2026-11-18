import { test, expect } from '@playwright/test';
import { coherenceFixture } from './coherencia-fixture';

for (const dark of [false, true]) {
  test(`Captura manual conserva título y tipos completos en ${dark ? 'oscuro' : 'claro'}`, async ({ browser, baseURL }, info) => {
    const { c, p, writes, pageErrors } = await coherenceFixture(browser, baseURL!);
    try {
      for (const width of [320, 390, 1280]) {
        const baseSizes = new Map<string, number>();
        for (const scale of [100, 200]) {
          await p.setViewportSize({ width, height: 844 });
          await p.goto('/dashboard');
          await p.locator('.capture-dock__manual').click();
          await p.locator('#quick-capture-panel').getByRole('button', { name: 'Abrir formulario', exact: true }).click();
          const dialog = p.getByRole('dialog', { name: 'Añadir movimiento', exact: true });
          await expect(dialog).toBeVisible();
          await p.evaluate(({ scale, dark }) => {
            document.documentElement.style.fontSize = `${scale}%`;
            document.documentElement.classList.toggle('dark', dark);
          }, { scale, dark });
          await p.evaluate(() => document.fonts.ready);
          for (const label of ['Gasto', 'Ingreso', 'Transferencia', 'movimiento']) {
            const element = label === 'movimiento' ? dialog.locator('h2') : dialog.getByRole('button', { name: label, exact: true });
            const size = await element.evaluate(e => parseFloat(getComputedStyle(e).fontSize));
            if (scale === 100) baseSizes.set(label, size);
            else expect(size).toBeCloseTo(baseSizes.get(label)! * 2, 1);
            expect(await element.evaluate((e, word) => {
              const text = e.firstChild!;
              const start = text.textContent!.indexOf(word);
              const range = document.createRange();
              range.setStart(text, start);
              range.setEnd(text, start + word.length);
              return [...range.getClientRects()].filter(r => r.width > 0).length;
            }, label), `${label} a ${width}px/${scale}%`).toBe(1);
          }
          expect(await dialog.evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
          expect(await p.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
          await p.screenshot({ path: info.outputPath(`captura-${width}-${scale}.png`) });
          for (const label of ['Ingreso', 'Transferencia', 'Gasto']) {
            const button = dialog.getByRole('button', { name: label, exact: true });
            await button.focus();
            await p.keyboard.press('Enter');
            await expect(button).toHaveAttribute('aria-pressed', 'true');
          }
          const close = dialog.getByRole('button', { name: 'Cerrar registro', exact: true });
          await close.focus();
          await p.keyboard.press('Enter');
          await expect(dialog).toBeHidden();
        }
      }
      expect(writes).toEqual([]);
      expect(pageErrors).toEqual([]);
    } finally {
      await c.close();
    }
  });
}
