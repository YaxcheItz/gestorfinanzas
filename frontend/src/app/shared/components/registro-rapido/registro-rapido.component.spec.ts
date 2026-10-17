import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { of, Subject } from 'rxjs';
import { RegistroRapidoComponent } from './registro-rapido.component';
import { FinanzasService } from '../../../core/services/finanzas.service';
import { AuthService } from '../../../core/services/auth.service';
import { CategoriaPreferidaService } from '../../../core/services/categoria-preferida.service';
import { PerfilService } from '../../../core/services/perfil.service';
import { ToastService } from '../../../core/services/toast.service';
import { PrivacidadService } from '../../../core/services/privacidad.service';
import { MovimientosOfflineService } from '../../../core/services/movimientos-offline.service';

const cuentas = [{id:1,nombre:'Efectivo',tipo:'EFECTIVO',moneda:'MXN',activo:true}, {id:2,nombre:'Ahorro',tipo:'AHORRO',moneda:'MXN',activo:true}, {id:3,nombre:'USD',tipo:'DEBITO',moneda:'USD',activo:true}, {id:4,nombre:'Credito',tipo:'CREDITO',moneda:'MXN',activo:true}, {id:5,nombre:'Credito 2',tipo:'CREDITO',moneda:'MXN',activo:true}];
const categorias = [{id:10,nombre:'Comida',tipo:'GASTO',activo:true}, {id:20,nombre:'Sueldo',tipo:'INGRESO',activo:true}];
describe('Registro rapido: guardado y privacidad', () => {
  let component: RegistroRapidoComponent;
  let fixture: ReturnType<typeof TestBed.createComponent<RegistroRapidoComponent>>;
  let respuesta: Subject<any>;
  let crear: ReturnType<typeof vi.fn>;
  const usuario = signal<any>({id:991});
  const conexion = signal(true);
  let offline: any;
  beforeEach(() => {
    localStorage.clear(); usuario.set({id:991}); respuesta = new Subject(); crear = vi.fn(() => respuesta);
    conexion.set(true);
    offline={conexion,guardarCatalogo:vi.fn(async()=>{}),leerCatalogo:vi.fn(async()=>({cuentas,categorias})),guardarPendiente:vi.fn(async()=>{}),sincronizar:vi.fn(async()=>0)};
    TestBed.configureTestingModule({imports:[RegistroRapidoComponent], providers:[provideRouter([]),
      {provide:FinanzasService,useValue:{getCuentas:()=>of({data:cuentas}),getCategorias:()=>of({data:categorias}),crearTransaccion:crear,getPresupuestoDisponible:()=>of({success:true,data:{tienePresupuesto:false}})}},
      {provide:AuthService,useValue:{currentUser:usuario}},
      {provide:CategoriaPreferidaService,useValue:{preferida:()=>null,recientes:()=>[],recordar:vi.fn()}},
      {provide:MovimientosOfflineService,useValue:offline},
      {provide:PerfilService,useValue:{alternarOcultarMontos:()=>TestBed.inject(PrivacidadService).alternarLocal()}},
      {provide:ToastService,useValue:{success:vi.fn(),info:vi.fn()}}
    ]});
    fixture=TestBed.createComponent(RegistroRapidoComponent);component=fixture.componentInstance;
    component.abrir();fixture.detectChanges();
  });
  afterEach(()=>fixture.destroy());
  it('oculta proporciones financieras y retira el presupuesto anterior al cambiar de cuenta',()=>{
    const pendientes=new Subject<any>();
    const api=vi.spyOn(TestBed.inject(FinanzasService),'getPresupuestoDisponible').mockReturnValue(pendientes);
    component.categoriaId=10;component.consultarPresupuestoDisponible();
    pendientes.next({success:true,data:{tienePresupuesto:true,estado:'ALERTA',moneda:'MXN',montoDisponible:20,montoGastado:80,montoLimite:100,porcentajeAlerta:75,porcentajeConsumido:80}});
    fixture.detectChanges();expect(fixture.nativeElement.querySelector('.entry-budget').textContent).toContain('80%');
    TestBed.inject(PrivacidadService).alternarLocal();fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.entry-budget').textContent).not.toContain('80%');
    api.mockReturnValue(new Subject<any>());component.cuentaId=3;component.consultarPresupuestoDisponible();
    pendientes.next({success:true,data:{tienePresupuesto:true,moneda:'MXN'}});fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.entry-budget')).toBeNull();
  });
  it('abre la categoria elegida desde el grafico sin guardar al abrir',()=>{
    component.cerrar();
    component.abrir(new CustomEvent('registro',{detail:{tipo:'GASTO',categoriaId:categorias[0].id}}));
    expect(component.categoriaId).toBe(categorias[0].id);
    expect(crear).not.toHaveBeenCalled();
  });

  it('conserva monto y cuenta al alternar con escribir',()=>{
    component.monto='45';component.cuentaId=2;component.cerrar();
    component.abrir(new CustomEvent('registro',{detail:{preservar:true}}));
    expect(component.monto).toBe('45');expect(component.cuentaId).toBe(2);
  });

  it('repetir prepara fecha de hoy y una solicitud nueva, sin guardar hasta confirmar',()=>{
    const repetir={tipo:'GASTO',cuentaId:2,categoriaId:null,monto:35,descripcion:'Cena',notas:'Sin picante',fecha:'2020-01-01'};
    component.cerrar();component.abrir(new CustomEvent('registro',{detail:{repetir}}));
    expect(component.fecha).toBe(component.hoyLocal());expect(component.cuentaId).toBe(2);expect(component.categoriaId).toBeNull();
    expect(component.descripcion).toBe('Cena');expect(component.nota).toBe('Sin picante');expect(crear).not.toHaveBeenCalled();
    component.guardar();component.guardar();expect(crear).toHaveBeenCalledOnce();const key=crear.mock.calls[0][1];
    expect(crear.mock.calls[0][0]).toMatchObject({monto:35,fecha:component.hoyLocal(),categoriaId:null,descripcion:'Cena'});
    respuesta.next({success:true});respuesta.complete();respuesta=new Subject();
    component.abrir(new CustomEvent('registro',{detail:{repetir}}));component.guardar();expect(crear.mock.calls[1][1]).not.toBe(key);
  });
  it('no sustituye silenciosamente una cuenta que ya no existe al repetir',()=>{
    component.cerrar();component.abrir(new CustomEvent('registro',{detail:{repetir:{tipo:'GASTO',cuentaId:999,categoriaId:10,monto:35}}}));
    expect(component.cuentaId).toBeNull();expect(component.error()).toContain('ya no está disponible');
    component.guardar();expect(crear).not.toHaveBeenCalled();
  });

  it('lleva descripción y nota por separado al formulario avanzado',async()=>{
    const router=TestBed.inject(Router);
    vi.spyOn(router,'navigate').mockResolvedValue(true);
    const recibir=vi.fn();window.addEventListener('kaptal-abrir-registro-manual',recibir);
    try {
      component.descripcion='Cena';component.nota='Sin picante';component.avanzado();await fixture.whenStable();
      expect(recibir.mock.calls[0][0].detail).toMatchObject({descripcion:'Cena',notas:'Sin picante'});
    }finally{window.removeEventListener('kaptal-abrir-registro-manual',recibir);}
  });
  it('guarda offline una sola vez y conserva los datos si falla el almacenamiento',async()=>{
    conexion.set(false);component.monto='45';
    let completar!:()=>void;
    offline.guardarPendiente.mockImplementation(()=>new Promise<void>(resolve=>{completar=resolve;}));
    component.guardar();component.guardar();
    expect(offline.guardarPendiente).toHaveBeenCalledOnce();expect(crear).not.toHaveBeenCalled();
    completar();await fixture.whenStable();expect(component.open()).toBe(false);
    component.abrir();component.monto='60';offline.guardarPendiente.mockRejectedValue(new Error('No hay espacio'));
    component.guardar();await fixture.whenStable();
    expect(component.open()).toBe(true);expect(component.monto).toBe('60');expect(component.error()).toBe('No hay espacio');
  });
  it('guarda un gasto con solo el monto y los valores predeterminados',()=>{
    component.monto='25,50';component.guardar();
    expect(crear.mock.calls[0][0]).toMatchObject({tipo:'GASTO',monto:25.5,cuentaId:1,categoriaId:10});
    expect(crear.mock.calls[0][1]).toMatch(/^[0-9a-f-]{36}$/);
    component.guardar();expect(crear).toHaveBeenCalledOnce();
    respuesta.next({success:true,data:{id:1}});expect(component.open()).toBe(false);
  });
  it('cambia a la categoria de ingreso y conserva un destino distinto para transferencias',()=>{
    component.cambiarTipo('INGRESO');expect(component.categoriaId).toBe(20);
    component.monto='900';component.guardar();expect(crear.mock.calls[0][0]).toMatchObject({tipo:'INGRESO',categoriaId:20});
  });
  it('guarda transferencias sin categoria y exige cambio entre monedas',()=>{
    component.cambiarTipo('TRANSFERENCIA');expect(component.destinoId).toBe(2);
    component.monto='100';component.destinoId=3;component.guardar();expect(crear).not.toHaveBeenCalled();
    component.tasaCambio=0.05;component.guardar();
    expect(crear.mock.calls[0][0]).toMatchObject({tipo:'TRANSFERENCIA',cuentaDestinoId:3,tasaCambio:0.05,categoriaId:null});
  });
  it('excluye transferencias entre tarjetas de credito',()=>{
    component.cambiarTipo('TRANSFERENCIA');component.cuentaId=4;component.ajustarDestino();expect(component.destinos().map(c=>c.id)).not.toContain(5);
  });
  it('rechaza montos invalidos y origen igual a destino',()=>{
    for (const monto of ['-5','NaN','0','12.345','1,200.00']) {component.monto=monto;component.guardar();}
    component.cambiarTipo('TRANSFERENCIA');component.monto='50';component.destinoId=component.cuentaId;component.guardar();
    expect(crear).not.toHaveBeenCalled();
  });
  it('reintenta el mismo payload y clave tras una respuesta incierta, incluso al cerrar',()=>{
    component.monto='25';component.guardar();const [payload,key]=crear.mock.calls[0];
    respuesta.error({status:0});component.cerrar();component.abrir();expect(component.monto).toBe('25');
    respuesta=new Subject();component.guardar();expect(crear.mock.calls[1]).toEqual([payload,key]);
  });
  it('oculta el monto editable sin perder el valor y limpia el borrador al cambiar usuario',async()=>{
    component.monto='123.45';TestBed.inject(PrivacidadService).aplicar(991,true);fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();
    const input=fixture.nativeElement.querySelector('#quick-entry-amount');expect(input.type).toBe('password');expect(input.value).toBe('123.45');
    usuario.set({id:992});fixture.detectChanges();expect(component.open()).toBe(false);expect(component.cuentas).toEqual([]);
  });
});
