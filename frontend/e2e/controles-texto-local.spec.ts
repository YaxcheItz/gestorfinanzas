import { test } from '@playwright/test';
import fs from 'node:fs';
import assert from 'node:assert/strict';

// Solo renderizado con contratos ficticios; nunca alcanza el backend.
test('controles secundarios y texto ampliado no cubren ni fragmentan contenido', async ({ browser, baseURL }, testInfo) => {
const origin=new URL(baseURL!).origin;
const output=testInfo.outputDir;
const c=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});await c.addInitScript(()=>{localStorage.setItem('finanzas_token',`qa.${btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))}.synthetic`);localStorage.setItem('finanzas_user',JSON.stringify({id:995,nombre:'Prueba visual',email:'ui@example.test'}));});await c.route('**/*',async r=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/api/')){let data=[];if(u.pathname.endsWith('/perfil'))data={id:995,nombre:'Prueba visual',email:'ui@example.test',tema:'CLARO',monedaPredeterminada:'MXN'};if(u.pathname.endsWith('/listas'))data=[{id:21,nombre:'Personal QA',moneda:'MXN',personal:true,rol:'PROPIETARIO',miembros:[]}];if(u.pathname.includes('transacciones')||u.pathname.endsWith('/avisos'))data={content:[],totalPages:0,totalElements:0};
if(u.pathname.endsWith('/asistente/captura-rapida'))data={answer:'Revisa esta propuesta ficticia antes de confirmar.',engine:'REGLAS',action:{id:'qa',type:'CREATE_TRANSACTION',summary:'Compra ficticia para reunión familiar',data:{tipo:'GASTO',monto:123456.78,moneda:'MXN',cuentaId:11,categoriaId:1,descripcion:'Compra ficticia para reunión familiar',fecha:'2026-11-11'}}};if(u.pathname.endsWith('/pareja'))data=null;if(u.pathname.endsWith('/dashboard/resumen'))data={balanceTotal:9876543.21,ingresosMes:28000,gastosMes:3456.78,balanceMes:24543.22,tasaAhorro:87,totalCuentas:1,mes:11,anio:2026,ultimosMovimientos:[],resumenPorMoneda:[{moneda:'MXN',balanceTotal:9876543.21,dineroDisponible:9876543.21,deudaTarjetas:0,ingresosMes:28000,gastosMes:3456.78,balanceMes:24543.22,tasaAhorro:87,totalCuentas:1}]};
if(u.pathname.endsWith('/dashboard/analitica'))data={gastosPorCategoria:[{categoriaId:1,categoriaNombre:'Alimentación y compras del hogar de prueba',categoriaColor:'#ee7777',monto:3456.78,moneda:'MXN'}],ultimosSeisMeses:[{anio:2026,mes:11,ingresos:28000,gastos:3456.78,moneda:'MXN'}]};
if(u.pathname.endsWith('/dashboard/comparacion'))data={mes:11,anio:2026,mesAnterior:10,anioAnterior:2026,porMoneda:[]};
if(u.pathname.endsWith('/presupuestos'))data={mes:11,anio:2026,presupuestos:[],resumenPorMoneda:[]};
if(u.pathname.endsWith('/cuentas'))data=[{id:11,nombre:'Cuenta ficticia para vacaciones y gastos extraordinarios familiares',tipo:'DEBITO',saldoActual:9876543.21,moneda:'MXN',activo:true,fechaCreacion:'2026-11-01'}];
if(u.pathname.endsWith('/categorias'))data=[{id:1,nombre:'Alimentación y compras del hogar de prueba',tipo:'GASTO',color:'#ee7777',icono:'🍎',esPersonalizada:true,activo:true}];
if(u.pathname.endsWith('/transacciones/recientes'))data=[];
return r.fulfill({json:{success:true,data}});}return u.origin===origin?r.continue():r.abort();});fs.mkdirSync('.local/visual-deep-1111',{recursive:true});let results=[];const p=await c.newPage();p.setDefaultTimeout(4000);p.on('pageerror',e=>console.log('PAGEERROR',e.message));


fs.mkdirSync(output,{recursive:true});
await p.setViewportSize({width:320,height:640});
for (const route of ['configuracion','reportes','metas','libro-diario','cuentas','presupuestos']) {
  await p.goto(origin+'/'+route);
  await p.locator('.capture-dock--inline').waitFor();
  await p.evaluate(()=>document.fonts.ready);
  const dock=await p.locator('.capture-dock').boundingBox();
  const main=await p.locator('#main-content').boundingBox();
  assert(dock&&main&&dock.y+dock.height<=main.y+1);
  assert.equal(await p.locator('.capture-dock').evaluate(e=>getComputedStyle(e).position),'static');
  await p.screenshot({path:output+'/'+route+'.png',fullPage:true});
}
for (const route of ['cuentas','presupuestos']) {
  await p.goto(origin+'/'+route);await p.waitForTimeout(500);
  await p.evaluate(()=>document.documentElement.style.fontSize='200%');
  if(route==='cuentas') {
    const name=await p.locator('.account-card__name').boundingBox();assert(name&&name.width>=200);assert.equal(await p.locator('.account-card__name').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
  } else {
    const month=await p.getByRole('combobox',{name:'Mes del presupuesto'}).boundingBox();assert(month&&month.width>=240);
  }
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),320);
  await p.screenshot({path:output+'/'+route+'-200.png',fullPage:true});
  await p.evaluate(()=>document.documentElement.classList.add('dark'));
  await p.screenshot({path:output+'/'+route+'-200-dark.png',fullPage:true});
}
await p.goto(origin+'/dashboard');await p.waitForTimeout(500);
assert.equal(await p.locator('.capture-dock').evaluate(e=>getComputedStyle(e).position),'fixed');
const before=await p.locator('.home-metric__value').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize));
await p.evaluate(()=>document.documentElement.style.fontSize='200%');
const after=await p.locator('.home-metric__value').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize));assert(after>=before*1.9);
await p.screenshot({path:output+'/inicio-200.png',fullPage:true});
await p.goto(origin+'/cuentas');await p.locator('.capture-dock__manual').click();await p.locator('#quick-capture-text').waitFor();
await c.close();
});
