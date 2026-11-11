// Reproduccion aislada de cabeceras HTTP; no usa Kaptal real ni credenciales.
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

async function main() {
  let pendiente;
  let cookieEnSolicitudTardia;
  let recibida;
  const llegada = new Promise(resolve => { recibida = resolve; });
  const server = http.createServer((req, res) => {
    if (req.url === '/api/auth/logout' && req.method === 'POST') {
      pendiente = res;
      recibida();
      return;
    }
    if (req.url === '/api/auth/login' && req.method === 'POST') {
      res.setHeader('Set-Cookie', 'sesion_ficticia=B; Path=/api/auth; HttpOnly; SameSite=Lax');
      res.end('ok');
      return;
    }
    if (req.url === '/api/auth/logout-tardio' && req.method === 'POST') {
      cookieEnSolicitudTardia = req.headers.cookie;
      res.end('ok');
      return;
    }
    res.setHeader('Content-Type', 'text/html');
    res.end('<!doctype html><title>Prueba local</title>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({headless: true});
    const context = await browser.newContext();
    await context.addCookies([{name:'sesion_ficticia',value:'A',domain:'127.0.0.1',path:'/api/auth',httpOnly:true,sameSite:'Lax'}]);
    const page = await context.newPage();
    await page.goto(origin);
    await page.evaluate(() => { window.logoutPendiente = fetch('/api/auth/logout', {method:'POST'}); });
    await Promise.race([llegada, new Promise((_, reject) => setTimeout(() => reject(new Error('No llego logout local')), 5000))]);
    await page.evaluate(() => fetch('/api/auth/login', {method:'POST'}));
    assert.equal((await context.cookies(origin+'/api/auth')).find(c => c.name === 'sesion_ficticia')?.value, 'B');
    pendiente.setHeader('Set-Cookie', 'sesion_ficticia=; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=0');
    pendiente.end('ok');
    await page.evaluate(() => window.logoutPendiente);
    assert.equal((await context.cookies(origin+'/api/auth')).find(c => c.name === 'sesion_ficticia'), undefined);
    console.log('REPRODUCIDO: una respuesta logout anterior borra la cookie HttpOnly ficticia de la sesion nueva.');
    await page.evaluate(() => fetch('/api/auth/login', {method:'POST'}));
    await page.evaluate(() => fetch('/api/auth/logout-tardio', {method:'POST'}));
    assert.equal(cookieEnSolicitudTardia, 'sesion_ficticia=B');
    console.log('REPRODUCIDO: un logout enviado despues del nuevo login adjunta la cookie nueva.');
    console.log('Limite: servidor sintetico local; no prueba backend Kaptal, Android ni concurrencia entre dispositivos.');
    await context.close();
  } finally {
    if (pendiente && !pendiente.writableEnded) pendiente.destroy();
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
