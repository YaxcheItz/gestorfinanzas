import { expect,test } from '@playwright/test';

test('elimina borradores antiguos sin perder movimientos confirmados en dispositivo',async({page,baseURL})=>{
  const origin=new URL(baseURL!).origin;let writes=0;
  await page.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.origin!==origin)return route.abort();
    if(!url.pathname.startsWith('/api/'))return route.continue();
    if(request.method()!=='GET'){writes++;return route.abort();}
    let data:unknown=[];
    if(url.pathname==='/api/perfil')data={id:995,nombre:'Prueba',email:'qa@example.test',tema:'CLARO',monedaPredeterminada:'MXN'};
    if(url.pathname==='/api/dashboard/resumen')data={totalCuentas:0,resumenPorMoneda:[],ultimosMovimientos:[]};
    if(url.pathname==='/api/dashboard/analitica')data={gastosPorCategoria:[],ultimosSeisMeses:[]};
    if(url.pathname==='/api/presupuestos')data={presupuestos:[],resumenPorMoneda:[]};
    await route.fulfill({json:{success:true,data}});
  });
  await page.goto('/login');
  await page.evaluate(async()=>{
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{
      const r=indexedDB.open('kaptal-movimientos-offline',3);
      r.onupgradeneeded=()=>{r.result.createObjectStore('movimientos',{keyPath:'id'}).createIndex('usuarioId','usuarioId');r.result.createObjectStore('catalogos',{keyPath:'usuarioId'});r.result.createObjectStore('borradores',{keyPath:'usuarioId'});};
      r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
    });
    await new Promise<void>((resolve,reject)=>{const tx=db.transaction(['borradores','movimientos'],'readwrite');
      tx.objectStore('borradores').put({usuarioId:995,texto:'Texto antiguo ficticio',acciones:[{id:'propuesta-vieja'}]});
      tx.objectStore('movimientos').put({id:'confirmado-qa',usuarioId:995,payload:{tipo:'GASTO',monto:25,cuentaId:1},creadoEn:'2026-01-01',estado:'PENDIENTE'});
      tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);});db.close();
    localStorage.setItem('finanzas_token',`qa.${btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))}.synthetic`);
    localStorage.setItem('finanzas_user',JSON.stringify({id:995,nombre:'Prueba',email:'qa@example.test'}));
  });
  await page.addInitScript(()=>Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false}));
  await page.goto('/dashboard');await expect(page.locator('app-dashboard')).toBeVisible();
  await expect.poll(async()=>page.evaluate(async()=>{
    const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('kaptal-movimientos-offline');r.onsuccess=()=>resolve(r.result);});
    const version=db.version,antiguos=db.objectStoreNames.contains('borradores');
    const movimiento=await new Promise<any>(resolve=>{const r=db.transaction('movimientos').objectStore('movimientos').get('confirmado-qa');r.onsuccess=()=>resolve(r.result);});db.close();
    return {version,antiguos,id:movimiento?.id,monto:movimiento?.payload?.monto};
  })).toEqual({version:4,antiguos:false,id:'confirmado-qa',monto:25});
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('kaptal-abrir-captura-chat')));
  const panel=page.locator('#quick-capture-panel');await expect(panel).toBeVisible();
  const text=panel.locator('#quick-capture-text');await expect(text).toHaveValue('');
  await text.fill('Texto nuevo ficticio');await panel.getByRole('button',{name:'Cerrar',exact:true}).click();
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('kaptal-abrir-captura-chat')));
  await expect(text).toHaveValue('Texto nuevo ficticio');
  await page.reload();await expect(page.locator('app-dashboard')).toBeVisible();
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('kaptal-abrir-captura-chat')));
  await expect(text).toHaveValue('');expect(writes).toBe(0);
});
