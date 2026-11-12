import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { createSectionsFixture } from './secciones-fixture';
import type { AsientoContable, Categoria, Cuenta, Presupuesto, PresupuestoResumen } from '../src/app/core/models/finanzas.models';
import type { AvisoFinanciero } from '../src/app/core/models/avisos.models';
import type { Pareja } from '../src/app/core/models/pareja.models';
const category: Categoria = { id: 1, nombre: 'Categoría ficticia para gastos familiares', tipo: 'GASTO', color: '#ee7777', icono: '🍎', esPersonalizada: true, activo: true };
const goal: Cuenta = { id: 22, nombre: 'Meta ficticia de vacaciones', tipo: 'AHORRO', saldoActual: 125, moneda: 'MXN', activo: true, fechaCreacion: '2026-11-01', metaObjetivo: 1000, metaCancelada: false };
const budget: Presupuesto = { id: 51, categoriaId: 1, categoriaNombre: category.nombre, montoLimite: 2000, montoGastado: 500, montoDisponible: 1500, porcentajeConsumido: 25, moneda: 'MXN', mes: 11, anio: 2026, estado: 'NORMAL' };
const budgets: PresupuestoResumen = { mes: 11, anio: 2026, totalPresupuestado: 2000, totalGastado: 500, totalDisponible: 1500, porcentajeConsumidoGlobal: 25, presupuestos: [budget], resumenPorMoneda: [{ moneda: 'MXN', totalPresupuestado: 2000, totalGastado: 500, totalDisponible: 1500, porcentajeConsumido: 25 }] };
const entry: AsientoContable = { id: 81, transaccionOrigenId: 71, tipoEvento: 'CREACION', tipoMovimiento: 'GASTO', fechaOperacion: '2026-11-11', descripcion: 'Asiento ficticio para revisión visual', tasaCambio: null, fechaCreacion: '2026-11-11', lineas: [
        { id: 1, codigoCuenta: '5001', nombreCuenta: 'Gastos ficticios', monto: 25, moneda: 'MXN', lado: 'DEBE', cuentaFinancieraId: null, categoriaId: 1 },
        { id: 2, codigoCuenta: '1001', nombreCuenta: 'Cuenta ficticia', monto: 25, moneda: 'MXN', lado: 'HABER', cuentaFinancieraId: 11, categoriaId: null },
    ] };
const notice: AvisoFinanciero = { id: 'qa-notice', origen: 'MANUAL', resumen: 'Aviso ficticio para revisión visual', clase: 'COMPRA', estado: 'PENDIENTE', moneda: 'MXN', datos: null, version: 1, creadoEn: '2026-11-11', transaccionId: null, coincidencias: [] };
const partner: Pareja = { id: 41, moneda: 'MXN', fechaCreacion: '2026-11-01', activa: true,
    yo: { id: 995, nombre: 'Persona ficticia', email: 'ui@example.test', aportado: 100, consumido: 25, pagado: 0, cobrado: 0, saldo: 75 },
    pareja: { id: 996, nombre: 'Pareja ficticia', email: 'pair@example.test', aportado: 100, consumido: 25, pagado: 0, cobrado: 0, saldo: 75 },
    resumen: { fondoDisponible: 150, totalAportado: 200, totalGastado: 50, cantidadAportes: 2, cantidadGastos: 1, cantidadPagos: 0, idQuienDebe: null, montoDeuda: 0 },
    aportes: [995, 996].map((id, i) => ({ id: i + 1, usuarioId: id, usuarioNombre: i ? 'Pareja ficticia' : 'Persona ficticia', monto: 100, moneda: 'MXN', fecha: '2026-11-11', notas: null, fechaCreacion: '2026-11-11' })),
    gastos: [{ id: 3, pagadoPorId: 995, pagadoPorNombre: 'Persona ficticia', monto: 50, moneda: 'MXN', fecha: '2026-11-11', descripcion: 'Gasto compartido ficticio', tipoReparto: 'IGUAL', repartos: [], miParte: 25, fechaCreacion: '2026-11-11' }], pagos: [],
};
const pageOf = (content: unknown[]) => ({ content, totalPages: 1, totalElements: content.length, number: 0, size: 20, first: true, last: true, empty: false });
const cases = [
    { path: 'cuentas', api: '', data: null, marker: 'Cuenta ficticia para vacaciones y gastos extraordinarios familiares' },
    { path: 'categorias', api: '/categorias/mias', data: [category], marker: category.nombre },
    { path: 'etiquetas', api: '/etiquetas', data: [{ id: 5, nombre: 'etiqueta_ficticia_para_revision' }], marker: '#etiqueta_ficticia_para_revision' },
    { path: 'metas', api: '/cuentas', data: [goal], marker: goal.nombre },
    { path: 'presupuestos', api: '/presupuestos', data: budgets, marker: category.nombre },
    { path: 'libro-diario', api: '/libro-diario', data: pageOf([entry]), marker: entry.descripcion },
    { path: 'avisos', api: '/avisos', data: pageOf([notice]), marker: notice.resumen },
    { path: 'pareja', api: '/pareja', data: partner, marker: 'Gasto compartido ficticio' },
    { path: 'reportes', api: '', data: null, marker: 'Alimentación y compras del hogar de prueba' },
] as const;
for (const scenario of cases) {
    test(`${scenario.path}: contenido ficticio poblado sin escritura`, async ({ browser, baseURL }, info) => {
        const { c, p, origin, writes, pageErrors } = await createSectionsFixture(browser, baseURL!);
        await p.route('**/api/**', async (route) => {
            if (scenario.api && route.request().method() === 'GET' && new URL(route.request().url()).pathname === '/api' + scenario.api)
                return route.fulfill({ json: { success: true, data: scenario.data } });
            return route.fallback();
        });
        try {
            for (const [width, font, dark] of [[390, '100%', false], [320, '200%', true], [1280, '100%', false]] as const) {
                await p.setViewportSize({ width, height: 844 });
                await p.goto(origin + '/' + scenario.path);
                await expect(p.locator('#main-content').getByText(scenario.marker, { exact: true }).first()).toBeVisible();
                await p.evaluate(({ font, dark }) => { document.documentElement.style.fontSize = font; document.documentElement.classList.toggle('dark', dark); }, { font, dark });
                await p.evaluate(() => document.fonts.ready);
            if(scenario.path==='reportes'){const month=p.locator('input[type=month]');const rect=await month.boundingBox();if(width===320)expect(rect!.width).toBeGreaterThanOrEqual(200);await month.screenshot({path:info.outputPath('month-input-'+width+'.png')});}
                await p.screenshot({ path: info.outputPath('populated-' + width + '.png'), fullPage: true });
                const geometry = await p.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, grids: [...document.querySelectorAll<HTMLElement>('.budget-category-card')].map(e => ({ width: e.clientWidth, columns: getComputedStyle(e).gridTemplateColumns, children: [...e.children].map(x => ({ class: x.className, width: x.getBoundingClientRect().width, min: getComputedStyle(x).minWidth })) })), offenders: [...document.querySelectorAll<HTMLElement>('#main-content *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1 && e.offsetWidth > 0 && !e.closest('.overflow-x-auto,.report-table')).slice(0, 15).map(e => ({ tag: e.tagName, classes: e.className, text: e.textContent?.trim().slice(0, 70), rect: e.getBoundingClientRect().toJSON() })) }));
                fs.writeFileSync(info.outputPath('geometry-' + width + '.json'), JSON.stringify(geometry, null, 2));
                if (scenario.path === 'presupuestos') {
                    const menu = p.locator('.budget-manage summary');
                    await menu.press('Enter');
                    const action = p.getByRole('button', { name: /^Eliminar presupuesto de / });
                    await expect(action).toBeVisible();
                    const r = await action.boundingBox();
                    expect(r!.x).toBeGreaterThanOrEqual(0);
                    expect(r!.x + r!.width).toBeLessThanOrEqual(width);
                    await p.screenshot({ path: info.outputPath('budget-menu-' + width + '.png') });
                    await menu.press('Enter');
                }
                expect(geometry.scroll, scenario.path + ' ' + width).toBeLessThanOrEqual(width);
                await expect(p.locator('#main-content').getByRole('alert')).toHaveCount(0);
            }
            expect(writes).toEqual([]);
            expect(pageErrors).toEqual([]);
        }
        finally {
            await c.close();
        }
    });
}
