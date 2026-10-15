import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Reportes } from './reportes';
import { signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

describe('Reportes', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [Reportes],
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
  }));
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  function responder(moneda = 'MXN') {
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(req => req.url.endsWith('/dashboard/resumen')).flush({ success: true, data: { resumenPorMoneda: [{ moneda, ingresosMes: 500, gastosMes: 100, balanceMes: 400 }] } });
    http.expectOne(req => req.url.endsWith('/dashboard/analitica')).flush({ success: true, data: { gastosPorCategoria: [{ moneda: 'USD', monto: 900, categoriaNombre: 'Otro' }, { moneda, monto: 100, categoriaNombre: 'Comida' }], ultimosSeisMeses: [] } });
    http.expectOne(req => req.url.endsWith('/dashboard/comparacion')).flush({ success: true, data: { porMoneda: [] } });
  }

  it('uses server reports and keeps currencies separate without an AI request', () => {
    const fixture = TestBed.createComponent(Reportes);
    responder();
    expect(fixture.componentInstance.categorias().map(item => item.categoriaNombre)).toEqual(['Comida']);
    fixture.componentInstance.privacidad.aplicar(1, true);
    expect(fixture.componentInstance.ancho(100, 100)).toBe(0);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('•••');
    expect(fixture.nativeElement.textContent).not.toContain('$500');
  });

  it('cancels the old period and renders only the newest request', () => {
    const fixture = TestBed.createComponent(Reportes);
    const http = TestBed.inject(HttpTestingController);
    const previous = http.match(req => req.url.includes('/dashboard/'));
    fixture.componentInstance.cambiarPeriodo('2026-03');
    expect(previous.every(req => req.cancelled)).toBe(true);
    responder('EUR');
    expect(fixture.componentInstance.moneda()).toBe('EUR');
    expect(fixture.componentInstance.periodo()).toBe('2026-03');
  });

  it('clears old figures when refreshing and gives a retryable connection error', () => {
    const fixture = TestBed.createComponent(Reportes);
    responder();
    fixture.componentInstance.cargar();
    expect(fixture.componentInstance.resumen()).toBeNull();
    const http = TestBed.inject(HttpTestingController);
    const requests = http.match(req => req.url.includes('/dashboard/'));
    requests[0].flush({}, { status: 503, statusText: 'Unavailable' });
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.error()).toContain('conexión');
    expect(requests.slice(1).every(req => req.cancelled)).toBe(true);
  });

  it('cancels pending reports and clears figures when the user changes', () => {
    const user = signal<{ id: number } | null>({ id: 1 });
    TestBed.overrideProvider(AuthService, { useValue: { currentUser: user } });
    const fixture = TestBed.createComponent(Reportes);
    fixture.detectChanges();
    responder();
    fixture.componentInstance.cargar();
    const old = TestBed.inject(HttpTestingController).match(req => req.url.includes('/dashboard/'));
    user.set({ id: 2 });
    fixture.detectChanges();
    expect(old.every(request => request.cancelled)).toBe(true);
    expect(fixture.componentInstance.resumen()).toBeNull();
    responder('EUR');
    expect(fixture.componentInstance.moneda()).toBe('EUR');
  });
});
