import { expect, test, Page } from '@playwright/test';

async function syntheticAndroid(page: Page, baseURL: string, dark = false, privacy = false, recovery = false, noPending = false) {
  expect(new URL(baseURL).hostname).toBe('localhost');
  const writes: string[] = [];
  await page.addInitScript(({ dark, privacy, recovery, noPending }) => {
    const w = window as any;
    localStorage.setItem('finanzas_token', `qa.${btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))}.synthetic`);
    localStorage.setItem('finanzas_user', JSON.stringify({id:995,nombre:'Prueba de interfaz',email:'ui@example.test'}));
    localStorage.setItem('kaptal_ocultar_montos_995', String(privacy));
    const methods = ['read','consume','update','configure','clear','validate','retry','apps','settings','retryAutomatic','discard','getInfo','getLaunchUrl','removeListener','removeAllListeners'];
    const rules = [
      {id:'qa-rule-santander',proveedor:'SANTANDER',cuentaId:11,listaId:21,terminacion:null,paquete:'mx.bancosantander.supermovil'},
      {id:'qa-rule-revolut',proveedor:'REVOLUT',cuentaId:13,listaId:21,terminacion:null,paquete:'com.revolut.revolut',ingresosMxn:false},
      {id:'qa-rule-amex',proveedor:'AMEX',cuentaId:14,listaId:21,terminacion:null,paquete:'com.americanexpress.android.acctsvcs.mx'},
      ...['1234','5678'].map(terminacion=>({id:'qa-rule-sears-'+terminacion,proveedor:'SEARS',cuentaId:12,listaId:21,terminacion,paquete:'com.google.android.apps.messaging',remitente:'QA'})),
    ];
    const notices = [{id:'qa-1',revision:1,at:Date.now(),text:'Aviso sintético',packageName:'mx.bancosantander.supermovil',automaticStatus:'ready',automaticVersion:'qa-v1',canRetry:true},
      {id:'qa-2',revision:1,at:Date.now(),text:'Aviso sintético',packageName:'com.google.android.apps.messaging',automaticStatus:'card_mismatch',automaticVersion:'qa-v1',canRetry:false}];
    w.__nativeCalls=[];
    let active=!recovery,queued=noPending?0:1,registered=2;
    w.CapacitorCustomPlatform={name:'android'};
    w.Capacitor={
      PluginHeaders:['NativeSession','AutomaticBank','BankNotifications','AppLock','ScreenPrivacy','SharedNotice','CaptureAction','App'].map(name=>({name,methods:[...methods.map(name=>({name,rtype:'promise'})),{name:'addListener',rtype:'callback'}]})),
      nativeCallback:()=> 'qa-listener',
      nativePromise:async (plugin:string,method:string,options:any)=>{
        w.__nativeCalls.push({plugin,method,options});
        if(plugin==='NativeSession'&&method==='read')return {closed:false,userId:995};
        if(plugin==='AppLock')return {enabled:false,supported:true,available:true};
        if(plugin==='ScreenPrivacy')return {enabled:false,supported:true};
        if(plugin==='AutomaticBank'){
          if(method==='validate')return {};
          if(method==='configure'){active=true;rules.splice(0,rules.length,...options.credential.reglas);return {};}
          if(method==='retry'){queued=0;registered++;return {};}
          return {deviceId:'synthetic-device',active,queued,registered,review:privacy?1:0,rules,reason:active?'':'reconnect',
            entries:recovery?[{id:'qa-queued',proveedor:'SANTANDER',cuentaId:11,status:queued?'queued':'registered',descripcion:'Compra QA 27',monto:25.1,moneda:'MXN',fecha:'2026-10-26'}]:[],
            reviews:privacy?[{eventoId:'qa-review',fecha:'2026-10-26',descripcion:'Compra QA 27',monto:25.1,moneda:'MXN'}]:[]};
        }
        if(plugin==='BankNotifications'){
          if(method==='retryAutomatic'){notices[0].automaticStatus='queued';notices[0].canRetry=false;return {};}
          if(method==='apps')return {apps:[{packageName:'com.google.android.apps.messaging',label:'Mensajes QA'}, {packageName:'test.banco.arbol',label:'Banco Árbol QA'}]};
          return {granted:true,enabled:true,packages:['mx.bancosantander.supermovil','com.google.android.apps.messaging'],notices,omitted:0};
        }
        return {};
      },
    };
  }, { dark, privacy, recovery, noPending });
  await page.route('**/*', async route => {
    const request=route.request(), url=new URL(request.url());
    if(!url.pathname.startsWith('/api/'))return url.origin===new URL(baseURL).origin ? route.continue() : route.abort();
    if(request.method()!=='GET')writes.push(url.pathname);
    let data: unknown = [];
    if(url.pathname.endsWith('/perfil'))data={id:995,nombre:'Prueba de interfaz',email:'ui@example.test',tema:dark?'OSCURO':'CLARO',monedaPredeterminada:'MXN',ocultarMontos:privacy};
    if(url.pathname.endsWith('/avisos'))data={content:[],totalPages:0};
    if(url.pathname.endsWith('/cuentas'))data=[{id:11,nombre:'Crédito QA',tipo:'CREDITO',moneda:'MXN',activo:true},{id:12,nombre:'Sears QA',tipo:'CREDITO',moneda:'MXN',activo:true},{id:13,nombre:'Débito QA',tipo:'DEBITO',moneda:'MXN',activo:true},{id:14,nombre:'Amex QA',tipo:'CREDITO',moneda:'MXN',activo:true}];
    if(url.pathname.endsWith('/listas'))data=[{id:21,nombre:'Personal QA',moneda:'MXN',personal:true,rol:'PROPIETARIO',archivada:false,miembros:[]}];
    if(url.pathname.endsWith('/automatizacion/android'))data={id:'qa-credential',clave:'synthetic-key',vence:'2027-01-01T00:00:00Z',reglas:request.postDataJSON().reglas};
    await route.fulfill({json:{success:true,data}});
  });
  await page.goto('/avisos');
  await page.evaluate(()=>document.fonts.ready.then(()=>undefined));
  await page.evaluate(dark=>document.documentElement.classList.toggle('dark',dark),dark);
  await page.getByRole('button',{name:'Bancos y cuentas',exact:true}).click();
  await expect(page.getByText(recovery?'Desactivado':'Registro activo',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Avisos',exact:true}).click();
  return writes;
}


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
