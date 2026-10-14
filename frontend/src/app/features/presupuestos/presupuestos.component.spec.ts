import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { FinanzasService } from '../../core/services/finanzas.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { PresupuestosComponent } from './presupuestos.component';

describe('PresupuestosComponent estados del período', () => {
  const vacio = { success: true, data: { presupuestos: [], resumenPorMoneda: [] } };
  let getPresupuestos: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    getPresupuestos = vi.fn(() => of(vacio));
    TestBed.configureTestingModule({ imports: [PresupuestosComponent], providers: [
      { provide: FinanzasService, useValue: { getPresupuestos, getCategorias: () => of({ success: true, data: [] }) } },
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
});
