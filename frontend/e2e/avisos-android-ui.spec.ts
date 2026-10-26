import { expect, test, Page } from '@playwright/test';
import { readPageGeometry } from './geometry-helper';

async function syntheticAndroid(page: Page, baseURL: string, dark = false, privacy = false) {
  expect(new URL(baseURL).hostname).toBe('localhost');
  const writes: string[] = [];
  await page.addInitScript(({ dark, privacy }) => {
    const w = window as any;
    localStorage.setItem('finanzas_token', `qa.${btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))}.synthetic`);
    localStorage.setItem('finanzas_user', JSON.stringify({id:995,nombre:'Prueba de interfaz',email:'ui@example.test'}));
    localStorage.setItem('kaptal_ocultar_montos_995', String(privacy));
    const methods = ['read','consume','update','configure','clear','apps','settings','retryAutomatic','discard','getInfo','getLaunchUrl','removeListener','removeAllListeners'];
    const rules = [
      {proveedor:'SANTANDER',cuentaId:11,listaId:21,terminacion:null,paquete:'mx.bancosantander.supermovil'},
      ...['1234','5678'].map(terminacion=>({proveedor:'SEARS',cuentaId:12,listaId:21,terminacion,paquete:'com.google.android.apps.messaging',remitente:'QA'})),
    ];
    const notices = [{id:'qa-1',revision:1,at:Date.now(),text:'Aviso sintético',packageName:'mx.bancosantander.supermovil',automaticStatus:'ready',automaticVersion:'qa-v1',canRetry:true},
      {id:'qa-2',revision:1,at:Date.now(),text:'Aviso sintético',packageName:'com.google.android.apps.messaging',automaticStatus:'card_mismatch',automaticVersion:'qa-v1',canRetry:false}];
    w.__nativeCalls=[];
    w.CapacitorCustomPlatform={name:'android'};
    w.Capacitor={
      PluginHeaders:['NativeSession','AutomaticBank','BankNotifications','AppLock','ScreenPrivacy','SharedNotice','CaptureAction','App'].map(name=>({name,methods:[...methods.map(name=>({name,rtype:'promise'})),{name:'addListener',rtype:'callback'}]})),
      nativeCallback:()=> 'qa-listener',
      nativePromise:async (plugin:string,method:string,options:any)=>{
        w.__nativeCalls.push({plugin,method,options});
        if(plugin==='NativeSession'&&method==='read')return {closed:false,userId:995};
        if(plugin==='AppLock')return {enabled:false,supported:true,available:true};
        if(plugin==='ScreenPrivacy')return {enabled:false,supported:true};
        if(plugin==='AutomaticBank')return {deviceId:'synthetic-device',active:true,queued:1,registered:2,review:privacy?1:0,rules,
          reviews:privacy?[{eventoId:'qa-review',fecha:'2026-10-26',descripcion:'Compra QA 27',monto:25.1,moneda:'MXN'}]:[]};
        if(plugin==='BankNotifications'){
          if(method==='retryAutomatic'){notices[0].automaticStatus='queued';notices[0].canRetry=false;return {};}
          if(method==='apps')return {apps:[{packageName:'com.google.android.apps.messaging',label:'Mensajes QA'}]};
          return {granted:true,enabled:true,packages:['mx.bancosantander.supermovil','com.google.android.apps.messaging'],notices,omitted:0};
        }
        return {};
      },
    };
  }, { dark, privacy });
  await page.route('**/*', async route => {
    const request=route.request(), url=new URL(request.url());
    if(!url.pathname.startsWith('/api/'))return url.origin===new URL(baseURL).origin ? route.continue() : route.abort();
    if(request.method()!=='GET')writes.push(url.pathname);
    let data: unknown = [];
    if(url.pathname.endsWith('/perfil'))data={id:995,nombre:'Prueba de interfaz',email:'ui@example.test',tema:dark?'OSCURO':'CLARO',monedaPredeterminada:'MXN',ocultarMontos:privacy};
    if(url.pathname.endsWith('/avisos'))data={content:[],totalPages:0};
    if(url.pathname.endsWith('/cuentas'))data=[{id:11,nombre:'Crédito QA',tipo:'CREDITO',moneda:'MXN',activo:true},{id:12,nombre:'Sears QA',tipo:'CREDITO',moneda:'MXN',activo:true}];
    if(url.pathname.endsWith('/listas'))data=[{id:21,nombre:'Personal QA',moneda:'MXN',personal:true,rol:'PROPIETARIO',archivada:false,miembros:[]}];
    await route.fulfill({json:{success:true,data}});
  });
  await page.goto('/avisos');
  await page.evaluate(dark=>document.documentElement.classList.toggle('dark',dark),dark);
  await expect(page.getByText('Registro activo',{exact:true})).toBeVisible();
  return writes;
}

test('una compra pendiente usa el original nativo y no el guardado manual', async ({page,baseURL})=>{
  const writes=await syntheticAndroid(page,baseURL!);
  await expect(page.getByText('Sears Visa · 2 tarjetas',{exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'No hay revisiones pendientes'})).toBeVisible();
  await page.getByRole('button',{name:'Registrar con la cuenta asociada',exact:true}).click();
  await expect(page.getByText('Enviando',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Registrar con la cuenta asociada',exact:true})).toHaveCount(0);
  const calls=await page.evaluate(()=>(window as any).__nativeCalls.filter((c:any)=>c.method==='retryAutomatic'));
  expect(calls).toEqual([{plugin:'BankNotifications',method:'retryAutomatic',options:{userId:995,id:'qa-1',revision:1,automaticVersion:'qa-v1'}}]);
  expect(writes).toEqual([]);
});

test('ocultar montos protege los envíos para revisión también en el lector de pantalla', async ({page,baseURL})=>{
  const writes=await syntheticAndroid(page,baseURL!,false,true);
  const summary=page.getByRole('region',{name:'Tus compras, en su cuenta'});
  await expect(summary).not.toContainText('25.1');
  await expect(summary).toContainText('Compra QA •••');
  expect(await summary.ariaSnapshot()).not.toMatch(/25[.,]10?|QA 27/);
  expect(writes).toEqual([]);
});

for(const dark of [false,true]) {
  test(`avisos y asociaciones se leen sin desbordes, tema ${dark?'oscuro':'claro'}`,async({page,baseURL},testInfo)=>{
    await page.setViewportSize({width:390,height:844});
    const writes=await syntheticAndroid(page,baseURL!,dark);
    await page.screenshot({path:testInfo.outputPath('avisos-sinteticos.png'),fullPage:true});
    await page.getByText('Registrar compras automáticamente · Administrar bancos',{exact:true}).click();
    await expect(page.getByLabel('Cuenta de destino · Sears Visa',{exact:true})).toHaveValue(/12$/);
    await expect(page.getByLabel('Últimos cuatro dígitos (opcionales) · Santander',{exact:true})).toBeVisible();
    await expect(page.getByLabel('Terminaciones Sears (obligatorias)')).toHaveValue('1234, 5678');
    for(const size of [{width:320,height:740},{width:844,height:390}]) {
      await page.setViewportSize(size);
      const geometry=await page.evaluate(readPageGeometry);
      expect(geometry,JSON.stringify(geometry)).toMatchObject({fits:true,elements:[],texts:[]});
    }
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:testInfo.outputPath('asociaciones-sinteticas.png'),fullPage:true});
    await page.addStyleTag({content:'html{font-size:200% !important}'});
    const enlarged=await page.evaluate(readPageGeometry);
    expect(enlarged,JSON.stringify(enlarged)).toMatchObject({fits:true,elements:[],texts:[]});
    expect(writes).toEqual([]);
  });
}
