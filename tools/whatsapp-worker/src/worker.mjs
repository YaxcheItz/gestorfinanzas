const encoder = new TextEncoder();
const decoder = new TextDecoder();
const MAX_BODY = 65536;
const now = () => Math.floor(Date.now() / 1000);
const normal = text => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ');
const day = timestamp => new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date(timestamp * 1000));
const b64 = bytes => btoa(String.fromCharCode(...bytes));
const unb64 = text => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const sql = (env, text, ...values) => env.DB.prepare(text).bind(...values);
const nextEvent = env => sql(env, 'SELECT * FROM events WHERE next_attempt<=? AND (state IN (\'pending\',\'ready\',\'audio_wait\',\'probe\') OR (replied=0 AND state IN (\'answered\',\'saved\',\'inbox\',\'audio_review\'))) ORDER BY received_at,rowid LIMIT 1', now()).first();
const fail = message => { throw new Error(message); };

export function binding(env) {
  const url = new URL(env.API_URL);
  const test = env.ALLOW_LOOPBACK_TEST === 'true' && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
  if ((!test && url.protocol !== 'https:') || url.pathname !== '/' || url.username || url.password || url.search || url.hash) fail('config');
  if (!/^[1-9]\d*$/.test(env.OWNER_ID ?? '') || !/^[1-9]\d{7,14}$/.test(env.OWNER_PHONE ?? '') || !/^[0-9]+$/.test(env.KAPSO_NUMBER_ID ?? '')) fail('config');
  if (unb64(env.SESSION_ENCRYPTION_KEY).length !== 32 || (env.KAPSO_WEBHOOK_SECRET?.length ?? 0) < 32 || !env.KAPSO_API_KEY) fail('config');
  return JSON.stringify([url.origin, Number(env.OWNER_ID), env.OWNER_PHONE, env.KAPSO_NUMBER_ID]);
}

export async function seal(env, label, value) {
  const key = await crypto.subtle.importKey('raw', unb64(env.SESSION_ENCRYPTION_KEY), 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({name: 'AES-GCM', iv, additionalData: encoder.encode(binding(env) + ':' + label)}, key, encoder.encode(JSON.stringify(value)));
  return JSON.stringify({iv: b64(iv), data: b64(new Uint8Array(data))});
}

export async function open(env, label, ciphertext) {
  const {iv, data} = JSON.parse(ciphertext);
  const key = await crypto.subtle.importKey('raw', unb64(env.SESSION_ENCRYPTION_KEY), 'AES-GCM', false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({name: 'AES-GCM', iv: unb64(iv), additionalData: encoder.encode(binding(env) + ':' + label)}, key, unb64(data));
  return JSON.parse(decoder.decode(plain));
}

export async function ensureChannel(env) {
  const identity = binding(env);
  await sql(env, 'INSERT OR IGNORE INTO channel(id,binding) VALUES(1,?)', identity).run();
  const channel = await sql(env, 'SELECT * FROM channel WHERE id=1').first();
  if (channel.binding !== identity) fail('owner');
  return channel;
}

export async function eventKey(env, source, id) {
  // Same UUIDv5 namespace and names as the Python bridge: migration preserves deduplication.
  const namespace = Uint8Array.from('6ba7b8119dad11d180b400c04fd430c8'.match(/../g), x => parseInt(x, 16));
  const name = encoder.encode(`kaptal:${env.OWNER_ID}:${source}:${id}`);
  const bytes = new Uint8Array(namespace.length + name.length);
  bytes.set(namespace); bytes.set(name, namespace.length);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-1', bytes)).slice(0, 16);
  hash[6] = (hash[6] & 15) | 80; hash[8] = (hash[8] & 63) | 128;
  const hex = [...hash].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

async function boundedBody(body, max) {
  const reader = body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks = []; let size = 0;
  try {
    while (true) {
      const {value, done} = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max) fail('size');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

export async function receive(request, env) {
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return 415;
  let raw;
  try { raw = await boundedBody(request.body, MAX_BODY); } catch { return 413; }
  const signature = request.headers.get('X-Webhook-Signature');
  if (!/^[a-f0-9]{64}$/.test(signature ?? '')) return 401;
  const key = await crypto.subtle.importKey('raw', encoder.encode(env.KAPSO_WEBHOOK_SECRET), {name: 'HMAC', hash: 'SHA-256'}, false, ['verify']);
  const valid = await crypto.subtle.verify('HMAC', key, Uint8Array.from(signature.match(/../g), x => parseInt(x, 16)), raw);
  if (!valid) return 401;
  let event;
  try { event = JSON.parse(decoder.decode(raw)); } catch { return 400; }
  const message = event?.message;
  if (!message || typeof message !== 'object' || Array.isArray(message) || !message.kapso || typeof message.kapso !== 'object' || event.batch) return 400;
  if (event.phone_number_id !== env.KAPSO_NUMBER_ID || String(message.from ?? '').replace(/^\+/, '') !== env.OWNER_PHONE) return 401;
  if (message.kapso.direction !== 'inbound' || message.kapso.passive) return 200;
  const timestamp = Number(message.timestamp);
  if (!Number.isSafeInteger(timestamp) || timestamp < 1) return 400;
  if (now() - timestamp > 86400 || timestamp - now() > 300) return 200;
  if (typeof message.id !== 'string' || !message.id || message.id.length > 512) return 400;
  let source = 'whatsapp-chat', state = 'pending', payload;
  if (message.type === 'text') {
    const text = message.text?.body;
    if (typeof text !== 'string' || !text.trim() || text.length > 1200) return 400;
    if (text.startsWith('/codex ')) {
      // Requests for a human review only; never execute commands or start agents.
      source = 'codex'; state = 'answered';
      payload = {note: text.slice(7), response: 'Solicitud recibida para revision. No se ejecutan comandos desde WhatsApp.'};
    } else payload = {note: text};
  } else if (message.type === 'audio') {
    const transcript = message.kapso.transcript?.text;
    if (transcript != null && (typeof transcript !== 'string' || transcript.length > 1200)) return 400;
    source = 'whatsapp-audio'; state = 'audio_wait';
    payload = {messageId: message.id, transcript: transcript ?? null, audioExpires: now() + 120};
  } else {
    state = 'answered'; payload = {response: 'Ese tipo de mensaje no se puede registrar. Envia texto o una nota de voz.'};
  }
  await ensureChannel(env);
  const id = await eventKey(env, source, message.id);
  await sql(env, 'INSERT OR IGNORE INTO events(key,source,state,payload,received_at) VALUES(?,?,?,?,?)', id, source, state, await seal(env, 'event:' + id, payload), timestamp).run();
  return 200; // Durable receipt precedes every external API call.
}

async function assertLease(env, run) {
  if (Date.now() > run.deadline) fail('deadline');
  const row = await sql(env, 'SELECT lease,lease_until,paused FROM channel WHERE id=1').first();
  if (row.paused || row.lease !== run.id || row.lease_until < now() + 10) fail('lease');
}

async function jsonFetch(url, options, run) {
  const remaining = run.deadline - Date.now();
  if (remaining < 200) fail('deadline');
  const response = await fetch(url, {...options, redirect: 'manual', signal: AbortSignal.timeout(Math.min(8000, remaining))});
  const raw = await boundedBody(response.body, 2_000_000);
  if (!response.ok) { const error = new Error('upstream'); error.status = response.status; throw error; }
  return {body: JSON.parse(decoder.decode(raw)), headers: response.headers};
}

async function loadSecret(env, name) {
  const row = await sql(env, 'SELECT ciphertext FROM secrets WHERE name=?', name).first();
  return row ? open(env, 'secret:' + name, row.ciphertext) : null;
}

async function storeSecret(env, name, value) {
  await sql(env, 'INSERT INTO secrets(name,ciphertext) VALUES(?,?) ON CONFLICT(name) DO UPDATE SET ciphertext=excluded.ciphertext', name, await seal(env, 'secret:' + name, value)).run();
}

async function refresh(env, run) {
  await assertLease(env, run);
  const channel = await sql(env, 'SELECT refresh_pending FROM channel WHERE id=1').first();
  const auth = await loadSecret(env, 'auth');
  if (channel.refresh_pending || !auth?.cookie) fail('reconnect');
  // A lost rotation response must NEVER trigger reuse of the previous refresh cookie.
  await sql(env, 'UPDATE channel SET refresh_pending=1 WHERE id=1 AND lease=?', run.id).run();
  const {body, headers} = await jsonFetch(env.API_URL.replace(/\/$/, '') + '/api/auth/refresh', {
    method: 'POST', headers: {'Content-Type': 'application/json', 'X-Gestion-Sesion': '1', Cookie: 'finanzas_refresh=' + auth.cookie}, body: '{}'
  }, run);
  if (!body.success || body.data?.id !== Number(env.OWNER_ID) || typeof body.data.token !== 'string') fail('owner');
  const setCookies = headers.getSetCookie?.() ?? [headers.get('set-cookie') ?? ''];
  const cookie = setCookies.map(x => x.match(/(?:^|,\s*)finanzas_refresh=([^;\s,]+)/)?.[1]).find(Boolean);
  if (!cookie || !/^[A-Za-z0-9._~-]{20,2048}$/.test(cookie)) fail('reconnect');
  await assertLease(env, run);
  const updated = {cookie, token: body.data.token, expires: now() + 600};
  const ciphertext = await seal(env, 'secret:auth', updated);
  await env.DB.batch([
    sql(env, 'UPDATE secrets SET ciphertext=? WHERE name=\'auth\' AND EXISTS(SELECT 1 FROM channel WHERE lease=?)', ciphertext, run.id),
    sql(env, 'UPDATE channel SET refresh_pending=0 WHERE id=1 AND lease=?', run.id)
  ]);
  return updated;
}

async function api(env, run, path, payload, retry = true) {
  await assertLease(env, run);
  let auth = await loadSecret(env, 'auth');
  if (!auth?.token || auth.expires < now() + 30) auth = await refresh(env, run);
  let result;
  try {
    result = await jsonFetch(env.API_URL.replace(/\/$/, '') + '/api' + path, {
      method: payload === undefined ? 'GET' : 'POST',
      headers: {Authorization: 'Bearer ' + auth.token, 'Content-Type': 'application/json'},
      body: payload === undefined ? undefined : JSON.stringify(payload)
    }, run);
  } catch (error) {
    if (error.status !== 401 || !retry) throw error;
    await refresh(env, run);
    return api(env, run, path, payload, false);
  }
  if (!result.body.success) fail('upstream');
  return result.body.data;
}

async function saveEvent(env, run, row, payload, state = row.state, replied = row.replied, nextAttempt = 0) {
  await assertLease(env, run);
  await sql(env, 'UPDATE events SET payload=?,state=?,replied=?,next_attempt=? WHERE key=? AND EXISTS(SELECT 1 FROM channel WHERE lease=?)', await seal(env, 'event:' + row.key, payload), state, replied, nextAttempt, row.key, run.id).run();
}

async function answer(env, run, row, text) {
  await saveEvent(env, run, row, {response: text.slice(0, 3800)}, 'answered');
}

async function processText(env, run, row, payload) {
  if (day(row.received_at) !== day(now())) return answer(env, run, row, 'Tu mensaje quedo pendiente desde otro dia. Envialo otra vez con fecha explicita. No se registro dinero.');
  let text = payload.note;
  if (normal(text) === 'ayuda' || normal(text) === '/ayuda') return answer(env, run, row,
    'Puedes pedir saldo, saldo de Nombre de cuenta, resumen de este mes, categorias, presupuestos o movimientos recientes.\nPara registrar: gaste 180 en comida con Nombre de cuenta. Si falta la cuenta, te la preguntare.\nPuedes enviar una nota de voz y revisar su transcripcion. Escribe cancelar para descartar el borrador. Los posibles duplicados se revisan en Avisos de Kaptal.');
  if (normal(text) === 'cancelar') {
    await env.DB.batch([
      sql(env, 'DELETE FROM secrets WHERE name=\'context\''),
      sql(env, 'UPDATE events SET state=\'cancelled\' WHERE source=\'whatsapp-audio\' AND state IN (\'audio_wait\',\'audio_review\')')
    ]);
    return answer(env, run, row, 'Borrador cancelado. No se registro dinero.');
  }
  if (normal(text).startsWith('confirmar audio ')) {
    const code = normal(text).slice('confirmar audio '.length);
    const matches = /^[0-9a-f]{8}$/.test(code) ? (await sql(env, 'SELECT * FROM events WHERE source=\'whatsapp-audio\' AND state=\'audio_review\' AND substr(key,1,8)=?', code).all()).results : [];
    const audio = matches.length === 1 ? await open(env, 'event:' + matches[0].key, matches[0].payload) : null;
    if (!audio?.transcript || audio.audioExpires < now()) return answer(env, run, row, 'Ese audio ya no esta disponible. Envia texto o una nueva nota de voz.');
    text = audio.transcript;
    await assertLease(env, run);
    await env.DB.batch([
      sql(env, 'UPDATE events SET state=\'confirmed\' WHERE key=?', matches[0].key),
      sql(env, 'UPDATE events SET payload=? WHERE key=?', await seal(env, 'event:' + row.key, {note: text}), row.key)
    ]);
    payload = {note: text};
  }
  const context = await loadSecret(env, 'context');
  if (context?.expires > now()) {
    const accounts = await api(env, run, '/cuentas');
    const selection = normal(text).replace(/^(con|desde|cuenta) /, '');
    const names = accounts.filter(a => a.activo && normal(a.nombre) === selection);
    if (names.length === 1) text = context.text + ' desde ' + names[0].nombre;
  }
  if (text.length > 1200) text = payload.note;
  const result = await api(env, run, '/canales/whatsapp/interpretar', {texto: text});
  if (!['CONSULTA', 'ACLARACION', 'PROPUESTA'].includes(result?.tipo)) fail('format');
  if (result.contexto) await storeSecret(env, 'context', {text: result.contexto, expires: now() + 900});
  else await sql(env, 'DELETE FROM secrets WHERE name=\'context\'').run();
  if (result.tipo === 'PROPUESTA' && result.propuesta) {
    return saveEvent(env, run, row, {candidate: {...result.propuesta, _currency: result.moneda}}, 'ready');
  }
  let response = result.respuesta;
  if (typeof response !== 'string') fail('format');
  if (result.sugerencias?.length) response += '\n' + result.sugerencias.slice(0, 8).map(x => String(x).slice(0, 100)).join('\n');
  if (result.contexto) response += '\nResponde con el nombre de la cuenta o escribe cancelar. El borrador dura 15 minutos.';
  return answer(env, run, row, response);
}

async function processCandidate(env, run, row, payload) {
  const tx = payload.candidate;
  const accounts = await api(env, run, '/cuentas');
  const actual = accounts.find(a => a.id === tx.cuentaId && a.activo);
  if (!actual || actual.moneda !== tx._currency) return answer(env, run, row, 'La cuenta ya no esta disponible o cambio de moneda. No se registro dinero; envia el movimiento corregido.');
  const { _currency, ...data } = tx;
  const notice = {origen: 'WHATSAPP', identificador: row.key, claveRegistro: row.key, resumen: tx.descripcion, clase: {GASTO: 'COMPRA', INGRESO: 'INGRESO', TRANSFERENCIA: 'TRANSFERENCIA'}[tx.tipo], moneda: _currency, datos: data};
  let result = await api(env, run, '/avisos', notice);
  if (env.AUTO_SAVE === 'true' && !result.coincidencias?.length && result.estado === 'PENDIENTE') {
    try { result = await api(env, run, '/avisos/' + encodeURIComponent(result.id) + '/confirmar', {version: result.version, aceptarPosibleDuplicado: false}); }
    catch (error) { if (![400, 409, 422].includes(error.status)) throw error; }
  }
  const saved = result.estado === 'REGISTRADO';
  await saveEvent(env, run, row, {...payload, result: result.id, response: saved ? 'Movimiento registrado en Kaptal.' : 'Aviso pendiente en Kaptal. Revisalo antes de guardar; si hay movimientos parecidos, confirma en la app si es otra operacion.'}, saved ? 'saved' : 'inbox');
}

async function processAudio(env, run, row, payload) {
  let text = payload.transcript;
  if (!text && payload.audioExpires > now()) {
    const result = await jsonFetch('https://api.kapso.ai/meta/whatsapp/v24.0/' + env.KAPSO_NUMBER_ID + '/messages/' + encodeURIComponent(payload.messageId), {headers: {'X-API-Key': env.KAPSO_API_KEY}}, run);
    const message = result.body;
    if (message.id !== payload.messageId || String(message.from ?? '').replace(/^\+/, '') !== env.OWNER_PHONE || message.type !== 'audio' || message.kapso?.direction !== 'inbound' || message.kapso.passive) fail('owner');
    text = message.kapso.transcript?.text;
  }
  if (text != null && (typeof text !== 'string' || !text.trim() || text.length > 1200)) text = null;
  if (!text && payload.audioExpires > now()) return saveEvent(env, run, row, payload, row.state, row.replied, now() + 15);
  if (!text) return answer(env, run, row, 'No pude obtener la transcripcion. No se registro dinero. Envia el movimiento por texto.');
  await saveEvent(env, run, row, {...payload, transcript: text.trim(), audioExpires: now() + 900, response: 'Entendi: "' + text.trim() + '"\nRevisa importe y cuenta. Para usar este texto responde: confirmar audio ' + row.key.slice(0, 8) + '\nSi esta mal, envia el texto corregido o escribe cancelar. Caduca en 15 minutos.'}, 'audio_review');
}

async function reply(env, run, row, payload) {
  if (!payload.response || now() - row.received_at > 86100) return saveEvent(env, run, row, payload, row.state, -2);
  // Persist an uncertain attempt before sending. A timeout is never retried blindly.
  await saveEvent(env, run, row, payload, row.state, -1);
  const result = await jsonFetch('https://api.kapso.ai/meta/whatsapp/v24.0/' + env.KAPSO_NUMBER_ID + '/messages', {
    method: 'POST', headers: {'X-API-Key': env.KAPSO_API_KEY, 'Content-Type': 'application/json'},
    body: JSON.stringify({messaging_product: 'whatsapp', to: env.OWNER_PHONE, type: 'text', text: {body: payload.response}})
  }, run);
  if (!result.body.messages?.[0]?.id) fail('delivery');
  await saveEvent(env, run, row, payload, row.state, 1);
}

export async function drain(env) {
  const channel = await ensureChannel(env);
  if (channel.paused || channel.refresh_pending) return;
  if (!await nextEvent(env)) return;
  const run = {id: crypto.randomUUID(), deadline: Date.now() + 24000};
  const claim = await sql(env, 'UPDATE channel SET lease=?,lease_until=? WHERE id=1 AND paused=0 AND lease_until<?', run.id, now() + 120, now()).run();
  if (!claim.meta.changes) return;
  try {
    for (let step = 0; step < 4 && Date.now() < run.deadline - 1500; step++) {
      const row = await nextEvent(env);
      if (!row) break;
      try {
        const profile = await api(env, run, '/perfil');
        if (profile.id !== Number(env.OWNER_ID)) fail('owner');
        await sql(env, 'UPDATE channel SET verified_at=? WHERE id=1 AND lease=?', now(), run.id).run();
        const payload = await open(env, 'event:' + row.key, row.payload);
        if (row.state === 'probe') await saveEvent(env, run, row, {}, 'probe_done', 1);
        else if (row.state === 'pending') await processText(env, run, row, payload);
        else if (row.state === 'ready') await processCandidate(env, run, row, payload);
        else if (row.state === 'audio_wait') await processAudio(env, run, row, payload);
        else await reply(env, run, row, payload);
        await sql(env, 'UPDATE channel SET last_error=NULL WHERE id=1 AND lease=?', run.id).run();
      } catch {
        await sql(env, 'UPDATE events SET next_attempt=? WHERE key=?', now() + 60, row.key).run();
        await sql(env, 'UPDATE channel SET last_error=\'pending\' WHERE id=1 AND lease=?', run.id).run();
        break;
      }
    }
  } finally {
    await sql(env, 'UPDATE channel SET lease=NULL,lease_until=0 WHERE id=1 AND lease=?', run.id).run();
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (request.method === 'GET' && url.pathname === '/health') return Response.json({ok: true}, {headers: {'Cache-Control': 'no-store'}});
      if (request.method === 'GET' && url.pathname === '/ready') {
        const channel = await ensureChannel(env);
        const auth = await sql(env, 'SELECT 1 FROM secrets WHERE name=\'auth\'').first();
        const ok = !!auth && channel.verified_at > 0 && !channel.paused && !channel.refresh_pending && !channel.last_error;
        return Response.json({ok}, {status: ok ? 200 : 503, headers: {'Cache-Control': 'no-store'}});
      }
      if (request.method !== 'POST' || url.pathname !== '/webhooks/kapso') return new Response(null, {status: 404});
      binding(env);
      const status = await receive(request, env);
      if (status === 200) ctx.waitUntil(drain(env).catch(() => {}));
      return new Response(null, {status});
    } catch { return new Response(null, {status: 503}); }
  },
  async scheduled(_controller, env, ctx) { ctx.waitUntil(drain(env).catch(() => {})); }
};
