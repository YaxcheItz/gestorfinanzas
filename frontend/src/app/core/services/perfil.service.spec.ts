import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Perfil } from '../models/auth.models';
import { PerfilService } from './perfil.service';
import { PrivacidadService } from './privacidad.service';

describe('PerfilService', () => {
  let service: PerfilService;
  let privacidad: PrivacidadService;
  let httpMock: HttpTestingController;

  // HttpTestingController no entiende `expect.stringContaining`: su matcher de
  // url es exacto, asi que el filtro va como predicado.
  const esPerfil = (method: string) => (req: { method: string; url: string }) =>
    req.method === method && req.url.endsWith('/perfil');

  const perfilBase: Perfil = {
    id: 7,
    nombre: 'Ana',
    email: 'ana@example.com',
    tema: 'CLARO',
    monedaPredeterminada: 'MXN',
    telefono: null,
    notificacionesWhatsapp: false
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [PerfilService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(PerfilService);
    privacidad = TestBed.inject(PrivacidadService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('respeta la preferencia cuando el backend todavia no la envia', () => {
    // Un backend anterior al campo no lo incluye en el JSON. La respuesta llega
    // sin `ocultarMontos` y no debe interpretarse como "el usuario lo apagó".
    privacidad.aplicar(7, true);
    service.cargar(7);

    httpMock.expectOne(esPerfil('GET')).flush({
      success: true,
      message: '',
      data: perfilBase
    });

    expect(privacidad.ocultarMontos()).toBe(true);
  });

  it('adopta la preferencia cuando el backend si la envia', () => {
    service.cargar(7);

    httpMock.expectOne(esPerfil('GET')).flush({
      success: true,
      message: '',
      data: { ...perfilBase, ocultarMontos: true }
    });

    expect(privacidad.ocultarMontos()).toBe(true);
  });

  it('mantiene el valor aplicado al pulsar el ojo si la respuesta no lo trae', () => {
    service.cargar(7);
    httpMock.expectOne(esPerfil('GET')).flush({
      success: true,
      message: '',
      data: { ...perfilBase, ocultarMontos: false }
    });

    service.alternarOcultarMontos();
    expect(privacidad.ocultarMontos()).toBe(true);

    // El PUT responde como lo haria un backend sin el campo, sin `ocultarMontos`.
    // Antes esto reventaba el clic del usuario un segundo despues.
    httpMock.expectOne(esPerfil('PUT')).flush({
      success: true,
      message: '',
      data: { ...perfilBase }
    });

    expect(privacidad.ocultarMontos()).toBe(true);
  });

  it('revierte el valor cuando el guardado falla', () => {
    service.cargar(7);
    httpMock.expectOne(esPerfil('GET')).flush({
      success: true,
      message: '',
      data: { ...perfilBase, ocultarMontos: false }
    });

    service.alternarOcultarMontos();
    expect(privacidad.ocultarMontos()).toBe(true);

    httpMock
      .expectOne(esPerfil('PUT'))
      .flush({ message: 'error' }, { status: 500, statusText: 'Server Error' });

    expect(privacidad.ocultarMontos()).toBe(false);
  });
});
