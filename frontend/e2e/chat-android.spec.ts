import {expect,test} from '@playwright/test';
import {registrarPrueba} from './registro-helper';

test.use({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block'});

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
  await page.getByRole('button',{name:'Escribir o dictar',exact:true}).click();
  const panel=page.locator('#quick-capture-panel'),text=page.locator('#quick-capture-text');
  await expect(panel).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(panel.getByRole('checkbox')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(panel.getByRole('button',{name:'Limpiar historial del chat'})).toBeFocused();
  await expect(panel.getByRole('button',{name:'Rápido',exact:true})).toBeVisible();
  await expect(panel.getByRole('button',{name:'Dictar movimiento'})).toBeVisible();
  expect(await panel.locator('.capture-chat').evaluate(e=>e.clientHeight)).toBeGreaterThan(250);
  await text.fill('Quiero revisar estos movimientos antes de guardarlos. '.repeat(15));
  for(const viewport of [{width:320,height:568},{width:568,height:320}]) {
    await page.setViewportSize(viewport);
    await expect.poll(()=>panel.evaluate(e=>{
      const r=e.getBoundingClientRect();return r.top>=0 && r.bottom<=innerHeight && r.left>=0 && r.right<=innerWidth;
    })).toBe(true);
    await expect(panel.getByRole('button',{name:'Recuperar propuestas pendientes'})).toBeInViewport();
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
  await expect(panel.getByRole('button',{name:'Recuperar propuestas pendientes'})).toBeInViewport();
  for(const selector of ['.capture-panel__head','.capture-chat__composer','.capture-chat__consent']){
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
  await page.setViewportSize({width:390,height:844});await panel.getByRole('button',{name:'Rápido',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Añadir movimiento'})).toBeVisible();
  await expect(page).toHaveURL(/dashboard/);
});
