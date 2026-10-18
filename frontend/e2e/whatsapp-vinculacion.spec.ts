import { expect, test } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash, randomBytes } from 'node:crypto';
import { registrarPrueba } from './registro-helper';

test('autorizar desde Kaptal vincula el puente sin contraseña y no reutiliza códigos', async ({ page, request }, testInfo) => {
  const email = `vinculo-${crypto.randomUUID()}@example.test`;
  const registration = await registrarPrueba(request, { nombre: 'QA vínculo', email, password: 'Password123' });
  expect(registration.ok()).toBeTruthy();
  const auth = (await registration.json()).data;
  await page.addInitScript(data => {
    localStorage.setItem('finanzas_token', data.token);
    localStorage.setItem('finanzas_user', JSON.stringify({ id: data.id, nombre: data.nombre, email: data.email }));
  }, auth);
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/vincular-canal#challenge=' + challenge);
  await expect(page.getByRole('heading', { name: 'Conectar WhatsApp' })).toBeVisible();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await expect(page.getByText(challenge.slice(0, 8), { exact: true })).toBeVisible();
  await expect(page.getByLabel('Código de un solo uso')).toHaveCount(0);
  await page.getByRole('button', { name: 'Autorizar conexión', exact: true }).click();
  const codeInput = page.getByLabel('Código de un solo uso');
  await expect(codeInput).toHaveValue(/^[A-Za-z0-9_-]{43}$/);
  const code = await codeInput.inputValue();
  const { stdout } = await promisify(execFile)(process.platform === 'win32' ? 'python' : 'python3', ['../tools/canales/e2e_browser_connect.py'], {
    env: { ...process.env, KAPTAL_E2E_FIXTURE: JSON.stringify({ apiUrl: testInfo.project.use.baseURL, ownerId: auth.id, email, verifier, code }) }
  });
  expect(JSON.parse(stdout.trim())).toEqual({ browserApproved: true, sessionReloaded: true, passwordUsed: false });
  const replay = await request.post('/api/auth/canal/intercambiar', { data: { codigo: code, verifier, email } });
  expect(replay.status()).toBe(400);
});
