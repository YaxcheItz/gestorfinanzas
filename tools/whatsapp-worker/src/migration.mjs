/** Translate only the personal bridge's metadata; financial keys and dates stay intact. */
export function importRow(row) {
  if (!/^[0-9a-f-]{36}$/.test(row.key) || !['whatsapp','whatsapp-chat','whatsapp-audio','codex'].includes(row.source)) throw new Error('Invalid queue row');
  if (![-2,-1,0,1].includes(Number(row.replied)) || !Number.isSafeInteger(Number(row.received_at??0))) throw new Error('Invalid queue metadata');
  const old=JSON.parse(row.payload);
  let data=old.cuentaId?{candidate:old}:old;
  let stage=row.state;
  if(data.candidate&&stage==='pending')stage='ready';
  if(row.source==='whatsapp-audio'){
    data={...data,audioExpires:old.expires??0};
    if(stage==='pending')stage='audio_wait';
    if(stage==='answered'&&old.transcript)stage='audio_review';
  }
  if(row.source==='codex'&&stage==='pending')stage='answered';
  if(row.source==='whatsapp'&&stage==='pending'&&!data.candidate)stage='manual';
  data.response=row.response??data.response??(row.state==='saved'?'Movimiento registrado en Kaptal.':row.source==='codex'?'Solicitud recibida para revision. No se ejecutan comandos.':'Aviso pendiente en Kaptal; revisalo antes de guardar.');
  return {data,stage};
}
