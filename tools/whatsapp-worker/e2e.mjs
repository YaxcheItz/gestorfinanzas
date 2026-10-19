/** Real Kaptal API/PostgreSQL, isolated synthetic owner; only Kapso delivery is mocked. */
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,basename} from 'node:path';
import {createHmac} from 'node:crypto';
import {Miniflare} from 'miniflare';
import {ensureChannel,seal,receive,drain,eventKey} from './src/worker.mjs';

const fixture=JSON.parse(process.env.KAPTAL_E2E_FIXTURE);
const target=new URL(fixture.apiUrl);
assert(target.protocol==='http:'&&['localhost','127.0.0.1'].includes(target.hostname));
const directory=await mkdtemp(join(tmpdir(),'kaptal-worker-e2e-'));
const nativeFetch=globalThis.fetch;
let mf,env,lostAck=false;
async function start(){
  mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:{DB:'queue'},d1Persist:directory});
  env={DB:await mf.getD1Database('DB'),API_URL:fixture.apiUrl,ALLOW_LOOPBACK_TEST:'true',OWNER_ID:String(fixture.ownerId),OWNER_PHONE:'5215555555555',KAPSO_NUMBER_ID:'12345',AUTO_SAVE:'true',KAPSO_API_KEY:'synthetic',KAPSO_WEBHOOK_SECRET:'x'.repeat(32),SESSION_ENCRYPTION_KEY:Buffer.alloc(32,3).toString('base64url')};
}
async function api(path){const r=await nativeFetch(fixture.apiUrl+'/api'+path,{headers:{Authorization:'Bearer '+fixture.token}});assert(r.ok);return (await r.json()).data;}
async function message(id,text,type='text'){
  const event={phone_number_id:'12345',message:{id,timestamp:String(Math.floor(Date.now()/1000)),type,from:env.OWNER_PHONE,kapso:{direction:'inbound',...(type==='audio'?{transcript:{text}}:{})},text:{body:text}}};
  const raw=JSON.stringify(event);const signature=createHmac('sha256',env.KAPSO_WEBHOOK_SECRET).update(raw).digest('hex');
  assert.equal(await receive(new Request('https://worker.example.test/webhooks/kapso',{method:'POST',headers:{'Content-Type':'application/json','X-Webhook-Signature':signature},body:raw}),env),200);
  await drain(env);
}
try{
  await start();
  const schema=await readFile(new URL('./migrations/0001_channel.sql',import.meta.url),'utf8');
  for(const statement of schema.split(';').filter(x=>x.trim()))await env.DB.prepare(statement).run();
  await ensureChannel(env);await env.DB.prepare('UPDATE channel SET paused=0').run();
  await env.DB.prepare('INSERT INTO secrets VALUES(?,?)').bind('auth',await seal(env,'secret:auth',{cookie:'synthetic-cookie',token:fixture.token,expires:Math.floor(Date.now()/1000)+600})).run();
  const sends=[];
  globalThis.fetch=async(url,options)=>{
    if(url.startsWith('https://api.kapso.ai/')){
      assert.equal(options.method,'POST');const body=JSON.parse(options.body);assert.equal(body.to,env.OWNER_PHONE);sends.push(body);return Response.json({messages:[{id:'synthetic-delivery'}]});
    }
    const response=await nativeFetch(url,options);
    if(lostAck&&new URL(url).pathname.endsWith('/confirmar')&&response.ok){lostAck=false;await response.arrayBuffer();throw new TypeError('Synthetic lost server acknowledgement');}
    return response;
  };
  // Account creation legitimately records opening balances in the ledger.
  const count=async()=> (await api('/transacciones?size=100')).content.filter(row=>row.tipo!=='SALDO_INICIAL').length;
  assert.equal(await count(),0);
  await message('balance','saldo');assert.equal(await count(),0);
  await message('question','Gaste 25 en tacos');assert.equal(await count(),0);
  await message('account','Nu prueba');assert.equal(await count(),1);
  await message('account','Nu prueba');assert.equal(await count(),1);
  await message('duplicate','Gaste 25 en tacos con Nu prueba');assert.equal(await count(),1);
  await message('audio','Gaste 7 en cafe con Nu prueba','audio');assert.equal(await count(),1);
  const key=await eventKey(env,'whatsapp-audio','audio');lostAck=true;
  await message('confirm','confirmar audio '+key.slice(0,8));assert.equal(await count(),2);
  await mf.dispose();await start();
  await env.DB.prepare('UPDATE events SET next_attempt=0').run();await drain(env);assert.equal(await count(),2);
  await message('confirm-again','confirmar audio '+key.slice(0,8));assert.equal(await count(),2);
  const accounts=await api('/cuentas');assert.equal(accounts.find(c=>c.nombre==='Nu prueba').saldoActual,968);assert.equal(accounts.find(c=>c.nombre==='Dolares prueba').saldoActual,20);
  assert(sends.some(s=>s.text.body.includes('transcripcion')||s.text.body.includes('Entendi')));
  console.log(JSON.stringify({readOnlyQueries:true,explicitAccount:true,duplicatePending:true,audioConfirmedOnce:true,persistentRestart:true,lostAcknowledgementRecovered:true,currenciesSeparated:true,providerMocked:true}));
}finally{
  globalThis.fetch=nativeFetch;await mf?.dispose();
  const safe=await realpath(directory);
  assert(dirname(safe)===await realpath(tmpdir())&&basename(safe).startsWith('kaptal-worker-e2e-'));
  await rm(safe,{recursive:true,force:true});
}
