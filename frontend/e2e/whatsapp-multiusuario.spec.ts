import {expect,test} from '@playwright/test';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {registrarPrueba} from './registro-helper';

test('WhatsApp conecta desde móvil y aísla dos propietarios con cola persistente',async({page,request},info)=>{
 test.setTimeout(120_000);
 const register=async(name:string)=>{
  const response=await registrarPrueba(request,{nombre:name,email:`wa-${crypto.randomUUID()}@example.test`,password:'Password123'});
  expect(response.ok()).toBeTruthy();return (await response.json()).data;
 };
 const a=await register('Persona A'),b=await register('Persona B');
 const pa='1555'+Date.now().toString().slice(-8),pb=String(Number(pa)+1);
 for(const [auth,name] of [[a,'Banco A'],[b,'Banco B']] as const){
  const response=await request.post('/api/cuentas',{headers:{Authorization:`Bearer ${auth.token}`},data:{nombre:name,tipo:'DEBITO',moneda:'MXN',saldoInicial:1000}});
  expect(response.ok()).toBeTruthy();
 }
 await page.addInitScript(auth=>{localStorage.setItem('finanzas_token',auth.token);localStorage.setItem('finanzas_user',JSON.stringify({id:auth.id,nombre:auth.nombre,email:auth.email}));},a);
 await page.setViewportSize({width:390,height:844});await page.goto('/configuracion');
 const section=page.locator('app-whatsapp-connection');
 await section.getByLabel('Número de WhatsApp').fill('+'+pa);
 await section.getByLabel('Permito consultar y registrar').check();
 await section.getByLabel('Guardar automáticamente').check();
 await section.getByRole('button',{name:'Conectar WhatsApp',exact:true}).click();
 const link=section.getByRole('link',{name:'Abrir WhatsApp'});await expect(link).toBeVisible();
 const code=new URL((await link.getAttribute('href'))!).searchParams.get('text');
 const {stdout}=await promisify(execFile)(process.execPath,['../tools/whatsapp-worker/e2e-multiuser.mjs'],{env:{...process.env,KAPTAL_E2E_FIXTURE:JSON.stringify({apiUrl:info.project.use.baseURL,a,b,code,pa,pb})},timeout:90_000});
 expect(JSON.parse(stdout.trim())).toEqual({twoOwnersIsolated:true,unknownSilent:true,committedOnce:true,lostAcknowledgementRecovered:true,persistentRestart:true,revokedSilent:true,providerMocked:true});
 await section.getByRole('button',{name:'Actualizar estado',exact:true}).click();
 await expect(section.getByRole('button',{name:'Conectar WhatsApp',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
