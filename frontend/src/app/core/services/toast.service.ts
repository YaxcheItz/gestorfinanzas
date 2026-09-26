import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: number;
  type: ToastType;
  title?: string;
  message: string;
  duration: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private counter = 0;
  readonly toasts = signal<ToastMessage[]>([]);

  show(type: ToastType, message: string, title?: string, duration: number = 4000): void {
    const id = ++this.counter;
    const toast: ToastMessage = {
      id,
      type,
      title,
      message,
      duration
    };

    this.toasts.update(current => [...current, toast]);

    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }
  }

  success(message: string, title?: string): void {
    this.show('success', message, title || 'Operación exitosa');
  }

  error(message: string, title?: string): void {
    this.show('error', message, title || 'Ocurrió un error');
  }

  warning(message: string, title?: string): void {
    this.show('warning', message, title || 'Atención');
  }

  info(message: string, title?: string): void {
    this.show('info', message, title || 'Información');
  }

  remove(id: number): void {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }
}
