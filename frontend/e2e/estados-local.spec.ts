import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { createSectionsFixture } from './secciones-fixture';
const emptyPage = { content: [], totalPages: 0, totalElements: 0, number: 0, size: 20, first: true, last: true, empty: true };
const cases = [
    { path: 'cuentas', api: '/cuentas', loading: /Cargando cuentas/, empty: 'Aún no tienes cuentas activas', data: [] },
    { path: 'presupuestos', api: '/presupuestos', loading: /Cargando presupuestos/, empty: 'No hay presupuestos fijados para este mes', data: { mes: 11, anio: 2026, totalPresupuestado: 0, totalGastado: 0, totalDisponible: 0, porcentajeConsumidoGlobal: 0, presupuestos: [], resumenPorMoneda: [] } },
    { path: 'categorias', api: '/categorias/mias', loading: /Cargando categor/, empty: 'Aún no has creado categorías personalizadas.', data: [] },
    { path: 'etiquetas', api: '/etiquetas', loading: /Cargando etiquetas/, empty: 'Aún no tienes etiquetas en tu lista.', data: [] },
    { path: 'metas', api: '/cuentas', loading: /Cargando metas/, empty: 'Aún no tienes metas.', data: [] },
    { path: 'libro-diario', api: '/libro-diario', loading: /Cargando asientos/, empty: 'Aún no hay asientos contables', data: emptyPage },
    { path: 'pareja', api: '/pareja', loading: /Cargando.*pareja/, empty: 'Invita a tu pareja', data: null },
    { path: 'reportes', api: '/dashboard/resumen', loading: /Cargando reportes/, empty: 'Tu historia empieza con un movimiento', data: { balanceTotal: 0, ingresosMes: 0, gastosMes: 0, balanceMes: 0, tasaAhorro: 0, totalCuentas: 0, mes: 11, anio: 2026, ultimosMovimientos: [], resumenPorMoneda: [] } },
    { path: 'avisos', api: '/avisos', loading: /Cargando avisos/, empty: 'No hay revisiones pendientes', data: emptyPage },
] as const;
for (const scenario of cases) {
    test(`${scenario.path}: carga, fallos HTTP/lógicos, desconexión y recuperación`, async ({ browser, baseURL }, info) => {
        const { c, p, origin, writes, pageErrors } = await createSectionsFixture(browser, baseURL!);
        let release = () => { };
        let gate: Promise<void>;
        let waiting = false;
        let outcome: 'server' | 'logical' | 'offline' | 'success' = 'server';
        const requests: string[] = [];
        const hold = (next: typeof outcome) => {
            outcome = next;
            waiting = true;
            gate = new Promise<void>(resolve => { release = () => { waiting = false; resolve(); }; });
        };
        hold('server');
        await p.route('**/api/**', async (route) => {
            if (new URL(route.request().url()).pathname !== '/api' + scenario.api || route.request().method() !== 'GET')
                return route.fallback();
            const result = outcome;
            requests.push(result);
            if (waiting)
                await gate;
            if (result === 'offline')
                return route.abort('internetdisconnected');
            if (result === 'server' || result === 'logical')
                return route.fulfill({
                    status: result === 'server' ? 503 : 200,
                    json: { success: false, message: 'Servicio ficticio temporalmente no disponible', data: null },
                });
            return route.fulfill({ json: { success: true, data: scenario.data } });
        });
        const main = p.locator('#main-content');
        const loading = main.getByRole('status', { name: scenario.loading });
        const empty = main.getByText(scenario.empty, { exact: false });
        const alert = main.getByRole('alert').first();
        const retry = main.getByRole('button', { name: /Reintentar|Reintenta|Recargar bandeja|Actualizar/ }).first();
        const appearance = () => p.evaluate(() => { document.documentElement.style.fontSize = '200%'; document.documentElement.classList.add('dark'); });
        const fits = async () => { const geometry = await p.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, offenders: [...document.querySelectorAll<HTMLElement>('#main-content *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1 && e.offsetWidth > 0).slice(0, 12).map(e => ({ tag: e.tagName, classes: e.className, text: e.textContent?.trim().slice(0, 65), rect: e.getBoundingClientRect().toJSON() })) })); console.log('GEOMETRY', scenario.path, JSON.stringify(geometry)); fs.writeFileSync(info.outputPath('overflow.json'), JSON.stringify(geometry, null, 2)); return expect.poll(() => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); };
        try {
            await p.setViewportSize({ width: 320, height: 844 });
            await p.goto(origin + '/' + scenario.path);
            await appearance();
            await expect(loading).toBeVisible();
            await expect(empty).toHaveCount(0);
            const draft = scenario.path === 'etiquetas' ? p.getByLabel('Nombre de la etiqueta', { exact: true }) : scenario.path === 'metas' ? p.getByRole('textbox', { name: 'Nombre', exact: true }) : null;
            if (draft)
                await draft.fill('Texto ficticio conservado');
            await p.screenshot({ path: info.outputPath('loading.png'), fullPage: true });
            release();
            await expect(alert).toBeVisible();
            await expect(empty).toHaveCount(0);
            await p.screenshot({ path: info.outputPath('http-error.png'), fullPage: true });
            await fits();
            hold('logical');
            await retry.focus();
            await p.keyboard.press('Enter');
            await expect(loading).toBeVisible();
            await expect(alert).toBeHidden();
            await expect(empty).toHaveCount(0);
            release();
            await expect(alert).toBeVisible();
            await expect(empty).toHaveCount(0);
            hold('success');
            await retry.click();
            await expect(loading).toBeVisible();
            release();
            await expect(empty).toBeVisible();
            await expect(alert).toBeHidden();
            await expect(loading).toHaveCount(0);
            if (draft)
                await expect(draft).toHaveValue('Texto ficticio conservado');
            hold('offline');
            await p.reload();
            await appearance();
            await expect(loading).toBeVisible();
            await c.setOffline(true);
            expect(await p.evaluate(() => navigator.onLine)).toBe(false);
            release();
            await expect(alert).toBeVisible();
            await expect(empty).toHaveCount(0);
            await p.screenshot({ path: info.outputPath('offline.png'), fullPage: true });
            await fits();
            outcome = 'success';
            await c.setOffline(false);
            await retry.focus();
            await p.keyboard.press('Enter');
            await expect(empty).toBeVisible();
            await expect(alert).toBeHidden();
            await p.screenshot({ path: info.outputPath('recovered-empty.png'), fullPage: true });
            await fits();
            expect(requests).toEqual(expect.arrayContaining(['server', 'logical', 'offline', 'success']));
            expect(writes).toEqual([]);
            expect(pageErrors).toEqual([]);
        }
        finally {
            release();
            await c.close();
        }
    });
}
