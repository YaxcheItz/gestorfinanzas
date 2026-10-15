import { chromium, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import assert from 'node:assert/strict';

const root = resolve('dist/frontend/browser');
const output = resolve(process.env['DESIGN_REVIEW_OUTPUT'] ?? '../replica/rediseno-integral');
await mkdir(`${output}/screens`, { recursive: true });
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  try {
    let path = resolve(root, `.${decodeURIComponent(new URL(req.url, 'http://localhost').pathname)}`);
    if (!path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    let data;
    try { data = await readFile(path); }
    catch {
      if (extname(path)) { res.writeHead(404).end(); return; }
      path = resolve(root, 'index.html'); data = await readFile(path);
    }
    res.setHeader('Content-Type', mime[extname(path)] ?? 'text/html'); res.end(data);
  } catch { res.writeHead(500).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = process.env['DESIGN_REVIEW_ORIGIN'] ?? `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const checks = [];
const user = { id: 991, nombre: 'Valeria', email: 'visual@example.test' };
const token = `e30.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.synthetic`;
const cuentas = [{ id: 1, nombre: 'Cuenta diaria', tipo: 'DEBITO', moneda: 'MXN', saldoActual: 18472.35, activo: true }, { id: 2, nombre: 'Tarjeta personal', tipo: 'CREDITO', moneda: 'MXN', saldoActual: -2340.50, limiteCredito: 15000, diaCorte: 12, diaPago: 2, activo: true }];
const categorias = [{ id: 1, nombre: 'Alimentos', tipo: 'GASTO', icono: 'shopping-cart', color: '#8CD6AD', activo: true, esPersonalizada: true }, { id: 2, nombre: 'Transporte', tipo: 'GASTO', icono: 'car', color: '#b7bbcf', activo: true, esPersonalizada: true }, { id: 3, nombre: 'Ocio', tipo: 'GASTO', icono: 'coffee', color: '#DDD7FF', activo: true, esPersonalizada: true }];
const movimientos = [{ id: 1, cuentaId: 1, cuentaNombre: 'Cuenta diaria', categoriaId: 1, categoriaNombre: 'Alimentos', categoriaIcono: 'shopping-cart', tipo: 'GASTO', monto: 187.50, moneda: 'MXN', fecha: '2026-10-14', descripcion: 'Compra semanal', fechaCreacion: '2026-10-14T12:00:00' }];
const resumenMoneda = { moneda: 'MXN', dineroDisponible: 18472.35, deudaTarjetas: 2340.50, balanceTotal: 16131.85, ingresosMes: 24500, gastosMes: 7147.65, balanceMes: 17352.35, tasaAhorro: 70.82, totalCuentas: 2 };
const presupuesto = { id: 1, categoriaId: 1, categoriaNombre: 'Alimentos', categoriaIcono: 'shopping-cart', moneda: 'MXN', montoLimite: 3500, montoGastado: 2147.25, montoDisponible: 1352.75, porcentajeConsumido: 61.35, estado: 'NORMAL', mes: 10, anio: 2026 };


const presupuestos = [presupuesto,
  { ...presupuesto, id: 2, categoriaId: 2, categoriaNombre: 'Transporte', categoriaIcono: 'car', categoriaColor: '#b7bbcf', montoLimite: 4500, montoGastado: 3880.40, montoDisponible: 619.60, porcentajeConsumido: 86.23, estado: 'ALERTA' },
  { ...presupuesto, id: 3, categoriaId: 3, categoriaNombre: 'Ocio', categoriaIcono: 'coffee', categoriaColor: '#d9b89c', montoLimite: 1000, montoGastado: 1120, montoDisponible: -120, porcentajeConsumido: 112, estado: 'EXCEDIDO' }
];
try {
  for (const width of (process.env['DESIGN_REVIEW_WIDTHS']?.split(',').map(Number) ?? [360, 390, 768, 1280])) for (const theme of ['CLARO', 'OSCURO']) {
    const context = await browser.newContext({ viewport: { width, height: ({375:812,390:844,393:852,402:874,430:932})[width] ?? 900 }, colorScheme: theme === 'OSCURO' ? 'dark' : 'light', hasTouch: width < 900, serviceWorkers: 'block' });
    const page = await context.newPage();
    const errors = [];
    let ocultarMontos = false;
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(({ token, user, theme }) => {
      if (['/login', '/registro', '/recuperar-cuenta'].includes(location.pathname)) {
        localStorage.removeItem('finanzas_token'); localStorage.removeItem('finanzas_user'); return;
      }
      localStorage.setItem('finanzas_token', token);
      localStorage.setItem('finanzas_user', JSON.stringify(user));
      localStorage.setItem('kaptal_tema_991', theme);
    }, { token, user, theme });
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let data = [];
      if (path === '/api/perfil') {
        const body = route.request().postDataJSON();
        if (typeof body?.ocultarMontos === 'boolean') ocultarMontos = body.ocultarMontos;
        data = { ...user, tema: theme, monedaPredeterminada: 'MXN', notificacionesWhatsapp: false, ocultarMontos };
      }
      else if (path.startsWith('/api/auth/refresh')) data = { token, usuario: user };
      else if (path === '/api/dashboard/resumen') data = { ...resumenMoneda, resumenPorMoneda: [resumenMoneda], ultimosMovimientos: movimientos, mes: 10, anio: 2026 };
      else if (path === '/api/dashboard/analitica') data = { gastosPorCategoria: categorias.map((c, i) => ({ categoriaId: c.id, categoriaNombre: c.nombre, monto: [2147.25, 3880.40, 1120][i], moneda: 'MXN' })), ultimosSeisMeses: [5, 6, 7, 8, 9, 10].map(mes => ({ mes, anio: 2026, ingresos: 24500, gastos: 3400 + mes * 800, moneda: 'MXN' })) };
      else if (path === '/api/dashboard/comparacion') data = { porMoneda: [{ moneda: 'MXN', variacionGastos: -1240.25 }], mes: 10, anio: 2026, mesAnterior: 9, anioAnterior: 2026 };
      else if (path === '/api/presupuestos') data = { presupuestos, resumenPorMoneda: [{ moneda: 'MXN', totalPresupuestado: 9000, totalGastado: 7147.65, totalDisponible: 1852.35, porcentajeConsumido: 79.42 }], totalPresupuestado: 9000, totalGastado: 7147.65, totalDisponible: 1852.35, porcentajeConsumidoGlobal: 79.42, mes: 10, anio: 2026 };
      else if (path.startsWith('/api/categorias')) data = categorias;
      else if (path === '/api/cuentas') data = cuentas;
      else if (path === '/api/transacciones/recientes') data = movimientos;
      else if (path.startsWith('/api/transacciones')) data = { content: movimientos, totalPages: 1, totalElements: 1, number: 0, size: 20 };
      else if (path === '/api/pareja') data = null;
      else if (path.includes('libro-diario') || path.includes('auditoria')) data = path.includes('backfill') ? { pendientes: 0, movimientosEncontrados: 0, yaContabilizados: 0, omitidos: 0 } : { content: [], totalPages: 0, totalElements: 0 };
      else if (path.includes('/asistente/estado')) data = { configurado: false, disponible: false, provider: 'groq', model: 'test' };
      else if (path.includes('push/configuracion')) data = { configurado: false, clavePublica: null };
      await route.fulfill({ json: { success: true, message: '', data } });
    });
    for (const route of ['dashboard', 'transacciones', 'reportes', 'presupuestos', 'cuentas', 'categorias', 'pareja', 'libro-diario', 'configuracion', 'asistente']) {
      await page.goto(`${origin}/${route}`);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      assert.equal(overflow, false, `${route} ${width} ${theme}: horizontal overflow`);
      assert.deepEqual(errors, [], `${route}: JavaScript errors`);
      assert.equal(await page.locator('html').evaluate(el => el.classList.contains('dark')), theme === 'OSCURO');
      if ([390, 393, 1280].includes(width)) await page.screenshot({ path: `${output}/screens/${route}-${width}-${theme}.png`, fullPage: true });
      checks.push({ route, width, theme, overflow: false, errors: 0 });
      if (['dashboard','transacciones'].includes(route)) {
        await expect(page.locator('.workspace-shortcuts')).toBeVisible();
        await expect(page.locator('.capture-dock__voice')).toBeVisible();
      }
      if (route === 'dashboard') {
        const skip = page.locator('.skip-link');
        const clipped = () => skip.evaluate(el => getComputedStyle(el).clipPath === 'inset(50%)' && el.getBoundingClientRect().width <= 1);
        assert.equal(await clipped(), true, 'Skip link should not be visible during normal use');
        await page.keyboard.press('Tab');
        await expect(skip).toBeFocused();
        await expect.poll(() => skip.evaluate(el => getComputedStyle(el).clipPath)).toBe('none');
        await page.keyboard.press('Enter');
        await expect(page.locator('#main-content')).toBeFocused();
        assert.equal(await clipped(), true);
        const menu = page.locator('.workspace-panel');
        const trigger = page.locator('.workspace-selector');
        await trigger.click();
        await expect(menu.getByRole('link', { name: 'Cuentas', exact: true })).toBeVisible();
        await expect(menu.getByRole('link', { name: 'Categorías', exact: true })).not.toBeVisible();
        await menu.locator('.workspace-menu__tools > summary').click();
        await expect(menu.getByRole('link', { name: 'Libro diario', exact: true })).toBeVisible();
        if (width === 390 && theme === 'OSCURO') await page.screenshot({ path: `${output}/screens/menu-390-OSCURO.png` });
        await page.keyboard.press('Escape');
        await expect(trigger).toBeFocused();
        await expect(menu).not.toHaveAttribute('open');
        await trigger.click();
        await page.mouse.click(4, 4);
        await expect(menu).not.toHaveAttribute('open');
        assert.equal(await clipped(), true, 'Pointer interactions must not expose the skip link');
        await trigger.click();
        await menu.locator('.workspace-menu__tools > summary').click();
        await menu.getByRole('link', { name: 'Categorías', exact: true }).click();
        await expect(page).toHaveURL(/\/categorias$/);
        await expect(menu).not.toHaveAttribute('open');
        checks.push({ route: 'navigation', width, theme, skipKeyboardOnly: true, menuDismissal: true, toolsGrouping: true });
        await page.goto(`${origin}/dashboard`);
        await expect(page.locator('.mobile-bottom-nav')).toHaveCount(0);
        await expect(page.locator('.capture-dock__voice')).toBeVisible();
        await expect(page.locator('.home-category')).toHaveCount(3);
        await expect(page.locator('.dashboard-screen__budgets')).toHaveCount(0);
        await page.locator('.home-period .time-dropdown-btn').click();
        const period = page.getByRole('dialog', { name: 'Seleccionar rango de tiempo', exact: true });
        await expect(period).toBeVisible();
        if(width === 390) await page.screenshot({path:`${output}/screens/period-${width}-${theme}.png`});
        await page.keyboard.press('Escape');
        await expect(period).not.toBeVisible();
        await expect(page.locator('.home-period .time-dropdown-btn')).toBeFocused();
        await page.locator('.home-category__more').first().click();
        const category = page.locator('.home-context-sheet');
        await expect(category).toBeVisible();
        if(width === 390) await page.screenshot({path:`${output}/screens/category-${width}-${theme}.png`});
        await category.getByRole('button',{name:'Añadir gasto',exact:true}).click();
        await expect(page.locator('.quick-entry')).toBeVisible();
        await expect(page.locator('.quick-entry select[name="categoria"] option:checked')).toHaveText('Transporte');
        await expect(page.getByRole('button',{name:'Cerrar registro',exact:true})).toBeInViewport();
        await page.getByRole('button',{name:'Cerrar registro',exact:true}).click();
        await page.getByRole('button',{name:'Detallada',exact:true}).click();
        await expect(page.locator('.dashboard-screen__budgets')).toBeVisible();
        if(width === 390) await page.screenshot({path:`${output}/screens/advanced-${width}-${theme}.png`,fullPage:true});
        await page.getByRole('button',{name:'Simple',exact:true}).click();
        await page.getByRole('button',{name:'Registrar por voz o texto',exact:true}).click();
        await expect(page.locator('#quick-capture-panel')).toBeVisible();
        await page.locator('#quick-capture-panel').getByRole('button',{name:'Cerrar',exact:true}).click();
        await expect(page.locator('#quick-capture-panel')).not.toBeVisible();
        checks.push({route:'home-context',width,theme,noTabBar:true,periodFocus:true,categoryCapture:true,advanced:true,voiceLauncher:true});
        await page.setViewportSize({width,height:500});
        await page.evaluate(()=>window.scrollTo(0,600));
        await expect(page.locator('.home-scroll-summary')).toBeVisible();
        await expect(page.locator('.dashboard-screen')).toHaveClass(/home-is-compact/);
        assert.equal(await page.locator('.home-category__track').first().evaluate(el=>el.getBoundingClientRect().height),88);
        if(width===390) await page.screenshot({path:`${output}/screens/home-scrolled-${theme}.png`});
        await page.evaluate(()=>window.scrollTo(0,0));
        await expect(page.locator('.home-scroll-summary')).not.toBeVisible();
        await page.setViewportSize({width,height:900});
        await page.locator('.dashboard-screen__header').getByRole('button',{name:'Ocultar montos',exact:true}).click();
        await expect(page.locator('.dashboard-screen__amount')).toHaveText('•••');
        assert.equal(await page.locator('.home-category__bar').evaluateAll(bars => bars.every(bar => bar.style.height === '0%')),true);
        await page.locator('.dashboard-screen__header').getByRole('button',{name:'Mostrar montos',exact:true}).click();
        if (width === 390 && theme === 'CLARO') {
          await page.route('**/api/dashboard/analitica**',r=>r.fulfill({status:503,json:{success:false}}));
          await page.reload();
          await expect(page.locator('.home-categories [role="alert"]')).toBeVisible();
          await page.screenshot({path:`${output}/screens/home-error-390-CLARO.png`});
          await page.unroute('**/api/dashboard/analitica**');
          await page.route('**/api/dashboard/analitica**',r=>r.fulfill({json:{success:true,data:{gastosPorCategoria:[],ultimosSeisMeses:[]}}}));
          await page.route('**/api/dashboard/resumen**',r=>r.fulfill({json:{success:true,data:{...resumenMoneda,gastosMes:0,resumenPorMoneda:[{...resumenMoneda,gastosMes:0}],ultimosMovimientos:[]}}}));
          await page.reload();
          await expect(page.locator('.home-empty')).toBeVisible();
          await expect(page.locator('.dashboard-screen__recent')).toHaveCount(0);
          await page.screenshot({path:`${output}/screens/home-empty-390-CLARO.png`});
          await page.unroute('**/api/dashboard/analitica**');
          await page.unroute('**/api/dashboard/resumen**');
          checks.push({route:'home-states',width,theme,empty:true,analyticsError:true,privacy:true});
        }


      }
    }
    await page.goto(`${origin}/dashboard`);
    await page.getByRole('button', { name: 'Añadir movimiento', exact: true }).click();
    await expect(page.locator('.quick-entry')).toBeVisible();
    await page.locator('#quick-entry-amount').fill('187.50');
    await page.getByRole('button', { name: 'Escribir o dictar', exact: true }).click();
    await expect(page.locator('#quick-capture-panel')).toBeVisible();
    await page.locator('#quick-capture-text').fill('Gasté 187.50 en comida');
    await page.setViewportSize({ width, height: 500 });
    await expect.poll(() => page.locator('#quick-capture-panel').evaluate(el => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1; })).toBe(true);
    checks.push({ route: 'capture', width, theme, keyboardViewport: true });
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['login', 'registro', 'recuperar-cuenta']) {
      await page.goto(`${origin}/${route}`);
      await page.waitForLoadState('networkidle');
      await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'OSCURO'), theme);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${route}: overflow`);
      assert.deepEqual(errors, [], `${route}: JavaScript errors`);
      if (width === 390) await page.screenshot({ path: `${output}/screens/${route}-${width}-${theme}.png`, fullPage: true });
      checks.push({ route, width, theme, overflow: false, errors: 0 });
    }
    await context.close();
    console.log(`${width}px ${theme}: pages and capture verified`);
  }
  if (process.env['DESIGN_REVIEW_SKIP_SW'] !== '1') {
  const offlineContext = await browser.newContext({ serviceWorkers: 'allow' });
  const offlinePage = await offlineContext.newPage();
  await offlinePage.goto(`${origin}/login`);
  await offlinePage.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => offlinePage.evaluate(async () => {
    const files = ['capture', 'dashboard', 'home', 'activity', 'settings'];
    return (await Promise.all(files.map(name => caches.match(new URL(`styles/${name}.css`, location.origin).href)))).every(Boolean);
  }), { timeout: 60000 }).toBe(true);
  await offlineContext.setOffline(true);
  await offlinePage.reload();
  await expect(offlinePage.getByRole('button', { name: 'Iniciar sesión', exact: true })).toBeVisible();
  checks.push({ route: 'offline-login', stylesCached: 5, serviceWorker: true, reloadOffline: true });
  await offlineContext.close();
  }
  await writeFile(`${output}/browser-checks.json`, JSON.stringify(checks, null, 2));
  console.log(`${checks.length} browser checks passed; synthetic API, Chromium, no physical Android.`);
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
