import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, request } from 'playwright';

// Crea y elimina exclusivamente su propia cuenta QA; nunca usa credenciales del propietario.
const origin = process.env['LAN_ORIGIN'];
assert.ok(origin && /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+):4300$/.test(origin), 'Indica LAN_ORIGIN con la IPv4 privada y puerto 4300.');
const output = resolve('../replica/acceso-lan');
await mkdir(output, { recursive: true });
const api = await request.newContext({ baseURL: origin });
const browser = await chromium.launch();
let token;
let cleaned = false;
const password = `Qa-${randomUUID().slice(0, 12)}!`;
const email = `qa-lan-${randomUUID()}@example.test`;
const result = { origin, browser: 'Chromium movil emulado', physicalDevice: false };
try {
  for (const path of ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout']) {
    const preflight = await api.fetch(path, { method: 'OPTIONS', headers: {
      Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,x-gestion-sesion'
    } });
    assert.equal(preflight.status(), 200);
    assert.equal(preflight.headers()['access-control-allow-origin'], origin);
    assert.equal(preflight.headers()['access-control-allow-credentials'], 'true');
  }
  result.preflight = true;
  const denied = await api.fetch('/api/auth/login', { method: 'OPTIONS', headers: {
    Origin: 'https://sitio-ajeno.example', 'Access-Control-Request-Method': 'POST'
  } });
  assert.equal(denied.status(), 403);
  // El servidor de desarrollo puede añadir sus propias cabeceras CORS al proxy.
  // Comprobar también la política del backend directamente.
  const deniedBackend = await api.fetch('http://127.0.0.1:18081/api/auth/login', { method: 'OPTIONS', headers: {
    Origin: 'https://sitio-ajeno.example', 'Access-Control-Request-Method': 'POST'
  } });
  assert.equal(deniedBackend.status(), 403);
  assert.equal(deniedBackend.headers()['access-control-allow-origin'], undefined);
  result.untrustedOriginBlocked = true;
  const registration = await api.post('/api/auth/registro', { headers: { Origin: origin }, data: { nombre: 'QA acceso LAN temporal', email, password } });
  assert.equal(registration.status(), 201);
  token = (await registration.json()).data.token;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${origin}/login`);
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await page.waitForURL('**/dashboard');
  await page.locator('.time-dropdown-btn').waitFor();
  assert.equal(await page.locator('vite-error-overlay').count(), 0);
  const cookie = (await context.cookies()).find(item => item.name === 'finanzas_refresh');
  assert.ok(cookie?.httpOnly && cookie.sameSite === 'Lax' && !cookie.secure);
  result.loginAndCookie = true;
  const csrfBlocked = await page.evaluate(async () => (await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })).status);
  assert.equal(csrfBlocked, 403);
  result.csrfPreserved = true;
  const refreshed = await page.evaluate(async () => {
    const response = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include', headers: { 'X-Gestion-Sesion': '1' } });
    return { status: response.status, success: (await response.json()).success };
  });
  assert.deepEqual(refreshed, { status: 200, success: true });
  await page.reload();
  await page.waitForURL('**/dashboard');
  await page.locator('.time-dropdown-btn').waitFor();
  result.refreshAndReload = true;
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: `${output}/dashboard-lan.png`, animations: 'disabled', fullPage: true });
  await page.goto(`${origin}/configuracion`);
  const logout = page.getByRole('button', { name: 'Cerrar sesión', exact: true, includeHidden: true });
  await logout.evaluate(button => { const details = button.closest('details'); if (details) details.open = true; });
  await logout.click();
  await page.waitForURL('**/login');
  assert.equal((await context.cookies()).some(item => item.name === 'finanzas_refresh'), false);
  result.logout = true;
  assert.deepEqual(errors, []);
  result.jsErrors = 0;
  await context.close();
} finally {
  if (token) {
    const deletion = await api.delete('/api/usuarios/me', { headers: { Authorization: `Bearer ${token}` }, data: { password } });
    cleaned = deletion.ok();
  }
  await browser.close();
  await api.dispose();
  result.temporaryAccountRemoved = cleaned;
  await writeFile(`${output}/verification.json`, JSON.stringify(result, null, 2));
}
assert.equal(cleaned, true, 'No se pudo eliminar la cuenta QA temporal.');
console.log('LAN: CORS, login, cookie, CSRF, renovacion, recarga y logout correctos; cuenta QA eliminada.');
