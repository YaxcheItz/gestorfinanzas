import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, Subject } from 'rxjs';
import { RegistroRapidoComponent } from './registro-rapido.component';
import { FinanzasService } from '../../../core/services/finanzas.service';
import { AuthService } from '../../../core/services/auth.service';
import { CategoriaPreferidaService } from '../../../core/services/categoria-preferida.service';
import { PerfilService } from '../../../core/services/perfil.service';
import { ToastService } from '../../../core/services/toast.service';
import { PrivacidadService } from '../../../core/services/privacidad.service';

const cuentas = [{id:1,nombre:'Efectivo',tipo:'EFECTIVO',moneda:'MXN',activo:true}, {id:2,nombre:'Ahorro',tipo:'AHORRO',moneda:'MXN',activo:true}, {id:3,nombre:'USD',tipo:'DEBITO',moneda:'USD',activo:true}, {id:4,nombre:'Credito',tipo:'CREDITO',moneda:'MXN',activo:true}, {id:5,nombre:'Credito 2',tipo:'CREDITO',moneda:'MXN',activo:true}];
const categorias = [{id:10,nombre:'Comida',tipo:'GASTO',activo:true}, {id:20,nombre:'Sueldo',tipo:'INGRESO',activo:true}];
describe('Registro rapido: guardado y privacidad', () => {
  let component: RegistroRapidoComponent;
  let fixture: ReturnType<typeof TestBed.createComponent<RegistroRapidoComponent>>;
  let respuesta: Subject<any>;
  let crear: ReturnType<typeof vi.fn>;
  const usuario = signal<any>({id:991});
  beforeEach(() => {
    localStorage.clear(); usuario.set({id:991}); respuesta = new Subject(); crear = vi.fn(() => respuesta);
    TestBed.configureTestingModule({imports:[RegistroRapidoComponent], providers:[provideRouter([]),
      {provide:FinanzasService,useValue:{getCuentas:()=>of({data:cuentas}),getCategorias:()=>of({data:categorias}),crearTransaccion:crear}},
      {provide:AuthService,useValue:{currentUser:usuario}},
      {provide:CategoriaPreferidaService,useValue:{preferida:()=>null,recordar:vi.fn()}},
      {provide:PerfilService,useValue:{alternarOcultarMontos:()=>TestBed.inject(PrivacidadService).alternarLocal()}},
      {provide:ToastService,useValue:{success:vi.fn()}}
    ]});
    fixture=TestBed.createComponent(RegistroRapidoComponent);component=fixture.componentInstance;
    component.abrir();fixture.detectChanges();
  });
  afterEach(()=>fixture.destroy());
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
