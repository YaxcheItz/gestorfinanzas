import {expect,test} from '@playwright/test';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {registrarPrueba} from './registro-helper';

test('WhatsApp consulta todas las cuentas y pide la cuenta antes de registrar sin duplicar',async({request},testInfo)=>{
  const registro=await registrarPrueba(request,{nombre:'QA canal cuentas',email:`canal-${crypto.randomUUID()}@example.test`,password:'Password123'});
  expect(registro.ok()).toBeTruthy();const auth=(await registro.json()).data;
  const headers={Authorization:`Bearer ${auth.token}`};
  for(const data of [{nombre:'Nu prueba',tipo:'DEBITO',moneda:'MXN',saldoInicial:1000},{nombre:'Dolares prueba',tipo:'DEBITO',moneda:'USD',saldoInicial:20}]){
    expect((await request.post('/api/cuentas',{headers,data})).ok()).toBeTruthy();
  }
  const {stdout}=await promisify(execFile)(process.platform==='win32'?'python':'python3',['../tools/canales/e2e_whatsapp.py'],{env:{...process.env,KAPTAL_E2E_FIXTURE:JSON.stringify({apiUrl:testInfo.project.use.baseURL,ownerId:auth.id,token:auth.token})}});
  const result=JSON.parse(stdout.trim());
  expect(result).toEqual({queriesReadOnly:true,explicitAccountSavedOnce:true,duplicatePending:true,currenciesSeparated:true,providerSendMocked:true});
  const cuentas=(await (await request.get('/api/cuentas',{headers})).json()).data;
  expect(cuentas.find((c:{nombre:string})=>c.nombre==='Nu prueba').saldoActual).toBe(975);
  expect(cuentas.find((c:{nombre:string})=>c.nombre==='Dolares prueba').saldoActual).toBe(20);
});
