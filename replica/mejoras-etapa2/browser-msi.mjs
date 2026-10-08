import { createServer } from 'node:http';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(new URL('../../frontend/package.json', import.meta.url));
const { chromium, expect } = require('@playwright/test');
const root = fileURLToPath(new URL('../../frontend/dist/frontend/browser/', import.meta.url));
const mime = { '.js':'text/javascript', '.css':'text/css', '.html':'text/html',
  '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.woff2':'font/woff2' };
const server = createServer(async (request,response) => {
  try {
    let archivo = resolve(root, '.' + decodeURIComponent(new URL(request.url,'http://localhost').pathname));
    if (!archivo.startsWith(resolve(root) + sep) && archivo !== resolve(root)) {
      response.writeHead(403).end(); return;
    }
    if (!(await stat(archivo).catch(() => null))?.isFile()) archivo = resolve(root,'index.html');
    response.writeHead(200, {'Content-Type':mime[extname(archivo)] ?? 'application/octet-stream'});
    response.end(await readFile(archivo));
  } catch { response.writeHead(500).end(); }
});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({headless:true});
const checks = [];
try {
  for (const escenario of [{width:360,dark:false},{width:390,dark:true},{width:1280,dark:false},{width:844,height:390,dark:false}]) {
    const context = await browser.newContext({ viewport:{width:escenario.width,height:escenario.height ?? 900},
      serviceWorkers:'block', reducedMotion:'reduce', colorScheme:escenario.dark ? 'dark' : 'light' });
    const errores = [];
    const base = { cuentaId:11,cuentaNombre:'Tarjeta',categoriaId:null,categoriaNombre:null,
      tipo:'GASTO',monto:33.33,moneda:'MXN',notas:null,frecuencia:'MENSUAL',
      siguienteFecha:'2025-03-30',fechaAncla:'2025-01-30',cuotasTotales:2,compraMsiId:'msi-demo' };
    let planes = [{...base,id:1,activa:true,cuotasPagadas:1,montoPendiente:33.34},
      {...base,id:2,activa:false,cuotasPagadas:2,montoPendiente:0}];
    let eliminaciones = 0;
    await context.addInitScript(() => {
      localStorage.setItem('finanzas_token',`e30.${btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))}.synthetic`);
      localStorage.setItem('finanzas_user',JSON.stringify({id:991,nombre:'Prueba MSI',email:'msi@example.test'}));
    });
    await context.route('**/runtime-config.js',route => route.fulfill({contentType:'text/javascript',body:'window.__API_BASE_URL__="/api";'}));
    await context.route('**/api/**',async route => {
      const path = new URL(route.request().url()).pathname;
      let data = [];
      if (path === '/api/perfil') data = {id:991,nombre:'Prueba MSI',email:'msi@example.test',
        tema:escenario.dark ? 'OSCURO':'CLARO',monedaPredeterminada:'MXN',ocultarMontos:false};
      else if (path === '/api/recurrencias') data = planes;
      else if (path === '/api/recurrencias/1' && route.request().method() === 'DELETE') {
        eliminaciones++; planes = planes.filter(p => p.id !== 1); data = null;
      } else if (path.includes('/push')) data = {configurado:false};
      else if (path === '/api/auth/google/config') data = {enabled:false,clientId:''};
      await route.fulfill({json:{success:true,message:'',data}});
    });
    const page = await context.newPage();
    page.on('pageerror',error => errores.push(error.message));
    await page.goto(`${origin}/configuracion#recurring`);
    const recurrentes = page.locator('#recurring');
    await expect(recurrentes).toContainText('2 de 3 cuotas registradas');
    await expect(recurrentes).toContainText('33.34');
    await expect(recurrentes.getByRole('button',{name:'Reanudar'})).toBeDisabled();
    const cancelar = recurrentes.getByRole('button',{name:'Cancelar pendientes'}).first();
    await cancelar.scrollIntoViewIfNeeded();
    assert.ok((await cancelar.boundingBox()).height >= 44);
    await recurrentes.screenshot({path:fileURLToPath(new URL(`./pendientes-${escenario.width}-${escenario.dark?'oscuro':'claro'}.png`,import.meta.url))});
    await cancelar.click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toContainText('se liberará su crédito retenido');
    await expect(dialogo).toContainText('Los pagos registrados se conservarán');
    assert.equal(eliminaciones,0);
    await dialogo.getByRole('button',{name:'Cancelar',exact:true}).click();
    assert.equal(eliminaciones,0);
    await cancelar.click();
    await dialogo.getByRole('button',{name:'Cancelar cuotas pendientes',exact:true}).click();
    await expect(recurrentes.locator('article')).toHaveCount(1);
    assert.equal(eliminaciones,1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
    assert.deepEqual(errores,[]);
    await recurrentes.screenshot({path:fileURLToPath(new URL(`./recurrentes-${escenario.width}-${escenario.dark?'oscuro':'claro'}.png`,import.meta.url))});
    checks.push({...escenario,confirmacionAntesDeEliminar:true,cancelarNoEnvia:true,
      pendienteExacto:true,completadaNoReanuda:true,overflow:false,errores});
    await context.close();
  }
  await writeFile(new URL('./browser-checks.json',import.meta.url),JSON.stringify({fecha:new Date().toISOString(),
    navegador:'Chromium',api:'sintética',serviceWorkers:'bloqueados',checks},null,2));
  console.log(JSON.stringify(checks));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
