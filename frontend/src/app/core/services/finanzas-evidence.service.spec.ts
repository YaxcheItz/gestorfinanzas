import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController,provideHttpClientTesting} from '@angular/common/http/testing';
import {FinanzasService} from './finanzas.service';
import {ListaContextoService} from './lista-contexto.service';

describe('Personal financial evidence requests',()=>{
  let http:HttpTestingController,service:FinanzasService;
  beforeEach(()=>{
    TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});
    TestBed.inject(ListaContextoService).activaId.set(79);
    http=TestBed.inject(HttpTestingController);service=TestBed.inject(FinanzasService);
  });
  afterEach(()=>http.verify());
  it('omits the selected shared list for personal history and CSV while preserving filters',()=>{
    const filters={soloPropios:true,listaId:79,moneda:'MXN',tipo:'GASTO' as const,fechaInicio:'2026-10-01',fechaFin:'2026-10-20',sinCategoria:true};
    service.getTransaccionesPaginadas(filters).subscribe();
    service.exportarTransaccionesCsv(filters).subscribe();
    const requests=http.match(r=>r.url.includes('/transacciones'));
    expect(requests).toHaveLength(2);
    for(const r of requests){expect(r.request.params.has('listaId')).toBe(false);expect(r.request.params.get('moneda')).toBe('MXN');expect(r.request.params.get('tipo')).toBe('GASTO');expect(r.request.params.get('sinCategoria')).toBe('true');r.flush(null);}
  });
  it('preserves normal shared list requests',()=>{
    service.getTransaccionesPaginadas().subscribe();
    const r=http.expectOne(req=>req.url.endsWith('/transacciones'));
    expect(r.request.params.get('listaId')).toBe('79');r.flush(null);
  });
  it('preserves explicit authorized list and author scope for evidence history and CSV',()=>{
    const filters={listaId:12,autorId:7,moneda:'MXN',tipo:'GASTO' as const,fechaInicio:'2026-10-01',fechaFin:'2026-10-31'};
    service.getTransaccionesPaginadas(filters).subscribe();
    service.exportarTransaccionesCsv(filters).subscribe();
    const requests=http.match(r=>r.url.includes('/transacciones'));
    expect(requests).toHaveLength(2);
    for(const r of requests){expect(r.request.params.get('listaId')).toBe('12');expect(r.request.params.get('autorId')).toBe('7');expect(r.request.params.get('moneda')).toBe('MXN');r.flush(null);}
  });
});
