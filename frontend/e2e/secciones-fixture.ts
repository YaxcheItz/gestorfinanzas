import { Browser, expect } from '@playwright/test';
// Sesion aislada, API ficticia y red externa bloqueada. Ninguna escritura alcanza un servidor.
export async function createSectionsFixture(browser: Browser, baseURL: string) {
    const origin = new URL(baseURL).origin;
    expect(new URL(origin).hostname).toBe('localhost');
    const writes: string[] = [];
    const c = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await c.addInitScript(() => { localStorage.setItem('finanzas_token', `qa.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.synthetic`); localStorage.setItem('finanzas_user', JSON.stringify({ id: 995, nombre: 'Prueba visual', email: 'ui@example.test' })); });
    await c.route('**/*', async (r) => {
        const u = new URL(r.request().url());
        if (u.pathname.startsWith('/api/')) {
            if (r.request().method() !== 'GET') {
                writes.push(r.request().method() + ' ' + u.pathname);
                return r.fulfill({ status: 503, json: { success: false, message: 'Escritura ficticia no autorizada' } });
            }
            let data: unknown = [];
            if (u.pathname.endsWith('/perfil'))
                data = { id: 995, nombre: 'Prueba visual', email: 'ui@example.test', tema: 'CLARO', monedaPredeterminada: 'MXN' };
            if (u.pathname.endsWith('/listas'))
                data = [{ id: 21, nombre: 'Personal QA', moneda: 'MXN', personal: true, rol: 'PROPIETARIO', miembros: [] }];
            if (u.pathname.includes('transacciones') || u.pathname.endsWith('/avisos') || u.pathname.endsWith('/libro-diario'))
                data = { content: [], totalPages: 0, totalElements: 0, number: 0, size: 20, first: true, last: true, empty: true };
            if (u.pathname.endsWith('/asistente/captura-rapida'))
                data = { answer: 'Revisa esta propuesta ficticia antes de confirmar.', engine: 'REGLAS', action: { id: 'qa', type: 'CREATE_TRANSACTION', summary: 'Compra ficticia para reunión familiar', data: { tipo: 'GASTO', monto: 123456.78, moneda: 'MXN', cuentaId: 11, categoriaId: 1, descripcion: 'Compra ficticia para reunión familiar', fecha: '2026-11-11' } } };
            if (u.pathname.endsWith('/pareja'))
                data = null;
            if (u.pathname.endsWith('/dashboard/resumen'))
                data = { balanceTotal: 9876543.21, ingresosMes: 28000, gastosMes: 3456.78, balanceMes: 24543.22, tasaAhorro: 87, totalCuentas: 1, mes: 11, anio: 2026, ultimosMovimientos: [], resumenPorMoneda: [{ moneda: 'MXN', balanceTotal: 9876543.21, dineroDisponible: 9876543.21, deudaTarjetas: 0, ingresosMes: 28000, gastosMes: 3456.78, balanceMes: 24543.22, tasaAhorro: 87, totalCuentas: 1 }] };
            if (u.pathname.endsWith('/dashboard/analitica'))
                data = { gastosPorCategoria: [{ categoriaId: 1, categoriaNombre: 'Alimentación y compras del hogar de prueba', categoriaColor: '#ee7777', monto: 3456.78, moneda: 'MXN' }], ultimosSeisMeses: [{ anio: 2026, mes: 11, ingresos: 28000, gastos: 3456.78, moneda: 'MXN' }] };
            if (u.pathname.endsWith('/dashboard/comparacion'))
                data = { mes: 11, anio: 2026, mesAnterior: 10, anioAnterior: 2026, porMoneda: [] };
            if (u.pathname.endsWith('/presupuestos'))
                data = { mes: 11, anio: 2026, presupuestos: [], resumenPorMoneda: [] };
            if (u.pathname.endsWith('/cuentas'))
                data = [{ id: 11, nombre: 'Cuenta ficticia para vacaciones y gastos extraordinarios familiares', tipo: 'AHORRO', saldoActual: 9876543.21, moneda: 'MXN', activo: true, fechaCreacion: '2026-11-01' }];
            if (u.pathname.endsWith('/categorias'))
                data = [{ id: 1, nombre: 'Alimentación y compras del hogar de prueba', tipo: 'GASTO', color: '#ee7777', icono: '🍎', esPersonalizada: true, activo: true }];
            if (u.pathname.endsWith('/transacciones/recientes'))
                data = [];
            return r.fulfill({ json: { success: true, data } });
        }
        return u.origin === origin ? r.continue() : r.abort();
    });
    const pageErrors: string[] = [];
    const p = await c.newPage();
    p.setDefaultTimeout(6000);
    p.on('pageerror', e => pageErrors.push(e.message));
    return { origin, c, p, pageErrors, writes };
}
