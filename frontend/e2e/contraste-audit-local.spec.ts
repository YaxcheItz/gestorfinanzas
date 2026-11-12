import { createSectionsFixture } from './secciones-fixture';
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
test('auditoria sintetica de contraste y foco', async ({ browser, baseURL }, testInfo) => {
    const { origin, c, p, pageErrors, writes } = await createSectionsFixture(browser, baseURL!);
    const output = testInfo.outputDir;
    fs.mkdirSync(output, { recursive: true });
    const evidence = [];
    const formRoutes = ['cuentas', 'presupuestos', 'categorias', 'configuracion'];
    for (const dark of [false, true])
        for (const form of [false, true])
            for (const route of ['cuentas', 'presupuestos', 'categorias', 'etiquetas', 'reportes', 'metas', 'libro-diario', 'pareja', 'avisos', 'configuracion']) {
                if (form && !formRoutes.includes(route))
                    continue;
                await p.goto(origin + '/' + route);
                await p.waitForTimeout(350);
                await p.evaluate(dark => document.documentElement.classList.toggle('dark', dark), dark);
                await p.waitForTimeout(400);
                if (route === 'configuracion')
                    await p.locator('details').evaluateAll(es => es.forEach(e => (e as HTMLDetailsElement).open = true));
                if (form) {
                    const names = { cuentas: '+ Agregar cuenta', presupuestos: 'Fijar Presupuesto', categorias: /Nueva categor/, configuracion: 'Eliminar mi cuenta y todos sus datos' };
                    await p.getByRole('button', { name: names[route as keyof typeof names], exact: true }).click();
                    await p.getByRole('dialog').waitFor();
                    await p.waitForTimeout(250);
                }
                const scope = form ? p.getByRole('dialog') : p.locator('#main-content');
                const contrast = await scope.evaluate(root => {
                    const canvas = document.createElement('canvas');
                    canvas.width = canvas.height = 1;
                    const ctx = canvas.getContext('2d')!;
                    const rgba = (s: string) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = s; ctx.fillRect(0, 0, 1, 1); const a = [...ctx.getImageData(0, 0, 1, 1).data]; return [a[0], a[1], a[2], a[3] / 255]; };
                    const blend = (a: number[], b: number[]) => [0, 1, 2].map(i => a[i] * a[3] + b[i] * (1 - a[3])).concat(1);
                    const bg = (e: Element | null): number[] => e ? blend(rgba(getComputedStyle(e).backgroundColor), bg(e.parentElement)) : [255, 255, 255, 1];
                    const lum = (a: number[]) => a.slice(0, 3).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
                    return [...root.querySelectorAll('*')].flatMap(e => {
                        const text = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent?.trim()).join(' ').trim();
                        const s = getComputedStyle(e);
                        if (!text || !/[A-Za-z?-?0-9]/.test(text) || !(e as HTMLElement).checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) || e.closest('[disabled],[aria-hidden="true"]') || Number(s.opacity) < 1)
                            return [];
                        const back = bg(e), front = blend(rgba(s.color), back);
                        const a = lum(front), b = lum(back), ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
                        const min = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && parseInt(s.fontWeight) >= 700) ? 3 : 4.5;
                        return ratio + .001 >= min ? [] : [{ text: text.slice(0, 95), tag: e.tagName, classes: e.className, color: s.color, bg: back, ratio, min }];
                    });
                });
                const focus = [];
                await p.locator('#main-content').focus();
                const controls = scope.locator(':is(button,a[href],input,select,textarea,summary,[tabindex="0"]):visible');
                for (const el of await controls.all()) {
                    if (!(await el.isEnabled()))
                        continue;
                    await el.focus();
                    await p.keyboard.press('Shift');
                    const result = await el.evaluate(e => { const s = getComputedStyle(e); return { text: e.getAttribute('aria-label') || e.textContent?.trim().slice(0, 70), active: document.activeElement === e, outline: s.outlineStyle, width: s.outlineWidth, shadow: s.boxShadow }; });
                    if (result.active && (result.outline === 'none' || result.width === '0px') && result.shadow === 'none')
                        focus.push(result);
                }
                evidence.push({ route, dark, form, contrast, focus });
                await p.screenshot({ path: output + '/' + route + '-' + dark + '-' + form + '.png', fullPage: true });
            }
    fs.writeFileSync(output + '/audit.json', JSON.stringify(evidence, null, 2));
    console.log('AUDIT', JSON.stringify(evidence.map(e => ({ route: e.route, dark: e.dark, form: e.form, contrast: e.contrast.length, focus: e.focus }))));
    expect(evidence.flatMap(e => e.contrast.map(f => ({ route: e.route, dark: e.dark, form: e.form, ...f })))).toEqual([]);
    expect(evidence.flatMap(e => e.focus)).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(writes).toEqual([]);
    await c.close();
});
