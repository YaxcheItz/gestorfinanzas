import { createServer } from 'node:http';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(new URL('../../frontend/package.json',import.meta.url));
const {chromium,expect}=require('@playwright/test');
const root=fileURLToPath(new URL('../../frontend/dist/frontend/browser/',import.meta.url));
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml',
  '.png':'image/png','.woff2':'font/woff2','.json':'application/json'};
const server=createServer(async(request,response) => {
  try {
    let archivo=resolve(root,'.'+decodeURIComponent(new URL(request.url,'http://localhost').pathname));
    if(archivo!==resolve(root)&&!archivo.startsWith(resolve(root)+sep)){response.writeHead(403).end();return;}
    if(!(await stat(archivo).catch(()=>null))?.isFile()) archivo=resolve(root,'index.html');
    response.writeHead(200,{'Content-Type':mime[extname(archivo)]??'application/octet-stream','Cache-Control':'no-store'});
    response.end(await readFile(archivo));
  }catch{response.writeHead(500).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true});
const resultados=[];
const ana={id:991,nombre:'Ana',email:'ana@example.test'};
const luis={id:992,nombre:'Luis',email:'luis@example.test'};
try {
  for(const escenario of [{width:360,dark:false},{width:390,dark:true},{width:1280,dark:false},{width:844,height:390,dark:false}]){
    let invitada=false,activa=false,archivada=false,aceptaciones=0;
    const aportes=[],gastos=[],pagos=[],pagosEnviados=[],escriturasPersonales=[],errores=[];
    const moneda='MXN',fecha='2026-10-06',fechaCreacion='2026-10-06T12:00:00';
    const invitacion=usuario=>({id:100,remitenteNombre:ana.nombre,remitenteEmail:ana.email,
      destinatarioEmail:luis.email,moneda,recibida:usuario.id===luis.id,fechaCreacion});
    const suma=(lista,campo,id)=>lista.filter(p=>p[campo]===id).reduce((total,p)=>total+p.monto,0);
    const miembro=usuario=>{
      const aportado=suma(aportes,'usuarioId',usuario.id);
      const consumido=gastos.flatMap(g=>g.repartos).filter(p=>p.usuarioId===usuario.id).reduce((s,p)=>s+p.monto,0);
      const pagado=suma(pagos,'pagadorId',usuario.id),cobrado=suma(pagos,'beneficiarioId',usuario.id);
      return {...usuario,aportado,consumido,pagado,cobrado,saldo:aportado+pagado-cobrado-consumido};
    };
    const estado=usuario=>{
      const otro=usuario.id===ana.id?luis:ana;
      const yo=miembro(usuario),pareja=miembro(otro);
      const totalAportado=aportes.reduce((s,p)=>s+p.monto,0),totalGastado=gastos.reduce((s,g)=>s+g.monto,0);
      const fondoDisponible=totalAportado-totalGastado;
      const deudor=fondoDisponible>=0?[yo,pareja].find(p=>p.saldo<0):null;
      return {id:100,moneda,fechaCreacion,activa,yo,pareja,
        resumen:{totalAportado,totalGastado,fondoDisponible,cantidadAportes:aportes.length,cantidadGastos:gastos.length,
          cantidadPagos:pagos.length,idQuienDebe:deudor?.id??null,montoDeuda:deudor?-deudor.saldo:0},
        aportes,gastos:gastos.map(g=>({...g,miParte:g.repartos.find(p=>p.usuarioId===usuario.id).monto})),pagos};
    };
    const contextos=[];
    const paginas=[];
    for(const usuario of [ana,luis]){
      const context=await browser.newContext({viewport:{width:escenario.width,height:escenario.height??900},
        serviceWorkers:'block',reducedMotion:'reduce',colorScheme:escenario.dark?'dark':'light'});
      contextos.push(context);
      await context.addInitScript(usuario=>{
        localStorage.setItem('finanzas_user',JSON.stringify(usuario));
        localStorage.setItem('finanzas_token',`e30.${btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600,sub:usuario.email}))}.synthetic`);
      },usuario);
      await context.route('**/runtime-config.js',route=>route.fulfill({contentType:'text/javascript',body:'window.__API_BASE_URL__="/api";'}));
      await context.route('**/api/**',async route=>{
        const request=route.request(),path=new URL(request.url()).pathname,method=request.method();
        let data=[],status=200;
        if(method!=='GET'&&!path.startsWith('/api/pareja')) escriturasPersonales.push({path,method});
        if(path==='/api/perfil') data={...usuario,tema:escenario.dark?'OSCURO':'CLARO',monedaPredeterminada:'MXN',ocultarMontos:false};
        else if(path==='/api/auth/google/config') data={enabled:false,clientId:''};
        else if(path==='/api/pareja'&&method==='GET') data=activa?estado(usuario):null;
        else if(path==='/api/pareja'&&method==='POST'){invitada=true;data=invitacion(usuario);status=201;}
        else if(path==='/api/pareja/invitaciones') data=invitada&&!activa&&!archivada?[invitacion(usuario)]:[];
        else if(path==='/api/pareja/invitaciones/100/aceptar'){
          assert.equal(usuario.id,luis.id);activa=true;aceptaciones++;data=estado(usuario);
        }else if(path==='/api/pareja/historial') data=archivada?[{id:100,nombrePareja:usuario.id===ana.id?luis.nombre:ana.nombre,moneda,importado:false,fechaCreacion}]:[];
        else if(path==='/api/pareja/historial/100') data=estado(usuario);
        else if(path==='/api/pareja/100'&&method==='DELETE'){activa=false;archivada=true;data=null;}
        else if(path==='/api/pareja/aportes'){
          assert.ok(activa);const payload=request.postDataJSON();
          aportes.push({id:101,usuarioId:usuario.id,usuarioNombre:usuario.nombre,monto:payload.monto,moneda,fecha,notas:null,fechaCreacion});data=estado(usuario);
        }else if(path==='/api/pareja/gastos'){
          assert.ok(activa);const payload=request.postDataJSON();
          gastos.push({id:201,pagadoPorId:usuario.id,pagadoPorNombre:usuario.nombre,monto:payload.monto,moneda,fecha,
            descripcion:payload.descripcion,tipoReparto:'IGUAL',fechaCreacion,repartos:[ana,luis].map(u=>({usuarioId:u.id,usuarioNombre:u.nombre,monto:payload.monto/2,porcentaje:50}))});data=estado(usuario);
        }else if(path==='/api/pareja/pagos'){
          assert.ok(activa);const payload=request.postDataJSON();pagosEnviados.push(payload);
          assert.notEqual(payload.pagadorId,payload.beneficiarioId);
          pagos.push({id:301,...payload,pagadorNombre:luis.nombre,beneficiarioNombre:ana.nombre,moneda,fechaCreacion,registradoPorId:usuario.id});data=estado(usuario);
        }
        await route.fulfill({status,json:{success:true,message:'',data}});
      });
      const page=await context.newPage();page.on('pageerror',error=>errores.push(error.message));paginas.push(page);
    }
    const [a,b]=paginas;
    await a.goto(`${origin}/pareja`);
    await a.locator('#correo-pareja').fill(luis.email);
    assert.ok((await a.getByRole('button',{name:'Enviar invitación',exact:true}).boundingBox()).height>=44);
    await a.getByRole('button',{name:'Enviar invitación',exact:true}).click();
    await expect(a.getByText(`Invitación enviada a ${luis.email}`,{exact:true})).toBeVisible();
    await expect(a.getByRole('button',{name:'Registrar gasto',exact:true})).toHaveCount(0);
    await a.screenshot({path:fileURLToPath(new URL(`./invitacion-${escenario.width}-${escenario.dark?'oscuro':'claro'}.png`,import.meta.url)),fullPage:true});
    await b.goto(`${origin}/pareja`);
    await b.getByRole('button',{name:'Aceptar',exact:true}).click();
    await expect(b.getByRole('dialog')).toContainText('Tus cuentas y movimientos personales no se comparten');
    await b.getByRole('dialog').getByRole('button',{name:'Cancelar',exact:true}).click();
    assert.equal(aceptaciones,0);
    await b.getByRole('button',{name:'Aceptar',exact:true}).click();
    await b.getByRole('dialog').getByRole('button',{name:'Aceptar invitación',exact:true}).click();
    await expect(b.getByRole('button',{name:'Registrar aporte',exact:true})).toBeVisible();
    await a.getByRole('button',{name:'Actualizar',exact:true}).click();
    await a.getByRole('button',{name:'Registrar aporte',exact:true}).click();
    await a.locator('#form-monto').fill('500');await a.getByRole('dialog').getByRole('button',{name:'Guardar',exact:true}).click();
    await expect(a.getByRole('dialog')).toHaveCount(0);
    await a.getByRole('button',{name:'Registrar gasto',exact:true}).click();
    await a.locator('#form-monto').fill('30');await a.locator('#form-descripcion').fill('Supermercado de prueba');
    await a.getByRole('dialog').getByRole('button',{name:'Guardar',exact:true}).click();
    await expect(a.getByRole('dialog')).toHaveCount(0);
    await b.getByRole('button',{name:'Actualizar',exact:true}).click();
    await expect(b.getByRole('button',{name:'Eliminar aporte',exact:true})).toHaveCount(0);
    await expect(b.getByRole('button',{name:'Eliminar gasto',exact:true})).toHaveCount(0);
    await b.getByRole('button',{name:'Registrar pago',exact:true}).click();
    await expect(b.locator('#direccion-pago')).toHaveValue('ENVIADO');
    await b.locator('#form-monto').fill('15');await b.getByRole('dialog').getByRole('button',{name:'Guardar',exact:true}).click();
    await expect(b.getByRole('dialog')).toHaveCount(0);
    assert.deepEqual(pagosEnviados.map(p=>[p.pagadorId,p.beneficiarioId]),[[luis.id,ana.id]]);
    await a.getByRole('button',{name:'Actualizar',exact:true}).click();
    await expect(a.getByRole('button',{name:'Eliminar pago',exact:true})).toHaveCount(0);
    await a.getByRole('button',{name:'Desvincular',exact:true}).click();
    await a.getByRole('dialog').getByRole('button',{name:'Desvincular',exact:true}).click();
    await expect(a.getByRole('dialog')).toHaveCount(0);
    await b.getByRole('button',{name:'Actualizar',exact:true}).click();
    await b.getByRole('button',{name:/Historial con Ana/}).click();
    await expect(b.getByText('Historial archivado de consulta.',{exact:false})).toBeVisible();
    await expect(b.getByRole('button',{name:'Registrar gasto',exact:true})).toHaveCount(0);
    await expect(b.getByRole('button',{name:'Eliminar pago',exact:true})).toHaveCount(0);
    for(const page of paginas) assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.deepEqual(errores,[]);assert.deepEqual(escriturasPersonales,[]);
    await b.locator('.toast-notification__dismiss').evaluateAll(botones=>botones.forEach(boton=>boton.click()));
    await expect(b.locator('.toast-notification__dismiss')).toHaveCount(0);
    await b.screenshot({path:fileURLToPath(new URL(`./historial-${escenario.width}-${escenario.dark?'oscuro':'claro'}.png`,import.meta.url)),fullPage:true});
    resultados.push({...escenario,invitacionSinVinculo:true,aceptacionConfirmada:true,cancelarNoAcepta:true,
      permisosBorrado:true,pagoDirigidoCorrectamente:true,historialConservado:true,historialSoloLectura:true,
      escriturasPersonales,overflow:false,errores});
    for(const context of contextos) await context.close();
  }
  const resultado={fecha:new Date().toISOString(),navegador:'Chromium',api:'sintética',serviceWorkers:'bloqueados',reducedMotion:true,resultados};
  await writeFile(new URL('./browser-checks.json',import.meta.url),JSON.stringify(resultado,null,2));
  console.log(JSON.stringify(resultado));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
