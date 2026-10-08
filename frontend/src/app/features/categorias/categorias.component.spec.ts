import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Categoria, PresupuestoResumen } from '../../core/models/finanzas.models';
import { CategoriaOrdenService } from '../../core/services/categoria-orden.service';
import { FinanzasService } from '../../core/services/finanzas.service';
import { PerfilService } from '../../core/services/perfil.service';
import { ToastService } from '../../core/services/toast.service';
import { CategoriasComponent } from './categorias.component';

describe('CategoriasComponent category management', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<CategoriasComponent>>;
  let finanzas: {
    getMisCategorias: ReturnType<typeof vi.fn>;
    getPresupuestos: ReturnType<typeof vi.fn>;
    crearCategoria: ReturnType<typeof vi.fn>;
    actualizarCategoria: ReturnType<typeof vi.fn>;
    guardarPresupuesto: ReturnType<typeof vi.fn>;
    eliminarPresupuesto: ReturnType<typeof vi.fn>;
  };
  let guardarOrden: ReturnType<typeof vi.fn>;

  const category: Categoria = {
    id: 4, nombre: 'Transporte', tipo: 'GASTO', icono: 'car',
    color: '#2563eb', esPersonalizada: true, activo: true
  };
  const budgetSummary: PresupuestoResumen = {
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear(),
    totalPresupuestado: 0, totalGastado: 0, totalDisponible: 0,
    porcentajeConsumidoGlobal: 0, presupuestos: [], resumenPorMoneda: []
  };

  beforeEach(async () => {
    finanzas = {
      getMisCategorias: vi.fn(() => of({ success: true, message: '', data: [category] })),
      getPresupuestos: vi.fn(() => of({ success: true, message: '', data: budgetSummary })),
      crearCategoria: vi.fn(() => of({ success: true, message: '', data: category })),
      actualizarCategoria: vi.fn(() => of({ success: true, message: '', data: category })),
      guardarPresupuesto: vi.fn(() => of({ success: true, message: '', data: {} })),
      eliminarPresupuesto: vi.fn(() => of({ success: true, message: '', data: undefined }))
    };
    guardarOrden = vi.fn();
    await TestBed.configureTestingModule({
      imports: [CategoriasComponent],
      providers: [
        { provide: FinanzasService, useValue: finanzas },
        { provide: CategoriaOrdenService, useValue: { ordenar: (items: Categoria[]) => items, guardarOrden } },
        { provide: PerfilService, useValue: { perfil: () => null } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(CategoriasComponent);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('limits a category name to 20 characters and submits its chosen color', () => {
    const component = fixture.componentInstance;
    component.abrirCrear();
    component.nombre = 'Transporte';
    component.color = '#2563eb';

    component.guardar();

    expect(finanzas.crearCategoria).toHaveBeenCalledWith(expect.objectContaining({
      nombre: 'Transporte',
      color: '#2563eb'
    }));
    component.abrirCrear();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#categoria-nombre').getAttribute('maxlength')).toBe('20');
  });

  it('rejects names longer than 20 characters before calling the API', () => {
    const component = fixture.componentInstance;
    component.abrirCrear();
    component.nombre = 'Nombre de categoría demasiado largo';

    component.guardar();

    expect(finanzas.crearCategoria).not.toHaveBeenCalled();
    expect(component.modalError()).toContain('20');
  });

  it('allows editing a legacy category while keeping its name unchanged', () => {
    const legacy = { ...category, nombre: 'Alimentos y Supermercado' };
    const component = fixture.componentInstance;
    component.abrirEditar(legacy);

    component.guardar();

    expect(finanzas.actualizarCategoria).toHaveBeenCalledWith(legacy.id, expect.objectContaining({
      nombre: legacy.nombre
    }));
  });

  it('creates the current-month budget after creating a category', () => {
    const component = fixture.componentInstance;
    component.abrirCrear();
    component.nombre = 'Transporte';
    component.presupuestoActivo = true;
    component.limiteMensual = 2500;

    component.guardar();

    expect(finanzas.guardarPresupuesto).toHaveBeenCalledWith(expect.objectContaining({
      categoriaId: 4,
      montoLimite: 2500,
      mes: new Date().getMonth() + 1,
      anio: new Date().getFullYear()
    }));
  });

  it('removes the current-month budget when its toggle is turned off', () => {
    const presupuestado = {
      id: 19, categoriaId: 4, categoriaNombre: 'Transporte', montoLimite: 500,
      moneda: 'MXN', montoGastado: 0, montoDisponible: 500,
      porcentajeConsumido: 0, mes: budgetSummary.mes, anio: budgetSummary.anio, estado: 'NORMAL'
    } as const;
    finanzas.getPresupuestos.mockReturnValue(of({
      success: true, message: '', data: { ...budgetSummary, presupuestos: [presupuestado] }
    }));
    const component = fixture.componentInstance;
    component.abrirEditar(category);
    component.presupuestoActivo = false;

    component.guardar();

    expect(finanzas.eliminarPresupuesto).toHaveBeenCalledWith(19);
  });

  it('preserves the existing currency when adjusting a monthly budget', () => {
    const presupuestado = {
      id: 19, categoriaId: 4, categoriaNombre: 'Transporte', montoLimite: 500,
      moneda: 'USD', montoGastado: 0, montoDisponible: 500,
      porcentajeConsumido: 0, mes: budgetSummary.mes, anio: budgetSummary.anio, estado: 'NORMAL'
    } as const;
    finanzas.getPresupuestos.mockReturnValue(of({
      success: true, message: '', data: { ...budgetSummary, presupuestos: [presupuestado] }
    }));
    const component = fixture.componentInstance;
    component.abrirEditar(category);
    component.limiteMensual = 600;

    component.guardar();

    expect(finanzas.guardarPresupuesto).toHaveBeenCalledWith(expect.objectContaining({
      categoriaId: 4,
      moneda: 'USD',
      montoLimite: 600
    }));
  });

  it('persists the order changed in the category manager', () => {
    const component = fixture.componentInstance;
    component.categorias.set([
      category,
      { ...category, id: 8, nombre: 'Hogar' }
    ]);

    component.moverCategoria(category, 1);

    expect(guardarOrden).toHaveBeenCalledWith([8, 4]);
  });

  it('reorders on touch release after a long press and leaves cancellation unchanged', () => {
    vi.useFakeTimers();
    try {
      const component = fixture.componentInstance;
      component.categorias.set([category, { ...category, id: 8, nombre: 'Hogar' }]);
      const event = { pointerType: 'touch', isPrimary: true, pointerId: 1, clientX: 0, clientY: 0, currentTarget: document.createElement('button') } as unknown as PointerEvent;
      component.iniciarReordenamientoTactil(event, category);
      vi.advanceTimersByTime(350);
      component.destinoTactil.set(8);
      component.terminarReordenamientoTactil(event);
      expect(guardarOrden).toHaveBeenCalledWith([8, 4]);
      guardarOrden.mockClear();
      component.iniciarReordenamientoTactil(event, category);
      component.cancelarReordenamientoTactil();
      vi.advanceTimersByTime(400);
      component.terminarReordenamientoTactil(event);
      expect(guardarOrden).not.toHaveBeenCalled();
    } finally { vi.useRealTimers(); }
  });
});
