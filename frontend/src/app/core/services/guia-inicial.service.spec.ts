import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from './auth.service';
import { Usuario } from '../models/auth.models';
import { GuiaInicialService } from './guia-inicial.service';

describe('GuiaInicialService', () => {
  const usuario = signal<Usuario | null>(null);
  const user = (id: number): Usuario => ({ id, nombre: 'Prueba', email: 'guia@example.test' });
  let guia: GuiaInicialService;

  beforeEach(() => {
    localStorage.clear();
    usuario.set(user(7));
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: { currentUser: usuario } }] });
    guia = TestBed.inject(GuiaInicialService);
  });
  afterEach(() => vi.restoreAllMocks());

  it('muestra la guía al entrar y nunca sin sesión', () => {
    expect(guia.visible()).toBe(true);
    usuario.set(null);
    expect(guia.visible()).toBe(false);
    guia.omitir(); guia.mostrar();
    expect(localStorage.length).toBe(0);
  });

  it('recuerda la omisión al volver a abrir la app', () => {
    guia.omitir();
    expect(guia.visible()).toBe(false);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: { currentUser: usuario } }] });
    expect(TestBed.inject(GuiaInicialService).visible()).toBe(false);
  });

  it('no mezcla la preferencia de dos cuentas ni la pierde al salir', () => {
    guia.omitir();
    usuario.set(user(8)); expect(guia.visible()).toBe(true);
    usuario.set(null); expect(guia.visible()).toBe(false);
    usuario.set(user(7)); expect(guia.visible()).toBe(false);
  });

  it('permite reabrir desde configuración y persiste esa elección', () => {
    guia.omitir(); guia.mostrar();
    expect(guia.visible()).toBe(true);
    expect(localStorage.getItem('kaptal_guia_inicial_v1_7')).toBeNull();
  });

  it('sigue siendo omitible cuando el almacenamiento está bloqueado', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(guia.visible()).toBe(true);
    guia.omitir(); expect(guia.visible()).toBe(false);
    guia.mostrar(); expect(guia.visible()).toBe(true);
  });

  it('ignora valores desconocidos sin ocultar la ayuda', () => {
    localStorage.setItem('kaptal_guia_inicial_v1_7', 'otro');
    expect(guia.visible()).toBe(true);
  });
});
