import { createSectionsFixture } from './secciones-fixture';
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
test('teclado en diez secciones y cuatro dialogos sin escribir', async ({ browser, baseURL }, testInfo) => {
    test.setTimeout(180000);
    const { origin, c, p, pageErrors, writes } = await createSectionsFixture(browser, baseURL!);
    const output = testInfo.outputDir;
    fs.mkdirSync(output, { recursive: true });
    for (const [width, font, dark] of [[390, '100%', false], [320, '200%', true], [1280, '100%', false]] as const) {
        await p.setViewportSize({ width, height: 844 });
        for (const route of ['cuentas', 'presupuestos', 'categorias', 'etiquetas', 'reportes', 'metas', 'libro-diario', 'pareja', 'avisos', 'configuracion']) {
            await p.goto(origin + '/' + route);
            await p.waitForTimeout(300);
            await p.evaluate(({ font, dark }) => { document.documentElement.style.fontSize = font; document.documentElement.classList.toggle('dark', dark); }, { font, dark });
            await p.waitForTimeout(300);
            await p.keyboard.press('Tab');
            await expect(p.getByRole('link', { name: 'Ir al contenido', exact: true })).toBeFocused();
            await p.keyboard.press('Enter');
            await expect(p.locator('#main-content')).toBeFocused();
            const expected = await p.locator('#main-content').evaluate(root => [...root.querySelectorAll<HTMLElement>('a[href],button,input,select,textarea,summary,[tabindex="0"]')].filter(e => e.tabIndex >= 0 && !e.matches(':disabled') && e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })).length);
            const seen = new Set<number>();
            for (let i = 0; i < expected * 5 + 10; i++) {
                await p.keyboard.press('Tab');
                await expect.poll(async () => {
                    const position = () => p.evaluate(() => {
                        const e = document.activeElement as HTMLElement;
                        if (!document.querySelector('#main-content')?.contains(e)) return null;
                        const r = e.getBoundingClientRect();
                        return { x: r.x, y: r.y, visible: r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth };
                    });
                    const before = await position();
                    await p.waitForTimeout(120);
                    const after = await position();
                    return !after || !!before && after.visible && Math.abs(before.x - after.x) < .5 && Math.abs(before.y - after.y) < .5;
                }, { timeout: 4000, message: route + ' ' + width + ' foco visible y desplazamiento terminado' }).toBe(true);
                const focus = await p.locator('#main-content').evaluate(root => {
                    const e = document.activeElement as HTMLElement;
                    if (!root.contains(e))
                        return null;
                    const controls = [...root.querySelectorAll<HTMLElement>('a[href],button,input,select,textarea,summary,[tabindex="0"]')].filter(e => e.tabIndex >= 0 && !e.matches(':disabled') && e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }));
                    const r = e.getBoundingClientRect(), s = getComputedStyle(e);
                    return { index: controls.indexOf(e), outline: s.outlineStyle, width: s.outlineWidth, shadow: s.boxShadow, text: e.outerHTML.slice(0, 180), rect: r.toJSON(), visible: r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth };
                });
                if (!focus)
                    break;
                expect(focus.visible, route + ' ' + JSON.stringify(focus)).toBe(true);
                expect(focus.index, route).toBeGreaterThanOrEqual(0);
                expect((focus.outline !== 'none' && focus.width !== '0px') || focus.shadow !== 'none', route).toBe(true);
                seen.add(focus.index);
            }
            expect(seen.size, route + ' ' + width).toBe(expected);
        }
    }
    const dialogs = [];
    for (const [width, font, dark] of [[390, '100%', false], [320, '200%', true], [1280, '100%', false]] as const) {
        await p.setViewportSize({ width, height: 844 });
        for (const [route, name] of [['cuentas', '+ Agregar cuenta'], ['presupuestos', 'Fijar Presupuesto'], ['categorias', /Nueva categor/], ['configuracion', 'Eliminar mi cuenta y todos sus datos']] as const) {
            await p.goto(origin + '/' + route + (route === 'configuracion' ? '#danger' : ''));
            await p.evaluate(({ font, dark }) => { document.documentElement.style.fontSize = font; document.documentElement.classList.toggle('dark', dark); }, { font, dark });
            await p.waitForTimeout(400);
            const trigger = p.getByRole('button', { name, exact: true });
            await trigger.waitFor();
            const start = route === 'configuracion' ? p.locator('#danger summary') : p.locator('#main-content');
            await start.focus();
            for (let i = 0; i < 25 && !(await trigger.evaluate(e => e === document.activeElement)); i++)
                await p.keyboard.press('Tab');
            await expect(trigger).toBeFocused();
            await p.keyboard.press('Enter');
            const dialog = p.getByRole('dialog');
            await expect(dialog).toBeVisible();
            expect(await dialog.evaluate(e => e.contains(document.activeElement))).toBe(true);
            const count = await dialog.locator(':is(button,input,select,textarea):visible:enabled').count();
            for (let i = 0; i < count * 3 + 2; i++) {
                await p.keyboard.press(i < count * 2 ? 'Tab' : 'Shift+Tab');
                expect(await dialog.evaluate(e => e.contains(document.activeElement)), route).toBe(true);
            }
            const size = await dialog.boundingBox();
            expect(size!.height, route).toBeLessThanOrEqual(844);
            expect(size!.y, route).toBeGreaterThanOrEqual(0);
            expect(size!.y + size!.height, route).toBeLessThanOrEqual(845);
            expect(await dialog.evaluate(e => e.scrollWidth <= e.clientWidth + 1), route).toBe(true);
            fs.writeFileSync(output + '/' + route + '-' + width + '-geometry.json', JSON.stringify(await dialog.evaluate(e => ({ rect: e.getBoundingClientRect().toJSON(), parent: e.parentElement!.getBoundingClientRect().toJSON(), position: getComputedStyle(e.parentElement!).position, scroll: scrollY, overflow: e.scrollWidth, client: e.clientWidth, font: getComputedStyle(document.documentElement).fontSize })), null, 2));
            await p.screenshot({ path: output + '/' + route + '-dialog-' + width + '.png' });
            await p.keyboard.press('Escape');
            await expect(dialog).toBeHidden();
            await expect(trigger).toBeFocused();
            dialogs.push({ route, width, font, dark, controls: count });
        }
    }
    fs.writeFileSync(output + '/dialogs.json', JSON.stringify(dialogs, null, 2));
    expect(pageErrors).toEqual([]);
    expect(writes).toEqual([]);
    await c.close();
});
test('el foco de cifras por mes contrasta en ambos temas', async ({ browser, baseURL }, info) => {
    const { origin, c, p, writes } = await createSectionsFixture(browser, baseURL!);
    const measurements = [];
    for (const dark of [false, true]) {
        await p.goto(origin + '/reportes');
        await p.evaluate(dark => document.documentElement.classList.toggle('dark', dark), dark);
        await p.waitForTimeout(400);
        const summary = p.getByText('Ver cifras por mes', { exact: true });
        await summary.focus();
        await p.keyboard.press('Shift');
        const result = await summary.evaluate(e => {
            const s = getComputedStyle(e);
            let parent = e.parentElement;
            while (parent && getComputedStyle(parent).backgroundColor === 'rgba(0, 0, 0, 0)')
                parent = parent.parentElement;
            const bg = getComputedStyle(parent!).backgroundColor;
            const lum = (color: string) => color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0);
            const a = lum(s.outlineColor), b = lum(bg);
            return { outline: s.outlineColor, bg, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
        });
        measurements.push({ dark, ...result });
        await summary.scrollIntoViewIfNeeded();
        await p.screenshot({ path: info.outputPath('reportes-focus-' + dark + '.png') });
        expect(result.ratio, JSON.stringify({ dark, ...result })).toBeGreaterThanOrEqual(3);
        await p.keyboard.press('Enter');
        await expect(p.locator('.report-table')).toHaveAttribute('open', '');
        await p.keyboard.press('Space');
        await expect(p.locator('.report-table')).not.toHaveAttribute('open', '');
    }
    fs.writeFileSync(info.outputPath('focus-contrast.json'), JSON.stringify(measurements, null, 2));
    expect(writes).toEqual([]);
    await c.close();
});
test('formularios caben con letra ampliada', async ({ browser, baseURL }, info) => {
    const { origin, c, p, writes } = await createSectionsFixture(browser, baseURL!);
    const evidence = [];
    await p.setViewportSize({ width: 320, height: 844 });
    for (const [route, name] of [['presupuestos', 'Fijar Presupuesto'], ['configuracion', 'Eliminar mi cuenta y todos sus datos']] as const) {
        await p.goto(origin + '/' + route + (route === 'configuracion' ? '#danger' : ''));
        await p.evaluate(() => { document.documentElement.style.fontSize = '200%'; document.documentElement.classList.add('dark'); });
        await p.waitForTimeout(450);
        await p.getByRole('button', { name, exact: true }).click();
        const dialog = p.getByRole('dialog');
        await dialog.waitFor();
        await p.waitForTimeout(400);
        const geometry = await dialog.evaluate(e => ({ rect: e.getBoundingClientRect().toJSON(), parent: e.parentElement!.getBoundingClientRect().toJSON(), position: getComputedStyle(e.parentElement!).position, scroll: scrollY, overflow: e.scrollWidth, client: e.clientWidth, font: getComputedStyle(document.documentElement).fontSize, offenders: [...e.querySelectorAll<HTMLElement>('*')].filter(x => x.scrollWidth > x.clientWidth + 1 && x.clientWidth > 0).map(x => ({ tag: x.tagName, classes: x.className, text: x.textContent?.slice(0, 80), scroll: x.scrollWidth, client: x.clientWidth })) }));
        console.log('MODAL', route, JSON.stringify(geometry));
        evidence.push({ route, ...geometry });
        await p.screenshot({ path: info.outputPath(route + '-initial.png') });
        await p.keyboard.press('Escape');
    }
    fs.writeFileSync(info.outputPath('geometry.json'), JSON.stringify(evidence, null, 2));
    expect(evidence.filter(g => g.rect.y < 0 || g.rect.bottom > 844 || g.overflow > g.client + 1)).toEqual([]);
    expect(writes).toEqual([]);
    await c.close();
});
