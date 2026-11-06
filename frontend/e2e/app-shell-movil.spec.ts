import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });

test('la búsqueda del dock funciona en Inicio con datos ficticios y permite reintentar', async ({page}) => {
  const usuario = {id:997,nombre:'Busqueda QA',email:'busqueda@example.test'};
  await page.addInitScript(user => {
    localStorage.setItem('finanzas_token', `test.${btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))}.synthetic`);
    localStorage.setItem('finanzas_user', JSON.stringify(user));
  }, usuario);
  let fallar = false;
  await page.route('**/api/**', async route => {
    if (route.request().method() !== 'GET') return route.abort();
    const url = new URL(route.request().url());
    let data: unknown = [];
    if (url.pathname === '/api/perfil') data = {...usuario,tema:'CLARO',monedaPredeterminada:'MXN'};
    if (url.pathname === '/api/dashboard/resumen') data = {totalCuentas:1,resumenPorMoneda:[{moneda:'MXN',balanceTotal:600,ingresosMes:100,gastosMes:25,totalCuentas:1}],ultimosMovimientos:[]};
    if (url.pathname === '/api/dashboard/analitica') data = {gastosPorCategoria:[],ultimosSeisMeses:[]};
    if (url.pathname === '/api/presupuestos') data = {presupuestos:[],resumenPorMoneda:[]};
    if (url.pathname === '/api/transacciones') {
      if (fallar) return route.fulfill({status:503,json:{success:false}});
      data = {content:[{id:1,tipo:'GASTO',descripcion:'Café ficticio',categoriaNombre:'Comida',monto:25,moneda:'MXN',fecha:'2026-01-15'}],totalPages:1};
    }
    await route.fulfill({json:{success:true,data}});
  });
  await page.goto('/dashboard');
  await expect(page.getByText('Saldo neto',{exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Configuración'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Ocultar montos'})).toBeVisible();
  await page.screenshot({path:test.info().outputPath('inicio-minimalista.png'),fullPage:true,animations:'disabled'});
  await page.getByRole('button',{name:'Buscar movimientos',exact:true}).click();
  const dialog = page.getByRole('dialog',{name:'Buscar movimientos'});
  await dialog.getByRole('searchbox').fill('café');
  await expect(dialog.getByText('Café ficticio')).toBeVisible();
  await page.screenshot({path:test.info().outputPath('busqueda-inicio.png'),animations:'disabled'});
  await expect(page).toHaveURL(/\/dashboard$/);
  fallar = true;
  await dialog.getByRole('searchbox').fill('otra búsqueda');
  await expect(dialog.getByRole('alert')).toBeVisible();
  fallar = false;
  await dialog.getByRole('button',{name:'Reintentar'}).click();
  await expect(dialog.getByText('Café ficticio')).toBeVisible();
  await dialog.getByRole('button',{name:'Cerrar búsqueda'}).click();
  await expect(dialog).toHaveCount(0);
});

test('selector de periodo compacto y filtro sin superposicion', async ({page}) => {
  const usuario={id:996,nombre:'QA',email:'qa@example.test'};
  await page.addInitScript(user=>{localStorage.setItem('finanzas_token',`test.${btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))}.synthetic`);localStorage.setItem('finanzas_user',JSON.stringify(user));},usuario);
  await page.route('**/api/**',async route=>{
    if(route.request().method()!=='GET')return route.abort();
    const path=new URL(route.request().url()).pathname;let data:unknown=[];
    if(path==='/api/perfil')data={...usuario,tema:'CLARO',monedaPredeterminada:'MXN'};
    if(path==='/api/dashboard/resumen')data={totalCuentas:1,resumenPorMoneda:[{moneda:'MXN',balanceTotal:10,ingresosMes:0,gastosMes:10,totalCuentas:1}],ultimosMovimientos:[]};
    if(path==='/api/dashboard/analitica')data={gastosPorCategoria:[{categoriaId:1,categoriaNombre:'Comida',monto:10,moneda:'MXN'},{categoriaId:2,categoriaNombre:'Transporte',monto:5,moneda:'MXN'}],ultimosSeisMeses:[]};
    if(path==='/api/categorias')data=[{id:1,nombre:'Comida',tipo:'GASTO',activo:true,icono:'utensils'},{id:2,nombre:'Transporte',tipo:'GASTO',activo:true,icono:'car'}];
    if(path==='/api/presupuestos')data={presupuestos:[],resumenPorMoneda:[]};
    if(path==='/api/transacciones')data={content:[],totalPages:0};
    await route.fulfill({json:{success:true,data}});
  });
  await page.goto('/dashboard');
  const calendar=page.getByRole('button',{name:/Seleccionar periodo/});await expect(calendar).toBeVisible();
  const eye=await page.getByRole('button',{name:'Ocultar montos'}).boundingBox();
  const calendarBox=await calendar.boundingBox();const settings=await page.getByRole('link',{name:'Configuraci\u00f3n'}).boundingBox();
  expect(eye!.x+eye!.width).toBeLessThanOrEqual(calendarBox!.x);
  expect(calendarBox!.x+calendarBox!.width).toBeLessThanOrEqual(settings!.x);
  expect((await calendar.innerText()).trim()).toBe('');await calendar.click();
  await expect(page.getByRole('dialog',{name:'Seleccionar periodo financiero'})).toBeVisible();
  await page.getByRole('button',{name:'Cerrar modal'}).click();
  for(const nombre of ['Comida','Transporte']){
    await page.getByRole('button',{name:'Filtrar movimientos de '+nombre}).click();
    const chip=page.locator('.home-filter-chip');await expect(chip).toContainText(nombre);
    const icon=await chip.locator('app-categoria-icono').boundingBox();
    const label=await chip.locator('span').filter({hasText:nombre}).boundingBox();
    expect(icon).not.toBeNull();expect(label).not.toBeNull();expect(label!.x).toBeGreaterThanOrEqual(icon!.x+icon!.width);
    await chip.click();
  }
});

test.describe('gestos de categorías', () => {
  test.use({ hasTouch: true, isMobile: true });

  test('abre el presupuesto existente de la categoría en el mes elegido', async ({page, context}) => {
    const usuario = {id:998,nombre:'Periodo QA',email:'periodo@example.test'};
    await page.clock.setFixedTime(new Date('2026-11-15T18:00:00Z'));
    await page.addInitScript(user => {
      localStorage.setItem('finanzas_token', `test.${btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))}.synthetic`);
      localStorage.setItem('finanzas_user', JSON.stringify(user));
    }, usuario);
    const consultas: string[] = [];
    const escrituras: string[] = [];
    await page.route('**/api/**', async route => {
      const request = route.request(), url = new URL(request.url());
      if (request.method() !== 'GET') { escrituras.push(url.pathname); return route.abort(); }
      let data: unknown = [];
      if (url.pathname === '/api/perfil') data = {...usuario,tema:'CLARO',monedaPredeterminada:'MXN'};
      if (url.pathname === '/api/dashboard/resumen') data = {totalCuentas:1,resumenPorMoneda:[{moneda:'MXN',balanceTotal:500,ingresosMes:0,gastosMes:100,totalCuentas:1}],ultimosMovimientos:[]};
      if (url.pathname === '/api/dashboard/analitica') data = {gastosPorCategoria:[{categoriaId:1,categoriaNombre:'Comida ficticia',monto:100,moneda:'MXN'}],ultimosSeisMeses:[]};
      if (url.pathname === '/api/categorias') data = [{id:1,nombre:'Comida ficticia',tipo:'GASTO',activo:true}];
      if (url.pathname === '/api/presupuestos') {
        consultas.push(url.search);
        const octubre = url.searchParams.get('mes') === '10' && url.searchParams.get('anio') === '2026';
        data = {presupuestos:octubre ? [{id:4,categoriaId:1,categoriaNombre:'Comida ficticia',moneda:'MXN',listaId:null,montoLimite:350,montoGastado:100,montoDisponible:250,porcentajeConsumido:28,porcentajeAlerta:80}] : [],resumenPorMoneda:[]};
      }
      await route.fulfill({json:{success:true,data}});
    });
    await page.goto('/dashboard');
    await page.locator('.time-dropdown-btn').click();
    await page.getByRole('dialog',{name:'Seleccionar periodo financiero'}).getByRole('button',{name:/Octubre/i}).click();
    await expect.poll(() => consultas.some(q => new URLSearchParams(q).get('mes') === '10' && new URLSearchParams(q).get('anio') === '2026')).toBe(true);
    const categoria = page.getByRole('button',{name:'Filtrar movimientos de Comida ficticia'});
    await expect(categoria).toBeVisible();
    await categoria.scrollIntoViewIfNeeded();
    const box = (await categoria.boundingBox())!, x = Math.round(box.x+box.width/2), y = Math.round(box.y+box.height/2);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    await page.waitForTimeout(600);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+40}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    const dialog = page.getByRole('dialog',{name:'Editar Presupuesto'});
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('#modalCat option:checked')).toHaveText('Comida ficticia');
    await expect(dialog.locator('#modalMonto')).toHaveValue('350');
    await expect(dialog).toContainText('Octubre 2026');
    expect(consultas.some(q => new URLSearchParams(q).get('mes') === '10' && new URLSearchParams(q).get('anio') === '2026')).toBe(true);
    expect(escrituras).toEqual([]);
  });

  test('desplaza la página y el gráfico y permite ambos gestos tras mantener pulsado', async ({ page, context }) => {
    const usuario = { id: 996, nombre: 'Gesto QA', email: 'gesto@example.test' };
    await page.addInitScript(user => {
      localStorage.setItem('finanzas_token', `test.${btoa(JSON.stringify({exp: Math.floor(Date.now()/1000)+3600}))}.synthetic`);
      localStorage.setItem('finanzas_user', JSON.stringify(user));
    }, usuario);
    await page.route('**/api/**', async route => {
      if (route.request().method() !== 'GET') return route.abort();
      const path = new URL(route.request().url()).pathname;
      let data: unknown = [];
      if (path === '/api/perfil') data = {...usuario, tema:'CLARO', monedaPredeterminada:'MXN'};
      if (path === '/api/dashboard/resumen') data = {totalCuentas:1, resumenPorMoneda:[{moneda:'MXN', balanceTotal:1000, dineroDisponible:1000, ingresosMes:1000, gastosMes:800, totalCuentas:1}], ultimosMovimientos:[]};
      if (path === '/api/dashboard/analitica') data = {gastosPorCategoria:Array.from({length:8}, (_, i) => ({categoriaId:i+1, categoriaNombre:`Categoría ${i+1}`, monto:100, moneda:'MXN'})), ultimosSeisMeses:[]};
      if (path === '/api/categorias') data = Array.from({length:8}, (_, i) => ({id:i+1,nombre:`Categoría ${i+1}`,tipo:'GASTO',activo:true}));
      if (path === '/api/cuentas') data = [{id:1,nombre:'Cuenta ficticia',tipo:'EFECTIVO',moneda:'MXN',saldoActual:1000,activo:true}];
      if (path === '/api/presupuestos') data = {presupuestos:[], resumenPorMoneda:[]};
      await route.fulfill({json:{success:true,data}});
    });
    await page.goto('/dashboard');
    // Asegura contenido desplazable en el escenario sintetico, aun con la cabecera mas compacta.
    await page.evaluate(() => { document.body.style.minHeight = '1400px'; });
    const categoria = page.getByRole('button', {name:'Filtrar movimientos de Categoría 1'});
    await categoria.scrollIntoViewIfNeeded();
    const cdp = await context.newCDPSession(page);
    const tocar = async (x: number, y: number, dx: number, dy: number, mantener: boolean) => {
      await cdp.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[{x,y}]});
      if (mantener) await page.waitForTimeout(600);
      for (let n=1; n<=5; n++) {
        await cdp.send('Input.dispatchTouchEvent', {type:'touchMove', touchPoints:[{x:Math.round(x+dx*n/5), y:Math.round(y+dy*n/5)}]});
        await page.waitForTimeout(30);
      }
    };
    let box = (await categoria.boundingBox())!;
    let x = Math.round(box.x+box.width/2), y = Math.round(box.y+box.height/2);
    const inicio = await page.evaluate(() => window.scrollY);
    await tocar(x,y,0,-100,false);
    await cdp.send('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]});
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(inicio);

    const grafico = page.locator('.home-category-chart');
    await grafico.scrollIntoViewIfNeeded();
    box = (await grafico.boundingBox())!;
    x = Math.round(box.x+box.width*.8); y = Math.round(box.y+box.height/2);
    await tocar(x,y,-125,0,false);
    await cdp.send('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]});
    await expect.poll(() => grafico.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);

    for (const [direccion, selector] of [[-40,'.gesture-pill--up.is-target'], [40,'.gesture-pill--down.is-target']] as const) {
      await page.reload();
      await categoria.scrollIntoViewIfNeeded();
      box = (await categoria.boundingBox())!;
      x = Math.round(box.x+box.width/2); y = Math.round(box.y+box.height/2);
      await tocar(x,y,0,direccion,true);
      await expect(page.locator(selector)).toBeVisible();
      for (const pill of await page.locator('.gesture-pill').all()) {
        await expect(pill).toBeInViewport();
        expect(await pill.evaluate(el => {
          const r = el.getBoundingClientRect();
          return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight && el.scrollWidth <= el.clientWidth;
        })).toBe(true);
      }
      await expect(page.locator('.home-context-sheet')).toHaveCount(0);
      await categoria.dispatchEvent('contextmenu', {button:2});
      await expect(page.locator('.home-context-sheet')).toHaveCount(0);
      await cdp.send('Input.dispatchTouchEvent', {type:'touchCancel',touchPoints:[]});
      await expect(page.locator('.home-category.is-gesture-active')).toHaveCount(0);
    }
    await page.reload();
    await categoria.scrollIntoViewIfNeeded();
    box = (await categoria.boundingBox())!;
    x = Math.round(box.x+box.width/2); y = Math.round(box.y+box.height/2);
    await tocar(x,y,0,-40,true);
    await expect(page.locator('.gesture-pill--up.is-target')).toBeVisible();
    await cdp.send('Input.dispatchTouchEvent', {type:'touchMove',touchPoints:[{x,y:y+40}]});
    await expect(page.locator('.gesture-pill--down.is-target')).toBeVisible();
    await cdp.send('Input.dispatchTouchEvent', {type:'touchMove',touchPoints:[{x,y}]});
    await cdp.send('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]});
    await expect(page.locator('.home-context-sheet')).toHaveCount(0);
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.reload();
    await categoria.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.addEventListener('kaptal-abrir-registro-rapido', () => document.documentElement.dataset['gestoRegistro'] = 'abierto'));
    box = (await categoria.boundingBox())!;
    x = Math.round(box.x+box.width/2); y = Math.round(box.y+box.height/2);
    await tocar(x,y,0,-40,true);
    await cdp.send('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]});
    await expect(page.locator('html')).toHaveAttribute('data-gesto-registro', 'abierto');
    const registro = page.getByRole('dialog',{name:'Añadir movimiento'});
    await expect(registro).toBeVisible();
    await expect(registro.getByRole('button',{name:'Categoría 1',exact:true})).toHaveAttribute('aria-pressed','true');

    await page.reload();
    await categoria.scrollIntoViewIfNeeded();
    box = (await categoria.boundingBox())!;
    x = Math.round(box.x+box.width/2); y = Math.round(box.y+box.height/2);
    await tocar(x,y,0,40,true);
    await cdp.send('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]});
    await expect(page).toHaveURL(/\/presupuestos/);
    const presupuesto = page.getByRole('dialog',{name:'Fijar Presupuesto'});
    await expect(presupuesto).toBeVisible();
    await expect(presupuesto.locator('#modalCat option:checked')).toHaveText('Categoría 1');
    await expect(presupuesto.locator('#modalMoneda option:checked')).toContainText('MXN');
  });
});

test('el enlace al contenido aparece con teclado y mueve el foco al contenido principal', async ({ page }) => {
  await page.route('**/api/**', route => route.fulfill({json:{success:true,data:{configurado:false}}}));
  await page.goto('/login');
  const skip = page.getByRole('link', {name:'Ir al contenido',exact:true});
  expect((await skip.boundingBox())!.width).toBe(1);
  await page.keyboard.press('Tab');
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  expect((await skip.boundingBox())!.width).toBeGreaterThan(44);
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
});

test('rechazar el micrófono permite seguir escribiendo sin enviar audio ni guardar', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('finanzas_token', `test.${btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))}.synthetic`);
    localStorage.setItem('finanzas_user', JSON.stringify({id:995,nombre:'Voz QA',email:'voz@example.test'}));
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')),
    });
  });
  const escrituras: string[] = [];
  await page.route('**/api/**', async route => {
    if (route.request().method() !== 'GET') escrituras.push(route.request().url());
    const data = new URL(route.request().url()).pathname.endsWith('/perfil')
      ? {id:995,nombre:'Voz QA',email:'voz@example.test',tema:'CLARO',monedaPredeterminada:'MXN'} : [];
    await route.fulfill({json:{success:true,data}});
  });
  await page.goto('/cuentas');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('kaptal-abrir-captura-chat')));
  const dialog = page.getByRole('dialog', {name:'Kaptal, captura y reportes'});
  await dialog.getByRole('button', {name:'Dictar movimiento',exact:true}).click();
  await dialog.getByRole('button', {name:'Permitir audio y grabar',exact:true}).click();
  await expect(dialog.getByRole('alert')).toContainText('El acceso al micrófono está bloqueado');
  await expect(dialog.getByRole('button', {name:'Dictar movimiento',exact:true})).toBeEnabled();
  await dialog.locator('#quick-capture-text').fill('Continuar por escrito');
  await expect(dialog.locator('#quick-capture-text')).toHaveValue('Continuar por escrito');
  expect(escrituras).toEqual([]);
});

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
    await expect(page.getByRole('button',{name:'Buscar movimientos',exact:true})).toBeInViewport();
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
  await page.getByRole('link',{name:'Configuración',exact:true}).click();
  await page.getByRole('link', { name: /Presupuestos/ }).click();
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

test('ajustes abre secciones y conserva la protección de eliminar cuenta', async ({ page }) => {
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
  await page.locator('#security summary').click();
  await expect(page.locator('#security')).toHaveAttribute('open','');
  await expect(page.getByRole('switch', { name: 'Proteger pantalla en este Android' })).toHaveCount(0);
  await expect(page.getByRole('switch', { name: 'Bloquear Kaptal al salir' })).toHaveCount(0);
  await page.locator('#backup summary').click();
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
