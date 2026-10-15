import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
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

  it('consulta el mismo rango y el anterior explicito en resumen, categorias y comparacion', () => {
    TestBed.overrideProvider(ActivatedRoute, { useValue: { snapshot: { queryParamMap: convertToParamMap({ desde: '2024-03-31', hasta: '2024-04-29', desdeAnterior: '2024-02-29', hastaAnterior: '2024-03-30' }) } } });
    const fixture = TestBed.createComponent(Reportes);
    const requests = TestBed.inject(HttpTestingController).match(req => req.url.includes('/dashboard/'));
    expect(requests).toHaveLength(3);
    for (const request of requests) {
      expect(request.request.params.get('desde')).toBe('2024-03-31');
      expect(request.request.params.get('hasta')).toBe('2024-04-29');
      if (request.request.url.endsWith('/comparacion')) {
        expect(request.request.params.get('desdeAnterior')).toBe('2024-02-29');
        expect(request.request.params.get('hastaAnterior')).toBe('2024-03-30');
        request.flush({ success: true, data: { porMoneda: [] } });
      } else if (request.request.url.endsWith('/resumen')) request.flush({ success: true, data: { resumenPorMoneda: [] } });
      else request.flush({ success: true, data: { gastosPorCategoria: [], ultimosSeisMeses: [] } });
    }
    expect(fixture.componentInstance.error()).toBe('');
    fixture.destroy();
  });

  it('todo el historial no intenta comparar con fechas anteriores al dominio permitido', () => {
    TestBed.overrideProvider(ActivatedRoute, { useValue: { snapshot: { queryParamMap: convertToParamMap({ desde: '2000-01-01', hasta: '2100-12-31', sinComparacion: 'true' }) } } });
    const fixture = TestBed.createComponent(Reportes);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(req => req.url.endsWith('/resumen')).flush({ success: true, data: { resumenPorMoneda: [] } });
    http.expectOne(req => req.url.endsWith('/analitica')).flush({ success: true, data: { gastosPorCategoria: [], ultimosSeisMeses: [] } });
    http.expectNone(req => req.url.endsWith('/comparacion'));
    expect(fixture.componentInstance.error()).toBe('');
    fixture.destroy();
  });

  it('rechaza fechas inexistentes antes de consultar el servidor', () => {
    TestBed.overrideProvider(ActivatedRoute, { useValue: { snapshot: { queryParamMap: convertToParamMap({ desde: '2025-02-29', hasta: '2025-03-30' }) } } });
    const fixture = TestBed.createComponent(Reportes);
    TestBed.inject(HttpTestingController).expectNone(req => req.url.includes('/dashboard/'));
    expect(fixture.componentInstance.error()).toContain('rango');
    fixture.destroy();
  });

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
