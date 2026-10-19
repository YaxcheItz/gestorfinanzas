/** Multiuser transport only: no user cookies, tokens, financial inference or SQL balances. */
const encoder=new TextEncoder(),decoder=new TextDecoder();
const sql=(env,text,...values)=>env.DB.prepare(text).bind(...values);
const now=()=>Date.now();
function base64(bytes){let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);}
const unbase64=text=>Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
export function relayBinding(env){
  const u=new URL(env.API_URL);
  const local=env.ALLOW_LOOPBACK_TEST==='true'&&u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname);
  if((!local&&u.protocol!=='https:')||u.pathname!=='/'||u.search||u.hash||u.username||u.password||!/^\d+$/.test(env.KAPSO_NUMBER_ID??'')||!env.KAPSO_API_KEY||(env.KAPSO_WEBHOOK_SECRET?.length??0)<32||unbase64(env.SESSION_ENCRYPTION_KEY).length!==32)throw Error('config');
  return JSON.stringify(['multi-v1',u.origin,env.KAPSO_NUMBER_ID]);
}
async function cipherKey(env,usage){return crypto.subtle.importKey('raw',unbase64(env.SESSION_ENCRYPTION_KEY),'AES-GCM',false,[usage]);}
export async function relaySeal(env,label,value){
  const iv=crypto.getRandomValues(new Uint8Array(12));const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(relayBinding(env)+':'+label)},await cipherKey(env,'encrypt'),encoder.encode(JSON.stringify(value)));
  return JSON.stringify({iv:base64(iv),data:base64(new Uint8Array(data))});
}
export async function relayOpen(env,label,value){
  const {iv,data}=JSON.parse(value);return JSON.parse(decoder.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unbase64(iv),additionalData:encoder.encode(relayBinding(env)+':'+label)},await cipherKey(env,'decrypt'),unbase64(data))));
}
async function hmac(env,data,usage='sign'){
  const key=await crypto.subtle.importKey('raw',encoder.encode(env.KAPSO_WEBHOOK_SECRET),{name:'HMAC',hash:'SHA-256'},false,[usage]);
  return {key,algorithm:'HMAC',data};
}
async function digest(text){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(text)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function relayControl(env){
  const binding=relayBinding(env);await sql(env,'INSERT OR IGNORE INTO relay_control(id,binding) VALUES(1,?)',binding).run();
  const row=await sql(env,'SELECT * FROM relay_control WHERE id=1').first();if(row.binding!==binding)throw Error('binding');return row;
}
async function bounded(body,max){
  const reader=body?.getReader();if(!reader)return new Uint8Array();const parts=[];let size=0;
  try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>max)throw Error('size');parts.push(value);}}
  finally{await reader.cancel().catch(()=>{});}
  const result=new Uint8Array(size);let offset=0;for(const part of parts){result.set(part,offset);offset+=part.length;}return result;
}
export async function receiveRelay(request,env,legacyKey){
  relayBinding(env);
  if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return 415;
  let raw;try{raw=await bounded(request.body,65536);}catch{return 413;}
  const signature=request.headers.get('X-Webhook-Signature');if(!/^[a-f0-9]{64}$/.test(signature??''))return 401;
  const {key}=await hmac(env,raw,'verify');
  if(!await crypto.subtle.verify('HMAC',key,Uint8Array.from(signature.match(/../g),x=>parseInt(x,16)),raw))return 401;
  let event;try{event=JSON.parse(decoder.decode(raw));}catch{return 400;}
  const m=event?.message,k=m?.kapso;
  if(!m||typeof m!=='object'||Array.isArray(m)||!k||typeof k!=='object'||event.batch)return 400;
  if(event.phone_number_id!==env.KAPSO_NUMBER_ID)return 401;
  if(k.direction!=='inbound'||k.passive)return 200;
  const phone=String(m.from??'').replace(/^\+/,'');if(!/^[1-9]\d{7,14}$/.test(phone))return 400;
  const epoch=Number(m.timestamp);if(!Number.isSafeInteger(epoch)||epoch<1)return 400;
  if(now()/1000-epoch>86400||epoch-now()/1000>300)return 200;
  if(typeof m.id!=='string'||!m.id||m.id.length>512)return 400;
  if(m.type==='text'&&(typeof m.text?.body!=='string'||!m.text.body.trim()||m.text.body.length>1200))return 400;
  const id=await digest(env.KAPSO_NUMBER_ID+':+'+phone+':'+m.id),lane=await digest(env.KAPSO_NUMBER_ID+':'+phone);
  if(await sql(env,'SELECT 1 FROM relay_events WHERE id=?',id).first())return 200;
  // Completed legacy rows keep their ciphertext and UUIDs; a provider replay is not a new purchase.
  if(legacyKey&&env.OWNER_ID&&phone===env.OWNER_PHONE){
    const source=m.type==='audio'?'whatsapp-audio':m.text?.body?.startsWith('/codex ')?'codex':'whatsapp-chat';
    if(await sql(env,'SELECT 1 FROM events WHERE key=?',await legacyKey(env,source,m.id)).first())return 200;
  }
  await relayControl(env);const at=now();
  await sql(env,'INSERT OR IGNORE INTO relay_lanes(id,window) VALUES(?,?)',lane,at).run();
  const limit=await sql(env,'UPDATE relay_lanes SET consumed=CASE WHEN window<? THEN 1 ELSE consumed+1 END,window=CASE WHEN window<? THEN ? ELSE window END WHERE id=? AND (window<? OR consumed<60)',at-60000,at-60000,at,lane,at-60000).run();
  if(!limit.meta.changes)return 429;
  await sql(env,'INSERT OR IGNORE INTO relay_events(id,lane,state,payload,received_at) VALUES(?,?,\'pending\',?,?)',id,lane,await relaySeal(env,'event:'+id,{raw:base64(raw),signature,phone}),at).run();
  return 200;
}
async function fetchJson(url,options,deadline){
  const left=deadline-now();if(left<100)throw Error('deadline');
  const r=await fetch(url,{...options,redirect:'manual',signal:AbortSignal.timeout(Math.min(8000,left))});
  const bytes=await bounded(r.body,2_000_000);
  if(!r.ok){const error=Error('upstream');error.status=r.status;throw error;}
  return JSON.parse(decoder.decode(bytes));
}
async function backend(env,row,data,path,deadline){
  const raw=unbase64(data.raw),prefix=encoder.encode('kaptal-relay-v1\n'+row.received_at+'\n'),bytes=new Uint8Array(prefix.length+raw.length);bytes.set(prefix);bytes.set(raw,prefix.length);
  const {key}=await hmac(env,bytes);const signature=[...new Uint8Array(await crypto.subtle.sign('HMAC',key,bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
  const r=await fetchJson(env.API_URL.replace(/\/$/,'')+'/api/canales/whatsapp/evento'+path,{method:'POST',headers:{'Content-Type':'application/json','X-Webhook-Signature':data.signature,'X-Kaptal-Received-At':String(row.received_at),'X-Kaptal-Relay-Signature':signature},body:raw},deadline);
  if(!r.success)throw Error('upstream');return r.data;
}
async function active(env,row,lease){
  const r=await sql(env,'SELECT l.lease,l.lease_until,c.paused FROM relay_lanes l CROSS JOIN relay_control c WHERE l.id=? AND c.id=1',row.lane).first();
  if(!r||r.paused||r.lease!==lease||r.lease_until<now()+10000)throw Error('lease');
}
async function save(env,row,lease,state,data){
  await active(env,row,lease);
  await sql(env,'UPDATE relay_events SET state=?,payload=?,next_attempt=0 WHERE id=? AND EXISTS(SELECT 1 FROM relay_lanes WHERE id=? AND lease=?)',state,await relaySeal(env,'event:'+row.id,data),row.id,row.lane,lease).run();
}
export async function drainRelay(env){
  if((await relayControl(env)).paused)return;
  const deadline=now()+24000;
  for(let step=0;step<4&&now()<deadline-1500;step++){
    let row=await sql(env,"SELECT e.* FROM relay_events e JOIN relay_lanes l ON l.id=e.lane WHERE e.state IN ('pending','answered') AND e.next_attempt<=? AND l.lease_until<? AND NOT EXISTS(SELECT 1 FROM relay_events p WHERE p.lane=e.lane AND p.seq<e.seq AND p.state IN ('pending','answered')) ORDER BY e.seq LIMIT 1",now(),now()).first();
    if(!row)break;const lease=crypto.randomUUID();
    if(!(await sql(env,'UPDATE relay_lanes SET lease=?,lease_until=? WHERE id=? AND lease_until<?',lease,now()+120000,row.lane,now()).run()).meta.changes)continue;
    try{
      // A previous holder may have finished between SELECT and lease acquisition.
      const current=await sql(env,'SELECT * FROM relay_events WHERE id=?',row.id).first();
      if(!current||!['pending','answered'].includes(current.state)||current.next_attempt>now())continue;
      row=current;
      await active(env,row,lease);const data=await relayOpen(env,'event:'+row.id,row.payload);
      if(now()-row.received_at>86400000){await save(env,row,lease,'expired',data);continue;}
      if(row.state==='pending'){
        const result=await backend(env,row,data,'',deadline);
        if(!result||typeof result.responder!=='boolean')throw Error('format');
        if(result.responder&&(typeof result.respuesta!=='string'||!result.respuesta||result.respuesta.length>3800))throw Error('format');
        await save(env,row,lease,result.responder?'answered':'ignored',{...data,result});
      }else{
        const allowed=await backend(env,row,data,'/autorizar-respuesta',deadline);
        if(allowed!==true){await save(env,row,lease,'ignored',data);continue;}
        // Persist before sending: unknown delivery is never retried automatically.
        await save(env,row,lease,'sending',data);await active(env,row,lease);
        const r=await fetchJson('https://api.kapso.ai/meta/whatsapp/v24.0/'+env.KAPSO_NUMBER_ID+'/messages',{method:'POST',headers:{'X-API-Key':env.KAPSO_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to:data.phone,type:'text',text:{body:data.result.respuesta}})},deadline);
        if(!r.messages?.[0]?.id)throw Error('delivery');await save(env,row,lease,'delivered',data);
      }
    }catch(error){
      if([400,413,422].includes(error.status))await sql(env,"UPDATE relay_events SET state='rejected' WHERE id=? AND state IN ('pending','answered') AND EXISTS(SELECT 1 FROM relay_lanes WHERE id=? AND lease=?)",row.id,row.lane,lease).run();
      else await sql(env,'UPDATE relay_events SET next_attempt=? WHERE id=? AND EXISTS(SELECT 1 FROM relay_lanes WHERE id=? AND lease=?)',now()+60000,row.id,row.lane,lease).run();
    }finally{await sql(env,'UPDATE relay_lanes SET lease=NULL,lease_until=0 WHERE id=? AND lease=?',row.lane,lease).run();}
  }
}
export async function relayFetch(request,env,ctx,legacyKey){
  const path=new URL(request.url).pathname;
  try{
    if(request.method==='GET'&&path==='/health')return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
    if(request.method==='GET'&&path==='/ready'){
      const c=await relayControl(env);let ok=false;
      if(!c.paused){const r=await fetchJson(env.API_URL.replace(/\/$/,'')+'/api/canales/whatsapp/disponibilidad',{},now()+8000);ok=r.success===true&&r.data===true;}
      return Response.json({ok},{status:ok?200:503,headers:{'Cache-Control':'no-store'}});
    }
    if(request.method!=='POST'||path!=='/webhooks/kapso')return new Response(null,{status:404});
    const status=await receiveRelay(request,env,legacyKey);
    if(status===200)ctx.waitUntil(drainRelay(env).catch(()=>{}));return new Response(null,{status});
  }catch{return new Response(null,{status:503});}
}
