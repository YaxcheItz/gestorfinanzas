import {expect,test} from '@playwright/test';
import {registrarPrueba} from './registro-helper';

test('compra antigua permite editar y eliminar el plan sin duplicar el importe',async({page})=>{
 const email=`anterior-${crypto.randomUUID()}@example.test`,password='Password123';
 const registro=await registrarPrueba(page.request,{nombre:'QA ficticio',email,password});expect(registro.ok()).toBeTruthy();
 const auth=(await registro.json()).data,headers={Authorization:`Bearer ${auth.token}`};
 const cuenta=await page.request.post('/api/cuentas',{headers,data:{nombre:'Tarjeta QA antigua',tipo:'CREDITO',moneda:'MXN',limiteCredito:1000,diaCorte:28,diaPago:10,saldoInicial:0}});const cid=(await cuenta.json()).data.id;
 const f=new Date();f.setUTCMonth(f.getUTCMonth()+1,1);const fecha=f.toISOString().slice(0,10);
 const creado=await page.request.post('/api/transacciones',{headers,data:{cuentaId:cid,tipo:'GASTO',monto:90,fecha,descripcion:'Plan QA anterior',msi:3}});expect(creado.ok()).toBeTruthy();const cuota=(await creado.json()).data;
 await page.route('**/api/dashboard/resumen?*',async route=>{
   const response=await route.fetch();const body=await response.json();
   body.data.ultimosMovimientos=body.data.ultimosMovimientos.filter((x:any)=>x.compraMsiId!==cuota.compraMsiId);
   body.data.comprasMsiAnteriores=[{...cuota,monto:90,fecha:new Date().toISOString().slice(0,10),compraMsiInformativa:true,impactoPendiente:false}];
   await route.fulfill({response,json:body});
 });
 await page.goto('/login');await page.locator('#email').fill(email);await page.locator('#password').fill(password);await page.getByRole('button',{name:'Iniciar sesi\u00f3n',exact:true}).click();await expect(page).toHaveURL(/dashboard/);
 const card=page.locator('app-movimiento-mobile-card').filter({hasText:'Plan QA anterior'}).first();await expect(card).toBeVisible();await expect(page.getByText('Total informativo.')).toHaveCount(0);
 async function swipe(card:any,direction:number){await card.locator('.swipe-actions__content').evaluate((content:any,dir:number)=>{const host=content.closest('.swipe-actions');Object.defineProperty(host,'setPointerCapture',{value:()=>{},configurable:true});const title=content.querySelector('h3');for(const [type,x] of [['pointerdown',150],['pointermove',150+dir*90],['pointerup',150+dir*90]] as const)title.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:1,isPrimary:true,button:0,clientX:x,clientY:200}));},direction);}
 await swipe(card,1);const edit=card.locator('.swipe-actions__action--edit');await expect(edit).toBeEnabled();await edit.click();
 const editor=page.getByRole('dialog',{name:'Editar movimiento'});await expect(editor).toBeVisible();await expect(editor.locator('#monto')).toHaveValue('90');await expect(editor.getByText('Indica la fecha original de la compra.')).toBeVisible();
 await editor.getByRole('button',{name:/cerrar/i}).first().click();await page.goto('/dashboard');
 const otra=page.locator('app-movimiento-mobile-card').filter({hasText:'Plan QA anterior'}).first();await expect(otra).toBeVisible();await swipe(otra,-1);const eliminar=otra.locator('.swipe-actions__action--delete');await expect(eliminar).toBeEnabled();await eliminar.click();
 const confirm=page.locator('app-confirm-dialog [role="dialog"]');await expect(confirm).toContainText('compra completa');await confirm.locator('button').last().click();
 await expect.poll(async()=>{const rows=(await (await page.request.get('/api/cuentas',{headers})).json()).data;const c=rows.find((x:any)=>x.id===cid);return [c.saldoActual,c.limiteRetenido]}).toEqual([0,0]);
});
