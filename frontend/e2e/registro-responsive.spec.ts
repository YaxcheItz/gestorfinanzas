import { expect,test } from '@playwright/test';
test.use({isMobile:true,hasTouch:true});

test('registra un gasto una vez y conserva los diálogos dentro del viewport',async({page})=>{
  const password='Password123';
  const email=`mobile-${crypto.randomUUID()}@example.test`;
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  const registro=await page.request.post('/api/auth/registro',{data:{nombre:'Prueba Android',email,password}});
  expect(registro.ok()).toBeTruthy();
  const auth=(await registro.json()).data;
  const headers={Authorization:`Bearer ${auth.token}`};
  const accountResponse=await page.request.post('/api/cuentas',{headers,
    data:{nombre:'Cuenta Android con nombre largo para comprobar el ancho del formulario',tipo:'DEBITO',moneda:'MXN',saldoInicial:1000}});
  expect(accountResponse.ok()).toBeTruthy();
  const account=(await accountResponse.json()).data;
  await page.setViewportSize({width:390,height:844});
  await page.goto('/login');await page.locator('#email').fill(email);await page.locator('#password').fill(password);
  await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await expect(page).toHaveURL(/dashboard/);
  const refreshCookie=(await page.context().cookies()).find(cookie=>cookie.name==='finanzas_refresh');
  expect(refreshCookie?.httpOnly).toBe(true);
  expect(refreshCookie?.secure).toBe(true);
  await page.evaluate(()=>{
    localStorage.setItem('finanzas_token',`e30.${btoa(JSON.stringify({exp:Date.now()/1000-60}))}.signature`);
    window.dispatchEvent(new Event('pageshow'));
  });
  await expect.poll(()=>page.evaluate(()=>localStorage.getItem('finanzas_token'))).not.toContain('.signature');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('finanzas_user')!).id)).toBe(auth.id);
  await page.goto('/transacciones');
  for(const viewport of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:1440,height:900}]) {
    await page.setViewportSize(viewport);
    await page.evaluate(()=>window.dispatchEvent(new Event('kaptal-abrir-registro-manual')));
    const dialog=page.getByRole('dialog',{name:'Nuevo movimiento'});
    await expect(dialog).toBeVisible();
    await dialog.locator('app-cuenta-selector button[aria-haspopup="listbox"]').click();
    await dialog.getByRole('option',{name:/Cuenta Android con nombre largo/}).click();
    await expect.poll(async()=>dialog.evaluate(element=>{
      const r=element.getBoundingClientRect();
      return r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;
    })).toBe(true);
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    await dialog.getByRole('button',{name:'Registrar',exact:true}).scrollIntoViewIfNeeded();
    await expect(dialog.getByRole('button',{name:'Registrar',exact:true})).toBeInViewport();
    await page.screenshot({path:`../.local/entry-production-${viewport.width}.png`});
    await dialog.getByRole('button',{name:'Cerrar formulario de movimiento'}).click();
    await expect(dialog).not.toBeVisible();
    expect(await page.evaluate(()=>document.body.style.overflow)).not.toBe('hidden');
  }
  // Emula la geometría del teclado, sin presentarla como prueba de hardware.
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{
    const viewport=new EventTarget();
    Object.assign(viewport,{height:360,width:390,offsetTop:0,scale:1});
    Object.defineProperty(window,'visualViewport',{configurable:true,value:viewport});
    window.dispatchEvent(new Event('kaptal-abrir-registro-manual'));
  });
  const dialog=page.getByRole('dialog',{name:'Nuevo movimiento'});
  await expect.poll(async()=>dialog.evaluate(element=>element.getBoundingClientRect().bottom)).toBeLessThanOrEqual(361);
  await dialog.locator('app-cuenta-selector button[aria-haspopup="listbox"]').click();
  await dialog.getByRole('option',{name:/Cuenta Android con nombre largo/}).click();
  await dialog.locator('#monto').fill('25.55');
  await dialog.getByRole('button',{name:'Registrar',exact:true}).click();
  await expect(dialog).not.toBeVisible();
  const cuentas=(await(await page.request.get('/api/cuentas',{headers})).json()).data;
  expect(cuentas.find((c:{id:number})=>c.id===account.id).saldoActual).toBe(974.45);
  const movimientos=(await(await page.request.get('/api/transacciones?size=20',{headers})).json()).data;
  expect(movimientos.content.filter((m:{monto:number})=>m.monto===25.55)).toHaveLength(1);
  expect(errors).toEqual([]);
});
