import {createServer} from 'node:http';
import {readFile,stat,writeFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(new URL('../../frontend/package.json',import.meta.url));
const {chromium,expect}=require('@playwright/test');
const root=fileURLToPath(new URL('../../frontend/dist/frontend/browser/',import.meta.url));
const mime={'.js':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const movimientos=new Map(),solicitudes=[];let perderRespuesta=true,version=1;
const cuentas=[{id:1,nombre:'Efectivo',tipo:'EFECTIVO',moneda:'MXN',saldoActual:100,activo:true}];
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost'),ruta=url.pathname;
  if(ruta==='/fixture'){res.writeHead(200,{'Content-Type':'text/html'}).end('<html><body>Fixture IndexedDB</body></html>');return;}
  if(ruta.startsWith('/api/')){
   let texto='';for await(const chunk of req)texto+=chunk;
   const body=texto?JSON.parse(texto):null;let data=[];
   if(ruta==='/api/perfil')data={id:991,nombre:'Prueba',tema:'CLARO',monedaPredeterminada:'MXN',ocultarMontos:false};
   else if(ruta==='/api/cuentas')data=cuentas;
   else if(ruta.startsWith('/api/categorias'))data=[{id:1,nombre:'Comida',tipo:'GASTO',activo:true,esPersonalizada:true}];
   else if(ruta==='/api/dashboard/resumen')data={resumenPorMoneda:[{moneda:'MXN',balanceTotal:100,ingresosMes:0,gastosMes:0,balanceMes:0,tasaAhorro:0,totalCuentas:1,dineroDisponible:100,deudaTarjetas:0}],ultimosMovimientos:[],mes:10,anio:2026,totalCuentas:1};
   else if(ruta==='/api/dashboard/analitica')data={gastosPorCategoria:[],ultimosSeisMeses:[]};
   else if(ruta==='/api/presupuestos')data={presupuestos:[],resumenPorMoneda:[],totalPresupuestado:0,totalGastado:0,totalDisponible:0,porcentajeConsumidoGlobal:0};
   else if(ruta==='/api/transacciones'&&req.method==='POST'){
    const key=req.headers['idempotency-key'];assert.ok(key);
    solicitudes.push({key,body});
    if(movimientos.has(key))assert.deepEqual(movimientos.get(key),body);
    else movimientos.set(key,body);
    if(perderRespuesta){perderRespuesta=false;res.writeHead(503,{'Content-Type':'application/json'}).end(JSON.stringify({success:false,message:'Confirmación no disponible',data:null}));return;}
    data={id:1,...body};
   }else if(ruta.startsWith('/api/transacciones'))data={content:[],totalPages:0,totalElements:0,number:0};
   res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify({success:true,data}));return;
  }
  if(ruta==='/runtime-config.js'){res.writeHead(200,{'Content-Type':'text/javascript'}).end('window.__API_BASE_URL__="/api";');return;}
  let path=resolve(root,'.'+decodeURIComponent(ruta));
  if(path!==resolve(root)&&!path.startsWith(resolve(root)+sep)){res.writeHead(403).end();return;}
  if(!(await stat(path).catch(()=>null))?.isFile())path=resolve(root,'index.html');
  let contenido=await readFile(path);
  if(ruta==='/ngsw.json'){const manifest=JSON.parse(contenido);manifest.appData={fixtureVersion:version};contenido=JSON.stringify(manifest);}
  res.writeHead(200,{'Content-Type':mime[extname(path)]??'application/octet-stream','Cache-Control':'no-store'}).end(contenido);
 }catch(e){process.stderr.write(String(e)+'\n');res.writeHead(500).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow',reducedMotion:'reduce'});
await context.addInitScript(()=>{
 if(!localStorage.getItem('finanzas_user')){
  localStorage.setItem('finanzas_user',JSON.stringify({id:991,nombre:'Prueba',email:'prueba@example.test'}));
  localStorage.setItem('finanzas_token',`e30.${btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))}.synthetic`);
 }
});
const page=await context.newPage(),errores=[];page.on('pageerror',e=>errores.push(e.message));
async function registros(store){return page.evaluate(nombre=>new Promise((resolve,reject)=>{
 const r=indexedDB.open('kaptal-movimientos-offline',3);r.onerror=()=>reject(r.error);
 r.onsuccess=()=>{const db=r.result,tx=db.transaction(nombre),q=tx.objectStore(nombre).getAll();q.onsuccess=()=>resolve(q.result.filter(e=>e.usuarioId===991));tx.oncomplete=()=>db.close();};
}),store);}
const abrir=async()=>{await page.getByRole('button',{name:'Añadir movimiento',exact:true}).click();await expect(page.locator('#quick-capture-panel')).toBeVisible();};
try{
 await page.goto(origin+'/fixture');
 await page.evaluate(()=>new Promise((resolve,reject)=>{
  const r=indexedDB.open('kaptal-movimientos-offline',2);
  r.onupgradeneeded=()=>{r.result.createObjectStore('movimientos',{keyPath:'id'}).createIndex('usuarioId','usuarioId');r.result.createObjectStore('catalogos',{keyPath:'usuarioId'});};
  r.onerror=()=>reject(r.error);r.onsuccess=()=>{
   const db=r.result,tx=db.transaction('catalogos','readwrite');
   tx.objectStore('catalogos').put({usuarioId:992,cuentas:[{id:992,nombre:'Catálogo anterior'}],categorias:[],actualizadoEn:new Date().toISOString()});
   tx.oncomplete=()=>{db.close();resolve();};
  };
 }));
 await page.goto(origin+'/dashboard');await abrir();
 await expect.poll(async()=> (await registros('catalogos')).length).toBe(1);
 assert.equal(await page.evaluate(()=>new Promise(resolve=>{
  const r=indexedDB.open('kaptal-movimientos-offline',3);r.onsuccess=()=>{
   const db=r.result,q=db.transaction('catalogos').objectStore('catalogos').get(992);q.onsuccess=()=>{resolve(q.result.cuentas[0].nombre);db.close();};
  };
 })),'Catálogo anterior');
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
 await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 await context.setOffline(true);await page.reload();await abrir();
 await page.locator('#quick-capture-text').fill('Gasté 25 en Comida con Efectivo ayer');
 await page.getByRole('button',{name:'Enviar movimiento',exact:true}).click();
 await expect(page.getByRole('button',{name:'Guardar movimiento',exact:true})).toHaveCount(1);
 assert.equal(movimientos.size,0);assert.equal((await registros('movimientos')).length,0);
 await expect.poll(async()=> (await registros('borradores'))[0]?.acciones.length).toBe(1);
 await page.reload();await abrir();
 await expect(page.getByRole('button',{name:'Guardar movimiento',exact:true})).toHaveCount(1);
 // Abortar después de una solicitud exitosa reproduce el fallo de commit tardío con IndexedDB real.
 await page.evaluate(()=>{
  const original=IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put=function(...args){
   const r=original.apply(this,args);
   if(this.name==='movimientos'){const tx=this.transaction;r.addEventListener('success',()=>tx.abort(),{once:true});IDBObjectStore.prototype.put=original;}
   return r;
  };
 });
 await page.getByRole('button',{name:'Guardar movimiento',exact:true}).click();
 await expect(page.getByRole('button',{name:'Guardar movimiento',exact:true})).toHaveCount(1);
 await expect(page.locator('#quick-capture-panel')).toContainText(/canceló|guardado local|almacenamiento local/);
 assert.equal((await registros('movimientos')).length,0);
 await page.getByRole('button',{name:'Guardar movimiento',exact:true}).click();
 await expect.poll(async()=> (await registros('movimientos')).length).toBe(1);
 const guardado=(await registros('movimientos'))[0];assert.equal(guardado.payload.monto,25);
 assert.equal(movimientos.size,0);
 await expect.poll(async()=> (await registros('borradores'))[0]?.acciones.length).toBe(0);
 await page.screenshot({path:fileURLToPath(new URL('./offline-confirmado.png',import.meta.url)),fullPage:true});
 await context.setOffline(false);
 await expect.poll(()=>movimientos.size).toBe(1);
 await expect.poll(async()=> (await registros('movimientos'))[0]?.estado).toBe('PENDIENTE');
 await page.evaluate(()=>window.dispatchEvent(new Event('online')));
 await expect.poll(async()=> (await registros('movimientos')).length).toBe(0);
 assert.equal(movimientos.size,1);assert.ok(solicitudes.length>=2);assert.deepEqual(solicitudes[0],solicitudes.at(-1));
 assert.equal(solicitudes[0].key,guardado.id);
 // Nueva versión del manifiesto, mismos assets: prueba el evento real del worker y el guardado antes de recargar.
 version=2;
 await page.evaluate(()=>navigator.serviceWorker.controller.postMessage({action:'CHECK_FOR_UPDATES',nonce:101}));
 const actualizar=page.getByRole('button',{name:'Guardar borrador y actualizar',exact:true});
 await expect(actualizar).toBeVisible({timeout:30000});
 await page.locator('#quick-capture-text').fill('Texto pendiente antes de actualizar');
 await Promise.all([page.waitForEvent('load'),actualizar.click()]);
 await abrir();await expect(page.locator('#quick-capture-text')).toHaveValue('Texto pendiente antes de actualizar');
 await context.setOffline(true);
 await page.locator('#quick-capture-text').fill('Gasté 10 en Comida con Efectivo hoy');
 await page.getByRole('button',{name:'Enviar movimiento',exact:true}).click();
 await page.getByRole('button',{name:'Guardar movimiento',exact:true}).click();
 await expect.poll(async()=> (await registros('movimientos')).length).toBe(1);
 const segundoId=(await registros('movimientos'))[0].id;
 const revisionAntes=(await registros('borradores'))[0].revision;
 const segunda=await context.newPage();await segunda.goto(origin+'/dashboard');
 await expect.poll(async()=> (await registros('borradores'))[0].revision).not.toBe(revisionAntes);
 await segunda.evaluate(async()=>{
  await new Promise(resolve=>{
   navigator.locks.request('kaptal-offline-991',async()=>{
    await new Promise(fin=>{window.soltarBloqueoOffline=fin;resolve();});
   });
  });
 });
 await context.setOffline(false);
 // El bloqueo real impide que las dos pestañas envíen mientras hay otro sincronizador.
 await page.evaluate(()=>window.dispatchEvent(new Event('online')));
 await segunda.evaluate(()=>window.dispatchEvent(new Event('online')));
 assert.equal(solicitudes.filter(s=>s.key===segundoId).length,0);
 await segunda.evaluate(()=>window.soltarBloqueoOffline());
 await Promise.all([page.evaluate(()=>window.dispatchEvent(new Event('online'))),segunda.evaluate(()=>window.dispatchEvent(new Event('online')))]);
 await expect.poll(async()=> (await registros('movimientos')).length).toBe(0);
 assert.equal(solicitudes.filter(s=>s.key===segundoId).length,1);
 assert.equal(movimientos.size,2);await segunda.close();
 await page.locator('#quick-capture-text').fill('Texto que debe conservarse ante otro borrador');
 await expect(page.locator('#quick-capture-panel')).toContainText('Otro chat cambió el borrador guardado');
 version=3;await page.evaluate(()=>navigator.serviceWorker.controller.postMessage({action:'CHECK_FOR_UPDATES',nonce:102}));
 await expect(actualizar).toBeVisible({timeout:30000});await actualizar.click();
 await expect(page.locator('.pwa-update')).toContainText('Otro chat cambió el borrador guardado');
 await expect(page.locator('#quick-capture-text')).toHaveValue('Texto que debe conservarse ante otro borrador');
 const vistas=[];
 for(const vista of [{width:360,height:800,dark:false},{width:390,height:844,dark:true},{width:1280,height:900,dark:false},{width:844,height:390,dark:false}]){
  await page.setViewportSize({width:vista.width,height:vista.height});
  await page.evaluate(oscuro=>document.documentElement.classList.toggle('dark',oscuro),vista.dark);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);
  await page.screenshot({path:fileURLToPath(new URL(`./vista-${vista.width}-${vista.dark?'oscuro':'claro'}.png`,import.meta.url)),fullPage:true});
  vistas.push({...vista,overflow});
 }
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errores,[]);
 await page.screenshot({path:fileURLToPath(new URL('./borrador-recuperado.png',import.meta.url)),fullPage:true});
 const resultado={fecha:new Date().toISOString(),api:'sintética',serviceWorker:'real',indexedDB:'real',
  migracionV2V3:true,recargaOffline:true,propuestaSinRegistro:true,abortoTardio:true,colaAtomica:true,reintentoMismoUuid:true,
  movimientos:movimientos.size,actualizacionConBorrador:true,bloqueoEntrePestanas:true,conflictoBorradorSinRecarga:true,vistas,errores,overflow:false};
 await writeFile(new URL('./browser-checks.json',import.meta.url),JSON.stringify(resultado,null,2));
 process.stdout.write(JSON.stringify(resultado));
}catch(e){await page.screenshot({path:fileURLToPath(new URL('./fallo-browser.png',import.meta.url)),fullPage:true});throw e;}
finally{await context.close();await browser.close();await new Promise(r=>server.close(r));}
