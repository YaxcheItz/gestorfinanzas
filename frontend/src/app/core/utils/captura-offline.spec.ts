import { prepararCapturaOffline, validarPayloadOffline } from './captura-offline';
import { Cuenta } from '../models/finanzas.models';

describe('Captura offline sin saldos ni IA', () => {
  const cuentas = [{id:1,nombre:'Efectivo',activo:true,tipo:'EFECTIVO',moneda:'MXN'},
    {id:2,nombre:'Banco',activo:true,tipo:'DEBITO',moneda:'USD'}] as Cuenta[];
  it('prepara decimales y ayer sin registrar movimientos', () => {
    const p=prepararCapturaOffline('Gasté 25,50 en Efectivo ayer',cuentas,[],'2026-03-01');
    expect(p.local).toBe(true);
    expect(p.data).toMatchObject({monto:25.5,cuentaId:1,fecha:'2026-02-28'});
  });
  it('deja la cuenta ambigua para revisión', () => {
    expect(prepararCapturaOffline('Gasté 25 en comida',cuentas,[]).data['cuentaId']).toBeNull();
  });
  it.each(['Gasté -25','Gasté 0.001','Gasté 0','Gasté 25 y 30','Gasté 25 el 2026-02-30','Gasté 25 mensual'])('rechaza %s', texto => {
    expect(()=>prepararCapturaOffline(texto,cuentas,[])).toThrow();
  });
  it('exige cambio de moneda y cuentas diferentes al confirmar', () => {
    const datos={tipo:'TRANSFERENCIA',monto:10,fecha:'2026-10-08',cuentaId:1,cuentaDestinoId:2};
    expect(()=>validarPayloadOffline(datos,cuentas,[])).toThrow('tasa');
    expect(validarPayloadOffline({...datos,tasaCambio:0.05},cuentas,[]).monto).toBe(10);
    expect(()=>validarPayloadOffline({...datos,cuentaDestinoId:1},cuentas,[])).toThrow('distintas');
  });
  it('rechaza cuenta inactiva y centavos adicionales', () => {
    const datos={tipo:'GASTO',monto:0.001,fecha:'2026-10-08',cuentaId:1};
    expect(()=>validarPayloadOffline(datos,cuentas,[])).toThrow();
    expect(()=>validarPayloadOffline({...datos,monto:25},[],[])).toThrow('cuenta');
  });
});
