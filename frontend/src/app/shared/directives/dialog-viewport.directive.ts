import { AfterViewInit, Directive, ElementRef, inject, OnDestroy } from '@angular/core';
import { DOCUMENT } from '@angular/common';

const bloqueos = new WeakMap<Document, { cantidad: number; overflow: string }>();

/** El teclado cambia el viewport visual aunque el viewport del layout conserve su altura. */
@Directive({ selector: '[appDialogViewport]', standalone: true })
export class DialogViewportDirective implements AfterViewInit, OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly window = this.document.defaultView;
  private readonly viewport = this.window?.visualViewport;
  private frame = 0;
  private readonly actualizar = () => {
    if (!this.window || this.frame) return;
    this.frame = this.window.requestAnimationFrame(() => {
      this.frame = 0;
      if (!this.element.isConnected) return;
      // Mantener el zoom accesible: no redimensionar el diálogo durante pinch-to-zoom.
      if (this.viewport && this.viewport.scale !== 1) return;
      this.element.style.setProperty('--dialog-visible-height', `${this.viewport?.height ?? this.window!.innerHeight}px`);
      this.element.style.setProperty('--dialog-visible-top', `${this.viewport?.offsetTop ?? 0}px`);
      const focused = this.document.activeElement;
      if (focused instanceof HTMLElement && this.element.contains(focused)
          && focused.matches('input, textarea, select')) {
        const rect = focused.getBoundingClientRect();
        const top = this.viewport?.offsetTop ?? 0;
        const height = this.viewport?.height ?? this.window!.innerHeight;
        if (rect.top < top || rect.bottom > top+height) {
          focused.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
        }
      }
    });
  };

  ngAfterViewInit(): void {
    const anterior = bloqueos.get(this.document);
    bloqueos.set(this.document, { cantidad: (anterior?.cantidad ?? 0)+1,
      overflow: anterior?.overflow ?? this.document.body.style.overflow });
    this.document.body.style.overflow = 'hidden';
    this.viewport?.addEventListener('resize', this.actualizar);
    this.viewport?.addEventListener('scroll', this.actualizar);
    this.window?.addEventListener('resize', this.actualizar);
    this.actualizar();
  }

  ngOnDestroy(): void {
    this.viewport?.removeEventListener('resize', this.actualizar);
    this.viewport?.removeEventListener('scroll', this.actualizar);
    this.window?.removeEventListener('resize', this.actualizar);
    if (this.frame) this.window?.cancelAnimationFrame(this.frame);
    const actual = bloqueos.get(this.document);
    if (actual && actual.cantidad > 1) actual.cantidad--;
    else if (actual) {
      this.document.body.style.overflow = actual.overflow;
      bloqueos.delete(this.document);
    }
  }
}
