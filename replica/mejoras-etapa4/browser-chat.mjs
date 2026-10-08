import { createServer } from 'node:http';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(new URL('../../frontend/package.json',import.meta.url));
const {chromium,expect}=require('@playwright/test');
const root=fileURLToPath(new URL('../../frontend/dist/frontend/browser/',import.meta.url));
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
  try{
    let path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(path!==resolve(root)&&!path.startsWith(resolve(root)+sep)){res.writeHead(403).end();return;}
    if(!(await stat(path).catch(()=>null))?.isFile())path=resolve(root,'index.html');
    res.writeHead(200,{'Content-Type':mime[extname(path)]??'application/octet-stream','Cache-Control':'no-store'}).end(await readFile(path));
  }catch{res.writeHead(500).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true});const resultados=[];
try{
 for(const escenario of [{width:360,height:800,dark:false},{width:390,height:844,dark:true},{width:1280,height:900,dark:false},{width:844,height:390,dark:false}]){
  const context=await browser.newContext({viewport:{width:escenario.width,height:escenario.height},serviceWorkers:'block',reducedMotion:'reduce',colorScheme:escenario.dark?'dark':'light'});
  await context.addInitScript(()=>{
   localStorage.setItem('finanzas_user',JSON.stringify({id:991,nombre:'Prueba',email:'prueba@example.test'}));
   localStorage.setItem('finanzas_token',`e30.${btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))}.synthetic`);
  });
  await context.route('**/runtime-config.js',r=>r.fulfill({contentType:'text/javascript',body:'window.__API_BASE_URL__="/api";'}));
  const propuestas=new Map(),movimientos=[],peticiones=[],errores=[];let indice=0,respuestaPerdida=false;
  await context.route('**/api/**',async route=>{
   const request=route.request(),path=new URL(request.url()).pathname,method=request.method();
   const body=request.postData()?request.postDataJSON():null;peticiones.push({path,method,body});
   let data=[],status=200,message='';
   if(path==='/api/perfil')data={id:991,nombre:'Prueba',tema:escenario.dark?'OSCURO':'CLARO',monedaPredeterminada:'MXN',ocultarMontos:false};
   else if(path==='/api/cuentas')data=[{id:1,nombre:'Efectivo',tipo:'EFECTIVO',moneda:'MXN',saldoActual:100-movimientos.reduce((s,m)=>s+m.monto,0),activo:true}];
   else if(path.startsWith('/api/categorias'))data=[{id:1,nombre:'Comida',tipo:'GASTO',activo:true,esPersonalizada:true}];
   else if(path==='/api/dashboard/resumen')data={resumenPorMoneda:[{moneda:'MXN',balanceTotal:100,ingresosMes:0,gastosMes:0,balanceMes:0,tasaAhorro:0,totalCuentas:1,dineroDisponible:100,deudaTarjetas:0}],ultimosMovimientos:[],mes:10,anio:2026,totalCuentas:1};
   else if(path==='/api/dashboard/analitica')data={gastosPorCategoria:[],ultimosSeisMeses:[]};
   else if(path==='/api/presupuestos')data={presupuestos:[],resumenPorMoneda:[],totalPresupuestado:0,totalGastado:0,totalDisponible:0,porcentajeConsumidoGlobal:0};
   else if(path.startsWith('/api/transacciones'))data={content:[],totalPages:0,totalElements:0,number:0};
   else if(path==='/api/asistente/acciones')data=[...propuestas.values()].filter(p=>!p.completada&&!p.descartada);
   else if(path==='/api/asistente/captura-rapida'){
    if(/reporte|resumen|saldo/i.test(body.content))data={answer:'Reporte calculado',engine:'REGLAS',actions:[],report:{title:'Hoy',labels:['Gastos'],values:[movimientos.reduce((s,m)=>s+m.monto,0)],unit:'MXN'}};
    else if(/gast[eé]|gasto/i.test(body.content)){
     const p={id:`propuesta-${++indice}`,version:0,type:'CREATE_TRANSACTION',summary:'Gasto de 25 MXN · Efectivo',data:{tipo:'GASTO',monto:25,cuentaId:1,categoriaId:1,fecha:'2026-10-07',metodoCaptura:'TEXTO'}};
     propuestas.set(p.id,p);data={answer:'Revisa antes de guardar',engine:'REGLAS',actions:[p]};
    }else if(!body.consentimientoDatosFinancieros){status=400;message='No encontré una regla local para ese texto. Activa el permiso.';data=null;}
    else data={answer:'La IA puede interpretar; no se ha guardado nada.',engine:'IA',actions:[]};
   }else if(path.startsWith('/api/asistente/acciones/')){
    const id=path.split('/')[4],p=propuestas.get(id);assert.ok(p,'Propuesta conocida');
    if(method==='PUT'){assert.equal(body.version,p.version);p.data=body.datos;p.version++;p.summary=`Gasto de ${p.data.monto} MXN · Efectivo`;data=p;}
    else if(method==='DELETE'){p.descartada=true;data=null;}
    else if(path.endsWith('/confirmar')){
     assert.equal(body.version,p.version);
     if(!p.completada){p.completada=true;movimientos.push({...p.data});}
     if(!respuestaPerdida){respuestaPerdida=true;await route.abort('failed');return;}
     data={completed:true};message='Movimiento guardado';
    }
   }
   await route.fulfill({status,json:{success:status===200,message,data}});
  });
  const page=await context.newPage();page.on('pageerror',e=>errores.push(e.message));
  await page.goto(origin+'/dashboard');await page.getByRole('button',{name:'Añadir movimiento',exact:true}).click();
  const panel=page.locator('#quick-capture-panel');await expect(panel).toBeVisible();
  await page.locator('#quick-capture-text').fill('Gasté 25 en tacos');await page.getByRole('button',{name:'Enviar movimiento',exact:true}).click();
  await expect(page.getByRole('button',{name:'Guardar movimiento',exact:true})).toHaveCount(1);
  assert.equal(movimientos.length,0);assert.equal(peticiones.find(p=>p.path.endsWith('/captura-rapida')).body.consentimientoDatosFinancieros,false);
  await page.reload();await page.getByRole('button',{name:'Añadir movimiento',exact:true}).click();
  await expect(page.getByRole('button',{name:'Guardar movimiento',exact:true})).toHaveCount(1);
  assert.equal(indice,1);await page.getByRole('button',{name:'Editar propuesta',exact:true}).click();
  await page.locator('input[name="editMonto"]').fill('30');
  await page.locator('input[name="editDescripcion"]').fill('Comida corregida');
  if(escenario.height>=800)assert.ok((await page.locator('.capture-editor').boundingBox()).height>=300,'Editor con espacio suficiente');
  await page.screenshot({path:fileURLToPath(new URL(`./edicion-${escenario.width}-${escenario.dark?'oscuro':'claro'}.png`,import.meta.url)),fullPage:true});
  await page.getByRole('button',{name:'Actualizar propuesta',exact:true}).click();await expect(page.locator('.capture-editor')).toHaveCount(0);
  assert.equal(movimientos.length,0);assert.equal(indice,1);assert.equal(propuestas.get('propuesta-1').version,1);
  await page.getByRole('button',{name:'Guardar movimiento',exact:true}).click();
  await expect(panel.getByText(/No pude comprobar el resultado/)).toBeVisible();assert.equal(movimientos.length,1);
  await page.getByRole('button',{name:'Guardar movimiento',exact:true}).click();await expect(page.getByRole('button',{name:'Guardar movimiento',exact:true})).toHaveCount(0);
  assert.equal(movimientos.length,1);assert.equal(movimientos[0].monto,30);
  const confirmaciones=peticiones.filter(p=>p.path.endsWith('/confirmar'));assert.equal(confirmaciones.length,2);assert.deepEqual(confirmaciones[0],confirmaciones[1]);
  await page.locator('#quick-capture-text').fill('Gasté 10 en tacos');await page.getByRole('button',{name:'Enviar movimiento',exact:true}).click();
  await page.getByRole('button',{name:'Descartar',exact:true}).click();await expect(page.getByRole('button',{name:'Guardar movimiento',exact:true})).toHaveCount(0);
  assert.equal(movimientos.length,1);assert.equal(propuestas.get('propuesta-2').descartada,true);
  await page.locator('#quick-capture-text').fill('Interpreta algo complejo');await page.getByRole('button',{name:'Enviar movimiento',exact:true}).click();
  await page.getByRole('button',{name:'Permitir y continuar',exact:true}).click();
  await expect(panel.getByText('La IA puede interpretar; no se ha guardado nada.')).toBeVisible();
  assert.equal(peticiones.filter(p=>p.path.endsWith('/captura-rapida')).at(-1).body.consentimientoDatosFinancieros,true);
  await page.locator('#quick-capture-text').fill('Reporte de hoy');await page.getByRole('button',{name:'Enviar movimiento',exact:true}).click();await expect(page.locator('.chat-local-report')).toBeVisible();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errores,[]);
  assert.equal(peticiones.filter(p=>p.method==='POST'&&p.path==='/api/transacciones').length,0);
  await page.screenshot({path:fileURLToPath(new URL(`./chat-${escenario.width}-${escenario.dark?'oscuro':'claro'}.png`,import.meta.url)),fullPage:true});
  resultados.push({...escenario,recarga:true,edicionSinRegistro:true,reintentoSinDuplicados:true,descartePersistente:true,consentimiento:true,reporteLocal:true,errores,overflow:false});
  await context.close();
 }
 const resultado={fecha:new Date().toISOString(),api:'sintética',serviceWorkers:'bloqueados',reducedMotion:true,resultados};
 await writeFile(new URL('./browser-checks.json',import.meta.url),JSON.stringify(resultado,null,2));process.stdout.write(JSON.stringify(resultado));
}finally{await browser.close();await new Promise(done=>server.close(done));}
