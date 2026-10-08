import { AiActionProposal } from '../models/ai.models';
import { Categoria, Cuenta, TransaccionPayload } from '../models/finanzas.models';
import { fechaFinanciera } from './fecha-financiera';

const normalizar=(texto:string)=>texto.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().trim().replace(/\s+/g,' ');

/** Reglas deliberadamente limitadas: no usan balances ni envían texto a proveedores. */
export function prepararCapturaOffline(texto:string,cuentas:Cuenta[],categorias:Categoria[],hoy=fechaFinanciera()):AiActionProposal {
  const limpio=normalizar(texto);
  if(/-\s*\d/.test(texto.replace(/\b\d{4}-\d{2}-\d{2}\b/g,'')))throw new Error('El monto debe ser positivo.');
  if(/\b(msi|meses|mensual|recurrente|cada|anual)\b/.test(limpio))throw new Error('MSI y recurrencias necesitan conexión. El texto sigue disponible.');
  const tipo=/^(?:por favor )?(?:(?:registra|anota) (?:un )?)?(transferi|transfiere|transferencia)/.test(limpio)?'TRANSFERENCIA'
    :/^(?:por favor )?(?:(?:registra|anota) (?:un )?)?(recibi|ingrese|ingreso)/.test(limpio)?'INGRESO'
    :/^(?:por favor )?(?:(?:registra|anota) (?:un )?)?(gaste|gasto|pague|compra|compre)/.test(limpio)?'GASTO':null;
  if(!tipo)throw new Error('Sin conexión puedes preparar un gasto, ingreso o transferencia con monto. Reportes, IA y voz necesitan conexión.');
  if(/^pague.*\b(tarjeta|deuda|credito)\b/.test(limpio))throw new Error('Indica una transferencia con cuenta origen y destino para pagar una tarjeta.');
  const fechas=texto.match(/\b\d{4}-\d{2}-\d{2}\b/g)??[];
  if(fechas.length>1)throw new Error('Indica una sola fecha.');
  let fecha=fechas[0]??hoy;
  if(fechas.length){const date=new Date(fecha+'T12:00:00Z');if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==fecha)throw new Error('La fecha no existe. Usa AAAA-MM-DD.');}
  else if(/\b(anteayer|ayer|manana)\b/.test(limpio)){
    const date=new Date(hoy+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+(/\banteayer\b/.test(limpio)?-2:/\bayer\b/.test(limpio)?-1:1));fecha=date.toISOString().slice(0,10);
  }else if(/\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo|pasado|hace|semana|mes|ano)\b/.test(limpio))throw new Error('Indica la fecha exacta para prepararlo sin conexión.');
  const importes=texto.replace(/\b\d{4}-\d{2}-\d{2}\b/g,'').match(/\d+(?:[.,]\d+)*/g)??[];
  if(importes.length!==1)throw new Error('Prepara un movimiento por mensaje con un solo monto.');
  let importe=importes[0];
  if(/^\d+,\d{1,2}$/.test(importe))importe=importe.replace(',','.');
  if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(importe))throw new Error('Usa un monto con hasta dos decimales, por ejemplo 1234.50.');
  const monto=Number(importe.replace(/,/g,''));
  if(!Number.isFinite(monto)||monto<0.01||monto>9999999999999.99)throw new Error('El monto debe ser positivo y tener hasta 13 dígitos enteros.');
  const activas=cuentas.filter(c=>c.activo);
  const menciones=activas.filter(c=>(' '+limpio+' ').includes(' '+normalizar(c.nombre)+' '));
  let cuentaId:number|null=menciones.length===1?menciones[0].id:activas.length===1?activas[0].id:null;
  let cuentaDestinoId:number|null=null;
  if(tipo==='TRANSFERENCIA'){
    const nombres=limpio.replace(/\b\d{4}-\d{2}-\d{2}\b/g,'').replace(/\b(hoy|ayer|anteayer|manana)\b/g,'').match(/\b(?:de|desde) (.+?) a (.+)$/);
    cuentaId=nombres?activas.find(c=>normalizar(c.nombre)===nombres[1].trim())?.id??null:null;
    cuentaDestinoId=nombres?activas.find(c=>normalizar(c.nombre)===nombres[2].trim())?.id??null:null;
  }
  const coincidencias=categorias.filter(c=>c.activo&&c.tipo===tipo&&(' '+limpio+' ').includes(' '+normalizar(c.nombre)+' '));
  const cuenta=activas.find(c=>c.id===cuentaId)?.nombre??'Cuenta por seleccionar';
  const destino=tipo==='TRANSFERENCIA'?' a '+(activas.find(c=>c.id===cuentaDestinoId)?.nombre??'destino por seleccionar'):'';
  return {id:crypto.randomUUID(),local:true,version:0,type:'CREATE_TRANSACTION',summary:`${tipo} de ${monto} · ${cuenta}${destino} · ${fecha}`,
    data:{tipo,monto,fecha,cuentaId,cuentaDestinoId,categoriaId:coincidencias.length===1?coincidencias[0].id:null,descripcion:texto.slice(0,200)}};
}

export function validarPayloadOffline(datos:Record<string,unknown>,cuentas:Cuenta[],categorias:Categoria[]):TransaccionPayload {
  const monto=Number(datos['monto']),tipo=datos['tipo'],fecha=String(datos['fecha']??'');
  if(!['GASTO','INGRESO','TRANSFERENCIA'].includes(String(tipo)))throw new Error('Elige gasto, ingreso o transferencia.');
  if(!Number.isFinite(monto)||monto<=0||monto>9999999999999.99||!/^\d+(?:\.\d{1,2})?$/.test(String(monto)))throw new Error('El monto debe ser positivo y tener hasta dos decimales.');
  const dia=new Date(fecha+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(fecha)||!Number.isFinite(dia.getTime())||dia.toISOString().slice(0,10)!==fecha)throw new Error('Elige una fecha válida.');
  const origen=cuentas.find(c=>c.id===datos['cuentaId']&&c.activo);if(!origen)throw new Error('Selecciona una cuenta guardada de este usuario en Editar propuesta.');
  if(tipo==='TRANSFERENCIA'){
    const destino=cuentas.find(c=>c.id===datos['cuentaDestinoId']&&c.activo);
    if(!destino||origen.id===destino.id)throw new Error('Selecciona cuentas distintas para la transferencia.');
    if(origen.tipo==='CREDITO'&&destino.tipo==='CREDITO')throw new Error('No puedes transferir entre tarjetas de crédito.');
    if(origen.moneda!==destino.moneda&&(!Number.isFinite(Number(datos['tasaCambio']))||Number(datos['tasaCambio'])<=0))throw new Error('Indica la tasa de cambio entre estas monedas.');
  }
  if(datos['categoriaId']!=null&&!categorias.some(c=>c.id===datos['categoriaId']&&c.activo&&c.tipo===tipo))throw new Error('Selecciona una categoría compatible o ninguna.');
  if(String(datos['descripcion']??'').length>200||String(datos['notas']??'').length>500)throw new Error('Reduce la descripción o las notas.');
  if(datos['msi']||datos['frecuenciaRecurrencia'])throw new Error('MSI y recurrencias necesitan validación con conexión.');
  return {...datos,monto} as unknown as TransaccionPayload;
}
