import { expect, test } from '@playwright/test';
import { registrarPrueba } from './registro-helper';

test('PWA: renueva una sesión vencida antes de abrir el acceso de ingreso', async ({page},info) => {
  test.skip(info.project.name !== 'chromium-pwa','Requiere build de producción.');
  test.setTimeout(120_000);
  const registro=await registrarPrueba(page.request,{nombre:'QA renovación',email:`renovar-${crypto.randomUUID()}@example.test`,password:'Password123'});
  expect(registro.ok()).toBeTruthy();
  const usuario=(await registro.json()).data;
  await page.goto('/login');
  await page.evaluate((usuario)=>{
    localStorage.setItem('finanzas_token',`test.${btoa(JSON.stringify({exp:1}))}.synthetic`);
    localStorage.setItem('finanzas_user',JSON.stringify({id:usuario.id,nombre:usuario.nombre,email:usuario.email}));
  },usuario);
  let renovaciones=0;
  page.on('request',request=>{if(request.url().includes('/api/auth/refresh') && request.method()==='POST') renovaciones++;});
  await page.goto('/dashboard?accion=nuevo-ingreso');
  await expect(page.getByRole('dialog',{name:'Añadir movimiento',exact:true})).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(renovaciones).toBe(1);
  expect(await page.evaluate(()=>localStorage.getItem('finanzas_token'))).not.toContain('synthetic');
});

for (const cookieValida of [true, false]) {
test(`PWA: captura con acceso vencido offline y ${cookieValida?'renovación':'relogin'} al recuperar red`, async ({page,context},info) => {
  test.skip(info.project.name !== 'chromium-pwa','Requiere service worker real.');
  test.setTimeout(120_000);
  const email=`expirada-${crypto.randomUUID()}@example.test`,password='Password123';
  const registro=await registrarPrueba(page.request,{nombre:'QA expirada',email,password});
  expect(registro.ok()).toBeTruthy();
  const headers={Authorization:`Bearer ${(await registro.json()).data.token}`};
  const cuenta=await page.request.post('/api/cuentas',{headers,data:{nombre:'Banco acceso vencido',tipo:'DEBITO',moneda:'MXN',saldoInicial:100}});
  expect(cuenta.ok()).toBeTruthy();
  await page.goto('/login');
  await page.locator('#email').fill(email);await page.locator('#password').fill(password);
  await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
  await page.getByRole('button',{name:'Añadir movimiento',exact:true}).click();
  const inicial=page.getByRole('dialog',{name:'Añadir movimiento',exact:true});
  await expect(inicial.locator('select[name="cuenta"]')).toContainText('Banco acceso vencido');
  await inicial.getByRole('button',{name:'Cerrar registro',exact:true}).click();
  await page.evaluate(async()=>{await navigator.serviceWorker.register('/ngsw-worker.js');await navigator.serviceWorker.ready;});
  await page.reload();
  await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
  await expect(page.getByRole('button',{name:'Añadir movimiento',exact:true})).toBeVisible();
  await page.evaluate(()=>localStorage.setItem('finanzas_token',`test.${btoa(JSON.stringify({exp:1}))}.synthetic`));
  if(!cookieValida)await context.clearCookies();
  await context.setOffline(true);await page.close();
  const reabierta=await context.newPage();
  await reabierta.goto('/dashboard?accion=nuevo-ingreso');
  const captura=reabierta.getByRole('dialog',{name:'Añadir movimiento',exact:true});
  await expect(captura).toBeVisible();
  await expect(reabierta).toHaveURL(/\/dashboard$/);
  await expect(captura.getByRole('button',{name:'Ingreso',exact:true})).toHaveAttribute('aria-pressed','true');
  await captura.locator('select[name="cuenta"]').selectOption({label:'Banco acceso vencido · MXN'});
  await captura.locator('#quick-entry-amount').fill('7.25');
  await captura.getByRole('button',{name:'Guardar en este dispositivo',exact:true}).click();
  await expect(captura).not.toBeVisible();
  await context.setOffline(false);
  if(!cookieValida){
    await expect(reabierta).toHaveURL(/\/login/);
    await reabierta.locator('#email').fill(email);await reabierta.locator('#password').fill(password);
    await reabierta.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
  }
  await expect(reabierta).toHaveURL(/\/dashboard$/);
  const movimientos=async()=>{
    const r=await reabierta.request.get('/api/transacciones?size=100',{headers});expect(r.ok()).toBeTruthy();
    return (await r.json()).data.content.filter((m:{monto:number;tipo:string})=>m.monto===7.25&&m.tipo==='INGRESO');
  };
  await expect.poll(async()=>(await movimientos()).length,{timeout:30000}).toBe(1);
  await reabierta.reload();
  expect(await movimientos()).toHaveLength(1);
  const saldos=await reabierta.request.get('/api/cuentas',{headers});expect(saldos.ok()).toBeTruthy();
  expect((await saldos.json()).data.find((c:{nombre:string})=>c.nombre==='Banco acceso vencido').saldoActual).toBe(107.25);
});
}

test('PWA: cerrar, abrir sin red y sincronizar una captura exactamente una vez', async ({page,context},info) => {
  test.skip(info.project.name !== 'chromium-pwa','Requiere build de producción y service worker real.');
  test.setTimeout(120_000);
  const email=`pwa-${crypto.randomUUID()}@example.test`,password='Password123';
  const registro=await registrarPrueba(page.request,{nombre:'QA PWA',email,password});expect(registro.ok()).toBeTruthy();
  const headers={Authorization:`Bearer ${(await registro.json()).data.token}`};
  const cuenta=await page.request.post('/api/cuentas',{headers,data:{nombre:'Banco PWA',tipo:'DEBITO',moneda:'MXN',saldoInicial:1000}});
  expect(cuenta.ok()).toBeTruthy();
  await page.goto('/dashboard?accion=nuevo-gasto');
  await expect(page).toHaveURL(/login\?captura=nuevo-gasto/);
  await page.locator('#email').fill(email);await page.locator('#password').fill(password);
  await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Añadir movimiento',exact:true});
  await expect(dialog.locator('select[name="cuenta"]')).toContainText('Banco PWA');
  await expect(dialog.locator('#quick-entry-amount')).toBeEnabled();
  await dialog.getByRole('button',{name:'Cerrar registro',exact:true}).click();
  await page.evaluate(async()=>{await navigator.serviceWorker.register('/ngsw-worker.js');await navigator.serviceWorker.ready;});
  await page.reload();
  await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
  await expect(page.getByRole('button',{name:'Añadir movimiento',exact:true})).toBeVisible();
  await context.setOffline(true);
  await page.close();
  const reabierta=await context.newPage();
  await reabierta.goto('/dashboard?accion=nuevo-gasto');
  const captura=reabierta.getByRole('dialog',{name:'Añadir movimiento',exact:true});
  await expect(captura.locator('#quick-entry-amount')).toBeEnabled();
  await captura.locator('select[name="cuenta"]').selectOption({label:'Banco PWA · MXN'});
  await captura.locator('#quick-entry-amount').fill('18.25');
  await captura.getByRole('button',{name:'Guardar en este dispositivo',exact:true}).click();
  await expect(captura).not.toBeVisible();
  await reabierta.close();
  const sincronizar=await context.newPage();
  await sincronizar.goto('/dashboard');
  await context.setOffline(false);
  const movimientos=async()=>{
    const r=await sincronizar.request.get('/api/transacciones?size=100',{headers});expect(r.ok()).toBeTruthy();
    return (await r.json()).data.content.filter((m:{monto:number})=>m.monto===18.25);
  };
  await expect.poll(async()=>(await movimientos()).length,{timeout:30000}).toBe(1);
  await sincronizar.reload();
  expect(await movimientos()).toHaveLength(1);
  const saldos=await sincronizar.request.get('/api/cuentas',{headers});expect(saldos.ok()).toBeTruthy();
  expect((await saldos.json()).data.find((c:{nombre:string})=>c.nombre==='Banco PWA').saldoActual).toBe(981.75);
});
