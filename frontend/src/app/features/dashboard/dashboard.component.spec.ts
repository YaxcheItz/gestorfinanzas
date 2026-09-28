import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { FinanzasService } from '../../core/services/finanzas.service';
import { PerfilService } from '../../core/services/perfil.service';
import { ToastService } from '../../core/services/toast.service';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent movement dialog accessibility', () => {
  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        {
          provide: AuthService,
          useValue: { currentUser: () => null, isAuthenticated: () => true }
        },
        {
          provide: FinanzasService,
          useValue: {
            getDashboardResumen: () => of({
              success: true,
              message: '',
              data: { resumenPorMoneda: [], ultimosMovimientos: [] }
            }),
            getDashboardAnalitica: () => of({
              success: true,
              message: '',
              data: { gastosPorCategoria: [], ultimosSeisMeses: [] }
            }),
            getDashboardComparacion: () => of({
              success: true,
              message: '',
              data: { mes: 4, anio: 2026, mesAnterior: 3, anioAnterior: 2026, porMoneda: [] }
            }),
            getPlantillasRecurrentes: () => of({ success: true, message: '', data: [] }),
            registrarMovimientoRecurrente: () => of({ success: true, message: '', data: undefined }),
            getCuentas: () => of({ success: true, message: '', data: [] }),
            getCategorias: () => of({ success: true, message: '', data: [] })
          }
        },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: ConfirmDialogService, useValue: { confirm: vi.fn() } },
        { provide: PerfilService, useValue: { perfil: signal(null) } },
        { provide: Router, useValue: { navigate: vi.fn() } }
      ]
    });
    await TestBed.compileComponents();
  });

  it('moves focus into the dialog, traps Tab, and restores focus on Escape', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    const opener = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
    ).find(button => button.textContent?.includes('Nuevo Movimiento')) as HTMLButtonElement;
    opener.focus();
    opener.click();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLDivElement;
    const closeButton = dialog.querySelector('[aria-label="Cerrar formulario de movimiento"]') as HTMLButtonElement;
    const submitButton = dialog.querySelector('button[type="submit"]') as HTMLButtonElement;

    expect(fixture.nativeElement.ownerDocument.activeElement).toBe(dialog.querySelector('#monto'));

    opener.focus();
    opener.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(fixture.nativeElement.ownerDocument.activeElement).toBe(closeButton);

    closeButton.focus();
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(fixture.nativeElement.ownerDocument.activeElement).toBe(submitButton);

    submitButton.focus();
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(fixture.nativeElement.ownerDocument.activeElement).toBe(closeButton);

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(fixture.nativeElement.ownerDocument.activeElement).toBe(opener);
  });

  it('exposes the selected movement type as a pressed state', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    fixture.componentInstance.abrirModal('TRANSFERENCIA');
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    const buttons = Array.from(dialog.querySelectorAll('button[aria-pressed]')) as HTMLButtonElement[];

    expect(buttons.find(button => button.textContent?.includes('Transferencia'))?.getAttribute('aria-pressed')).toBe('true');
    expect(buttons.find(button => button.textContent?.includes('Gasto'))?.getAttribute('aria-pressed')).toBe('false');
  });

  it('announces analytics loading and errors and exposes chart values in a data table', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.analiticaLoading.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain('Cargando analítica');

    component.analiticaLoading.set(false);
    component.analiticaError.set('No se pudo cargar la analítica financiera.');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('No se pudo cargar');

    component.analiticaError.set(null);
    component.analitica.set({
      gastosPorCategoria: [{
        categoriaId: 1,
        categoriaNombre: 'Alimentos',
        monto: 4321,
        moneda: 'MXN'
      }],
      ultimosSeisMeses: [{
        anio: 2026,
        mes: 4,
        ingresos: 12500,
        gastos: 4321,
        moneda: 'MXN'
      }]
    });
    component.monedaAnalitica.set('MXN');
    fixture.detectChanges();

    const table = fixture.nativeElement.querySelector('table') as HTMLTableElement;
    expect(table.textContent).toContain('abr 2026');
    expect(table.textContent).toContain('Ingresos');
    expect(table.textContent).toContain('Gastos');
    expect(table.textContent).toContain('12,500.00');
    expect(fixture.nativeElement.querySelector('ul[aria-label="Gastos por categoría e importe"]')?.textContent)
      .toContain('Alimentos');
  });

  it('stacks income and expense summaries on narrow screens and preserves long amounts', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    fixture.componentInstance.resumen.set({
      balanceTotal: 12500,
      ingresosMes: 15000,
      gastosMes: 2500,
      balanceMes: 12500,
      tasaAhorro: 83.3,
      totalCuentas: 2,
      mes: 4,
      anio: 2026,
      ultimosMovimientos: [],
      resumenPorMoneda: [{
        moneda: 'MXN',
        balanceTotal: 12500,
        ingresosMes: 15000,
        gastosMes: 2500,
        balanceMes: 12500,
        tasaAhorro: 83.3,
        totalCuentas: 2
      }]
    });
    fixture.detectChanges();

    const incomeSummary = fixture.nativeElement.querySelector('article.border-emerald-100') as HTMLElement;
    const summaryGrid = incomeSummary.parentElement as HTMLElement;
    const amount = incomeSummary.querySelector('p.min-w-0') as HTMLElement;
    const totalBalance = fixture.nativeElement.querySelector('article p.min-w-0.break-words') as HTMLElement;

    expect(summaryGrid.classList.contains('grid-cols-1')).toBe(true);
    expect(summaryGrid.classList.contains('sm:grid-cols-2')).toBe(true);
    expect(amount.classList.contains('break-words')).toBe(true);
    expect(totalBalance.classList.contains('text-2xl')).toBe(true);
  });

  it('shows only active recurring movements due within the next seven days', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const addDays = (value: string, count: number) => {
      const [year, month, day] = value.split('-').map(Number);
      const date = new Date(year, month - 1, day + count);
      return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')
      ].join('-');
    };
    const plantilla = (id: number, fecha: string, activa = true) => ({
      id,
      cuentaId: 1,
      cuentaNombre: 'Efectivo',
      categoriaId: null,
      categoriaNombre: 'Renta',
      tipo: 'GASTO' as const,
      monto: 100,
      moneda: 'MXN',
      notas: null,
      frecuencia: 'MENSUAL' as const,
      siguienteFecha: fecha,
      activa
    });

    component.plantillasRecurrentes.set([
      plantilla(1, component.fechaHoy()),
      plantilla(2, addDays(component.fechaHoy(), 7)),
      plantilla(3, addDays(component.fechaHoy(), 8)),
      plantilla(4, component.fechaHoy(), false)
    ]);

    expect(component.plantillasPorAtender().map(item => item.id)).toEqual([1, 2]);
  });
});
