import { AfterViewInit, Directive, ElementRef, EventEmitter, HostListener, OnDestroy, Output } from '@angular/core';

@Directive({
  selector: '[appFocusTrap]',
  standalone: true
})
export class FocusTrapDirective implements AfterViewInit, OnDestroy {
  @Output() readonly focusTrapEscape = new EventEmitter<void>();

  private readonly previousFocus: HTMLElement | null;

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {
    const active = this.elementRef.nativeElement.ownerDocument.activeElement;
    this.previousFocus = active && typeof (active as HTMLElement).focus === 'function'
      ? active as HTMLElement
      : null;
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => {
      if (!this.elementRef.nativeElement.isConnected) return;
      const first = this.focusableElements()[0];
      (first ?? this.elementRef.nativeElement).focus();
    });
  }

  ngOnDestroy(): void {
    if (this.previousFocus?.isConnected) this.previousFocus.focus();
  }

  @HostListener('keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.focusTrapEscape.emit();
      return;
    }
    if (event.key !== 'Tab') return;

    const elements = this.focusableElements();
    if (!elements.length) {
      event.preventDefault();
      this.elementRef.nativeElement.focus();
      return;
    }

    const first = elements[0];
    const last = elements[elements.length - 1];
    const active = this.elementRef.nativeElement.ownerDocument.activeElement;
    if (event.shiftKey && (active === first || !this.elementRef.nativeElement.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !this.elementRef.nativeElement.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusableElements(): HTMLElement[] {
    return Array.from(this.elementRef.nativeElement.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(element => !element.closest('[hidden], [aria-hidden="true"]'));
  }
}
