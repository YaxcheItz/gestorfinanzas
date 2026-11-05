import { expect, test } from '@playwright/test';
import { registrarPrueba } from './registro-helper';

test('captura ficticia reconoce categoria personal, Amex y etiqueta sin duplicar la confirmacion', async ({page, baseURL}) => {
  expect(['localhost','127.0.0.1']).toContain(new URL(baseURL!).hostname);
  const registro=await registrarPrueba(page.request,{nombre:'Prueba local',email:`captura-${crypto.randomUUID()}@example.test`,password:'Password123'});
  expect(registro.ok()).toBeTruthy();
  const headers={Authorization:`Bearer ${(await registro.json()).data.token}`};
  const cuenta=await page.request.post('/api/cuentas',{headers,data:{nombre:'American Express',tipo:'DEBITO',moneda:'MXN',saldoInicial:0}});
  expect(cuenta.ok()).toBeTruthy(); const cuentaId=(await cuenta.json()).data.id;
  const categoria=await page.request.post('/api/categorias',{headers,data:{nombre:'Comida',tipo:'GASTO',icono:'utensils',color:'#ef4444'}});
  expect(categoria.ok()).toBeTruthy(); const categoriaId=(await categoria.json()).data.id;
  const captura=await page.request.post('/api/asistente/captura-rapida',{headers,data:{content:'Pague 50 en restaurantes con Amex con etiqueta ensayo',consentimientoDatosFinancieros:false,capturaPorVoz:true}});
  expect(captura.ok()).toBeTruthy(); const resultado=(await captura.json()).data;
  expect(resultado.engine).toBe('REGLAS'); const propuesta=resultado.actions?.[0] ?? resultado.action;
  expect(propuesta.data).toMatchObject({tipo:'GASTO',monto:50,cuentaId,categoriaId,etiquetas:['ensayo'],metodoCaptura:'VOZ'});
  const confirmar=()=>page.request.post(`/api/asistente/acciones/${propuesta.id}/confirmar`,{headers,data:{version:propuesta.version}});
  expect((await confirmar()).ok()).toBeTruthy(); expect((await confirmar()).ok()).toBeTruthy();
  const movimientos=await page.request.get('/api/transacciones',{headers}); expect(movimientos.ok()).toBeTruthy();
  const data=(await movimientos.json()).data; const lista=Array.isArray(data)?data:data.content;
  expect(lista.filter((m:{descripcion:string})=>m.descripcion?.includes('restaurantes'))).toHaveLength(1);
});

test('voz simulada guarda la frase revisada en backend local sin enviar al chat', async ({page,baseURL}) => {
  test.setTimeout(90000);
  expect(['localhost','127.0.0.1']).toContain(new URL(baseURL!).hostname);
  const email=`voz-integral-${crypto.randomUUID()}@example.test`;
  const registro=await registrarPrueba(page.request,{nombre:'Prueba local',email,password:'Password123'});
  expect(registro.ok()).toBeTruthy();
  const headers={Authorization:`Bearer ${(await registro.json()).data.token}`};
  const cuenta=await page.request.post('/api/cuentas',{headers,data:{nombre:'American Express',tipo:'DEBITO',moneda:'MXN',saldoInicial:0}});
  expect(cuenta.ok()).toBeTruthy(); const cuentaId=(await cuenta.json()).data.id;
  const categoria=await page.request.post('/api/categorias',{headers,data:{nombre:'Comida',tipo:'GASTO',icono:'utensils',color:'#ef4444'}});
  expect(categoria.ok()).toBeTruthy(); const categoriaId=(await categoria.json()).data.id;
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{
      const audio=new AudioContext(), oscilador=audio.createOscillator(), salida=audio.createMediaStreamDestination();
      oscilador.connect(salida); oscilador.start(); return salida.stream;
    }});
  });
  await page.route('**/api/asistente/voz/transcribir',route=>route.fulfill({json:{success:true,data:'Pague 50 en restaurantes con Amex con etiqueta ensayo'}}));
  await page.goto('/login'); await page.locator('#email').fill(email); await page.locator('#password').fill('Password123');
  await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click(); await expect(page).toHaveURL(/dashboard/);
  await page.locator('.capture-dock__voice').click(); const voz=page.locator('#voice-screen');
  await voz.getByRole('button',{name:'Iniciar grabación'}).click();
  await voz.getByRole('button',{name:'Permitir audio y grabar'}).click();
  await expect(voz.getByRole('button',{name:'Detener grabación'})).toBeVisible();
  await page.waitForTimeout(1200); await voz.getByRole('button',{name:'Detener grabación'}).click();
  await expect(voz.locator('#voice-transcript')).toHaveValue('Pague 50 en restaurantes con Amex con etiqueta ensayo',{timeout:10000});
  await voz.getByRole('button',{name:'Continuar con este texto'}).click();
  await expect(voz.getByText('Movimiento guardado.')).toBeVisible({timeout:15000});
  await expect(page.locator('#quick-capture-panel')).toBeHidden();
  const respuesta=await page.request.get('/api/transacciones',{headers}); expect(respuesta.ok()).toBeTruthy();
  const data=(await respuesta.json()).data; const lista=Array.isArray(data)?data:data.content;
  const encontrados=lista.filter((m:{descripcion:string})=>m.descripcion?.includes('restaurantes'));
  expect(encontrados).toHaveLength(1);
  expect(encontrados[0]).toMatchObject({cuentaId,categoriaId,monto:50,etiquetas:['ensayo']});
});
