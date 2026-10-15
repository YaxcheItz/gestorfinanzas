import { afterEach, describe, expect, it } from 'vitest';
import { ListaContextoService } from './lista-contexto.service';
import { ListaFinanciera } from '../models/listas.models';
const personal: ListaFinanciera = { id:1,nombre:'Personal',emoji:'',moneda:'MXN',personal:true,archivada:false,rol:'PROPIETARIO',miembros:[] };
const compartida: ListaFinanciera = {...personal,id:2,nombre:'Viaje',personal:false,rol:'LECTOR'};
describe('Contexto de listas', () => {
  afterEach(() => localStorage.clear());
  it('conserva seleccion offline y aisla usuarios', () => {
    const c=new ListaContextoService(); c.iniciar(10);c.aplicar([personal,compartida]);c.seleccionar(2);
    expect(c.puedeEscribir()).toBe(false);
    const siguiente=new ListaContextoService();siguiente.iniciar(10);expect(siguiente.activaId()).toBe(2);
    siguiente.iniciar(20);expect(siguiente.listas()).toEqual([]);expect(siguiente.activaId()).toBeNull();
  });
  it('vuelve a Personal al revocar acceso y rechaza ids desconocidos', () => {
    const c=new ListaContextoService();c.iniciar(10);c.aplicar([personal,compartida]);c.seleccionar(2);
    c.aplicar([personal]);expect(c.activaId()).toBe(1);c.seleccionar(999);expect(c.activaId()).toBe(1);
    c.aplicar([{...personal,archivada:true}]);expect(c.puedeEscribir()).toBe(false);
  });
  it('resuelve enlaces directos solo entre listas autorizadas por el servidor', () => {
    const c=new ListaContextoService();c.iniciar(10);c.solicitarDesdeRuta(2);c.aplicar([personal,compartida]);
    expect(c.activaId()).toBe(2);
    c.solicitarDesdeRuta(999);c.aplicar([personal]);expect(c.activaId()).toBe(1);
    c.solicitarDesdeRuta(2);c.iniciar(20);c.aplicar([personal,compartida]);expect(c.activaId()).toBe(1);
  });

});
