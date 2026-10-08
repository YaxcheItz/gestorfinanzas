import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const require = createRequire(new URL('../../frontend/package.json', import.meta.url));
const { chromium, expect } = require('@playwright/test');
const browser = await chromium.launch({ headless: true });
const checks = [];
try {
  for (const settings of [
    { width: 360, height: 800, colorScheme: 'light', hasTouch: true },
    { width: 390, height: 844, colorScheme: 'light', hasTouch: true },
    { width: 390, height: 844, colorScheme: 'dark', hasTouch: true },
    { width: 1280, height: 900, colorScheme: 'light', hasTouch: false }
  ]) {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: settings, colorScheme: settings.colorScheme, hasTouch: settings.hasTouch });
    const page = await context.newPage();
    const errors = [];
    const requests = [];
    page.on('pageerror', error => errors.push(error.message));
    const token = `e30.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.synthetic`;
    await page.addInitScript(({ token, scheme }) => {
      localStorage.setItem('finanzas_token', token);
      localStorage.setItem('finanzas_user', JSON.stringify({ id: 991, nombre: 'Prueba', email: 'prueba@example.test' }));
      localStorage.setItem('kaptal_tema_modo_991', 'AUTO');
    }, { token, scheme: settings.colorScheme });
    const categories = [50, 20, 10, 10, 10].map((monto, index) => ({ id: index + 1, nombre: `Cat ${index}`, tipo: 'GASTO', activo: true, esPersonalizada: true, color: '#10b981', icono: 'food', monto }));
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      requests.push({ path: url.pathname, method: route.request().method(), params: Object.fromEntries(url.searchParams), body: route.request().postDataJSON(), key: route.request().headers()['idempotency-key'] });
      let data = [];
      if (url.pathname === '/api/perfil') data = { id: 991, nombre: 'Prueba', email: 'prueba@example.test', tema: settings.colorScheme === 'dark' ? 'OSCURO' : 'CLARO', monedaPredeterminada: 'MXN' };
      else if (url.pathname === '/api/dashboard/resumen') data = {
        resumenPorMoneda: [{ moneda: 'MXN', balanceTotal: 5000, ingresosMes: 200, gastosMes: 100, balanceMes: 100, tasaAhorro: 50, totalCuentas: 1, dineroDisponible: 5000, deudaTarjetas: 0 }],
        ultimosMovimientos: [], mes: 10, anio: 2026, totalCuentas: 1
      };
      else if (url.pathname === '/api/dashboard/analitica') data = {
        gastosPorCategoria: categories.map(item => ({ categoriaId: item.id, categoriaNombre: item.nombre, categoriaColor: item.color, monto: item.monto, moneda: 'MXN' })), ultimosSeisMeses: []
      };
      else if (url.pathname === '/api/presupuestos') data = { presupuestos: [], resumenPorMoneda: [], totalPresupuestado: 0, totalGastado: 0, totalDisponible: 0, porcentajeConsumidoGlobal: 0 };
      else if (url.pathname.startsWith('/api/categorias')) data = [...categories,{id:20,nombre:'Sueldo',tipo:'INGRESO',activo:true,esPersonalizada:true}];
      else if (url.pathname === '/api/cuentas') data = [{ id: 1, nombre: 'Efectivo', tipo: 'EFECTIVO', moneda: 'MXN', saldoActual: 5000, activo: true }, { id: 2, nombre: 'Ahorro', tipo: 'AHORRO', moneda: 'MXN', saldoActual: 0, activo: true }];
      else if (url.pathname === '/api/asistente/captura-rapida') {
        const text=route.request().postDataJSON().content;
        const report=/reporte|top|saldo/i.test(text);
        data={answer:report?'Resumen del periodo':'Revisa antes de guardar',engine:'REGLAS',actions:report?[]:[{id:'mov-1',type:'CREATE_TRANSACTION',summary:'Gasto de 80 MXN ? Efectivo ? 2026-10-04',data:{tipo:'GASTO',monto:80,cuentaId:1,categoriaId:1,fecha:'2026-10-04'}}],report:report?{title:'Resumen',labels:['Ingresos','Gastos'],values:[200,80],unit:'MXN'}:null};
      }
      else if (url.pathname.includes('/api/asistente/acciones/')) data={completed:true};
      else if (url.pathname === '/api/transacciones' && route.request().method() === 'POST') data = { id: 100, ...route.request().postDataJSON() };
      else if (url.pathname.startsWith('/api/transacciones')) data = { content: [], totalPages: 0, totalElements: 0, number: 0 };
      await route.fulfill({ json: { success: true, message: '', data } });
    });
    await page.goto('http://127.0.0.1:14201/dashboard');
    await page.locator('.stable-bottom-nav').waitFor();
    assert.equal(await page.locator('app-registro-rapido').count(),0);
    await page.getByRole('button',{name:'Añadir movimiento',exact:true}).click();
    await expect(page.locator('#quick-capture-panel')).toBeVisible();
    await page.locator('#quick-capture-text').fill('Gaste 80 en tacos');
    await page.getByRole('button',{name:'Enviar movimiento',exact:true}).click();
    await page.waitForTimeout(500);
    await writeFile(new URL('debug.json',import.meta.url),JSON.stringify({requests,errors,text:await page.locator('#quick-capture-panel').innerText()},null,2));
    await expect(page.getByRole('button',{name:'Guardar movimiento',exact:true})).toBeVisible();
    assert.equal(requests.filter(r=>r.path.includes('/acciones/')).length,0);
    const body=requests.filter(r=>r.path==='/api/asistente/captura-rapida').at(-1).body;
    assert.equal(body.consentimientoDatosFinancieros,false);
    await page.getByRole('button',{name:'Guardar movimiento',exact:true}).click();
    await expect(page.getByRole('button',{name:'Guardar movimiento',exact:true})).toHaveCount(0);
    await page.locator('.chat-local-prompts button').first().click();
    await expect(page.locator('.chat-local-report')).toBeVisible();
    assert.equal(await page.locator('.capture-chat__user').count(),2);
    assert.equal(requests.filter(r=>r.path.includes('verificar')).length,0);
    const panel=await page.locator('#quick-capture-panel').boundingBox();
    assert.ok(panel.width<=settings.width && panel.height<=settings.height);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.getByRole('button',{name:'Cerrar',exact:true}).click();
    await page.getByRole('button',{name:'Reportes',exact:true}).click();
    await expect(page.locator('.chat-local-report')).toHaveCount(2);
    assert.equal(await page.locator('.capture-chat__user').count(),3);
    await page.screenshot({path:fileURLToPath(new URL(`chat-${settings.width}-${settings.colorScheme}.png`,import.meta.url)),fullPage:true});
    assert.deepEqual(errors,[]);
    checks.push({settings,chatOnly:true,confirmation:true,unifiedReports:true,noProviderPing:true,noOverflow:true});
    await context.close();
  }
  await writeFile(new URL('browser-checks.json',import.meta.url),JSON.stringify(checks,null,2));
  process.stdout.write(JSON.stringify(checks));
} finally {await browser.close();}
