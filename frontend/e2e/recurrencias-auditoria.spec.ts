import { expect, test } from '@playwright/test';
import { registrarPrueba } from './registro-helper';

test.use({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block'});
test.setTimeout(120_000);

test('recurrencias: registrar, editar alcances, pausar y eliminar conserva el historial y el saldo', async ({page}) => {
  const email=`recurrencias-${crypto.randomUUID()}@example.test`,password='Password123';
  const registro=await registrarPrueba(page.request,{nombre:'QA Recurrencias',email,password});
  expect(registro.ok()).toBeTruthy();
  const headers={Authorization:`Bearer ${(await registro.json()).data.token}`};
  const consultar=async(path:string)=>{
    const r=await page.request.get(`/api/${path}`,{headers});expect(r.ok()).toBeTruthy();return (await r.json()).data;
  };
  const cuenta=await page.request.post('/api/cuentas',{headers,data:{nombre:'Banco QA Serie',tipo:'DEBITO',moneda:'MXN',saldoInicial:1000}});
  expect(cuenta.ok()).toBeTruthy();const cuentaId=(await cuenta.json()).data.id;
  const categoria=(await consultar('categorias')).find((c:{tipo:string})=>c.tipo==='GASTO');
  const hoy=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const [year,month]=hoy.split('-').map(Number);
  const anterior=new Date(year,month-2,1);
  const fecha=`${anterior.getFullYear()}-${String(anterior.getMonth()+1).padStart(2,'0')}-01`;
  const movimiento=await page.request.post('/api/transacciones',{headers,data:{cuentaId,categoriaId:categoria.id,tipo:'GASTO',monto:25,fecha,descripcion:'Serie auditoría',notas:'Nota inicial',frecuenciaRecurrencia:'MENSUAL',siguienteFechaRecurrencia:hoy}});
  expect(movimiento.ok()).toBeTruthy();const original=(await movimiento.json()).data;
  await page.goto('/login');await page.locator('#email').fill(email);await page.locator('#password').fill(password);
  await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await expect(page).toHaveURL(/dashboard/);
  await page.goto('/configuracion#recurring');
  const serie=page.locator('#recurring article');
  await serie.getByRole('button',{name:'Pausar',exact:true}).click();
  await expect(serie).toContainText('En pausa');
  await expect(serie.getByRole('button',{name:'Registrar ahora',exact:true})).toHaveCount(0);
  await serie.getByRole('button',{name:'Reanudar',exact:true}).click();
  await serie.getByRole('button',{name:'Registrar ahora',exact:true}).click();
  await expect(serie.getByRole('button',{name:'Registrar ahora',exact:true})).toHaveCount(0);
  const movimientos=async()=> (await consultar('transacciones?size=100')).content.filter((m:{tipo:string})=>m.tipo==='GASTO');
  expect(await movimientos()).toHaveLength(2);
  await page.goto('/transacciones');
  for (const [modo,nota,label] of [['TODA_LA_SERIE','Toda la serie QA','Toda la serie'],['ESTA_Y_SIGUIENTES','Futuros QA','Este y los siguientes'],['SOLO_ESTA','Individual QA','Solo este movimiento']]) {
    await page.getByRole('button',{name:'Ver detalle de Serie auditoría',exact:true}).click();
    await page.getByRole('dialog',{name:'Detalle',exact:true}).getByRole('button',{name:'Editar',exact:true}).click();
    const edit=page.getByRole('dialog',{name:'Editar movimiento',exact:true});
    await edit.getByRole('radio',{name:new RegExp(`^${label}`)}).check();
    await edit.locator('#notas').fill(nota);
    await edit.getByRole('button',{name:'Guardar cambios',exact:true}).click();await expect(edit).not.toBeVisible();
    const items=await movimientos();
    expect(items.find((m:{id:number})=>m.id===original.id).notas).toBe(nota);
    expect(items.find((m:{id:number})=>m.id!==original.id).notas).toBe('Toda la serie QA');
    expect((await consultar('recurrencias'))[0].notas).toBe(modo==='SOLO_ESTA'?'Futuros QA':nota);
  }
  await page.goto('/configuracion#recurring');
  await serie.getByRole('button',{name:'Eliminar',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Eliminar plantilla',exact:true}).click();
  await expect(serie).toHaveCount(0);
  expect(await consultar('recurrencias')).toHaveLength(0);
  expect(await movimientos()).toHaveLength(2);
  expect((await consultar('cuentas')).find((c:{id:number})=>c.id===cuentaId).saldoActual).toBe(950);
});
