import { expect, test } from '@playwright/test';
import { registrarPrueba } from './registro-helper';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' });
test.setTimeout(90_000);

test('registro rápido guarda gastos, ingresos y transferencias; conserva borrador y no duplica reintentos', async ({ page }) => {
  await page.context().setOffline(false);
  const email=`rapido-${crypto.randomUUID()}@example.test`,password='Password123';
  const registration=await registrarPrueba(page.request,{nombre:'QA registro rápido',email,password});
  expect(registration.ok()).toBeTruthy();
  const headers={Authorization:`Bearer ${(await registration.json()).data.token}`};
  for(const [nombre,saldoInicial] of [['Banco Rápido',1000],['Ahorro Rápido',0]] as const) {
    const account=await page.request.post('/api/cuentas',{headers,data:{nombre,tipo:'DEBITO',moneda:'MXN',saldoInicial}});
    expect(account.ok()).toBeTruthy();
  }
  await page.goto('/login');await page.locator('#email').fill(email);await page.locator('#password').fill(password);
  await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await expect(page).toHaveURL(/dashboard/);
  const dialog=page.getByRole('dialog',{name:'Añadir movimiento'}),amount=page.locator('#quick-entry-amount');
  const open=async()=>{await page.getByRole('button',{name:'Añadir movimiento',exact:true}).click();await expect(amount).toBeEnabled();};
  const selectBank=async()=>{await dialog.locator('select[name="cuenta"]').selectOption({label:'Banco Rápido · MXN'});};
  const movements=async()=>{const r=await page.request.get('/api/transacciones?size=100',{headers});expect(r.ok()).toBeTruthy();return (await r.json()).data.content;};
  await open();await expect(dialog.getByRole('button',{name:'Gasto',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(dialog.getByRole('button',{name:'Guardar gasto',exact:true})).toBeDisabled();
  const privacy=dialog.locator('app-privacy-toggle button');
  await privacy.focus();await page.keyboard.press('Shift+Tab');
  await expect(dialog.locator('summary')).toBeFocused();
  await page.keyboard.press('Tab');await expect(privacy).toBeFocused();
  await dialog.locator('summary').click();
  await privacy.focus();await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button',{name:'Opciones avanzadas: recurrentes y meses sin intereses'})).toBeFocused();
  await dialog.locator('summary').click();
  await selectBank();await amount.fill('25,50');
  const category=dialog.locator('.entry-category-chips button').first();await category.click();
  const categoryName=await category.locator(':scope > span').innerText();
  await amount.focus();
  await page.setViewportSize({width:390,height:360});
  await expect.poll(()=>amount.evaluate(e=>{
    const input=e.getBoundingClientRect(),body=e.closest('fieldset')!.getBoundingClientRect();
    return input.top>=body.top-1 && input.bottom<=body.bottom+1;
  })).toBe(true);
  const save=dialog.getByRole('button',{name:'Guardar gasto',exact:true});await expect(save).toBeInViewport();
  await save.focus();await page.keyboard.press('Tab');await expect(privacy).toBeFocused();
  await save.evaluate(button=>{(button as HTMLButtonElement).click();(button as HTMLButtonElement).click();});
  await expect(dialog).not.toBeVisible();
  expect((await movements()).filter((m:{monto:number})=>m.monto===25.5)).toHaveLength(1);
  await page.setViewportSize({width:390,height:844});await open();
  await expect(dialog.locator('select[name="cuenta"] option:checked')).toHaveText('Banco Rápido · MXN');
  await expect(dialog.getByRole('button',{name:categoryName.trim(),exact:true})).toHaveAttribute('aria-pressed','true');
  await amount.fill('12');await dialog.getByRole('button',{name:'Escribir o dictar',exact:true}).click();
  await expect(page.locator('#quick-capture-panel')).toBeVisible();
  await page.locator('#quick-capture-panel').getByRole('button',{name:'Rápido',exact:true}).click();
  await expect(amount).toHaveValue('12');await expect(page).toHaveURL(/dashboard/);
  await dialog.getByRole('button',{name:'Ingreso',exact:true}).click();await selectBank();await amount.fill('100');
  await dialog.getByRole('button',{name:'Guardar ingreso',exact:true}).click();await expect(dialog).not.toBeVisible();
  await open();await dialog.getByRole('button',{name:'Transferencia',exact:true}).click();await selectBank();
  await dialog.locator('select[name="destino"]').selectOption({label:'Ahorro Rápido · MXN'});await amount.fill('50');
  await dialog.getByRole('button',{name:'Guardar transferencia',exact:true}).click();await expect(dialog).not.toBeVisible();
  await open();await amount.fill('7.50');
  await page.route('**/api/transacciones',async route=>{
    if(route.request().method()!=='POST')return route.continue();
    const response=await route.fetch();expect(response.ok()).toBeTruthy();await route.abort('failed');
  },{times:1});
  await dialog.getByRole('button',{name:'Guardar gasto',exact:true}).click();
  await expect(dialog.getByRole('button',{name:'Reintentar el mismo movimiento'})).toBeVisible();
  await expect(amount).toBeDisabled();
  await dialog.getByRole('button',{name:'Reintentar el mismo movimiento'}).click();await expect(dialog).not.toBeVisible();
  expect((await movements()).filter((m:{monto:number})=>m.monto===7.5)).toHaveLength(1);
  await page.context().setOffline(true);await open();await amount.fill('12');
  await expect(dialog.getByText(/Se guardará en este dispositivo/)).toBeVisible();
  await dialog.getByRole('button',{name:'Guardar en este dispositivo',exact:true}).evaluate(button=>{(button as HTMLButtonElement).click();(button as HTMLButtonElement).click();});
  await expect(dialog).not.toBeVisible();await page.context().setOffline(false);
  await expect.poll(async()=>(await movements()).filter((m:{monto:number})=>m.monto===12).length,{timeout:30000}).toBe(1);
  const accounts=await page.request.get('/api/cuentas',{headers});expect(accounts.ok()).toBeTruthy();
  const balances=(await accounts.json()).data;
  expect(balances.find((c:{nombre:string})=>c.nombre==='Banco Rápido').saldoActual).toBe(1005);
  expect(balances.find((c:{nombre:string})=>c.nombre==='Ahorro Rápido').saldoActual).toBe(50);
});
