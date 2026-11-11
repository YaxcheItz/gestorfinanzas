import { expect, test } from '@playwright/test';

test('accesos separan voz y escritura y llevan herramientas a ajustes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('finanzas_token', `test.${btoa(JSON.stringify({ exp: Math.floor(Date.now()/1000)+3600 }))}.synthetic`);
    localStorage.setItem('finanzas_user', JSON.stringify({ id: 998, nombre: 'Prueba', email: 'prueba@example.test' }));
  });
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const data = path === '/api/perfil' ? { id: 998, nombre: 'Prueba', email: 'prueba@example.test', tema: 'CLARO', monedaPredeterminada: 'MXN' } : [];
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/dashboard');
  const search = page.getByRole('button', { name: 'Buscar movimientos', exact: true });
  const pencil = page.locator('.capture-dock__manual');
  const mic = page.locator('.capture-dock__voice');
  const [a,b,c] = await Promise.all([search.boundingBox(),pencil.boundingBox(),mic.boundingBox()]);
  expect(a!.x).toBeLessThan(b!.x); expect(b!.x + b!.width).toBeLessThan(c!.x);
  await mic.click();
  const voice = page.getByRole('dialog', { name: 'Cuéntame tu movimiento' });
  await expect(voice).toBeVisible();
  await voice.getByRole('button', { name: 'Iniciar grabación' }).click();
  await expect(voice.getByRole('button', { name: 'Permitir audio y grabar' })).toBeVisible();
  await expect(voice.getByRole('button', { name: 'Prefiero escribir' })).toHaveCount(0);
  await voice.getByRole('button', { name: 'Cerrar voz' }).click();
  await pencil.click();
  await expect(page.locator('#quick-capture-panel')).toBeVisible();
  await expect(page.getByText('Cuéntame tu movimiento')).toBeVisible();
  await page.locator('#quick-capture-panel').getByRole('button', { name: 'Cerrar', exact: true }).click();
  await page.getByRole('button', { name: 'Cambiar lista' }).click();
  await expect(page.getByRole('button', { name: /^Herramientas/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Cerrar listas' }).click();
  await page.getByRole('link', { name: 'Configuración', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Reportes', exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Presupuestos', exact: false })).toBeVisible();
});

test('voz revisada guarda una vez sin enviar el texto al chat', async ({ page }) => {
  test.setTimeout(45000);
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(() => {
    localStorage.setItem('finanzas_token', `test.${btoa(JSON.stringify({ exp: Math.floor(Date.now()/1000)+3600 }))}.synthetic`);
    localStorage.setItem('finanzas_user', JSON.stringify({id:998,nombre:'Prueba',email:'prueba@example.test'}));
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {value:async () => {
      const audio = new AudioContext(); const oscillator = audio.createOscillator(); const output = audio.createMediaStreamDestination();
      oscillator.connect(output); oscillator.start(); return output.stream;
    }});
  });
  let transcripciones=0, guardados=0;
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if(path.endsWith('/asistente/voz/transcribir')) {transcripciones++; await route.fulfill({json:{success:true,data:transcripciones===1?'Texto provisional':'Texto final ficticio'}}); return;}
    if(path.endsWith('/asistente/captura-rapida')) {await route.fulfill({json:{success:true,data:{answer:'Propuesta',engine:'REGLAS',actions:[{id:'voz-sintetica',type:'CREATE_TRANSACTION',version:0,summary:'Gasto ficticio',data:{tipo:'GASTO',monto:50,cuentaId:1,categoriaId:10,fecha:'2026-11-05'}}]}}});return;}
    if(path.includes('/confirmar')) {guardados++; await route.fulfill({json:{success:true,data:{completed:true}}});return;}
    const data = path === '/api/perfil' ? {id:998,nombre:'Prueba',email:'prueba@example.test',tema:'CLARO',monedaPredeterminada:'MXN'} : path === '/api/cuentas' ? [{id:1,nombre:'Efectivo',activo:true,tipo:'EFECTIVO',moneda:'MXN'}] : path === '/api/categorias' ? [{id:10,nombre:'Comida',tipo:'GASTO',activo:true,esPersonalizada:true}] : [];
    await route.fulfill({json:{success:true,data}});
  });
  await page.goto('/dashboard'); await page.locator('.capture-dock__voice').click();
  const voice=page.locator('#voice-screen'); await voice.getByRole('button',{name:'Iniciar grabación'}).click();
  await voice.getByRole('button',{name:'Permitir audio y grabar'}).click();
  await expect(voice.getByLabel('Transcripción provisional')).toHaveText('Texto provisional',{timeout:20000});
  await voice.getByRole('button',{name:'Detener grabación'}).click();
  const texto=voice.locator('#voice-transcript');
  await expect(texto).toHaveValue('Texto final ficticio',{timeout:10000});
  await texto.fill('Gasté 50 en tacos');
  await expect(page.locator('#quick-capture-panel')).toBeHidden();
  await voice.getByRole('button',{name:'Continuar con este texto'}).click();
  await expect(voice.getByText('Movimiento guardado.')).toBeVisible();
  await expect(voice.getByRole('button',{name:'Revisar movimientos'})).toBeVisible();
  await expect(page.locator('#quick-capture-panel')).toBeHidden();
  expect(transcripciones).toBe(2); expect(guardados).toBe(1);
});
