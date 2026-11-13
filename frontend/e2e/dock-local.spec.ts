import {test} from '@playwright/test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
test('dock y contenido con datos ficticios',async({browser,baseURL},testInfo)=>{
const origin=new URL(baseURL!).origin;
const output=testInfo.outputDir;
const c=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});await c.addInitScript(()=>{localStorage.setItem('finanzas_token',`qa.${btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))}.synthetic`);localStorage.setItem('finanzas_user',JSON.stringify({id:995,nombre:'Prueba visual',email:'ui@example.test'}));});await c.route('**/*',async r=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/api/')){if(r.request().method()!=='GET')throw new Error('No se permiten escrituras en esta prueba');let data=[];if(u.pathname.endsWith('/perfil'))data={id:995,nombre:'Prueba visual',email:'ui@example.test',tema:'CLARO',monedaPredeterminada:'MXN'};if(u.pathname.endsWith('/listas'))data=[{id:21,nombre:'Personal QA',moneda:'MXN',personal:true,rol:'PROPIETARIO',miembros:[]}];if(u.pathname.includes('transacciones')||u.pathname.endsWith('/avisos'))data={content:[],totalPages:0,totalElements:0};
if(u.pathname.endsWith('/asistente/captura-rapida'))data={answer:'Revisa esta propuesta ficticia antes de confirmar.',engine:'REGLAS',action:{id:'qa',type:'CREATE_TRANSACTION',summary:'Compra ficticia para reunión familiar',data:{tipo:'GASTO',monto:123456.78,moneda:'MXN',cuentaId:11,categoriaId:1,descripcion:'Compra ficticia para reunión familiar',fecha:'2026-11-11'}}};if(u.pathname.endsWith('/pareja'))data=null;if(u.pathname.endsWith('/dashboard/resumen'))data={balanceTotal:9876543.21,ingresosMes:28000,gastosMes:3456.78,balanceMes:24543.22,tasaAhorro:87,totalCuentas:1,mes:11,anio:2026,ultimosMovimientos:[],resumenPorMoneda:[{moneda:'MXN',balanceTotal:9876543.21,dineroDisponible:9876543.21,deudaTarjetas:0,ingresosMes:28000,gastosMes:3456.78,balanceMes:24543.22,tasaAhorro:87,totalCuentas:1}]};
if(u.pathname.endsWith('/dashboard/analitica'))data={gastosPorCategoria:[{categoriaId:1,categoriaNombre:'Alimentación y compras del hogar de prueba',categoriaColor:'#ee7777',monto:3456.78,moneda:'MXN'}],ultimosSeisMeses:[{anio:2026,mes:11,ingresos:28000,gastos:3456.78,moneda:'MXN'}]};
if(u.pathname.endsWith('/dashboard/comparacion'))data={mes:11,anio:2026,mesAnterior:10,anioAnterior:2026,porMoneda:[]};
if(u.pathname.endsWith('/presupuestos'))data={mes:11,anio:2026,presupuestos:[],resumenPorMoneda:[]};
if(u.pathname.endsWith('/cuentas'))data=[{id:11,nombre:'Cuenta ficticia para vacaciones y gastos extraordinarios familiares',tipo:'DEBITO',saldoActual:9876543.21,moneda:'MXN',activo:true,fechaCreacion:'2026-11-01'}];
if(u.pathname.endsWith('/categorias'))data=[{id:1,nombre:'Alimentación y compras del hogar de prueba',tipo:'GASTO',color:'#ee7777',icono:'🍎',esPersonalizada:true,activo:true}];
if(u.pathname.endsWith('/transacciones/recientes'))data=[];
return r.fulfill({json:{success:true,data}});}return u.origin===origin?r.continue():r.abort();});const pageErrors:string[]=[];const p=await c.newPage();p.setDefaultTimeout(4000);p.on('pageerror',e=>pageErrors.push(e.message));




fs.mkdirSync(output,{recursive:true});

const movement={id:71,cuentaId:11,cuentaNombre:'Cuenta ficticia',categoriaId:1,categoriaNombre:'Compras QA',tipo:'GASTO',monto:45,moneda:'MXN',fecha:'2026-11-11',descripcion:'Compra ficticia',etiquetas:[]};
await p.route('**/api/transacciones*',async r=>{const u=new URL(r.request().url());if(u.pathname!=='/api/transacciones')return r.fallback();return r.fulfill({json:{success:true,data:{content:Array.from({length:20},(_,i)=>({...movement,id:71+i,descripcion:'Compra ficticia '+i})),totalPages:2,totalElements:40,number:0,size:20,first:true,last:false,empty:false}}});});


await p.emulateMedia({reducedMotion:'reduce'});
// Esperar el desplazamiento antes de medir y excluir botones deshabilitados.

const evidence=[];
for(const [width,height,font,dark] of [[390,844,'100%',false],[320,640,'200%',false],[390,480,'100%',true],[1280,800,'100%',false]] as const){
 await p.setViewportSize({width,height});
 for(const route of ['dashboard','transacciones']){
 await p.goto(origin+'/'+route);await p.waitForTimeout(500);
 await p.evaluate(({font,dark})=>{document.documentElement.style.fontSize=font;document.documentElement.classList.toggle('dark',dark);},{font,dark});
 const contrast=await p.locator('.capture-dock__voice').evaluate(e=>{
 const style=getComputedStyle(e);
 const lum=(color:string)=>{const channels=color.match(/[\d.]+/g)!.slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return channels.reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);};
 const colors=[lum(style.color),lum(style.backgroundColor)].sort((a,b)=>a-b);return (colors[1]+.05)/(colors[0]+.05);
 });assert(contrast>=3);
 await p.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
 await p.screenshot({path:output+'/'+route+'-'+width+'-'+height+'-'+font+'-bottom.png'});
 if(route==='transacciones'){
 for(const button of await p.locator('.history-pagination button').all()){
 assert.equal(await button.evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
 const rect=await button.boundingBox();assert(rect&&rect.x>=0&&rect.x+rect.width<=width);
 }
 }
 const elements=p.locator('#main-content button:visible:enabled,#main-content a:visible,#main-content [role="button"]:visible');
 const hits=[];
 await elements.first().focus();await p.keyboard.press('Tab');
 assert.equal(await p.evaluate(()=>document.querySelector('#main-content')?.contains(document.activeElement)),true);
 for(const el of await elements.all()){
 await el.focus();await p.waitForTimeout(60);
 const result=await el.evaluate(e=>{const r=e.getBoundingClientRect();const docks=[...document.querySelectorAll('.capture-dock button')].map(b=>b.getBoundingClientRect());return {focused:e===document.activeElement,text:e.getAttribute('aria-label')||e.textContent?.trim(),rect:r.toJSON(),overlap:docks.some(b=>r.left<b.right&&r.right>b.left&&r.top<b.bottom&&r.bottom>b.top)};});
 if(result.focused&&result.overlap)hits.push(result);
 }
 evidence.push({route,width,height,font,hits});
 assert.deepEqual(hits,[],JSON.stringify({route,width,height,font,hits}));
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await p.screenshot({path:output+'/'+route+'-'+width+'-'+height+'-'+font+'-focus.png'});
 }
}
assert.deepEqual(pageErrors,[]);
fs.writeFileSync(output+'/geometry.json',JSON.stringify(evidence,null,2));
await c.close();
});
