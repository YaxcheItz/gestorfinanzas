import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });

test('la entrada muestra Kaptal antes de que llegue JavaScript, sin un lienzo vacío', async ({ page }) => {
  await page.route('**/*.js', route => route.abort());
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('Abriendo tu espacio');
  await expect(page.locator('.kaptal-launch img')).toBeVisible();
  expect(await page.locator('.kaptal-launch').evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(844);
});

test('una descarga interrumpida ofrece reintentar sin recargar automáticamente', async ({ page }) => {
  await page.clock.install();
  await page.route('**/*.js', route => /\/(startup-check|runtime-config)\.js$/.test(route.request().url()) ? route.continue() : route.abort());
  await page.goto('/dashboard?accion=nuevo-gasto');
  await page.clock.fastForward(20001);
  await expect(page.getByRole('status')).toContainText('Está tardando más');
  await expect(page.getByRole('link', { name: 'Volver a intentar' })).toHaveAttribute('href', /\/dashboard\?accion=nuevo-gasto$/);
  expect(page.url()).toContain('/dashboard?accion=nuevo-gasto');
});

test('la carga lenta conserva estructura y los controles contextuales siguen visibles en ambas orientaciones', async ({ page }) => {
  const usuario = { id: 991, nombre: 'Prueba visual', email: 'visual@example.test' };
  await page.addInitScript(user => {
    const claims = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, sub: user.email }));
    localStorage.setItem('finanzas_token', `test.${claims}.synthetic`);
    localStorage.setItem('finanzas_user', JSON.stringify(user));
  }, usuario);
  let liberar!: () => void;
  const espera = new Promise<void>(resolve => liberar = resolve);
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    let data: unknown = [];
    if (url.pathname.endsWith('/perfil')) data = { ...usuario, tema: 'OSCURO', monedaPredeterminada: 'MXN' };
    if (url.pathname.endsWith('/dashboard/resumen')) {
      await espera;
      data = { totalCuentas: 0, resumenPorMoneda: [], ultimosMovimientos: [] };
    }
    if (url.pathname.endsWith('/presupuestos')) data = { presupuestos: [], resumenPorMoneda: [] };
    if (url.pathname.endsWith('/dashboard/analitica')) data = { gastosPorCategoria: [], ultimosSeisMeses: [] };
    await route.fulfill({ json: { success: true, message: '', data } });
  });
  await page.goto('/dashboard');
  await expect(page.locator('.home-amount-loading')).toBeVisible();
  await expect(page.locator('.dashboard-loading-row')).toHaveCount(3);
  await expect(page.getByRole('heading', {name:'Sin gastos todavía',exact:true})).toHaveCount(0);
  await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute('content', '#111315');
  for (const viewport of [{ width: 320, height: 640 }, { width: 568, height: 320 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const voice = page.getByRole('button', {name:'Registrar por voz o texto',exact:true});
    await expect(voice).toBeInViewport();
    await expect(page.getByRole('button',{name:'Añadir movimiento',exact:true})).toBeInViewport();
    await expect(page.getByRole('link',{name:'Movimientos',exact:true})).toBeInViewport();
    await expect(page.getByRole('link',{name:'Configuración',exact:true})).toBeInViewport();
    await expect(page.locator('.mobile-bottom-nav')).toHaveCount(0);
    const bounds = await voice.boundingBox();
    expect(bounds!.width).toBeGreaterThanOrEqual(44);
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: test.info().outputPath('carga-movil.png') });
  liberar();
  await expect(page.getByRole('heading', {name:'Sin gastos todavía',exact:true})).toBeVisible();
  await expect(page.locator('.home-amount-loading')).toHaveCount(0);
});

test('cuentas y presupuestos conservan monedas, acciones y estados en pantallas pequeñas', async ({ page }) => {
  const usuario = { id: 992, nombre: 'Diseño', email: 'pantallas@example.test' };
  await page.addInitScript(user => {
    const claims = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, sub: user.email }));
    localStorage.setItem('finanzas_token', `test.${claims}.synthetic`);
    localStorage.setItem('finanzas_user', JSON.stringify(user));
  }, usuario);
  let fallo = false;
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    let data: unknown = [];
    if (url.pathname.endsWith('/perfil')) data = { ...usuario, tema: 'CLARO', monedaPredeterminada: 'MXN' };
    if (url.pathname.endsWith('/cuentas')) data = [
      { id: 1, nombre: 'Ahorro para proyectos personales y viajes', tipo: 'AHORRO', moneda: 'MXN', saldoActual: 1200, activo: true },
      { id: 2, nombre: 'Tarjeta', tipo: 'CREDITO', moneda: 'USD', saldoActual: -50, limiteCredito: 500, activo: true },
    ];
    if (url.pathname.endsWith('/presupuestos')) {
      if (fallo) return route.fulfill({ status: 503, json: { success: false } });
      data = { presupuestos: [{ id: 1, categoriaId: 1, categoriaNombre: 'Comidas y compras para la casa', moneda: 'MXN', montoLimite: 100, montoGastado: 120, montoDisponible: -20, porcentajeConsumido: 120, estado: 'EXCEDIDO' }], resumenPorMoneda: [{ moneda: 'MXN', totalPresupuestado: 100, totalGastado: 120, totalDisponible: -20, porcentajeConsumido: 120 }] };
    }
    await route.fulfill({ json: { success: true, message: '', data } });
  });
  await page.goto('/cuentas');
  await expect(page.locator('.account-card')).toHaveCount(2);
  await expect(page.locator('.account-card').nth(1)).toContainText('Crédito disponible');
  await expect(page.locator('.account-card').nth(1)).toContainText('USD');
  await expect(page.locator('.account-manage button').first()).not.toBeVisible();
  await page.locator('.account-manage summary').first().click();
  await page.getByRole('button', { name: 'Editar', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  for (const width of [320, 390, 568]) {
    await page.setViewportSize({ width, height: width === 568 ? 320 : 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: test.info().outputPath('cuentas-movil.png'), fullPage: true });
  await page.getByRole('button',{name:'Abrir herramientas de tu espacio personal',exact:true}).click();
  await page.getByRole('link', { name: 'Presupuestos', exact: true }).click();
  await expect(page.locator('.budget-remaining')).toContainText('Te excediste');
  await expect(page.locator('.budget-remaining')).toContainText(/20[.,]00/);
  await expect(page.locator('.budget-overview__percent')).toHaveClass(/is-over/);
  await expect(page.getByRole('button', { name: 'Eliminar presupuesto de Comidas y compras para la casa' })).not.toBeVisible();
  await page.locator('.budget-manage summary').click();
  await expect(page.getByRole('button', { name: 'Eliminar presupuesto de Comidas y compras para la casa' })).toBeVisible();
  await page.locator('.budget-manage summary').click();
  for (const width of [320, 390, 568]) {
    await page.setViewportSize({ width, height: width === 568 ? 320 : 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: test.info().outputPath('presupuestos-movil.png'), fullPage: true });
  fallo = true;
  const mes = page.getByRole('combobox', { name: 'Mes del presupuesto' });
  const actual = Number(await mes.inputValue());
  await mes.selectOption(String(actual === 12 ? 1 : actual + 1));
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('.budget-overview')).toHaveCount(0);
  await expect(page.getByText('No hay presupuestos fijados para este mes')).toHaveCount(0);
});

test('chat conserva foco, controles y confirmación con geometría de teclado Android', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('finanzas_token', `test.${btoa(JSON.stringify({ exp: Math.floor(Date.now()/1000)+3600 }))}.synthetic`);
    localStorage.setItem('finanzas_user', JSON.stringify({id:993,nombre:'Chat',email:'chat@example.test'}));
    const viewport = new EventTarget();
    Object.assign(viewport, {height:360,width:390,offsetTop:0,scale:1});
    Object.defineProperty(window, 'visualViewport', {configurable:true,value:viewport});
  });
  let confirmar = 0;
  let liberar!: () => void;
  const respuesta = new Promise<void>(resolve => liberar = resolve);
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    let data: unknown = [];
    if (url.pathname.endsWith('/perfil')) data = {id:993,nombre:'Chat',email:'chat@example.test',tema:'CLARO',monedaPredeterminada:'MXN'};
    if (url.pathname.endsWith('/cuentas')) data = [{id:1,nombre:'Efectivo',tipo:'EFECTIVO',moneda:'MXN',saldoActual:100,activo:true}];
    if (url.pathname.endsWith('/categorias')) data = [{id:2,nombre:'Comida',tipo:'GASTO',activo:true}];
    if (url.pathname.endsWith('/captura-rapida')) {
      await respuesta;
      data = {answer:'Revisa tu gasto antes de guardarlo.',engine:'REGLAS',actions:[{id:'chat-keyboard',type:'CREATE_TRANSACTION',summary:'Gasto de 25 en comida',version:0,data:{tipo:'GASTO',monto:25,cuentaId:1,categoriaId:2,moneda:'MXN',fecha:'2026-10-13',descripcion:'Comida'}}]};
    }
    if (url.pathname.endsWith('/confirmar')) { confirmar++; data = {completed:true}; }
    await route.fulfill({json:{success:true,message:'',data}});
  });
  await page.goto('/cuentas');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('kaptal-abrir-captura-chat')));
  const dialog = page.getByRole('dialog', {name:'Kaptal, captura y reportes'});
  await expect(dialog).toBeVisible();
  const text = dialog.locator('#quick-capture-text');
  await text.fill('Gasté 25 en comida');
  await text.press('Enter');
  await expect(text).toBeFocused();
  await expect(text).toHaveJSProperty('readOnly', true);
  expect(confirmar).toBe(0);
  liberar();
  await expect(dialog.getByRole('button',{name:'Guardar movimiento',exact:true})).toBeVisible();
  for (const target of [text, dialog.getByRole('button',{name:'Enviar movimiento'})]) {
    const bounds = await target.boundingBox();
    expect(bounds?.y).toBeGreaterThanOrEqual(0);
    expect((bounds?.y??0)+(bounds?.height??0)).toBeLessThanOrEqual(361);
  }
  await dialog.getByRole('button',{name:'Guardar movimiento',exact:true}).dblclick();
  await expect(dialog.locator('.capture-receipt')).toContainText('Movimiento confirmado en tus cuentas');
  expect(confirmar).toBe(1);
  await page.screenshot({path:test.info().outputPath('chat-teclado.png')});
  await dialog.getByRole('button',{name:'Cerrar',exact:true}).click();
  await expect(dialog).not.toBeVisible();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
});

test('acceso y recuperación conservan controles legibles y permiten reintentar', async ({ page }) => {
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/recuperacion')) return route.fulfill({json:{success:true,data:false}});
    return route.fulfill({json:{success:true,data:{configurado:false}}});
  });
  await page.goto('/login');
  await page.locator('#password').fill('Prueba123');
  await page.getByRole('button',{name:'Mostrar contraseña'}).click();
  await expect(page.locator('#password')).toHaveAttribute('type','text');
  await page.getByRole('button',{name:'Ocultar contraseña'}).click();
  for (const width of [320,390,568]) {
    await page.setViewportSize({width,height:width===568?320:844});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('#email').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  }
  await page.getByRole('link',{name:'¿Olvidaste tu contraseña?'}).click();
  await page.locator('#recovery-email').fill('prueba@example.test');
  await page.getByRole('button',{name:'Enviar enlace de recuperación'}).click();
  await expect(page.getByRole('alert')).toContainText('no está disponible');
  await expect(page.locator('#recovery-email')).toBeVisible();
  await expect(page.getByRole('button',{name:'Enviar enlace de recuperación'})).toBeEnabled();
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:test.info().outputPath('recuperacion-movil.png')});
});

test('ajustes abre secciones por enlace y conserva la protección de eliminar cuenta', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('finanzas_token', `test.${btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))}.synthetic`);
    localStorage.setItem('finanzas_user', JSON.stringify({id:994,nombre:'Ajustes',email:'ajustes@example.test'}));
  });
  await page.route('**/api/**', async route => {
    const data = new URL(route.request().url()).pathname.endsWith('/perfil') ? {id:994,nombre:'Ajustes',email:'ajustes@example.test',tema:'CLARO',monedaPredeterminada:'MXN'} : [];
    await route.fulfill({json:{success:true,data}});
  });
  await page.goto('/configuracion');
  await expect(page.locator('#security')).not.toHaveAttribute('open');
  await page.screenshot({path:test.info().outputPath('ajustes-movil.png'),fullPage:true});
  await page.getByRole('navigation',{name:'Secciones de configuración'}).getByRole('link',{name:'Seguridad',exact:true}).click();
  await expect(page.locator('#security')).toHaveAttribute('open','');
  await page.getByRole('navigation',{name:'Secciones de configuración'}).getByRole('link',{name:'Respaldo',exact:true}).click();
  await expect(page.locator('#backup')).toHaveAttribute('open','');
  await expect(page.locator('#security')).not.toHaveAttribute('open');
  for (const width of [320,390,568]) {
    await page.setViewportSize({width,height:width===568?320:844});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.goto('/configuracion#danger');
  await expect(page.locator('#danger')).toHaveAttribute('open','');
  await page.locator('#danger button').last().click();
  const confirmacion = page.getByRole('dialog');
  await expect(confirmacion).toBeVisible();
  await expect(confirmacion.getByRole('button',{name:'Sí, eliminar mi cuenta',exact:true})).toBeDisabled();
});
