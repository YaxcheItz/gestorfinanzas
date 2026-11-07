import {test,expect} from '@playwright/test';
import {registrarPrueba} from './registro-helper';
test('Ingresos abre el historial filtrado desde Inicio',async({page})=>{
 const email=`ingresos-${crypto.randomUUID()}@example.test`,password='Password123';
 const registro=await registrarPrueba(page.request,{nombre:'QA ingresos',email,password});expect(registro.ok()).toBeTruthy();
 await page.goto('/login');await page.locator('#email').fill(email);await page.locator('#password').fill(password);
 await page.getByRole('button',{name:'Iniciar sesi\u00f3n',exact:true}).click();await expect(page).toHaveURL(/dashboard/);
 const link=page.getByRole('link',{name:'Ingresos. Ver historial de ingresos',exact:true});await expect(link).toBeVisible();await link.click();
 await expect(page).toHaveURL(/transacciones\?tipo=INGRESO/);
});
