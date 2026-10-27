import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { AutomaticBankComponent } from './automatic-bank';
import { AutomaticBankService } from '../core/services/automatic-bank';
import { BankNotificationsService } from '../core/services/bank-notifications';
import { FinanzasService } from '../core/services/finanzas.service';
import { AuthService } from '../core/services/auth.service';

describe('Configuración bancaria guardada', () => {
  const user = signal({ id: 71 });
  let automatic: any;
  let c: AutomaticBankComponent;
  let http: HttpTestingController;
  beforeEach(() => {
    automatic = { available: true, read: vi.fn().mockResolvedValue({ active: true, queued: 0,
      rules: [
        { proveedor: 'SANTANDER', cuentaId: 11, listaId: 21, terminacion: null },
        { proveedor: 'SEARS', cuentaId: 12, listaId: 21, terminacion: '1234', paquete: 'com.google.android.apps.messaging', remitente: 'QA' },
      ] }), configure: vi.fn(), disconnect: vi.fn() };
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: AutomaticBankService, useValue: automatic },
      { provide: BankNotificationsService, useValue: { apps: async () => [], current: signal({granted:true}) } },
      { provide: FinanzasService, useValue: { getCuentas: () => of({ data: [] }) } },
      { provide: AuthService, useValue: { currentUser: user } },
    ] });
    c = TestBed.runInInjectionContext(() => new AutomaticBankComponent());
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  async function load() {
    const pending = c.load();
    await Promise.resolve();
    http.expectOne('/api/listas').flush({ data: [] });
    await pending;
  }
  it('recupera Santander, Sears y destino al volver a abrir sin reactivar ni renovar consentimiento', async () => {
    await load();
    expect(c.profiles.find(p => p.provider === 'SANTANDER')?.account).toBe(11);
    expect(c.profiles.find(p => p.provider === 'SEARS')?.account).toBe(12);
    expect(c.smsPackage).toBe('com.google.android.apps.messaging');
    expect(c.sender).toBe('QA'); expect(c.listId).toBe(21); expect(c.consent).toBe(false);
    c.opened({ target: { open: false } } as unknown as Event);
    await load();
    expect(c.profiles.find(p => p.provider === 'SANTANDER')?.account).toBe(11);
    expect(automatic.configure).not.toHaveBeenCalled(); expect(automatic.disconnect).not.toHaveBeenCalled();
  });
  it('elimina selecciones antiguas si ya no hay reglas y conserva el estado desactivado', async () => {
    await load();
    automatic.read.mockResolvedValue({ active: false, queued: 0, rules: [] });
    await load();
    expect(c.profiles.every(p => p.account === null && p.suffix === '')).toBe(true);
    expect(c.listId).toBeNull(); expect(c.sender).toBe(''); expect(c.smsPackage).toBe('');
    expect(c.state()?.active).toBe(false);
  });
  it('conserva tarjetas física y digital Sears en una sola cuenta sin perder los demás bancos', async () => {
    const state=await automatic.read();
    state.rules.push({...state.rules[1],terminacion:'5678'});
    await load();
    const sears=c.profiles.find(p=>p.provider==='SEARS')!;
    expect(sears.suffix).toBe('1234, 5678');
    c.consent=true;await c.connect();
    const rules=automatic.configure.mock.calls[0][0];
    expect(rules.filter((r:any)=>r.proveedor==='SEARS').map((r:any)=>r.terminacion)).toEqual(['1234','5678']);
    expect(rules.filter((r:any)=>r.proveedor==='SEARS').every((r:any)=>r.cuentaId===12&&r.listaId===21)).toBe(true);
    expect(rules.some((r:any)=>r.proveedor==='SANTANDER'&&r.cuentaId===11)).toBe(true);
  });
  it('rechaza terminaciones Sears repetidas o incompletas sin renovar la conexión', async () => {
    await load();c.consent=true;const sears=c.profiles.find(p=>p.provider==='SEARS')!;
    for(const value of ['1234,1234','1234,','1234,56']) {
      sears.suffix=value;await c.connect();
      expect(automatic.configure).not.toHaveBeenCalled();
    }
  });
  it('conserva el estado nativo activo aunque falle la carga de cuentas y listas', async () => {
    const pending=c.load();
    await Promise.resolve();
    http.expectOne('/api/listas').flush({}, {status:503,statusText:'Offline'});
    await pending;
    expect(c.state()?.active).toBe(true);
    expect(c.ruleCount('SEARS')).toBe(1);
    expect(c.loaded()).toBe(false);
    expect(automatic.configure).not.toHaveBeenCalled();
  });
  it('consulta el resumen sin descargar catálogos ni activar el registro', async () => {
    await c.refreshSummary();
    expect(c.state()?.active).toBe(true);
    c.opened({target:{open:false}} as unknown as Event);
    expect(c.state()?.active).toBe(true);
    expect(automatic.configure).not.toHaveBeenCalled();
  });
  it('permite Santander y BBVA de débito sin ofrecer cuentas incompatibles', () => {
    const debit={moneda:'MXN',tipo:'DEBITO'} as any;
    expect(c.canUseAccount(c.profiles[0],debit)).toBe(true);
    expect(c.canUseAccount(c.profiles.find(p=>p.provider==='BBVA')!,debit)).toBe(true);
    expect(c.canUseAccount(c.profiles.find(p=>p.provider==='SEARS')!,debit)).toBe(false);
    expect(c.canUseAccount(c.profiles[0],{...debit,moneda:'USD'})).toBe(false);
  });
  it('no bloquea Santander si Android no puede listar la app de mensajes', async () => {
    c.bank.apps=vi.fn().mockRejectedValue(new Error('Unavailable'));
    await load();
    expect(c.loaded()).toBe(true);expect(c.smsApps()).toEqual([]);
    expect(c.profiles[0].account).toBe(11);
  });
  it('actualiza la bandeja solo cuando cambia el resultado de los envíos', async () => {
    const changed=vi.fn();c.changed.subscribe(changed);
    automatic.read.mockResolvedValue({active:true,registered:0,review:0,queued:1});
    await c.refreshSummary();await c.refreshSummary();expect(changed).not.toHaveBeenCalled();
    automatic.read.mockResolvedValue({active:true,registered:1,review:0,queued:0});
    await c.refreshSummary();await c.refreshSummary();expect(changed).toHaveBeenCalledTimes(1);
  });
});
