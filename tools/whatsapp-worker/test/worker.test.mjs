import {test, before, after, beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
import {Miniflare} from 'miniflare';
import worker, {binding, seal, open, eventKey, ensureChannel, receive, drain} from '../src/worker.mjs';

let mf, env, nativeFetch, calls, notices, ledger, lostAck, lostReply, refreshLost, refreshCalls;
const seconds = () => Math.floor(Date.now()/1000);
const success = data => Response.json({success:true,data});
const fiscalDay = () => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const candidate = () => ({cuentaId:10,tipo:'GASTO',monto:25,fecha:fiscalDay(),descripcion:'cafe',listaId:null});

test('event identifiers match Python UUIDv5 across migrations',async()=>{
  assert.equal(await eventKey({OWNER_ID:'7'},'whatsapp-chat','synthetic-event'),'6a514198-ffa9-59ab-b4d1-cc0183038a7d');
});

before(async()=>{
  mf = new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:{DB:'test'}});
  env={DB:await mf.getD1Database('DB'),API_URL:'https://kaptal.example.test',OWNER_ID:'7',OWNER_PHONE:'5215555555555',KAPSO_NUMBER_ID:'12345',SESSION_ENCRYPTION_KEY:Buffer.alloc(32,7).toString('base64url'),KAPSO_WEBHOOK_SECRET:'x'.repeat(32),KAPSO_API_KEY:'synthetic',AUTO_SAVE:'true'};
  const schema=await readFile(new URL('../migrations/0001_channel.sql',import.meta.url),'utf8');
  for(const statement of schema.split(';').filter(x=>x.trim())) await env.DB.prepare(statement).run();
  nativeFetch=globalThis.fetch;
});
after(async()=>{globalThis.fetch=nativeFetch;await mf?.dispose();});
beforeEach(async()=>{
  globalThis.fetch=nativeFetch;
  await env.DB.batch(['events','secrets','channel'].map(t=>env.DB.prepare(`DELETE FROM ${t}`)));
  calls=[];notices=new Map();ledger=[];lostAck=false;lostReply=false;refreshLost=false;refreshCalls=0;
  await ensureChannel(env);
  await env.DB.prepare('UPDATE channel SET paused=0 WHERE id=1').run();
  await env.DB.prepare('INSERT INTO secrets VALUES(?,?)').bind('auth',await seal(env,'secret:auth',{cookie:'c'.repeat(43),token:'synthetic-access',expires:seconds()+600})).run();
  globalThis.fetch=async(url,options={})=>{
    const path=new URL(url).pathname;
    const body=options.body?JSON.parse(options.body):undefined;
    calls.push({url,path,body,headers:options.headers});
    if(path.endsWith('/auth/refresh')){
      refreshCalls++;
      if(refreshLost)throw new TypeError('synthetic timeout');
      return new Response(JSON.stringify({success:true,data:{id:7,token:'rotated-access'}}),{headers:{'Content-Type':'application/json','Set-Cookie':'finanzas_refresh='+'n'.repeat(43)+'; Path=/; Secure; HttpOnly'}});
    }
    if(path==='/api/perfil')return success({id:7});
    if(path==='/api/cuentas')return success([{id:10,nombre:'Nu',moneda:'MXN',activo:true}]);
    if(path==='/api/canales/whatsapp/interpretar'){
      if(body.texto==='saldo')return success({tipo:'CONSULTA',respuesta:'Nu: 1000.00 MXN'});
      if(!body.texto.includes('Nu'))return success({tipo:'ACLARACION',respuesta:'Que cuenta?',contexto:body.texto,sugerencias:['Nu']});
      return success({tipo:'PROPUESTA',propuesta:candidate(),moneda:'MXN'});
    }
    if(path==='/api/avisos'){
      const old=notices.get(body.identificador);
      if(old)return success(old);
      const notice={id:body.identificador,estado:'PENDIENTE',version:0,coincidencias:ledger.length?[1]:[]};
      notices.set(body.identificador,notice);return success(notice);
    }
    if(path.endsWith('/confirmar')){
      const id=path.split('/')[3];const notice=notices.get(id);
      if(notice.estado!=='REGISTRADO'){notice.estado='REGISTRADO';ledger.push(id);}
      if(lostAck){lostAck=false;throw new TypeError('synthetic lost acknowledgement');}
      return success(notice);
    }
    if(url.startsWith('https://api.kapso.ai/')&&options.method==='POST'){
      if(lostReply)throw new TypeError('synthetic send timeout');
      return Response.json({messages:[{id:'synthetic-outbound'}]});
    }
    if(url.startsWith('https://api.kapso.ai/'))return Response.json({id:'audio',from:env.OWNER_PHONE,type:'audio',kapso:{direction:'inbound',transcript:{text:'gaste 25 cafe con Nu'}}});
    throw new Error('Unexpected request');
  };
});

function event(text='gaste 25 cafe con Nu',id='message',extra={}){
  return {phone_number_id:env.KAPSO_NUMBER_ID,message:{id,timestamp:String(seconds()),type:'text',from:env.OWNER_PHONE,kapso:{direction:'inbound'},text:{body:text},...extra}};
}
function request(data,signature){
  const raw=JSON.stringify(data);
  return new Request('https://worker.example.test/webhooks/kapso',{method:'POST',headers:{'Content-Type':'application/json','X-Webhook-Signature':signature??createHmac('sha256',env.KAPSO_WEBHOOK_SECRET).update(raw).digest('hex')},body:raw});
}
const rows=async()=> (await env.DB.prepare('SELECT * FROM events ORDER BY rowid').all()).results;
async function releaseRetry(){await env.DB.prepare('UPDATE events SET next_attempt=0').run();}

test('ciphertext is bound to owner, row and fresh nonce',async()=>{
  const first=await seal(env,'test',{secret:'private'});const second=await seal(env,'test',{secret:'private'});
  assert.notEqual(first,second);assert(!first.includes('private'));
  assert.deepEqual(await open(env,'test',first),{secret:'private'});
  await assert.rejects(open({...env,OWNER_ID:'8'},'test',first));
  await assert.rejects(open(env,'other-row',first));
});
test('another account cannot bind an existing database',async()=>{
  await assert.rejects(ensureChannel({...env,OWNER_ID:'8'}));
  assert.throws(()=>binding({...env,API_URL:'https://evil.example.test/path'}));
});
test('signed receipt persists once without financial requests and encrypts content',async()=>{
  await Promise.all(Array.from({length:5},()=>receive(request(event()),env)));
  const stored=await rows();assert.equal(stored.length,1);assert(!stored[0].payload.includes('cafe'));assert.equal(calls.length,0);
  assert.deepEqual(await open(env,'event:'+stored[0].key,stored[0].payload),{note:'gaste 25 cafe con Nu'});
});
test('signature, owner, bot and malformed payload are rejected',async()=>{
  assert.equal(await receive(request(event(),'0'.repeat(64)),env),401);
  const foreign=event();foreign.message.from='5215555555556';assert.equal(await receive(request(foreign),env),401);
  const other=event();other.phone_number_id='999';assert.equal(await receive(request(other),env),401);
  assert.equal(await receive(request({...event(),batch:true}),env),400);
  assert.equal((await rows()).length,0);
});
test('body size is bounded even without Content-Length',async()=>{
  const req=new Request('https://worker.example.test/webhooks/kapso',{method:'POST',headers:{'Content-Type':'application/json'},body:'x'.repeat(65537)});
  assert.equal(await receive(req,env),413);
});
test('passive, old and future events cannot change finances',async()=>{
  assert.equal(await receive(request(event('', 'passive',{kapso:{direction:'inbound',passive:true}})),env),200);
  await receive(request(event('saldo','old',{timestamp:String(seconds()-86401)})),env);
  await receive(request(event('saldo','future',{timestamp:String(seconds()+301)})),env);
  await drain(env);assert.equal((await rows()).length,0);assert.equal(calls.length,0);
});
test('normal expense records and replies once; replay preserves original key',async()=>{
  const key=await eventKey(env,'whatsapp-chat','message');
  await receive(request(event()),env);await drain(env);await receive(request(event()),env);await drain(env);
  assert.deepEqual(ledger,[key]);assert.equal((await rows())[0].replied,1);
  const replies=calls.filter(c=>c.url.startsWith('https://api.kapso.ai/')&&c.body);
  assert.equal(replies.length,1);assert.equal(replies[0].body.to,env.OWNER_PHONE);
});
test('concurrent drain invocations cannot both own the queue',async()=>{
  await receive(request(event()),env);await Promise.all([drain(env),drain(env),drain(env)]);
  assert.equal(ledger.length,1);assert.equal(calls.filter(c=>c.path.endsWith('/confirmar')).length,1);
});
test('lost financial acknowledgement resumes with same notice and no duplicate',async()=>{
  await receive(request(event()),env);lostAck=true;await drain(env);
  assert.equal(ledger.length,1);assert.equal((await rows())[0].state,'ready');
  await releaseRetry();await drain(env);assert.equal(ledger.length,1);assert.equal((await rows())[0].state,'saved');
});
test('another identical purchase stays in notices for review',async()=>{
  await receive(request(event()),env);await drain(env);
  await receive(request(event('gaste 25 cafe con Nu','second')),env);await drain(env);
  assert.equal(ledger.length,1);assert.equal((await rows())[1].state,'inbox');
});
test('clarification remembers account but never guesses it',async()=>{
  await receive(request(event('gaste 25 cafe')),env);await drain(env);assert.equal(ledger.length,0);
  await receive(request(event('Nu','account')),env);await drain(env);assert.equal(ledger.length,1);
  assert(calls.some(c=>c.body?.texto==='gaste 25 cafe desde Nu'));
});
test('audio requires exact, single-use confirmation',async()=>{
  const audio=event('', 'audio',{type:'audio',kapso:{direction:'inbound',transcript:{text:'gaste 25 cafe con Nu'}}});
  await receive(request(audio),env);await drain(env);assert.equal(ledger.length,0);
  const key=await eventKey(env,'whatsapp-audio','audio');
  await receive(request(event('confirmar audio '+key.slice(0,8),'confirm')),env);await drain(env);assert.equal(ledger.length,1);
  await receive(request(event('confirmar audio '+key.slice(0,8),'again')),env);await drain(env);assert.equal(ledger.length,1);
});
test('cancelled audio cannot register anything',async()=>{
  await receive(request(event('', 'audio',{type:'audio',kapso:{direction:'inbound',transcript:{text:'gaste 25 cafe con Nu'}}})),env);await drain(env);
  await receive(request(event('cancelar','cancel')),env);await drain(env);
  assert.equal((await rows())[0].state,'cancelled');assert.equal(ledger.length,0);
});
test('audio without initial transcript uses fixed provider URL',async()=>{
  await receive(request(event('', 'audio',{type:'audio'})),env);await drain(env);
  assert(calls.some(c=>c.url==='https://api.kapso.ai/meta/whatsapp/v24.0/12345/messages/audio'));assert.equal(ledger.length,0);
});
test('uncertain message delivery is not retried automatically',async()=>{
  lostReply=true;await receive(request(event('saldo')),env);await drain(env);await releaseRetry();await drain(env);
  assert.equal((await rows())[0].replied,-1);
  assert.equal(calls.filter(c=>c.url.startsWith('https://api.kapso.ai/')&&c.body).length,1);assert.equal(ledger.length,0);
});
test('pending interpretation from another day requires new input',async()=>{
  const data=event();data.message.timestamp=String(seconds()-23*3600);
  await receive(request(data),env);await env.DB.prepare('UPDATE events SET received_at=?').bind(seconds()-2*86400).run();await drain(env);
  assert.equal(ledger.length,0);assert(!calls.some(c=>c.path.endsWith('/interpretar')));
});
test('refresh rotation reloads encrypted state and never exposes cookie',async()=>{
  await env.DB.prepare('UPDATE secrets SET ciphertext=? WHERE name=\'auth\'').bind(await seal(env,'secret:auth',{cookie:'c'.repeat(43),expires:0})).run();
  await receive(request(event('saldo')),env);await drain(env);assert.equal(refreshCalls,1);
  const stored=await env.DB.prepare('SELECT ciphertext FROM secrets WHERE name=\'auth\'').first();assert(!stored.ciphertext.includes('n'.repeat(43)));
  assert.equal((await open(env,'secret:auth',stored.ciphertext)).cookie,'n'.repeat(43));
});
test('unknown refresh outcome stops cookie reuse and requires a new authorization',async()=>{
  await env.DB.prepare('UPDATE secrets SET ciphertext=? WHERE name=\'auth\'').bind(await seal(env,'secret:auth',{cookie:'c'.repeat(43),expires:0})).run();
  refreshLost=true;await receive(request(event('saldo')),env);await drain(env);await releaseRetry();await drain(env);
  assert.equal(refreshCalls,1);assert.equal((await env.DB.prepare('SELECT refresh_pending FROM channel').first()).refresh_pending,1);
});
test('paused service persists events but cannot process or send them',async()=>{
  await env.DB.prepare('UPDATE channel SET paused=1').run();await receive(request(event()),env);await drain(env);
  assert.equal((await rows()).length,1);assert.equal(calls.length,0);
});
test('no public inbox, financial data or administrative endpoints',async()=>{
  for(const path of ['/inbox','/admin/session','/metrics'])assert.equal((await worker.fetch(new Request('https://worker.example.test'+path),env,{waitUntil(){}})).status,404);
  const response=await worker.fetch(new Request('https://worker.example.test/ready'),env,{});assert.deepEqual(await response.json(),{ok:false});
});
test('session probe verifies the owner without creating movements or sending messages',async()=>{
  const key=crypto.randomUUID();
  await env.DB.prepare('INSERT INTO events(key,source,state,payload,received_at) VALUES(?,?,?,?,?)').bind(key,'probe','probe',await seal(env,'event:'+key,{}),seconds()).run();
  await drain(env);assert.equal(ledger.length,0);assert(calls.every(c=>c.path==='/api/perfil'));
  const response=await worker.fetch(new Request('https://worker.example.test/ready'),env,{});assert.equal(response.status,200);
});
