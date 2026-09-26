import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastMessage } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed bottom-5 right-5 sm:top-5 sm:bottom-auto z-50 flex flex-col space-y-2.5 max-w-sm w-full px-4 sm:px-0 pointer-events-none">
      @for (toast of toastService.toasts(); track toast.id) {
        <div 
          class="pointer-events-auto flex items-start p-4 rounded-2xl bg-white/95 backdrop-blur-md shadow-xl border transition-all duration-300 transform translate-y-0 opacity-100"
          [ngClass]="getToastBorderClass(toast.type)">
          
          <!-- Icono según tipo -->
          <div class="shrink-0 mr-3 mt-0.5">
            @if (toast.type === 'success') {
              <div class="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            } @else if (toast.type === 'error') {
              <div class="w-7 h-7 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            } @else if (toast.type === 'warning') {
              <div class="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            } @else {
              <div class="w-7 h-7 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            }
          </div>

          <!-- Mensaje y Título -->
          <div class="flex-1 min-w-0 pr-2">
            @if (toast.title) {
              <h4 class="text-xs font-bold text-slate-900">{{ toast.title }}</h4>
            }
            <p class="text-xs text-slate-600 mt-0.5 leading-relaxed break-words">{{ toast.message }}</p>
          </div>

          <!-- Botón Cerrar -->
          <button 
            type="button"
            (click)="toastService.remove(toast.id)"
            class="shrink-0 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      }
    </div>
  `
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService);

  getToastBorderClass(type: string): string {
    switch (type) {
      case 'success':
        return 'border-emerald-200/80 shadow-emerald-500/5';
      case 'error':
        return 'border-rose-200/80 shadow-rose-500/5';
      case 'warning':
        return 'border-amber-200/80 shadow-amber-500/5';
      default:
        return 'border-blue-200/80 shadow-blue-500/5';
    }
  }
}
