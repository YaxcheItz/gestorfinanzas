import {expect,test} from '@playwright/test';
import {registrarPrueba} from './registro-helper';

test.use({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block'});
test.setTimeout(90_000);
test('inicio separa deuda y monedas, y repetir crea solo un movimiento nuevo confirmado',async({page},testInfo)=>{
  await page.context().setOffline(false);
  const email=`inicio-${crypto.randomUUID()}@example.test`,password='Password123';
  const registro=await registrarPrueba(page.request,{nombre:'QA inicio',email,password});expect(registro.ok()).toBeTruthy();
  const headers={Authorization:`Bearer ${(await registro.json()).data.token}`};
  const cuenta=async(data:object)=>{const r=await page.request.post('/api/cuentas',{headers,data});expect(r.ok()).toBeTruthy();return (await r.json()).data.id as number;};
  const banco=await cuenta({nombre:'Banco',tipo:'DEBITO',moneda:'MXN',saldoInicial:1000});
  const tarjeta=await cuenta({nombre:'Tarjeta',tipo:'CREDITO',moneda:'MXN',saldoInicial:0,limiteCredito:1000,diaCorte:15,diaPago:25});
  await cuenta({nombre:'Dólares',tipo:'DEBITO',moneda:'USD',saldoInicial:100});
  const cats=await page.request.get('/api/categorias',{headers});expect(cats.ok()).toBeTruthy();
  const gastos=(await cats.json()).data.filter((c:{tipo:string;activo:boolean})=>c.tipo==='GASTO'&&c.activo);expect(gastos.length).toBeGreaterThan(1);
  const hoy=new Date(),fecha=`${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`;
  const fechaOriginal=`${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-01`;
  for(const [categoriaId,moneda,montoLimite] of [[gastos[0].id,'MXN',500],[gastos[1].id,'USD',80]]){
    const r=await page.request.post('/api/presupuestos',{headers,data:{categoriaId,moneda,montoLimite,mes:hoy.getMonth()+1,anio:hoy.getFullYear()}});expect(r.ok()).toBeTruthy();
  }
  const original=await page.request.post('/api/transacciones',{headers,data:{cuentaId:banco,categoriaId:gastos[0].id,tipo:'GASTO',monto:25,fecha:fechaOriginal,descripcion:'Cena repetible',notas:'Nota original'}});expect(original.ok()).toBeTruthy();const originalId=(await original.json()).data.id;
  const cargo=await page.request.post('/api/transacciones',{headers,data:{cuentaId:tarjeta,categoriaId:gastos[0].id,tipo:'GASTO',monto:200,fecha,descripcion:'Compra tarjeta'}});expect(cargo.ok()).toBeTruthy();
  const movimientos=async()=>{const r=await page.request.get('/api/transacciones?size=100',{headers});expect(r.ok()).toBeTruthy();return (await r.json()).data.content;};
  const antes=(await movimientos()).length;
  let posts=0;page.on('request',r=>{if(r.method()==='POST' && new URL(r.url()).pathname==='/api/transacciones')posts++;});
  await page.goto('/login');await page.locator('#email').fill(email);await page.locator('#password').fill(password);await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await expect(page).toHaveURL(/dashboard/);
  const hero=page.locator('.dashboard-screen__monthly'),budget=page.locator('.dashboard-budget-remaining');
  await expect(hero).toContainText('Dinero en cuentas');await expect(hero.locator('.dashboard-screen__amount')).toContainText(/975[.,]00/);
  await expect(hero.getByText('Deuda de tarjetas').locator('..')).toContainText(/200[.,]00/);await expect(budget).toContainText(/275[.,]00/);
  await page.getByRole('combobox',{name:'Moneda del balance'}).selectOption('USD');await expect(hero.locator('.dashboard-screen__amount')).toContainText(/100[.,]00/);await expect(budget).toContainText(/80[.,]00/);
  await page.getByRole('combobox',{name:'Moneda del balance'}).selectOption('MXN');
  await page.screenshot({path:testInfo.outputPath('inicio-movil.png'),fullPage:true});
  await page.getByRole('button',{name:'Ver detalle de Cena repetible',exact:true}).press('Enter');await expect(page).toHaveURL(/detalle=/);
  await page.getByRole('dialog',{name:'Detalle',exact:true}).getByRole('button',{name:'Repetir movimiento',exact:true}).click();
  const repeat=page.getByRole('dialog',{name:'Repetir movimiento',exact:true}),amount=repeat.locator('#quick-entry-amount');
  await expect(amount).toHaveValue('25');await expect(repeat.locator('input[name="descripcion"]')).toHaveValue('Cena repetible');
  await expect(repeat.locator('select[name="cuenta"] option:checked')).toHaveText('Banco · MXN');
  await expect(repeat.locator('.entry-summary')).toContainText(gastos[0].nombre);
  await expect(repeat.getByText(/Es un movimiento nuevo para hoy/)).toBeVisible();expect(posts).toBe(0);expect((await movimientos()).length).toBe(antes);
  await amount.fill('30');await repeat.locator('input[name="descripcion"]').fill('Cena repetida');await amount.focus();await page.setViewportSize({width:390,height:360});
  await expect(repeat.getByRole('button',{name:'Guardar gasto',exact:true})).toBeInViewport();
  await repeat.getByRole('button',{name:'Guardar gasto',exact:true}).evaluate(e=>{(e as HTMLButtonElement).click();(e as HTMLButtonElement).click();});await expect(repeat).not.toBeVisible();
  expect(posts).toBe(1);const despues=await movimientos();expect(despues.length).toBe(antes+1);
  const copia=despues.find((m:{descripcion:string})=>m.descripcion==='Cena repetida');expect(copia).toMatchObject({monto:30,cuentaId:banco,categoriaId:gastos[0].id,fecha,notas:'Nota original'});expect(copia.id).not.toBe(originalId);
  expect(despues.find((m:{id:number})=>m.id===originalId)).toMatchObject({monto:25,fecha:fechaOriginal,descripcion:'Cena repetible'});
  await page.setViewportSize({width:390,height:844});await page.getByRole('link',{name:'Inicio',exact:true}).click();await expect(budget).toContainText(/245[.,]00/);
  await page.route('**/api/dashboard/analitica**',r=>r.fulfill({status:503,json:{success:false}}));
  await page.getByRole('button',{name:'Actualizar resumen'}).click();await expect(page.getByText('No pudimos cargar la distribución de gastos.',{exact:true})).toBeVisible();
  await page.unroute('**/api/dashboard/analitica**');await page.getByRole('button',{name:'Actualizar resumen'}).click();
  await expect(page.getByText('No pudimos cargar la distribución de gastos.',{exact:true})).not.toBeVisible();
  for(const viewport of [{width:320,height:568},{width:568,height:320},{width:1440,height:900}]){await page.setViewportSize(viewport);await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
});
