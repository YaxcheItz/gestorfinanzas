import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { FinanzasService } from '../../core/services/finanzas.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { PresupuestosComponent } from './presupuestos.component';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { ListaContextoService } from '../../core/services/lista-contexto.service';

describe('PresupuestosComponent estados del período', () => {
  const vacio = { success: true, data: { presupuestos: [], resumenPorMoneda: [] } };
  let getPresupuestos: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    getPresupuestos = vi.fn(() => of(vacio));
    TestBed.configureTestingModule({ imports: [PresupuestosComponent], providers: [
      { provide: FinanzasService, useValue: { getPresupuestos, getCategorias: () => of({ success: true, data: [{id:7,nombre:'Comida',tipo:'GASTO'}] }) } },
      { provide: ActivatedRoute, useValue: {snapshot:{queryParamMap:convertToParamMap({})}} },
      { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      { provide: ConfirmDialogService, useValue: { confirm: vi.fn() } },
    ] });
  });

  it('un error de consulta no se presenta como un mes sin presupuestos', async () => {
    getPresupuestos.mockReturnValue(throwError(() => new Error('sin conexión')));
    const fixture = TestBed.createComponent(PresupuestosComponent);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    expect(el.textContent).not.toContain('No hay presupuestos fijados');
    expect(el.textContent).not.toContain('Crear primer presupuesto');
  });

  it('cancela el mes anterior y no deja que su respuesta sustituya el período elegido', () => {
    const anterior = new Subject<any>();
    const actual = new Subject<any>();
    getPresupuestos.mockReturnValueOnce(anterior).mockReturnValueOnce(actual);
    const fixture = TestBed.createComponent(PresupuestosComponent);
    const component = fixture.componentInstance;
    component.cargarPresupuestos();
    component.cambiarMes(2);
    expect(anterior.observed).toBe(false);
    actual.next(vacio);
    anterior.next({ success: true, data: { presupuestos: [{ id: 99 }], resumenPorMoneda: [] } });
    expect(component.resumen()?.presupuestos).toEqual([]);
    expect(component.loading()).toBe(false);
    fixture.destroy();
    expect(actual.observed).toBe(false);
  });

  it('una respuesta inválida muestra error y permite reintentar', () => {
    getPresupuestos.mockReturnValue(of({ success: false, data: null }));
    const component = TestBed.createComponent(PresupuestosComponent).componentInstance;
    component.cargarPresupuestos();
    expect(component.error()).toContain('Vuelve a intentarlo');
    expect(component.loading()).toBe(false);
  });

  it('abre el formulario de la categoría y moneda indicadas cuando aún no existe presupuesto', () => {
    TestBed.overrideProvider(ActivatedRoute, {useValue:{snapshot:{queryParamMap:convertToParamMap({categoriaId:'7',moneda:'USD'})}}});
    const fixture = TestBed.createComponent(PresupuestosComponent); fixture.detectChanges();
    expect(fixture.componentInstance.modalAbierto()).toBe(true);
    expect(fixture.componentInstance.modoEdicion()).toBe(false);
    expect(fixture.componentInstance.formCategoriaId).toBe(7);
    expect(fixture.componentInstance.formMoneda).toBe('USD');
  });

  it('edita el presupuesto existente de la categoría y moneda elegidas', () => {
    TestBed.overrideProvider(ActivatedRoute, {useValue:{snapshot:{queryParamMap:convertToParamMap({categoriaId:'7',moneda:'USD'})}}});
    getPresupuestos.mockReturnValue(of({success:true,data:{presupuestos:[{id:8,categoriaId:7,moneda:'USD',listaId:null,montoLimite:300,porcentajeAlerta:80}],resumenPorMoneda:[]}}));
    const fixture = TestBed.createComponent(PresupuestosComponent); fixture.detectChanges();
    expect(fixture.componentInstance.modalAbierto()).toBe(true);
    expect(fixture.componentInstance.modoEdicion()).toBe(true);
    expect(fixture.componentInstance.formMontoLimite).toBe(300);
  });

  it('no ofrece crear otro presupuesto al existir uno de la categoría en otra moneda', () => {
    TestBed.overrideProvider(ActivatedRoute, {useValue:{snapshot:{queryParamMap:convertToParamMap({categoriaId:'7',moneda:'USD'})}}});
    getPresupuestos.mockReturnValue(of({success:true,data:{presupuestos:[{id:8,categoriaId:7,moneda:'MXN',listaId:null,montoLimite:300}],resumenPorMoneda:[]}}));
    const fixture = TestBed.createComponent(PresupuestosComponent); fixture.detectChanges();
    expect(fixture.componentInstance.modoEdicion()).toBe(true);
    expect(fixture.componentInstance.formMoneda).toBe('MXN');
    expect(fixture.componentInstance.formMontoLimite).toBe(300);
  });

  it('abre y consulta el mes y año seleccionados en Inicio', () => {
    TestBed.overrideProvider(ActivatedRoute, {useValue:{snapshot:{queryParamMap:convertToParamMap({categoriaId:'7',moneda:'MXN',mes:'2',anio:'2022'})}}});
    const fixture = TestBed.createComponent(PresupuestosComponent); fixture.detectChanges();
    expect(getPresupuestos).toHaveBeenCalledWith(2,2022,null);
    expect(fixture.componentInstance.mesSeleccionado()).toBe(2);
    expect(fixture.componentInstance.anioSeleccionado()).toBe(2022);
    expect(fixture.componentInstance.aniosDisponibles).toContain(2022);
    expect(fixture.componentInstance.formCategoriaId).toBe(7);
  });

  it('espera el presupuesto de la nueva lista antes de abrir el formulario', () => {
    TestBed.overrideProvider(ActivatedRoute, {useValue:{snapshot:{queryParamMap:convertToParamMap({categoriaId:'7',moneda:'MXN'})}}});
    const pendiente = new Subject<any>();
    getPresupuestos.mockReturnValueOnce(of({success:true,data:{presupuestos:[{id:8,categoriaId:7,moneda:'MXN',listaId:1,montoLimite:100}],resumenPorMoneda:[]}})).mockReturnValueOnce(pendiente);
    const contexto = TestBed.inject(ListaContextoService);
    contexto.aplicar([{id:1,nombre:'Lista A',personal:true,rol:'PROPIETARIO',miembros:[]},{id:2,nombre:'Lista B',personal:false,rol:'PROPIETARIO',miembros:[]}] as any);
    contexto.cargando.set(true);
    const fixture = TestBed.createComponent(PresupuestosComponent); fixture.detectChanges();
    contexto.seleccionar(2); fixture.detectChanges();
    contexto.cargando.set(false); fixture.detectChanges();
    expect(fixture.componentInstance.modalAbierto()).toBe(false);
    pendiente.next({success:true,data:{presupuestos:[{id:9,categoriaId:7,moneda:'MXN',listaId:2,montoLimite:200}],resumenPorMoneda:[]}});
    expect(fixture.componentInstance.modalAbierto()).toBe(true);
    expect(fixture.componentInstance.modoEdicion()).toBe(true);
    expect(fixture.componentInstance.formMontoLimite).toBe(200);
    fixture.destroy();
  });
});
