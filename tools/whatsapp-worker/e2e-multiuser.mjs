/** Real HTTP API/PostgreSQL; only outbound Kapso delivery is replaced. */
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,basename} from 'node:path';
import {createHmac} from 'node:crypto';
import {Miniflare} from 'miniflare';
import {relayControl,receiveRelay,drainRelay} from './src/relay.mjs';

const fixture=JSON.parse(process.env.KAPTAL_E2E_FIXTURE),url=new URL(fixture.apiUrl);
assert(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname));
const directory=await mkdtemp(join(tmpdir(),'kaptal-relay-e2e-')),nativeFetch=globalThis.fetch;
let mf,env,lostAck=false;const sends=[];
async function start(){
  mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:{DB:'queue'},d1Persist:directory});
  env={DB:await mf.getD1Database('DB'),API_URL:fixture.apiUrl,ALLOW_LOOPBACK_TEST:'true',KAPSO_NUMBER_ID:'12345',KAPSO_API_KEY:'synthetic',KAPSO_WEBHOOK_SECRET:'synthetic-webhook-secret-at-least-32',SESSION_ENCRYPTION_KEY:Buffer.alloc(32,5).toString('base64url')};
}
async function api(who,path,method='GET',data){
 const r=await nativeFetch(fixture.apiUrl+'/api'+path,{method,headers:{Authorization:'Bearer '+fixture[who].token,'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});
 assert(r.ok,`${method} ${path}: ${r.status}`);return (await r.json()).data;
}
function packet(phone,id,text){
 const raw=JSON.stringify({phone_number_id:'12345',message:{id,from:phone,timestamp:String(Math.floor(Date.now()/1000)),type:'text',kapso:{direction:'inbound'},text:{body:text}}});
 const signature=createHmac('sha256',env.KAPSO_WEBHOOK_SECRET).update(raw).digest('hex');
 return ()=>new Request('https://worker.example.test/webhooks/kapso',{method:'POST',headers:{'Content-Type':'application/json','X-Webhook-Signature':signature},body:raw});
}
async function message(phone,id,text){const p=packet(phone,id,text);assert.equal(await receiveRelay(p(),env),200);await drainRelay(env);return p;}
async function count(who){return (await api(who,'/transacciones?size=100')).content.filter(r=>r.tipo!=='SALDO_INICIAL').length;}
try{
 await start();for(const statement of (await readFile(new URL('./migrations/0002_multiuser_relay.sql',import.meta.url),'utf8')).split(';').filter(s=>s.trim()))await env.DB.prepare(statement).run();
 await relayControl(env);await env.DB.prepare('UPDATE relay_control SET paused=0').run();
 globalThis.fetch=async(target,options)=>{
  if(target.startsWith('https://api.kapso.ai/')){assert(!options.headers.Authorization&&!options.headers.Cookie);sends.push(JSON.parse(options.body));return Response.json({messages:[{id:'synthetic-delivery'}]});}
  assert(!options?.headers?.Authorization&&!options?.headers?.Cookie);
  const r=await nativeFetch(target,options);
  if(lostAck&&new URL(target).pathname.endsWith('/whatsapp/evento')&&r.ok){lostAck=false;await r.arrayBuffer();throw new TypeError('Synthetic lost acknowledgement after commit');}return r;
 };
 const {pa,pb}=fixture;
 await message(pa,'verify-a',fixture.code);
 const b=await api('b','/canales/whatsapp/conexion','POST',{telefono:'+'+pb,aceptarVinculacion:true,guardarAutomaticamente:true});
 await message(pb,'verify-b',new URL(b.urlWhatsapp).searchParams.get('text'));
 assert.equal((await api('a','/canales/whatsapp/conexion')).estado,'VERIFICADA');
 assert.equal((await api('b','/canales/whatsapp/conexion')).estado,'VERIFICADA');
 await message(pa,'balance-a','saldo');await message(pb,'balance-b','saldo');
 assert(sends.some(s=>s.to===pa&&s.text.body.includes('Banco A')&&!s.text.body.includes('Banco B')));
 assert(sends.some(s=>s.to===pb&&s.text.body.includes('Banco B')&&!s.text.body.includes('Banco A')));
 const before=sends.length;await message('15555550203','unknown','saldo');assert.equal(sends.length,before);
 lostAck=true;const purchase=await message(pa,'purchase','Gaste 25 en tacos con Banco A');assert.equal(await count('a'),1);assert.equal(await count('b'),0);
 await mf.dispose();await start();await env.DB.prepare('UPDATE relay_events SET next_attempt=0').run();await drainRelay(env);
 assert.equal(await receiveRelay(purchase(),env),200);await drainRelay(env);assert.equal(await count('a'),1);
 assert.equal((await api('a','/cuentas')).find(c=>c.nombre==='Banco A').saldoActual,975);
 const queued=packet(pa,'revoked','saldo');assert.equal(await receiveRelay(queued(),env),200);
 await api('a','/canales/whatsapp/conexion','DELETE');const delivered=sends.length;await drainRelay(env);assert.equal(sends.length,delivered);
 console.log(JSON.stringify({twoOwnersIsolated:true,unknownSilent:true,committedOnce:true,lostAcknowledgementRecovered:true,persistentRestart:true,revokedSilent:true,providerMocked:true}));
}finally{
 globalThis.fetch=nativeFetch;await mf?.dispose();const safe=await realpath(directory);
 assert(dirname(safe)===await realpath(tmpdir())&&basename(safe).startsWith('kaptal-relay-e2e-'));await rm(safe,{recursive:true,force:true});
}
