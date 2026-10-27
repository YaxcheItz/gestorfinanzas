import { expect, test } from '@playwright/test';
import { registrarPrueba } from './registro-helper';

test.use({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block'});
test.setTimeout(60_000);

test('compras automáticas muestran categoría y redelivery conserva un solo gasto',async({page,baseURL})=>{
  expect(new URL(baseURL!).hostname).toBe('localhost');
  const email=`categorias-auto-${crypto.randomUUID()}@example.test`,password='Password123';
  const registration=await registrarPrueba(page.request,{nombre:'QA categorias automaticas',email,password});
  expect(registration.ok()).toBeTruthy();
  await page.goto('/login');await page.locator('#email').fill(email);await page.locator('#password').fill(password);
  await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await expect(page).toHaveURL(/dashboard/);
  const headers={Authorization:`Bearer ${await page.evaluate(()=>localStorage.getItem('finanzas_token'))}`};
  const account=await page.request.post('/api/cuentas',{headers,data:{nombre:'Banco categorias QA',tipo:'DEBITO',moneda:'MXN',saldoInicial:1000}});
  expect(account.ok()).toBeTruthy();const cuentaId=(await account.json()).data.id;
  const lists=await page.request.get('/api/listas',{headers});expect(lists.ok()).toBeTruthy();
  const listaId=(await lists.json()).data.find((l:any)=>l.personal).id;
  const reglaId=crypto.randomUUID();
  const connection=await page.request.post('/api/automatizacion/android',{headers,data:{dispositivoId:crypto.randomUUID(),consentimiento:true,
    reglas:[{id:reglaId,proveedor:'REVOLUT',paquete:'com.revolut.revolut',remitente:null,terminacion:null,cuentaId,listaId,categoriaId:null}]}});
  expect(connection.ok()).toBeTruthy();const key=(await connection.json()).data.clave;
  const fecha=new Date().toLocaleDateString('en-CA',{timeZone:'America/Mexico_City'});
  const send=async(eventoId:string,descripcion:string,monto:number)=>{
    const r=await page.request.post('/api/canales/android/evento',{headers:{'X-Kaptal-Android':key},data:{reglaId,eventoId,clase:'COMPRA',moneda:'MXN',fecha,descripcion,monto}});
    expect(r.ok()).toBeTruthy();return(await r.json()).data;
  };
  const first=await send('a'.repeat(64),'Restaurante QA automatico',25);
  expect(first.estado).toBe('REGISTRADO');expect(first.datos.categoriaId).toBeTruthy();
  expect((await send('a'.repeat(64),'Restaurante QA automatico',25)).transaccionId).toBe(first.transaccionId);
  await send('b'.repeat(64),'Comercio desconocido QA',31);
  const movements=await page.request.get('/api/transacciones?size=100',{headers});expect(movements.ok()).toBeTruthy();
  const rows=(await movements.json()).data.content;
  expect(rows.filter((m:any)=>m.cuentaId===cuentaId&&m.tipo==='GASTO')).toHaveLength(2);
  expect(rows.find((m:any)=>m.id===first.transaccionId).categoriaNombre).toBe('Comida');
  expect(rows.find((m:any)=>m.descripcion==='Comercio desconocido QA').categoriaNombre).toBe('Otros gastos');
  await page.goto('/transacciones');
  const cards=page.locator('app-movimiento-mobile-card');
  await expect(cards.filter({hasText:'Restaurante QA automatico'})).toContainText('Comida');
  await expect(cards.filter({hasText:'Comercio desconocido QA'})).toContainText('Otros gastos');
});
