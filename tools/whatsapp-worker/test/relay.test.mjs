import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
import {Miniflare} from 'miniflare';
import {relayControl,relaySeal,relayOpen,receiveRelay,drainRelay,relayFetch} from '../src/relay.mjs';
import {eventKey,seal} from '../src/worker.mjs';

let mf,env,nativeFetch,cache,ledger,sends,revoked,down,lostAck,lostSend;
const phoneA='15555550111',phoneB='15555550222';
before(async()=>{
  mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:{DB:'relay'}});
  env={DB:await mf.getD1Database('DB'),API_URL:'https://kaptal.example.test',KAPSO_NUMBER_ID:'12345',KAPSO_WEBHOOK_SECRET:'x'.repeat(32),KAPSO_API_KEY:'synthetic',SESSION_ENCRYPTION_KEY:Buffer.alloc(32,4).toString('base64url')};
  for(const path of ['0001_channel.sql','0002_multiuser_relay.sql'])for(const s of (await readFile(new URL('../migrations/'+path,import.meta.url),'utf8')).split(';').filter(x=>x.trim()))await env.DB.prepare(s).run();
  nativeFetch=globalThis.fetch;
});
after(async()=>{globalThis.fetch=nativeFetch;await mf.dispose();});
beforeEach(async()=>{
  globalThis.fetch=nativeFetch;delete env.OWNER_ID;delete env.OWNER_PHONE;
  for(const table of ['relay_events','relay_lanes','relay_control','events'])await env.DB.prepare('DELETE FROM '+table).run();
  await relayControl(env);await env.DB.prepare('UPDATE relay_control SET paused=0').run();
  cache=new Map();ledger=[];sends=[];revoked=new Set();down=new Set();lostAck=false;lostSend=false;
  globalThis.fetch=async(url,options={})=>{
    const path=new URL(url).pathname;
    if(path.endsWith('/disponibilidad'))return Response.json({success:true,data:true});
    if(url.startsWith(env.API_URL)){
      assert.equal(options.headers.Authorization,undefined);assert.equal(options.headers.Cookie,undefined);
      const raw=Buffer.from(options.body),data=JSON.parse(raw),phone=data.message.from;
      const signature=createHmac('sha256',env.KAPSO_WEBHOOK_SECRET).update('kaptal-relay-v1\n'+options.headers['X-Kaptal-Received-At']+'\n').update(raw).digest('hex');
      assert.equal(options.headers['X-Kaptal-Relay-Signature'],signature);
      assert.equal(options.headers['X-Webhook-Signature'],createHmac('sha256',env.KAPSO_WEBHOOK_SECRET).update(raw).digest('hex'));
      if(down.has(phone))throw new TypeError('synthetic unavailable');
      if(path.endsWith('/autorizar-respuesta'))return Response.json({success:true,data:!revoked.has(phone)});
      const key=phone+':'+data.message.id;
      if(!cache.has(key)){ledger.push(key);cache.set(key,{responder:[phoneA,phoneB].includes(phone),respuesta:'Respuesta de '+phone,conexionId:phone,generacion:1});}
      if(lostAck){lostAck=false;throw new TypeError('synthetic lost financial acknowledgement');}
      return Response.json({success:true,data:cache.get(key)});
    }
    const body=JSON.parse(options.body);sends.push(body);
    if(lostSend)throw new TypeError('synthetic uncertain provider delivery');
    return Response.json({messages:[{id:'synthetic-delivery'}]});
  };
});
function request(phone=phoneA,id='one',text='saldo',extra={}){
  const data={phone_number_id:env.KAPSO_NUMBER_ID,message:{id,from:phone,timestamp:String(Math.floor(Date.now()/1000)),type:'text',text:{body:text},kapso:{direction:'inbound'},...extra}};
  const raw=JSON.stringify(data);return new Request('https://worker.example.test/webhooks/kapso',{method:'POST',headers:{'Content-Type':'application/json','X-Webhook-Signature':createHmac('sha256',env.KAPSO_WEBHOOK_SECRET).update(raw).digest('hex')},body:raw});
}
test('relay receives durably with encrypted raw bytes and never a user cookie',async()=>{
  assert.equal(await receiveRelay(request(),env),200);assert.equal(ledger.length,0);
  const row=await env.DB.prepare('SELECT * FROM relay_events').first();assert(!row.payload.includes(phoneA));assert(!row.payload.includes('saldo'));
  const data=await relayOpen(env,'event:'+row.id,row.payload);assert.equal(JSON.parse(Buffer.from(data.raw,'base64')).message.from,phoneA);
  await drainRelay(env);assert.equal(ledger.length,1);assert.equal(sends.length,1);assert.equal(sends[0].to,phoneA);
});
test('two users and concurrent drainers preserve lane ownership',async()=>{
  await receiveRelay(request(phoneA,'a'),env);await receiveRelay(request(phoneB,'b'),env);
  await Promise.all([drainRelay(env),drainRelay(env),drainRelay(env)]);await drainRelay(env);
  assert.equal(ledger.length,2);assert.equal(sends.length,2);assert.deepEqual(new Set(sends.map(x=>x.to)),new Set([phoneA,phoneB]));
  await receiveRelay(request(phoneA,'a'),env);await drainRelay(env);assert.equal(ledger.length,2);assert.equal(sends.length,2);
});
test('lost backend acknowledgement retries the exact event and keeps one result',async()=>{
  await receiveRelay(request(),env);lostAck=true;await drainRelay(env);assert.equal(ledger.length,1);assert.equal(sends.length,0);
  await env.DB.prepare('UPDATE relay_events SET next_attempt=0').run();await drainRelay(env);assert.equal(ledger.length,1);assert.equal(sends.length,1);
});
test('one unavailable user does not block another or reorder its own messages',async()=>{
  down.add(phoneA);await receiveRelay(request(phoneA,'a'),env);await receiveRelay(request(phoneA,'later'),env);await receiveRelay(request(phoneB,'b'),env);await drainRelay(env);
  assert.equal(sends.length,1);assert.equal(sends[0].to,phoneB);assert(!ledger.some(x=>x.includes('later')));
});
test('revocation is checked before sending and unknown numbers get no financial reply',async()=>{
  revoked.add(phoneA);await receiveRelay(request(),env);await receiveRelay(request('15555550999','unknown'),env);await drainRelay(env);assert.equal(sends.length,0);
});
test('uncertain delivery is never blindly retried',async()=>{
  lostSend=true;await receiveRelay(request(),env);await drainRelay(env);assert.equal(sends.length,1);
  await drainRelay(env);assert.equal(sends.length,1);assert.equal((await env.DB.prepare('SELECT state FROM relay_events').first()).state,'sending');
});
test('pause accepts messages but cannot interpret or send',async()=>{
  await env.DB.prepare('UPDATE relay_control SET paused=1').run();await receiveRelay(request(),env);await drainRelay(env);assert.equal(ledger.length,0);assert.equal(sends.length,0);
});

test('expired queued input cannot block later messages from the same phone',async()=>{
  await receiveRelay(request(phoneA,'expired'),env);
  await env.DB.prepare('UPDATE relay_events SET received_at=?').bind(Date.now()-86400001).run();
  await receiveRelay(request(phoneA,'fresh'),env);await drainRelay(env);
  assert.equal((await env.DB.prepare("SELECT count(*) AS n FROM relay_events WHERE state='expired'").first()).n,1);
  assert.equal(ledger.length,1);assert.equal(sends.length,1);
});
test('signature, bot, passive events and large bodies are guarded',async()=>{
  const bad=request();bad.headers.set('X-Webhook-Signature','0'.repeat(64));assert.equal(await receiveRelay(bad,env),401);
  assert.equal(await receiveRelay(request(phoneA,'passive','saldo',{kapso:{direction:'inbound',passive:true}}),env),200);
  assert.equal(await receiveRelay(new Request('https://worker.example.test/webhooks/kapso',{method:'POST',headers:{'Content-Type':'application/json'},body:'x'.repeat(65537)}),env),413);
  assert.equal((await env.DB.prepare('SELECT count(*) AS n FROM relay_events').first()).n,0);
});
test('new ciphertext is bound to bot and server without modifying legacy archive',async()=>{
  const cipher=await relaySeal(env,'probe',{safe:true});await assert.rejects(()=>relayOpen({...env,KAPSO_NUMBER_ID:'999'},'probe',cipher));
  env.OWNER_ID='7';env.OWNER_PHONE=phoneA;
  const key=await eventKey(env,'whatsapp-chat','old'),oldCipher=await seal(env,'event:'+key,{response:'old'});
  await env.DB.prepare("INSERT INTO events(key,source,state,payload,received_at,replied) VALUES(?,'whatsapp-chat','answered',?,0,1)").bind(key,oldCipher).run();
  assert.equal(await receiveRelay(request(phoneA,'old'),env,eventKey),200);
  assert.equal((await env.DB.prepare('SELECT count(*) AS n FROM relay_events').first()).n,0);assert.equal((await env.DB.prepare('SELECT payload FROM events WHERE key=?').bind(key).first()).payload,oldCipher);
});
test('health and readiness reveal only a boolean and no admin endpoint',async()=>{
  const ctx={waitUntil(){}};assert.equal((await relayFetch(new Request('https://worker.example.test/ready'),env,ctx)).status,200);
  await env.DB.prepare('UPDATE relay_control SET paused=1').run();assert.equal((await relayFetch(new Request('https://worker.example.test/ready'),env,ctx)).status,503);
  assert.equal((await relayFetch(new Request('https://worker.example.test/admin'),env,ctx)).status,404);
});
