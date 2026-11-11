import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('conserva el borrador anterior y muestra propuestas locales solo al solicitarlas',async({page,baseURL})=>{
  const origin=new URL(baseURL!).origin;
  let writes=0;
  await page.context().route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.origin!==origin)return route.abort();
    if(!url.pathname.startsWith('/api/'))return route.continue();
    if(request.method()!=='GET'){writes++;return route.abort();}
    let data:unknown=[];
    if(url.pathname==='/api/perfil')data={id:995,nombre:'Prueba',email:'test@example.test',tema:'CLARO',monedaPredeterminada:'MXN'};
    if(url.pathname==='/api/dashboard/resumen')data={totalCuentas:0,resumenPorMoneda:[],ultimosMovimientos:[]};
    if(url.pathname==='/api/dashboard/analitica')data={gastosPorCategoria:[],ultimosSeisMeses:[]};
    if(url.pathname==='/api/presupuestos')data={presupuestos:[],resumenPorMoneda:[]};
    await route.fulfill({json:{success:true,data}});
  });
  await page.goto('/login');
  await page.evaluate(async()=>{
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{
      const open=indexedDB.open('kaptal-movimientos-offline',3);
      open.onupgradeneeded=()=>{const d=open.result;d.createObjectStore('movimientos',{keyPath:'id'}).createIndex('usuarioId','usuarioId');d.createObjectStore('catalogos',{keyPath:'usuarioId'});d.createObjectStore('borradores',{keyPath:'usuarioId'});};
      open.onsuccess=()=>resolve(open.result);open.onerror=()=>reject(open.error);
    });
    await new Promise<void>((resolve,reject)=>{const tx=db.transaction('borradores','readwrite');
      tx.objectStore('borradores').put({usuarioId:995,revision:'original',texto:'Texto anterior ficticio',contexto:'contexto ficticio',acciones:[{id:'local-qa',type:'CREATE_TRANSACTION',summary:'Propuesta ficticia',data:{},local:true}],actualizadoEn:'2026-01-01'});
      tx.objectStore('borradores').put({usuarioId:'archivo:996:qa',borrador:{usuarioId:996,texto:'Texto ajeno ficticio',acciones:[],actualizadoEn:'2026-01-01'}});
      tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);});db.close();
    localStorage.setItem('finanzas_token',`qa.${btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))}.synthetic`);
    localStorage.setItem('finanzas_user',JSON.stringify({id:995,nombre:'Prueba',email:'test@example.test'}));
  });
  await page.goto('/dashboard');
  await expect(page.locator('app-dashboard')).toBeVisible();
  await page.waitForTimeout(500);
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('kaptal-abrir-captura-chat')));
  const panel=page.locator('#quick-capture-panel');
  await expect(panel).toBeVisible();
  await expect(panel.locator('#quick-capture-text')).toHaveValue('');
  await expect(panel.getByText('Propuesta ficticia')).toHaveCount(0);
  await expect(panel.getByRole('button',{name:'Revisar propuestas pendientes'})).toBeEnabled();
  for(const viewport of [{width:320,height:568},{width:568,height:320}]){
    await page.setViewportSize(viewport);
    await expect.poll(()=>panel.evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth;})).toBe(true);
    await expect(panel.locator('#quick-capture-text')).toBeInViewport();
  }
  await page.setViewportSize({width:1280,height:720});
  await expect.poll(async()=>page.evaluate(async()=>{
    const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('kaptal-movimientos-offline');r.onsuccess=()=>resolve(r.result);});
    const all=await new Promise<any[]>(resolve=>{const r=db.transaction('borradores').objectStore('borradores').getAll();r.onsuccess=()=>resolve(r.result);});db.close();
    return all.some(x=>typeof x.usuarioId==='string' && x.borrador?.texto==='Texto anterior ficticio');
  })).toBe(true);
  await panel.getByRole('button',{name:'Revisar propuestas pendientes'}).click();
  await expect(panel.getByText('Propuesta ficticia').first()).toBeVisible();
  await page.context().setOffline(true);
  await panel.locator('#quick-capture-text').fill('Texto sin conexión ficticio');
  await panel.getByRole('button',{name:'Cerrar',exact:true}).click();
  await expect(panel).toHaveCount(0);
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('kaptal-abrir-captura-chat')));
  await expect(panel.locator('#quick-capture-text')).toHaveValue('');
  await expect(panel.getByText('Propuesta ficticia').first()).toBeVisible();
  await expect.poll(async()=>page.evaluate(async()=>{
    const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('kaptal-movimientos-offline');r.onsuccess=()=>resolve(r.result);});
    const all=await new Promise<any[]>(resolve=>{const r=db.transaction('borradores').objectStore('borradores').getAll();r.onsuccess=()=>resolve(r.result);});db.close();
    return all.some(x=>typeof x.usuarioId==='string' && x.borrador?.texto==='Texto sin conexión ficticio');
  })).toBe(true);
  await page.context().setOffline(false);
  const revision=async()=>page.evaluate(async()=>{
    const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('kaptal-movimientos-offline');r.onsuccess=()=>resolve(r.result);});
    const current=await new Promise<any>(resolve=>{const r=db.transaction('borradores').objectStore('borradores').get(995);r.onsuccess=()=>resolve(r.result);});db.close();return current.revision;
  });
  await page.waitForTimeout(300);const anterior=await revision();
  const otra=await page.context().newPage();await otra.goto('/dashboard');
  await expect(otra.locator('app-dashboard')).toBeVisible();
  await expect.poll(revision).not.toBe(anterior);
  await panel.locator('#quick-capture-text').fill('Texto nuevo de pestaña anterior');
  await expect(panel.getByRole('alert').filter({hasText:'Otro chat cambió'})).toBeVisible();
  await otra.goto('/configuracion');
  await expect(otra.getByText('Conversación de esta sesión',{exact:true})).toBeAttached();
  await otra.context().setOffline(true);
  await otra.getByText('Conversación de esta sesión',{exact:true}).click();
  await expect(otra.getByText('Texto anterior ficticio')).toHaveCount(0);
  await otra.getByRole('button',{name:'Consultar copias guardadas'}).click();
  const resumenes=otra.locator('details > summary').filter({hasText:'Copia del'});
  await expect(resumenes).toHaveCount(2);
  for(let i=0;i<await resumenes.count();i++)await resumenes.nth(i).click();
  await expect(otra.getByText('Texto ajeno ficticio')).toHaveCount(0);
  const copia=otra.locator('div').filter({has:otra.getByText('Texto anterior ficticio',{exact:true})}).filter({has:otra.getByRole('button',{name:'Descargar copia'})}).last();
  const descarga=otra.waitForEvent('download');await copia.getByRole('button',{name:'Descargar copia'}).click();
  const archivo=await descarga;const datos=JSON.parse(await readFile((await archivo.path())!,'utf8'));
  expect(datos.texto).toBe('Texto anterior ficticio');expect(datos.acciones[0].id).toBe('local-qa');
  await copia.getByRole('button',{name:'Eliminar esta copia'}).click();
  await otra.getByRole('dialog',{name:'Eliminar copia local'}).getByRole('button',{name:'Eliminar copia'}).click();
  await expect(otra.getByText('Texto anterior ficticio',{exact:true})).toHaveCount(0);
  const ajena=await otra.evaluate(async()=>{
    const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('kaptal-movimientos-offline');r.onsuccess=()=>resolve(r.result);});
    const value=await new Promise<any>(resolve=>{const r=db.transaction('borradores').objectStore('borradores').get('archivo:996:qa');r.onsuccess=()=>resolve(r.result);});db.close();return value;
  });
  expect(ajena.borrador.texto).toBe('Texto ajeno ficticio');
  await otra.context().setOffline(false);
  await otra.close();
  expect(writes).toBe(0);
});
