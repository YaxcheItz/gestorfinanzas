import { test } from '@playwright/test';
import fs from 'node:fs';
import assert from 'node:assert/strict';

// Solo renderizado con contratos ficticios; nunca alcanza el backend.
test('cuentas enlazan su historial y presupuesto permite consultar y editar', async ({ browser, baseURL }, testInfo) => {
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
const budget={id:51,categoriaId:1,categoriaNombre:'Alimentación y compras del hogar de prueba',montoLimite:123456.78,montoGastado:98765.43,montoDisponible:24691.35,porcentajeConsumido:80,moneda:'MXN',mes:11,anio:2026,estado:'ALERTA'};
const movement={id:71,cuentaId:11,cuentaNombre:'Cuenta ficticia con nombre largo para gastos familiares',categoriaId:1,categoriaNombre:budget.categoriaNombre,tipo:'GASTO',monto:98765.43,moneda:'MXN',fecha:'2026-11-11',descripcion:'Compra ficticia con una descripción deliberadamente extensa para comprobar la distribución',etiquetas:['prueba']};
const requests:string[]=[];
await p.route('**/api/**',async route=>{
 const url=new URL(route.request().url());requests.push(url.pathname+url.search);
 if(route.request().method()!=='GET')throw new Error('No guardar datos durante esta revisión');
 if(url.pathname==='/api/presupuestos')return route.fulfill({json:{success:true,data:{mes:11,anio:2026,presupuestos:[budget],resumenPorMoneda:[]}}});
 if(url.pathname==='/api/presupuestos/51/detalle')return route.fulfill({json:{success:true,data:{presupuesto:budget,movimientos:[movement]}}});
 if(url.pathname==='/api/transacciones')return route.fulfill({json:{success:true,data:{content:[movement],totalPages:1,totalElements:1,number:0,size:20,first:true,last:true,empty:false}}});
 return route.fallback();
});
await p.goto(origin+'/cuentas');await p.locator('.account-card > a').click();await p.waitForURL(/cuentaId=11/);assert.equal(new URL(p.url()).searchParams.get('cuentaId'),'11');
await p.waitForTimeout(400);assert(requests.some(url=>url.startsWith('/api/transacciones?')&&url.includes('cuentaId=11')));
await p.screenshot({path:output+'/historial-cuenta.png'});
for(const [width,font,dark] of [[390,'100%',false],[320,'200%',false],[390,'100%',true]] as const){
 await p.setViewportSize({width,height:844});await p.goto(origin+'/presupuestos');
 await p.getByRole('button',{name:/Ver detalle y movimientos de/}).click();
 const dialog=p.getByRole('dialog');await dialog.waitFor();await p.getByText(movement.descripcion,{exact:true}).waitFor();
 await p.evaluate(({font,dark})=>{document.documentElement.style.fontSize=font;document.documentElement.classList.toggle('dark',dark);},{font,dark});
 assert.equal(await dialog.locator('.budget-detail-totals').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);assert.equal(await dialog.locator('.budget-detail-description').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
 await p.screenshot({path:output+'/detalle-'+width+'-'+font+'-'+dark+'.png'});
 await p.getByRole('button',{name:'Modificar límite',exact:true}).scrollIntoViewIfNeeded();
 await p.screenshot({path:output+'/detalle-pie-'+width+'-'+font+'-'+dark+'.png'});
 await p.getByRole('button',{name:'Modificar límite',exact:true}).click();assert.equal(await p.locator('#modalMonto').inputValue(),'123456.78');
 await p.getByRole('button',{name:'Cerrar formulario de presupuesto'}).click();
 await p.getByRole('button',{name:/Ver detalle y movimientos de/}).click();await p.getByRole('dialog').waitFor();await p.keyboard.press('Escape');await p.getByRole('dialog').waitFor({state:'hidden'});
}
await c.close();
});
