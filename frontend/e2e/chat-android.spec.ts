import {expect,test} from '@playwright/test';
import {registrarPrueba} from './registro-helper';

test.use({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block'});

test('captura clasificada confirma una sola vez con respuestas ficticias',async({page})=>{
  const password='Password123',email=`groq-ui-${crypto.randomUUID()}@example.test`;
  const registration=await registrarPrueba(page.request,{nombre:'QA captura',email,password});
  expect(registration.ok()).toBeTruthy();
  const auth=(await registration.json()).data;
  const headers={Authorization:`Bearer ${auth.token}`};
  const cuentaRespuesta=await page.request.post('/api/cuentas',{headers,data:{nombre:'Banco QA',tipo:'DEBITO',moneda:'MXN',saldoInicial:0}});
  expect(cuentaRespuesta.ok()).toBeTruthy();
  const cuenta=(await cuentaRespuesta.json()).data;
  const categorias=await page.request.get('/api/categorias',{headers});
  const categoria=(await categorias.json()).data.find((c:{tipo:string;activo:boolean})=>c.tipo==='GASTO'&&c.activo);
  expect(categoria).toBeTruthy();
  let confirmaciones=0;
  await page.route('**/api/asistente/captura-rapida',route=>route.fulfill({json:{success:true,data:{answer:'Clasificado',engine:'GROQ_CATEGORIA',actions:[{
    id:'propuesta-qa',type:'CREATE_TRANSACTION',version:2,summary:'Gasto ficticio',
    data:{tipo:'GASTO',monto:25,cuentaId:cuenta.id,categoriaId:categoria.id,fecha:'2026-11-10'}
  }]}}}));
  await page.route('**/api/asistente/acciones/propuesta-qa/confirmar',async route=>{
    confirmaciones++;
    expect(route.request().postDataJSON()).toEqual({version:2});
    await route.fulfill({json:{success:true,data:{completed:true}}});
  });
  await page.goto('/login');await page.locator('#email').fill(email);await page.locator('#password').fill(password);
  await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await expect(page).toHaveURL(/dashboard/);
  await page.locator('.dashboard-screen__inline-empty').getByRole('button',{name:'Añadir movimiento',exact:true}).click();
  await page.getByRole('dialog',{name:'Añadir movimiento'}).getByRole('button',{name:'Escribir o dictar'}).click();
  const panel=page.locator('#quick-capture-panel');
  await expect(panel.getByRole('button',{name:'Cerrar',exact:true})).toBeVisible();
  await expect(panel.getByRole('button',{name:'Limpiar historial del chat'})).toHaveCount(0);
  await expect(panel.getByRole('button',{name:'Recuperar propuestas pendientes'})).toHaveCount(0);
  expect(await panel.evaluate(el=>el.getBoundingClientRect().height)).toBeLessThan(600);
  for (const viewport of [{width:320,height:568},{width:568,height:320}]) {
    await page.setViewportSize(viewport);
    await expect.poll(()=>panel.evaluate(el=>{
      const r=el.getBoundingClientRect();
      return r.top>=0 && r.bottom<=innerHeight && r.left>=0 && r.right<=innerWidth;
    })).toBe(true);
    await expect(panel.locator('#quick-capture-text')).toBeInViewport();
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('#quick-capture-text').fill('Gasté 25 en empanadas desde Banco QA');
  await panel.getByRole('button',{name:'Enviar movimiento'}).click();
  await expect(panel.getByText('Movimiento confirmado en tus cuentas',{exact:false})).toBeVisible();
  expect(confirmaciones).toBe(1);
  const movimientos=await page.request.get('/api/transacciones?size=100',{headers});
  expect((await movimientos.json()).data.content).toHaveLength(0);
  await panel.getByRole('button',{name:'Cerrar',exact:true}).click();
  await page.getByRole('link',{name:'Configuración',exact:true}).click();
  await page.getByText('Conversación de esta sesión',{exact:true}).click();
  await page.getByRole('button',{name:'Ver historial del chat'}).click();
  await expect(panel.getByText('Gasté 25 en empanadas desde Banco QA')).toBeVisible();
});

test('una categoria escrita completa la propuesta y solo guardar crea el movimiento',async({page})=>{
  const password='Password123', email=`categoria-chat-${crypto.randomUUID()}@example.test`;
  const registration=await registrarPrueba(page.request,{nombre:'QA captura',email,password});
  expect(registration.ok()).toBeTruthy();
  const auth=(await registration.json()).data;
  const headers={Authorization:`Bearer ${auth.token}`};
  const account=await page.request.post('/api/cuentas',{headers,data:{nombre:'Banco QA',tipo:'DEBITO',moneda:'MXN',saldoInicial:0}});
  expect(account.ok()).toBeTruthy();
  await page.goto('/login');await page.locator('#email').fill(email);await page.locator('#password').fill(password);
  await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await expect(page).toHaveURL(/dashboard/);
  await page.locator('.dashboard-screen__inline-empty').getByRole('button',{name:'Añadir movimiento',exact:true}).click();
  await page.getByRole('dialog',{name:'Añadir movimiento'}).getByRole('button',{name:'Escribir o dictar'}).click();
  const panel=page.locator('#quick-capture-panel'), text=page.locator('#quick-capture-text');
  await text.fill('Gasté 25 en concepto ficticio');await panel.getByRole('button',{name:'Enviar movimiento'}).click();
  await expect(panel.locator('.categorization-review__drop').first()).toBeVisible();
  await text.fill('fue en comida');await panel.getByRole('button',{name:'Enviar movimiento'}).click();
  const save=panel.getByRole('button',{name:'Guardar movimiento',exact:true});await expect(save).toBeVisible();
  const before=await page.request.get('/api/transacciones?size=100',{headers});
  expect((await before.json()).data.content).toHaveLength(0);
  await save.click();await expect(panel.getByText('Movimiento confirmado en tus cuentas', {exact:false})).toBeVisible();
  const after=await page.request.get('/api/transacciones?size=100',{headers});
  const movements=(await after.json()).data.content;
  expect(movements).toHaveLength(1);expect(movements[0].monto).toBe(25);expect(movements[0].categoriaNombre).toBe('Alimentos y Supermercado');
});

test('chat mantiene escritura visible y guarda categoría offline sin duplicados',async({page},testInfo)=>{
  await page.context().setOffline(false);
  const password='Password123',email=`android-chat-${crypto.randomUUID()}@example.test`;
  const registration=await registrarPrueba(page.request,{nombre:'QA chat Android',email,password});
  expect(registration.ok()).toBeTruthy();const auth=(await registration.json()).data;
  const headers={Authorization:`Bearer ${auth.token}`};
  const account=await page.request.post('/api/cuentas',{headers,data:{nombre:'Banco QA',tipo:'DEBITO',moneda:'MXN',saldoInicial:1000}});
  expect(account.ok()).toBeTruthy();
  await page.goto('/login');await page.locator('#email').fill(email);await page.locator('#password').fill(password);
  await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await expect(page).toHaveURL(/dashboard/);
  await page.getByRole('button',{name:'Añadir movimiento',exact:true}).click();
  const panel=page.locator('#quick-capture-panel'),text=page.locator('#quick-capture-text');
  await expect(panel).toBeFocused();
  const opcionesIa=panel.locator('.capture-options > summary');
  await page.keyboard.press('Shift+Tab');
  await expect(opcionesIa).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(panel.getByRole('button',{name:'Cerrar',exact:true})).toBeFocused();
  await opcionesIa.click();
  await expect(panel.getByRole('checkbox')).toBeVisible();
  await panel.getByRole('button',{name:'Cerrar',exact:true}).focus();
  await page.keyboard.press('Shift+Tab');
  await expect(panel.getByRole('checkbox')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(panel.getByRole('button',{name:'Cerrar',exact:true})).toBeFocused();
  await opcionesIa.click();
  await expect(panel.getByRole('checkbox')).not.toBeVisible();
  await expect(panel.getByRole('button',{name:'Introducir datos manualmente',exact:true})).toBeVisible();
  await expect(panel.getByRole('button',{name:'Dictar movimiento'})).toBeVisible();
  expect(await panel.locator('.capture-chat').evaluate(e=>e.clientHeight)).toBeGreaterThan(80);
  await text.fill('Quiero revisar estos movimientos antes de guardarlos. '.repeat(15));
  for(const viewport of [{width:320,height:568},{width:568,height:320}]) {
    await page.setViewportSize(viewport);
    await expect.poll(()=>panel.evaluate(e=>{
      const r=e.getBoundingClientRect();return r.top>=0 && r.bottom<=innerHeight && r.left>=0 && r.right<=innerWidth;
    })).toBe(true);
    await expect(panel.getByRole('button',{name:'Cerrar',exact:true})).toBeInViewport();
    await expect(panel.getByRole('button',{name:'Enviar movimiento'})).toBeInViewport();
    await expect.poll(()=>text.evaluate(e=>e.scrollTop+e.clientHeight>=e.scrollHeight-2)).toBe(true);
  }
  await page.setViewportSize({width:390,height:844});
  await page.route('**/api/asistente/captura-rapida',route=>route.abort('internetdisconnected'));
  await text.fill('Gasté 25 en Banco QA');await page.getByRole('button',{name:'Enviar movimiento'}).click();
  const category=page.locator('.categorization-review__drop').first();await expect(category).toBeVisible();
  await page.context().setOffline(true);await category.click();
  const save=page.getByRole('button',{name:'Guardar movimiento',exact:true});await expect(save).toBeVisible();
  await page.setViewportSize({width:390,height:360});await text.focus();
  await expect.poll(()=>panel.getAttribute('data-compact-viewport')).toBe('');
  await expect(text).toBeInViewport();await expect(page.getByRole('button',{name:'Enviar movimiento'})).toBeInViewport();
  await expect(panel.getByRole('button',{name:'Cerrar',exact:true})).toBeInViewport();
  for(const selector of ['.capture-panel__head','.capture-chat__composer','.capture-options > summary']){
    await expect(panel.locator(selector)).toBeVisible();
    await expect.poll(()=>panel.locator(selector).evaluate(element=>{
      const r=element.getBoundingClientRect();return r.top>=0 && r.bottom<=innerHeight && r.left>=0 && r.right<=innerWidth;
    })).toBe(true);
  }
  await page.screenshot({path:testInfo.outputPath('chat-viewport-reducido.png')});
  const thread=page.locator('#capture-chat-thread');
  expect(await thread.evaluate(e=>e.scrollHeight>e.clientHeight)).toBe(true);
  await save.scrollIntoViewIfNeeded();await save.evaluate(button=>{(button as HTMLButtonElement).click();(button as HTMLButtonElement).click();});
  await expect(panel.getByText(/1 movimiento\(s\) guardados/)).toBeVisible();
  await page.context().setOffline(false);
  await expect.poll(async()=>{
    const r=await page.request.get('/api/transacciones?size=100',{headers});
    const movimientos=(await r.json()).data.content;
    return movimientos.filter((m:{monto:number;categoriaId:number|null})=>m.monto===25&&m.categoriaId!==null).length;
  },{timeout:30000}).toBe(1);
  await page.setViewportSize({width:390,height:844});await panel.getByRole('button',{name:'Introducir datos manualmente',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Añadir movimiento'})).toBeVisible();
  await expect(page).toHaveURL(/dashboard/);
});
