import {expect,test} from '@playwright/test';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {registrarPrueba} from './registro-helper';

test('Worker D1 conserva voz y movimientos al reiniciar sin duplicar un acuse perdido',async({request},testInfo)=>{
  const registration=await registrarPrueba(request,{nombre:'QA Worker',email:`worker-${crypto.randomUUID()}@example.test`,password:'Password123'});
  expect(registration.ok()).toBeTruthy();const auth=(await registration.json()).data;
  const headers={Authorization:`Bearer ${auth.token}`};
  for(const data of [{nombre:'Nu prueba',tipo:'DEBITO',moneda:'MXN',saldoInicial:1000},{nombre:'Dolares prueba',tipo:'DEBITO',moneda:'USD',saldoInicial:20}])expect((await request.post('/api/cuentas',{headers,data})).ok()).toBeTruthy();
  const {stdout}=await promisify(execFile)(process.execPath,['../tools/whatsapp-worker/e2e.mjs'],{env:{...process.env,KAPTAL_E2E_FIXTURE:JSON.stringify({apiUrl:testInfo.project.use.baseURL,ownerId:auth.id,token:auth.token})}});
  expect(JSON.parse(stdout.trim())).toEqual({readOnlyQueries:true,explicitAccount:true,duplicatePending:true,audioConfirmedOnce:true,persistentRestart:true,lostAcknowledgementRecovered:true,currenciesSeparated:true,providerMocked:true});
});
