import { prepararCapturaOffline, validarPayloadOffline } from './captura-offline';
import { Categoria, Cuenta } from '../models/finanzas.models';

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
  it('resuelve Amex o deja la cuenta para revision si no coincide', () => {
    const amex=[{...cuentas[0],id:3,nombre:'American Express'}];
    expect(prepararCapturaOffline('Pague 50 en cafe con Amex',amex,[]).data['cuentaId']).toBe(3);
    expect(prepararCapturaOffline('Pague 50 en cafe con Amex',[cuentas[0]],[]).data['cuentaId']).toBeNull();
  });
  it('infiere categorias por vocabulario y no usa etiquetas como concepto', () => {
    const cats=[{id:10,nombre:'Comida',tipo:'GASTO',activo:true},{id:11,nombre:'Transporte',tipo:'GASTO',activo:true}] as Categoria[];
    expect(prepararCapturaOffline('Gaste 50 en restaurantes',cuentas,cats).data['categoriaId']).toBe(10);
    expect(prepararCapturaOffline('Me eche 50 en una torta',cuentas,cats).data['categoriaId']).toBe(10);
    expect(prepararCapturaOffline('Pague 50 de gasolina',cuentas,cats).data['categoriaId']).toBe(11);
    expect(prepararCapturaOffline('Gaste 50 en regalo con etiqueta gasolina',cuentas,cats).data['categoriaId']).toBeNull();
    expect(prepararCapturaOffline('Gaste 50 en tacos y gasolina',cuentas,cats).data['categoriaId']).toBeNull();
  });
  it('prefiere una categoria personal a una generica para el mismo concepto', () => {
    const cats=[{id:10,nombre:'Comida',tipo:'GASTO',activo:true,esPersonalizada:true},{id:11,nombre:'Alimentos y Supermercado',tipo:'GASTO',activo:true,esPersonalizada:false}] as Categoria[];
    expect(prepararCapturaOffline('Gaste 50 en restaurantes',cuentas,cats).data['categoriaId']).toBe(10);
    const distintas=[cats[0],{id:12,nombre:'Transporte',tipo:'GASTO',activo:true,esPersonalizada:false}] as Categoria[];
    expect(prepararCapturaOffline('Gaste 50 en tacos y gasolina',cuentas,distintas).data['categoriaId']).toBeNull();
  });
});
