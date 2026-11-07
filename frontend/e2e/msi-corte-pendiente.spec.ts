import {test,expect} from '@playwright/test';
import {registrarPrueba} from './registro-helper';
test('MSI antes del corte retiene credito sin cargo ni gasto en el historial',async({request})=>{
 const registro=await registrarPrueba(request,{nombre:'QA MSI corte',email:`corte-${crypto.randomUUID()}@example.test`,password:'Password123'});expect(registro.ok()).toBeTruthy();
 const auth=(await registro.json()).data,headers={Authorization:`Bearer ${auth.token}`};
 const cuenta=await request.post('/api/cuentas',{headers,data:{nombre:'Tarjeta ficticia corte',tipo:'CREDITO',moneda:'MXN',limiteCredito:1000,diaCorte:28,diaPago:10,saldoInicial:0}});expect(cuenta.ok()).toBeTruthy();const cid=(await cuenta.json()).data.id;
 const fecha=new Date();fecha.setUTCMonth(fecha.getUTCMonth()+1,1);const dia=fecha.toISOString().slice(0,10);
 const datos={cuentaId:cid,tipo:'GASTO',monto:90,fecha:dia,descripcion:'Ficticia pendiente',msi:3};
 const compra=await request.post('/api/transacciones',{headers,data:datos});expect(compra.ok(),await compra.text()).toBeTruthy();const t=(await compra.json()).data;expect(t.impactoPendiente).toBe(true);
 const estado=async()=>{const cs=(await (await request.get('/api/cuentas',{headers})).json()).data;return cs.find((c:any)=>c.id===cid);};
 expect((await estado()).saldoActual).toBe(0);expect((await estado()).limiteRetenido).toBe(90);
 const historia=(await (await request.get('/api/transacciones?size=100',{headers})).json()).data.content;expect(historia.some((x:any)=>x.id===t.id)).toBe(false);
 expect(historia.filter((x:any)=>x.compraMsiInformativa)).toHaveLength(1);expect(historia.find((x:any)=>x.compraMsiInformativa).monto).toBe(90);
 const editar=await request.put(`/api/transacciones/${t.id}`,{headers,data:{...datos,monto:120,msi:4}});expect(editar.ok(),await editar.text()).toBeTruthy();expect((await estado()).saldoActual).toBe(0);expect((await estado()).limiteRetenido).toBe(120);
 const borrar=await request.delete(`/api/transacciones/${t.id}?planMsi=true`,{headers});expect(borrar.ok()).toBeTruthy();expect((await estado()).saldoActual).toBe(0);expect((await estado()).limiteRetenido).toBe(0);
 const libro=(await (await request.get('/api/libro-diario?size=100',{headers})).json()).data.content;expect(libro).toHaveLength(0);
});
