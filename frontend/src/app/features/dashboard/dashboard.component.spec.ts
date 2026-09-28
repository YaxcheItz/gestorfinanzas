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
});
