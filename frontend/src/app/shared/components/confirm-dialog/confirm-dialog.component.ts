import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (dialogService.isOpen()) {
      <!-- Overlay -->
      <div 
        class="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
        (click)="dialogService.handleCancel()">
        
        <!-- Modal Card -->
        <div 
          class="bg-white rounded-2xl sm:rounded-3xl w-full max-w-sm max-h-[calc(100dvh-1rem)] overflow-y-auto shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
          (click)="$event.stopPropagation()">
          
          <!-- Icono + Encabezado -->
          <div class="pt-6 sm:pt-8 px-4 sm:px-6 pb-4 text-center">
            <div 
              class="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4"
              [ngClass]="getIconBgClass()">
              @if (dialogService.options().type === 'danger') {
                <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              } @else if (dialogService.options().type === 'warning') {
                <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              } @else {
                <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            </div>
            <h3 class="text-base font-bold text-slate-900 mb-1">
              {{ dialogService.options().title }}
            </h3>
            <p class="text-xs text-slate-500 leading-relaxed">
              {{ dialogService.options().message }}
            </p>
          </div>

          <!-- Botones de Acción -->
          <div class="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 px-4 sm:px-6 pb-4 sm:pb-6 pt-2">
            <!-- Cancelar -->
            <button 
              type="button"
              (click)="dialogService.handleCancel()"
              class="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
              {{ dialogService.options().cancelText || 'Cancelar' }}
            </button>

            <!-- Confirmar -->
            <button 
              type="button"
              (click)="dialogService.handleConfirm()"
              [ngClass]="getConfirmButtonClass()"
              class="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold text-white transition-all cursor-pointer shadow-md">
              {{ dialogService.options().confirmText || 'Confirmar' }}
            </button>
          </div>

        </div>
      </div>
    }
  `
})
export class ConfirmDialogComponent {
  readonly dialogService = inject(ConfirmDialogService);

  getIconBgClass(): string {
    switch (this.dialogService.options().type) {
      case 'danger':
        return 'bg-rose-100 text-rose-600';
      case 'warning':
        return 'bg-amber-100 text-amber-600';
      default:
        return 'bg-blue-100 text-blue-600';
    }
  }

  getConfirmButtonClass(): string {
    switch (this.dialogService.options().type) {
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-rose-600/20';
      case 'warning':
        return 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 shadow-amber-500/20';
      default:
        return 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-blue-600/20';
    }
  }
}
