/** Private workstation setup. No tokens/cookies/financial content are printed. */
import {readFile, writeFile, mkdir, unlink} from 'node:fs/promises';
import {resolve, dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {createConnection} from 'node:net';
import {binding, seal, open} from './src/worker.mjs';
import {importRow} from './src/migration.mjs';
import {parseCliJson} from './src/cli-output.mjs';

class SetupError extends Error {}

const here = dirname(fileURLToPath(import.meta.url));
const project = resolve(here, '../..');
const argv = process.argv.slice(2);
const command = argv.shift();
const option = name => { const i=argv.indexOf(name); return i<0?undefined:argv[i+1]; };
const directory = resolve(option('--state-dir') ?? '.local/canales-cloudflare');
const stateFile = join(directory, 'state.private.json');
const privateConfig = join(directory, 'wrangler.private.json');
const literal = text => "'" + String(text).replace(/'/g,"''") + "'";
const timestamp = () => Math.floor(Date.now()/1000);
const python = process.platform === 'win32' ? 'python' : 'python3';
const readJson = async path => JSON.parse((await readFile(path,'utf8')).replace(/^\uFEFF/,''));
const saveJson = (path,data) => writeFile(path,JSON.stringify(data,null,2)+'\n',{mode:0o600});

async function cli(args,{input, json=false}={}) {
  const result=spawnSync(process.execPath,[join(here,'node_modules/wrangler/bin/wrangler.js'),...args],{
    cwd:here,encoding:'utf8',input,maxBuffer:32*1024*1024,
    env:{...process.env,WRANGLER_SEND_METRICS:'false',CI:'true'}
  });
  await writeFile(join(directory,'wrangler-last.private.log'),(result.stdout??'')+(result.stderr??''),{mode:0o600});
  if(result.status!==0)throw new SetupError('Wrangler no completo la operacion. Revisa el registro privado, sin compartirlo completo.');
  return json?parseCliJson(result.stdout):result.stdout;
}

async function config(state) {
  const source=await readJson(join(state.sourceDirectory,'config.private.json'));
  if(binding({...variables(state),...await credentials(state)})!==state.binding)throw new SetupError('Cambio de propietario o servidor: no se reemplaza la configuracion.');
  if(Number(source.ownerId)!==Number(state.ownerId)||source.apiUrl.replace(/\/$/,'')!==state.apiUrl||source.ownerPhone.replace(/^\+/,'')!==state.ownerPhone||source.kapsoPhoneNumberId!==state.numberId)throw new SetupError('La configuracion de origen ya no coincide.');
  const template=JSON.parse(await readFile(join(here,'wrangler.jsonc'),'utf8'));
  template.name=state.name;template.main=join(here,'src/worker.mjs');template.account_id=state.accountId;template.vars=variables(state);
  template.d1_databases=state.databaseId?[{binding:'DB',database_name:state.name,database_id:state.databaseId,migrations_dir:join(here,'migrations')}]:[];
  await saveJson(privateConfig,template);
  return source;
}

function variables(state) {
  return {API_URL:state.apiUrl,OWNER_ID:String(state.ownerId),OWNER_PHONE:state.ownerPhone,KAPSO_NUMBER_ID:state.numberId,AUTO_SAVE:String(state.autoSave)};
}
async function credentials(state) {
  const secrets=await readJson(join(state.sourceDirectory,'secrets.private.json'));
  return {SESSION_ENCRYPTION_KEY:state.encryptionKey,KAPSO_API_KEY:secrets.KAPSO_API_KEY,KAPSO_WEBHOOK_SECRET:secrets.KAPSO_WEBHOOK_SECRET};
}
async function execute(state,text) {
  // Remote --file imports return a summary, not SELECT rows. Read-only queries
  // contain no credentials and must use the query endpoint (--command).
  if(/^SELECT\b/i.test(text.trim()))return cli(['d1','execute',state.name,'--remote','--yes','--json','--command',text,'--config',privateConfig],{json:true});
  const file=join(directory,'operation.private.sql');await writeFile(file,text,{mode:0o600});
  return cli(['d1','execute',state.name,'--remote','--yes','--json','--file',file,'--config',privateConfig],{json:true});
}
const results = output => output.flatMap(x=>x.results??[]);
async function channel(state) {
  const rows=results(await execute(state,'SELECT binding,paused,lease_until,refresh_pending,verified_at,last_error FROM channel WHERE id=1;'));
  if(rows.length!==1||rows[0].binding!==state.binding)throw new SetupError('La base no pertenece al canal configurado.');
  return rows[0];
}
async function maintenance(state) {
  const row=await channel(state);
  if(!row.paused||row.lease_until>=timestamp())throw new SetupError('Pausa primero el Worker y espera a que termine su operacion activa.');
}
async function localReceiverStopped() {
  const listening=await new Promise(resolveResult=>{
    const socket=createConnection({host:'127.0.0.1',port:18765});
    socket.setTimeout(1000);socket.once('connect',()=>{socket.destroy();resolveResult(true);});
    socket.once('error',()=>{socket.destroy();resolveResult(false);});socket.once('timeout',()=>{socket.destroy();resolveResult(false);});
  });
  if(listening)throw new SetupError('El receptor local sigue activo. Detenlo antes de trasladar la cola o activar el Worker.');
}

async function initialize() {
  await mkdir(directory,{recursive:true,mode:0o700});
  const sourceDirectory=resolve(option('--source-dir')??'.local/canales');
  const source=await readJson(join(sourceDirectory,'config.private.json'));
  let existing;
  try { existing=await readJson(stateFile); }
  catch(error){if(error.code!=='ENOENT')throw error;}
  if(existing){await config(existing);console.log('Preparacion privada existente conservada.');return;}
  const account=await cli(['whoami','--json'],{json:true});
  if(!account.loggedIn)throw new SetupError('Autoriza primero a Wrangler desde el navegador.');
  const accounts=account.accounts??[];
  const selected=option('--account-id')?accounts.find(a=>a.id===option('--account-id')):accounts.length===1?accounts[0]:undefined;
  if(!selected)throw new SetupError('Hay varias cuentas o ninguna disponible: selecciona la cuenta exacta con --account-id.');
  const state={sourceDirectory,name:option('--name')??'kaptal-whatsapp',accountId:selected.id,databaseId:null,workerUrl:null,encryptionKey:randomBytes(32).toString('base64url'),apiUrl:source.apiUrl.replace(/\/$/,''),ownerId:source.ownerId,ownerEmail:source.ownerEmail,ownerPhone:source.ownerPhone.replace(/^\+/,''),numberId:source.kapsoPhoneNumberId,autoSave:source.autoSaveRecognized===true,migrated:false};
  if(!/^[a-z][a-z0-9-]{2,40}$/.test(state.name))throw new SetupError('Nombre de Worker no valido.');
  state.binding=binding({...variables(state),...await credentials(state)});
  await saveJson(stateFile,state);await config(state);console.log('Configuracion privada preparada. No se desplego ni cambio el webhook.');
}

async function deploy(state) {
  if(!state.databaseId){
    const before=await cli(['d1','list','--json','--config',privateConfig],{json:true});
    if(before.some(d=>d.name===state.name))throw new SetupError('Ya existe una base con ese nombre. No se reutiliza ni sobrescribe por inferencia.');
    await cli(['d1','create',state.name,'--location','wnam','--update-config=false','--config',privateConfig]);
    const after=await cli(['d1','list','--json','--config',privateConfig],{json:true});
    const created=after.find(d=>d.name===state.name);
    if(!created)throw new SetupError('No se pudo identificar la base nueva.');
    state.databaseId=created.uuid??created.id;
    if(!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(state.databaseId??''))throw new SetupError('Identificador de base no valido. No se continua el despliegue.');
    await saveJson(stateFile,state);await config(state);
  }
  await cli(['d1','migrations','apply',state.name,'--remote','--config',privateConfig]);
  await execute(state,'INSERT OR IGNORE INTO channel(id,binding) VALUES(1,'+literal(state.binding)+');');
  await maintenance(state);
  const output=await cli(['deploy','--config',privateConfig]);
  await cli(['secret','bulk','--config',privateConfig],{input:JSON.stringify(await credentials(state))});
  const url=output.match(/https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev\b/i)?.[0];
  if(!url)throw new SetupError('Worker publicado pero URL no identificada; consulta el registro privado antes de continuar.');
  state.workerUrl=url;await saveJson(stateFile,state);
  console.log('Worker desplegado y pausado. Cola y webhook actuales conservados.');
}

async function connect(state) {
  await maintenance(state);
  await saveJson(join(directory,'config.private.json'),{
    apiUrl:state.apiUrl,ownerId:state.ownerId,ownerEmail:state.ownerEmail,ownerPhone:state.ownerPhone,
    kapsoPhoneNumberId:state.numberId,publicWebhookUrl:state.workerUrl+'/webhooks/kapso',allAccounts:true,autoSaveRecognized:state.autoSave,accounts:{},bankRules:[]
  });
  const result=spawnSync(python,[join(project,'tools/canales/whatsapp_setup.py'),'connect','--directory',directory],{stdio:'inherit'});
  if(result.status!==0)throw new SetupError('No se completo la autorizacion independiente de Kaptal.');
  const extraction=spawnSync(python,['-c',"import http.cookiejar,json,sys;c=http.cookiejar.MozillaCookieJar();c.load(sys.argv[1],ignore_discard=True);v=[x.value for x in c if x.name=='finanzas_refresh'];assert len(v)==1;print(json.dumps({'cookie':v[0],'expires':0}))",join(directory,'inbox.sqlite.session')],{encoding:'utf8'});
  if(extraction.status!==0)throw new SetupError('No se pudo preparar la sesion del canal.');
  await maintenance(state);
  const env={...variables(state),...await credentials(state)};
  const ciphertext=await seal(env,'secret:auth',JSON.parse(extraction.stdout));
  await execute(state,"INSERT INTO secrets(name,ciphertext) VALUES('auth',"+literal(ciphertext)+") ON CONFLICT(name) DO UPDATE SET ciphertext=excluded.ciphertext;UPDATE channel SET refresh_pending=0,verified_at=0,last_error=NULL WHERE id=1;");
  // This independent cookie now belongs to D1. Never rotate a stale workstation copy.
  await unlink(join(directory,'inbox.sqlite.session'));
  console.log('Sesion independiente guardada cifrada en D1. No se registro dinero ni se activo el webhook.');
}

async function migrate(state) {
  await maintenance(state);await localReceiverStopped();
  const extraction=spawnSync(python,['-c',`
import json,sqlite3,sys
from pathlib import Path
p=Path(sys.argv[1]);c=json.loads((p/'config.private.json').read_text(encoding='utf-8-sig'))
d=sqlite3.connect((p/'inbox.sqlite').resolve().as_uri()+'?mode=ro',uri=True);d.row_factory=sqlite3.Row;d.execute('BEGIN')
assert json.loads(d.execute('SELECT identity FROM owner').fetchone()[0])==[c['apiUrl'],c['ownerId']]
binding=d.execute('SELECT identity FROM channel_owner').fetchone()
assert binding and json.loads(binding[0])==[c['ownerPhone'].removeprefix('+'),c['kapsoPhoneNumberId']]
rows=[dict(r) for r in d.execute("SELECT * FROM events WHERE source IN ('whatsapp','whatsapp-chat','whatsapp-audio','codex') ORDER BY rowid")]
context=d.execute('SELECT text,expires FROM chat_context').fetchone()
print(json.dumps({'events':rows,'context':dict(context) if context else None}));d.close()
`,state.sourceDirectory],{encoding:'utf8',maxBuffer:32*1024*1024});
  if(extraction.status!==0)throw new SetupError('No se pudo validar/exportar la cola local. No se activa el Worker.');
  const snapshot=JSON.parse(extraction.stdout),env={...variables(state),...await credentials(state)};
  let statements=[];
  for(const row of snapshot.events){
    const {data,stage}=importRow(row);
    const cipher=await seal(env,'event:'+row.key,data);
    statements.push(`INSERT OR IGNORE INTO events(key,source,state,payload,received_at,replied) VALUES(${literal(row.key)},${literal(row.source)},${literal(stage)},${literal(cipher)},${Number(row.received_at??0)},${Number(row.replied)});`);
    if(statements.length===25){await execute(state,statements.join('\n'));statements=[];}
  }
  if(statements.length)await execute(state,statements.join('\n'));
  if(snapshot.context?.expires>timestamp()){
    const cipher=await seal(env,'secret:context',snapshot.context);
    await execute(state,"INSERT INTO secrets(name,ciphertext) VALUES('context',"+literal(cipher)+") ON CONFLICT(name) DO UPDATE SET ciphertext=excluded.ciphertext;");
  }
  state.migrated=true;await saveJson(stateFile,state);console.log('Cola trasladada sin cambiar claves ni borrar el origen. Worker aun pausado.');
}

async function main(){
  if(command==='init')return initialize();
  const state=await readJson(stateFile);await config(state);
  if(command==='deploy')return deploy(state);
  if(command==='connect')return connect(state);
  if(command==='migrate')return migrate(state);
  if(command==='pause'){await execute(state,'UPDATE channel SET paused=1 WHERE id=1;');console.log('Worker pausado; espera a que termine su lease antes de mantenimiento.');return;}
  if(command==='disconnect'){
    await maintenance(state);
    const rows=results(await execute(state,"SELECT ciphertext FROM secrets WHERE name='auth';"));
    if(rows.length){
      const auth=await open({...variables(state),...await credentials(state)},'secret:auth',rows[0].ciphertext);
      const response=await fetch(state.apiUrl+'/api/auth/logout',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json','X-Gestion-Sesion':'1',Cookie:'finanzas_refresh='+auth.cookie},body:'{}'});
      if(!response.ok||!(await response.json()).success)throw new SetupError('No se pudo confirmar la revocacion. La sesion cifrada se conserva para revisarla.');
    }
    await execute(state,"DELETE FROM secrets WHERE name='auth';UPDATE channel SET verified_at=0,refresh_pending=0,last_error=NULL WHERE id=1;");
    console.log('Sesion del Worker revocada; cola conservada. Desactiva tambien el webhook de Kapso.');return;
  }
  if(command==='retry-response'){
    await maintenance(state);
    if(!argv.includes('--accept-duplicate-risk')||!/^[-0-9a-f]{36}$/.test(option('--id')??''))throw new SetupError('Revisa la entrega en Kapso e indica --id y --accept-duplicate-risk.');
    await execute(state,"UPDATE events SET replied=0,next_attempt=0 WHERE key="+literal(option('--id'))+" AND replied=-1;");
    console.log('Respuesta preparada para revision/reintento; no se repite el registro financiero.');return;
  }
  if(command==='resume'){
    await maintenance(state);await localReceiverStopped();if(!state.migrated)throw new SetupError('Primero traslada la cola local.');
    const key=crypto.randomUUID(),env={...variables(state),...await credentials(state)};
    await execute(state,`INSERT INTO events(key,source,state,payload,received_at) VALUES(${literal(key)},'probe','probe',${literal(await seal(env,'event:'+key,{}))},${timestamp()});UPDATE channel SET paused=0 WHERE id=1 AND refresh_pending=0 AND EXISTS(SELECT 1 FROM secrets WHERE name='auth');`);
    if((await channel(state)).paused)throw new SetupError('Falta una sesion valida. Autoriza con connect antes de habilitar el procesador.');
    console.log('Procesador habilitado. Espera la comprobacion de sesion y verifica /ready antes de cambiar Kapso.');return;
  }
  if(command==='status'){
    const row=await channel(state);const counts=results(await execute(state,'SELECT state,replied,count(*) AS total FROM events GROUP BY state,replied;'));
    console.log(JSON.stringify({paused:!!row.paused,reconnectRequired:!!row.refresh_pending,sessionVerified:row.verified_at>0,pendingError:!!row.last_error,events:counts}));return;
  }
  throw new SetupError('Usa init, deploy, connect, migrate, pause, resume, disconnect, retry-response o status.');
}
main().catch(error=>{console.error(error instanceof SetupError?error.message:'No se completo la operacion. Revisa configuracion, autorizacion y registros privados; no compartas secretos.');process.exitCode=1;});
