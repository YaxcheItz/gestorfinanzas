import { expect, test, Page } from '@playwright/test';
import { syntheticAndroid, sharedData } from './avisos-compartidos-fixture';

const layouts = [[320, '200%', true], [320, '200%', false], [390, '100%', true], [1280, '100%', true]] as const;
async function resize(p: Page, font: string, dark: boolean) {
  await p.evaluate(({font,dark}) => {document.documentElement.style.fontSize=font;document.documentElement.classList.toggle('dark',dark);}, {font,dark});
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
}
async function noNativeWrites(p: Page) {
  expect(await p.evaluate(() => (window as any).__nativeCalls.filter((c: any) => ['configure','retry','clear','discard','settings','retryAutomatic','update'].includes(c.method)))).toEqual([]);
}

test('Compartidos conserva nombres completos en el desglose y permite cerrar sus formularios sin enviar', async ({page:p,baseURL},info) => {
  const writes = await syntheticAndroid(p,baseURL!);
  const errors: string[]=[];p.on('pageerror',e=>errors.push(e.message));
  const data=sharedData();
  data.gastos[0].repartos=[data.yo,data.pareja].map((m,i)=>({usuarioId:m.id,usuarioNombre:m.nombre,porcentaje:50,monto:i?49382.71:49382.72}));
  await p.route('**/api/pareja**',r=>{expect(r.request().method()).toBe('GET');return r.fulfill({json:{success:true,data:new URL(r.request().url()).pathname==='/api/pareja'?data:[]}});});
  for(const[width,font,dark]of layouts) {
    await p.setViewportSize({width,height:844});await p.goto('/pareja');
    await expect(p.getByRole('button',{name:'Registrar gasto',exact:true})).toBeVisible();await resize(p,font,dark);
    const names=p.locator('.shared-finance-page article ul li > span:first-child').filter({hasText:'persona ficticia'});
    await expect(names).toHaveCount(2);
    for(const name of await names.all()) {
      expect(await name.evaluate(e=>({clipped:e.scrollWidth>e.clientWidth+1,nowrap:getComputedStyle(e).whiteSpace==='nowrap'}))).toEqual({clipped:false,nowrap:false});
    }
    expect(await p.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
    for(const action of ['aporte','gasto','pago']) {
      const trigger=p.getByRole('button',{name:'Registrar '+action,exact:true});await trigger.click();
      const dialog=p.getByRole('dialog');await expect(dialog).toBeVisible();
      if(action==='gasto')for(const split of ['IGUAL','PARTES','PORCENTAJE','EXACTO']){await p.locator('#form-tipo').selectOption(split);await p.getByRole('button',{name:'Cancelar',exact:true}).scrollIntoViewIfNeeded();expect(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);}
      await p.getByRole('button',{name:'Cancelar',exact:true}).scrollIntoViewIfNeeded();await p.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(trigger).toBeFocused();
    }
    await p.screenshot({path:info.outputPath(`compartidos-${width}-${dark}.png`),fullPage:true});
  }
  expect(writes).toEqual([]);expect(errors).toEqual([]);await noNativeWrites(p);
});

test('Avisos amplía campos, etiquetas, título e importe y conserva el texto al cambiar de panel', async ({page:p,baseURL},info) => {
  const writes=await syntheticAndroid(p,baseURL!);
  const errors: string[]=[];p.on('pageerror',e=>errors.push(e.message));
  const notice={id:'qa-long',origen:'MANUAL',resumen:'Aviso ficticio con contenido largo para revisión de compras familiares',clase:'COMPRA',estado:'PENDIENTE',moneda:'MXN',datos:{cuentaId:11,categoriaId:null,listaId:21,tipo:'GASTO',monto:98765.43,fecha:'2026-11-14',descripcion:'Aviso ficticio con contenido largo para revisión de compras familiares'},version:1,creadoEn:'2026-11-14',transaccionId:null,coincidencias:[21]};
  await p.route('**/api/avisos?*',r=>{expect(r.request().method()).toBe('GET');return r.fulfill({json:{success:true,data:{content:[notice],totalPages:2}}});});
  for(const[width,font,dark]of layouts) {
    await p.setViewportSize({width,height:844});await p.goto('/avisos');await expect(p.locator('.row')).toHaveCount(1);await resize(p,font,dark);
    const scale=font==='200%'?2:1;
    expect(await p.locator('.row h2').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBe(17*scale);
    expect(await p.locator('.row-top strong').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBe(15*scale);
    expect(await p.locator('.row a').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBe(13*scale);
    await p.getByRole('button',{name:'Guardar movimiento',exact:true}).click();await expect(p.getByRole('dialog')).toContainText('¿Es otra operación?');await p.keyboard.press('Escape');await expect(p.getByRole('button',{name:'Guardar movimiento',exact:true})).toBeFocused();
    for(const action of ['Añadir aviso','Revisar y corregir']) {
      const trigger=p.getByRole('button',{name:action,exact:true});await trigger.click();
      const dialog=p.getByRole('dialog');
      for(const control of await dialog.locator('input,select,textarea').all())expect(await control.evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBe(16*scale);
      expect(await dialog.locator('label').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBe(14*scale);
      expect(await dialog.locator('h2').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBe(17*scale);
      await dialog.locator('[name=descripcion]').fill('Descripción ficticia local sin enviar');await dialog.locator('button[type=submit]').scrollIntoViewIfNeeded();
      expect(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);await p.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(trigger).toBeFocused();
    }
    await p.getByRole('button',{name:'Bancos y cuentas',exact:true}).click();await expect(p.locator('.metrics')).toBeVisible();await p.getByRole('button',{name:'Avisos',exact:true}).click();await expect(p.locator('.row h2')).toHaveText(notice.resumen);
    expect(await p.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);await p.screenshot({path:info.outputPath(`avisos-${width}-${dark}.png`),fullPage:true});
  }
  expect(writes).toEqual([]);expect(errors).toEqual([]);await noNativeWrites(p);
});

test('Avisos mantiene completos los botones de sección con texto ampliado', async ({page:p,baseURL}) => {
  const writes=await syntheticAndroid(p,baseURL!);
  for(const[width,font,dark]of layouts) {
    await p.setViewportSize({width,height:844});await p.goto('/avisos');await resize(p,font,dark);
    for(const button of await p.locator('.inbox-sections button').all())expect(await button.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
    const bank=p.getByRole('button',{name:'Bancos y cuentas',exact:true});await bank.focus();await p.keyboard.press('Enter');await expect(bank).toHaveAttribute('aria-pressed','true');
    const notices=p.getByRole('button',{name:'Avisos',exact:true});await notices.focus();await p.keyboard.press('Enter');await expect(notices).toHaveAttribute('aria-pressed','true');
    expect(await p.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
  }
  expect(writes).toEqual([]);await noNativeWrites(p);
});
