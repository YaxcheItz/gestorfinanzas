import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

interface MovimientoMock {
  id: number;
  concepto: string;
  categoria: string;
  tipo: 'INGRESO' | 'GASTO';
  monto: number;
  fecha: string;
  cuenta: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <!-- Encabezado y Saludo -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Resumen Financiero
          </h1>
          <p class="text-sm text-slate-500 mt-1">
            Hola, {{ authService.currentUser()?.nombre || 'Usuario' }}. Aquí tienes el estado actual de tus cuentas.
          </p>
        </div>

        <div class="flex items-center space-x-3">
          <button class="inline-flex items-center px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Septiembre 2026
          </button>
          <button class="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-emerald-600/20 transition-all cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Movimiento
          </button>
        </div>
      </div>

      <!-- Tarjetas Métricas Principales (Grid responsive) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <!-- Saldo Total -->
        <div class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Balance Total</span>
            <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
          <div class="mt-4">
            <div class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">$24,580.00 <span class="text-xs text-slate-400 font-normal">MXN</span></div>
            <p class="text-xs text-emerald-600 font-medium mt-1 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clip-rule="evenodd" />
              </svg>
              +12.4% vs mes anterior
            </p>
          </div>
        </div>

        <!-- Ingresos del Mes -->
        <div class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Ingresos (Mes)</span>
            <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
            </div>
          </div>
          <div class="mt-4">
            <div class="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600">+$32,000.00</div>
            <p class="text-xs text-slate-500 font-medium mt-1">2 fuentes registradas</p>
          </div>
        </div>

        <!-- Gastos del Mes -->
        <div class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Gastos (Mes)</span>
            <div class="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
              </svg>
            </div>
          </div>
          <div class="mt-4">
            <div class="text-2xl sm:text-3xl font-bold tracking-tight text-rose-600">-$7,420.00</div>
            <p class="text-xs text-slate-500 font-medium mt-1">23.1% de tus ingresos</p>
          </div>
        </div>

        <!-- Capacidad de Ahorro -->
        <div class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Tasa de Ahorro</span>
            <div class="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div class="mt-4">
            <div class="text-2xl sm:text-3xl font-bold tracking-tight text-violet-600">76.9%</div>
            <p class="text-xs text-emerald-600 font-medium mt-1">Por encima de tu meta (50%)</p>
          </div>
        </div>

      </div>

      <!-- Banner de Inteligencia Artificial (Spring AI) -->
      <div class="bg-linear-to-r from-emerald-900 to-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="space-y-1 relative z-10">
          <div class="flex items-center space-x-2">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Spring AI Ready ✨
            </span>
            <span class="text-xs text-slate-400">Módulo Inteligente</span>
          </div>
          <h2 class="text-lg font-bold">Asistente y Clasificador Inteligente</h2>
          <p class="text-xs text-slate-300 max-w-xl">
            Tu backend está preparado para conectar modelos de lenguaje (OpenAI, Gemini u Ollama local) para clasificar recibos, sugerir presupuestos y responder preguntas sobre tus balances.
          </p>
        </div>
        <button class="shrink-0 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-xl transition-all cursor-pointer self-start md:self-center">
          Explorar Asistente IA
        </button>
      </div>

      <!-- Tabla de Transacciones Recientes -->
      <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div class="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 class="text-base font-bold text-slate-900">Últimos Movimientos</h2>
            <p class="text-xs text-slate-500 mt-0.5">Historial reciente de ingresos y gastos</p>
          </div>
          <button class="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer">
            Ver todos los movimientos &rarr;
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50 text-xs uppercase font-semibold text-slate-400 tracking-wider">
              <tr>
                <th class="px-6 py-3.5">Concepto</th>
                <th class="px-6 py-3.5">Categoría</th>
                <th class="px-6 py-3.5">Cuenta</th>
                <th class="px-6 py-3.5">Fecha</th>
                <th class="px-6 py-3.5 text-right">Monto</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (m of movimientos(); track m.id) {
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <td class="px-6 py-4 font-medium text-slate-900 flex items-center space-x-3">
                    <div [class]="m.tipo === 'INGRESO' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'"
                         class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                      @if (m.tipo === 'INGRESO') {
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                        </svg>
                      } @else {
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                        </svg>
                      }
                    </div>
                    <span>{{ m.concepto }}</span>
                  </td>
                  <td class="px-6 py-4">
                    <span class="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {{ m.categoria }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-xs font-medium text-slate-500">
                    {{ m.cuenta }}
                  </td>
                  <td class="px-6 py-4 text-xs text-slate-500">
                    {{ m.fecha }}
                  </td>
                  <td class="px-6 py-4 text-right font-bold"
                      [class.text-emerald-600]="m.tipo === 'INGRESO'"
                      [class.text-rose-600]="m.tipo === 'GASTO'">
                    {{ m.tipo === 'INGRESO' ? '+' : '-' }}\${{ m.monto.toFixed(2) }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `
})
export class DashboardComponent {
  public readonly authService = inject(AuthService);

  movimientos = signal<MovimientoMock[]>([
    { id: 1, concepto: 'Pago Quincenal de Nómina', categoria: 'Salario', tipo: 'INGRESO', monto: 16000.00, fecha: '2026-09-15', cuenta: 'Cuenta Débito BBVA' },
    { id: 2, concepto: 'Supermercado semanal', categoria: 'Alimentos y Supermercado', tipo: 'GASTO', monto: 2350.50, fecha: '2026-09-18', cuenta: 'Tarjeta Santander' },
    { id: 3, concepto: 'Gasolina auto', categoria: 'Transporte', tipo: 'GASTO', monto: 850.00, fecha: '2026-09-20', cuenta: 'Efectivo' },
    { id: 4, concepto: 'Rendimiento Inversiones', categoria: 'Inversiones', tipo: 'INGRESO', monto: 450.00, fecha: '2026-09-21', cuenta: 'Cetes / Fondos' },
    { id: 5, concepto: 'Cena Restaurante', categoria: 'Ocio y Salidas', tipo: 'GASTO', monto: 620.00, fecha: '2026-09-22', cuenta: 'Tarjeta Santander' }
  ]);
}
