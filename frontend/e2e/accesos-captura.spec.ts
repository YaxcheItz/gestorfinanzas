import { expect, test } from '@playwright/test';
import { registrarPrueba } from './registro-helper';

test.use({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block'});
test.setTimeout(120_000);

test('accesos: login conserva ingreso, acción consumida y dictado sin activar el micrófono', async ({page}) => {
  const email=`accesos-${crypto.randomUUID()}@example.test`,password='Password123';
  const registro=await registrarPrueba(page.request,{nombre:'QA Accesos',email,password});expect(registro.ok()).toBeTruthy();
  const headers={Authorization:`Bearer ${(await registro.json()).data.token}`};
  const cuenta=await page.request.post('/api/cuentas',{headers,data:{nombre:'Banco Accesos',tipo:'DEBITO',moneda:'MXN',saldoInicial:1000}});
  expect(cuenta.ok()).toBeTruthy();
  await page.addInitScript(()=>{
    (window as any).solicitudesMicrofono=0;
    Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:()=>{(window as any).solicitudesMicrofono++;return Promise.reject(new DOMException('Denied','NotAllowedError'));}});
  });
  await page.goto('/dashboard?accion=nuevo-ingreso');
  await expect(page).toHaveURL(/login\?captura=nuevo-ingreso/);
  await page.locator('#email').fill(email);await page.locator('#password').fill(password);
  await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Añadir movimiento',exact:true});
  await expect(dialog.getByRole('button',{name:'Ingreso',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page).not.toHaveURL(/accion=/);
  await dialog.getByRole('button',{name:'Cerrar registro',exact:true}).click();
  await page.reload();await expect(page.getByRole('button',{name:'Añadir movimiento',exact:true})).toBeVisible();
  await expect(dialog).not.toBeVisible();
  await page.evaluate(()=>{history.pushState(null,'','/dashboard?accion=dictar');dispatchEvent(new PopStateEvent('popstate'));});
  const chat=page.getByRole('dialog',{name:'Kaptal, captura y reportes',exact:true});
  await expect(chat).toBeVisible();
  expect(await page.evaluate(()=>(window as any).solicitudesMicrofono)).toBe(0);
  await expect(chat.getByRole('button',{name:'Dictar movimiento',exact:true})).toBeEnabled();
  await expect(page).not.toHaveURL(/accion=/);
  const movimientos=await page.request.get('/api/transacciones?size=100',{headers});expect(movimientos.ok()).toBeTruthy();
  expect((await movimientos.json()).data.content.filter((m:{tipo:string})=>['GASTO','INGRESO'].includes(m.tipo))).toHaveLength(0);
});
