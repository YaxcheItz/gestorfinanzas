import {expect,test} from '@playwright/test';
import {registrarPrueba} from './registro-helper';
test.use({viewport:{width:390,height:844},hasTouch:true});
test('chat MSI, edicion del plan y eliminacion conservan credito y auditoria',async({page})=>{
  const email=`msi-${crypto.randomUUID()}@example.test`,password='Password123';
  const reg=await registrarPrueba(page.request,{nombre:'QA MSI ficticio',email,password});
  expect(reg.ok()).toBeTruthy();const auth=(await reg.json()).data;
  const headers={Authorization:`Bearer ${auth.token}`};
  const cuenta=await page.request.post('/api/cuentas',{headers,data:{nombre:'Tarjeta ficticia',tipo:'CREDITO',moneda:'MXN',limiteCredito:5000,diaCorte:20,diaPago:10,saldoInicial:0}});
  expect(cuenta.ok()).toBeTruthy();const cid=(await cuenta.json()).data.id;
  const cats=(await (await page.request.get('/api/categorias',{headers})).json()).data;
  const categoria=cats.find((c:any)=>c.tipo==='GASTO');
  const captura=await page.request.post('/api/asistente/captura-rapida',{headers,data:{content:`Compre 900 con Tarjeta ficticia a 3 meses sin intereses categoria ${categoria.nombre} 2025-01-05 etiqueta ensayo`,consentimientoDatosFinancieros:false,voz:false}});
  expect(captura.ok(),await captura.text()).toBeTruthy();const result=(await captura.json()).data;
  const propuesta=result.action??result.actions[0];expect(propuesta.data.msi).toBe(3);
  for(let n=0;n<2;n++)expect((await page.request.post(`/api/asistente/acciones/${propuesta.id}/confirmar`,{headers,data:{version:propuesta.version??0}})).ok()).toBeTruthy();
  let rows=(await (await page.request.get('/api/transacciones?size=100',{headers})).json()).data.content.filter((t:any)=>t.compraMsiId);
  expect(rows).toHaveLength(1);const id=rows[0].id;expect(rows[0].fecha).toBe('2025-01-20');expect(rows[0].monto).toBe(300);expect(rows[0].etiquetas).toContain('ensayo');
  await page.goto('/login');await page.locator('#email').fill(email);await page.locator('#password').fill(password);await page.getByRole('button',{name:'Iniciar sesi\u00f3n',exact:true}).click();await expect(page).toHaveURL(/dashboard/);
  await page.goto('/transacciones?fechaInicio=2025-01-01&fechaFin=2025-01-31');
  const card=page.locator('app-movimiento-mobile-card').filter({hasText:'Tarjeta ficticia'}).first();
  await expect(card).toBeVisible();
  await card.locator('.swipe-actions__content').evaluate(content=>{
    const host=content.closest('.swipe-actions') as HTMLElement;
    Object.defineProperty(host,'setPointerCapture',{value:()=>{}});
    const title=content.querySelector('h3')!;
    title.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1,isPrimary:true,button:0,clientX:60,clientY:200}));
    title.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:1,isPrimary:true,button:0,clientX:150,clientY:200}));
    title.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1,isPrimary:true,button:0,clientX:150,clientY:200}));
  });
  await expect(page.getByRole('dialog',{name:'Editar movimiento'})).toBeHidden();
  const editar=card.locator('.swipe-actions__action--edit');await expect(editar).toBeEnabled();await editar.click();
  const editor=page.getByRole('dialog',{name:'Editar movimiento'});await expect(editor).toBeVisible();await expect(editor.locator('#monto')).toHaveValue('900');
  await editor.locator('#monto').fill('1200');await editor.locator('[name="mesesPlanMsi"]').fill('4');await editor.getByRole('button',{name:'Guardar cambios',exact:true}).click();await expect(editor).toBeHidden();
  const plan=(await (await page.request.get(`/api/transacciones/${id}/plan-msi`,{headers})).json()).data;expect(plan.monto).toBe(1200);expect(plan.msi).toBe(4);
  const cuentas=(await (await page.request.get('/api/cuentas',{headers})).json()).data;const tarjeta=cuentas.find((c:any)=>c.id===cid);expect(tarjeta.saldoActual).toBe(-300);expect(tarjeta.limiteRetenido).toBe(900);
  await page.goto(`/transacciones?detalle=${id}`);const detalle=page.locator('.ledger-detail-sheet');await expect(detalle).toBeVisible();await detalle.getByRole('button',{name:'Eliminar',exact:true}).click();
  const confirmar=page.locator('app-confirm-dialog [role="dialog"]');await expect(confirmar).toContainText('compra completa');await confirmar.locator('button').last().click();
  await expect(confirmar).toBeHidden();await expect.poll(async()=>{const c=(await (await page.request.get('/api/cuentas',{headers})).json()).data.find((c:any)=>c.id===cid);return [c.saldoActual,c.limiteRetenido];}).toEqual([0,0]);
  rows=(await (await page.request.get('/api/transacciones?size=100',{headers})).json()).data.content.filter((t:any)=>t.compraMsiId);expect(rows).toHaveLength(0);
  const ledger=(await (await page.request.get('/api/libro-diario?size=100',{headers})).json()).data.content.filter((a:any)=>a.transaccionOrigenId===id);
  expect(ledger.map((a:any)=>a.tipoEvento)).toEqual(expect.arrayContaining(['CREACION','ACTUALIZACION','ELIMINACION']));
  for(const asiento of ledger){
    const debe=asiento.lineas.filter((l:any)=>l.lado==='DEBE').reduce((n:number,l:any)=>n+l.monto,0);
    const haber=asiento.lineas.filter((l:any)=>l.lado==='HABER').reduce((n:number,l:any)=>n+l.monto,0);
    expect(debe).toBeCloseTo(haber,2);
  }
  const auditoria=(await (await page.request.get('/api/perfil/historial?size=100',{headers})).json()).data.content;
  expect(auditoria.length).toBeGreaterThanOrEqual(3);

});
