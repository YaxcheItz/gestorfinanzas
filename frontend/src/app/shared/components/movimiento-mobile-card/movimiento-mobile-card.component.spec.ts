import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi } from 'vitest';
import { MovimientoMobileCardComponent, SwipeActionsDirective } from './movimiento-mobile-card.component';

describe('MovimientoMobileCardComponent swipe', () => {
  it('deja el boton visible sin emitir editar ni cerrar al soltar', () => {
    const card = TestBed.runInInjectionContext(() => new MovimientoMobileCardComponent());
    const editar = vi.spyOn(card.editar, 'emit');
    const actions = { close: vi.fn() };
    card.onSwipeEdit(actions as unknown as SwipeActionsDirective);
    expect(editar).not.toHaveBeenCalled();
    expect(actions.close).not.toHaveBeenCalled();
  });
});
