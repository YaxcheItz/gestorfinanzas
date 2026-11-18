import { expect, test } from '@playwright/test';

import { syntheticAndroid } from './avisos-compartidos-fixture';

test('avisos y asociaciones Android con datos ficticios',async({page,baseURL},info)=>{
 await page.setViewportSize({width:320,height:844});const writes=await syntheticAndroid(page,baseURL!);
 await page.screenshot({path:info.outputPath('avisos.png'),fullPage:true});
 await page.getByRole('button',{name:'Bancos y cuentas',exact:true}).click();
 await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 await expect(page.locator('.metrics')).toBeVisible();expect(await page.locator('.metrics').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length)).toBe(1);
 await page.screenshot({path:info.outputPath('asociaciones-200.png'),fullPage:true});
 await page.getByRole('button',{name:'Avisos',exact:true}).click();
 await page.screenshot({path:info.outputPath('avisos-200.png'),fullPage:true});
 await page.getByRole('button',{name:'Añadir aviso',exact:true}).click();await page.getByRole('dialog').waitFor();
 await page.screenshot({path:info.outputPath('aviso-formulario-200.png')});
 await page.getByRole('button',{name:'Cerrar aviso'}).click();expect(writes).toEqual([]);
});
test('gastos en pareja vacío, poblado y error sin escribir operaciones',async({page,baseURL},info)=>{
 await page.setViewportSize({width:320,height:844});const writes=await syntheticAndroid(page,baseURL!);
 let mode='empty';
 const yo={id:995,nombre:'Persona ficticia con un nombre largo para comprobar legibilidad',email:'qa@example.test',aportado:150000,consumido:98765.43,pagado:2000,cobrado:0,saldo:53234.57};
 const otra={id:996,nombre:'Segunda persona ficticia con un nombre extenso',email:'otra@example.test',aportado:100000,consumido:50000,pagado:0,cobrado:2000,saldo:48000};
 const populated={id:41,activa:true,moneda:'MXN',fechaCreacion:'2026-11-01',yo,pareja:otra,resumen:{fondoDisponible:101234.57,totalAportado:250000,totalGastado:148765.43,cantidadAportes:1,cantidadGastos:1,cantidadPagos:1,idQuienDebe:995,montoDeuda:2000},aportes:[{id:1,usuarioId:995,usuarioNombre:yo.nombre,monto:150000,moneda:'MXN',fecha:'2026-11-11',notas:'Aporte ficticio para gastos del hogar',fechaCreacion:'2026-11-11'}],gastos:[{id:2,pagadoPorId:995,pagadoPorNombre:yo.nombre,monto:98765.43,moneda:'MXN',fecha:'2026-11-11',descripcion:'Compra ficticia con descripción larga para comprobar la distribución del fondo compartido',tipoReparto:'IGUAL',repartos:[],miParte:49382.715,fechaCreacion:'2026-11-11'}],pagos:[{id:3,pagadorId:995,pagadorNombre:yo.nombre,beneficiarioId:996,beneficiarioNombre:otra.nombre,monto:2000,moneda:'MXN',fecha:'2026-11-11',notas:'Pago ficticio de prueba',fechaCreacion:'2026-11-11'}]};
 await page.route('**/api/pareja**',async route=>{
  expect(route.request().method()).toBe('GET');const url=new URL(route.request().url());
  if(url.pathname!=='/api/pareja')return route.fulfill({json:{success:true,data:[]}});
  if(mode==='error')return route.fulfill({status:503,json:{success:false,message:'Error ficticio al cargar el fondo'}});
  return route.fulfill({json:{success:true,data:mode==='empty'?null:populated}});
 });
 await page.goto('/pareja');await expect(page.getByRole('heading',{name:'Invita a tu pareja'})).toBeVisible();
 await page.screenshot({path:info.outputPath('pareja-vacio.png'),fullPage:true});
 mode='populated';await page.reload();await expect(page.getByRole('button',{name:'Registrar aporte'})).toBeVisible();
 await page.screenshot({path:info.outputPath('pareja-poblado.png'),fullPage:true});
 await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(320);
 await page.screenshot({path:info.outputPath('pareja-200.png'),fullPage:true});
 await page.getByRole('button',{name:'Registrar gasto',exact:true}).click();await page.getByRole('dialog').waitFor();
 await page.getByRole('button',{name:'Cancelar',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('pareja-formulario-200.png')});await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
 mode='error';await page.reload();await expect(page.getByRole('alert')).toContainText('Error ficticio');expect(writes).toEqual([]);
});
