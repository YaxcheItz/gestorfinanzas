import { test, expect } from '@playwright/test';
import { coherenceFixture } from './coherencia-fixture';

for (const dark of [false, true]) {
  test(`Cuentas conserva palabras completas y navegación con texto ampliado en ${dark ? 'oscuro' : 'claro'}`, async ({ browser, baseURL }, info) => {
    const { c, p, writes, pageErrors } = await coherenceFixture(browser, baseURL!);
    try {
      for (const width of [320, 390, 1280]) {
        for (const scale of [100, 200]) {
          await p.setViewportSize({ width, height: 844 });
          await p.goto('/cuentas');
          const card = p.locator('.account-card').first();
          await expect(card).toBeVisible();
          await p.evaluate(({ scale, dark }) => {
            document.documentElement.style.fontSize = `${scale}%`;
            document.documentElement.classList.toggle('dark', dark);
          }, { scale, dark });
          await p.evaluate(() => document.fonts.ready);
          const label = card.locator('p').filter({ hasText: 'Ver transacciones' });
          expect(await label.evaluate(e => parseFloat(getComputedStyle(e).fontSize))).toBe(14 * scale / 100);
          // Medir la palabra: scrollWidth no detecta una letra aislada en otra línea.
          const lines = await label.evaluate(element => {
            const node = [...element.childNodes].find(n => n.nodeType === Node.TEXT_NODE && n.textContent?.includes('transacciones'))!;
            const start = node.textContent!.indexOf('transacciones');
            const range = document.createRange();
            range.setStart(node, start);
            range.setEnd(node, start + 'transacciones'.length);
            return [...range.getClientRects()].filter(r => r.width > 0).length;
          });
          await p.screenshot({ path: info.outputPath(`cuentas-${width}-${scale}.png`), fullPage: true });
          expect(lines, `transacciones a ${width}px/${scale}%`).toBe(1);
          expect(await p.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
          expect(await label.evaluate(e => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
          const link = card.getByRole('link', { name: 'Ver transacciones de', exact: false });
          const href = await link.getAttribute('href');
          await link.focus();
          await expect(link).toBeFocused();
          await p.keyboard.press('Enter');
          await expect(p).toHaveURL(new URL(href!, baseURL!).href);
          await expect(p.locator('.history-page')).toBeVisible();
        }
      }
      expect(writes).toEqual([]);
      expect(pageErrors).toEqual([]);
    } finally {
      await c.close();
    }
  });
}
