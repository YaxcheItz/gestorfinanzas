import { test } from '@playwright/test';
import fs from 'node:fs';
import assert from 'node:assert/strict';

// Solo renderizado con contratos ficticios; nunca alcanza el backend.
test('formularios de cuenta y presupuesto con datos ficticios', async ({ browser, baseURL }, testInfo) => {
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
for (const [width,font,dark] of [[390,'100%',false],[320,'200%',false],[390,'100%',true]] as const) {
  await p.setViewportSize({width,height:844});
  await p.goto(origin+'/cuentas');await p.getByRole('button',{name:'Agregar cuenta',exact:false}).click();
  const dialog=p.getByRole('dialog');await dialog.waitFor();
  await p.evaluate(({font,dark})=>{document.documentElement.style.fontSize=font;document.documentElement.classList.toggle('dark',dark);},{font,dark});
  await p.locator('#cuenta-tipo').selectOption({label:'Tarjeta de Crédito'});
  await p.screenshot({path:output+'/cuenta-'+width+'-'+font+'-'+dark+'.png',fullPage:true});
  const day=p.locator('#cuenta-dia-corte');await day.scrollIntoViewIfNeeded();const dayBox=await day.boundingBox();assert(dayBox&&dayBox.width>=100);
  await p.screenshot({path:output+'/corte-'+width+'-'+font+'-'+dark+'.png'});
  await p.getByRole('button',{name:'Crear cuenta',exact:true}).scrollIntoViewIfNeeded();
  await p.screenshot({path:output+'/cuenta-pie-'+width+'-'+font+'-'+dark+'.png'});
  await dialog.getByRole('button',{name:'Cerrar',exact:true}).click();
  await p.goto(origin+'/presupuestos');await p.getByRole('button',{name:'Fijar Presupuesto',exact:true}).click();
  await p.evaluate(({font,dark})=>{document.documentElement.style.fontSize=font;document.documentElement.classList.toggle('dark',dark);},{font,dark});
  await p.screenshot({path:output+'/presupuesto-'+width+'-'+font+'-'+dark+'.png',fullPage:true});
  await p.getByRole('button',{name:'Cancelar',exact:true}).scrollIntoViewIfNeeded();
  await p.screenshot({path:output+'/presupuesto-pie-'+width+'-'+font+'-'+dark+'.png'});
  await p.getByRole('button',{name:'Cerrar formulario de presupuesto'}).click();
}
await p.goto(origin+'/presupuestos');await p.getByRole('button',{name:'Fijar Presupuesto',exact:true}).click();
await p.locator('#modalCat').selectOption({index:1});await p.locator('#modalMonto').fill('2000');
await p.route('**/api/presupuestos',r=>r.request().method()==='POST'?r.fulfill({status:503,json:{success:false,message:'Error ficticio de guardado'}}):r.fallback());
await p.getByRole('button',{name:'Guardar Presupuesto',exact:true}).click();
await p.getByRole('alert').filter({hasText:'Error ficticio de guardado'}).waitFor();
assert.equal(await p.locator('#modalMonto').inputValue(),'2000');
await p.screenshot({path:output+'/error-presupuesto.png'});
await c.close();
});
