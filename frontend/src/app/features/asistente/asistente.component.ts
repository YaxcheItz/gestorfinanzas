import { Component } from '@angular/core';

@Component({
  selector: 'app-asistente',
  standalone: true,
  template: `
    <main class="mx-auto flex w-full max-w-5xl flex-1 items-start px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      <section class="w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
        <div class="border-b border-slate-100 bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-5 sm:p-8">
          <div class="flex items-start gap-4">
            <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <svg aria-hidden="true" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/>
                <path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z"/>
                <path d="m5 16 .6 1.4L7 18l-1.4.6L5 20l-.6-1.4L3 18l1.4-.6L5 16Z"/>
              </svg>
            </span>
            <div class="min-w-0">
              <p class="text-xs font-semibold uppercase tracking-wider text-emerald-700">Kaptal inteligente</p>
              <h1 class="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Asistente IA</h1>
              <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Estamos preparando un espacio para consultar tus finanzas y registrar movimientos con ayuda de inteligencia artificial.
              </p>
            </div>
          </div>
        </div>
        <div class="p-5 sm:p-8">
          <div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center sm:p-10">
            <span class="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">En preparación</span>
            <h2 class="mt-3 text-lg font-bold text-slate-900">Próximamente</h2>
            <p class="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
              Aquí se irán agregando las funciones del asistente. Por ahora, tus cuentas y movimientos siguen administrándose desde las secciones actuales.
            </p>
          </div>
        </div>
      </section>
    </main>
  `
})
export class AsistenteComponent {}
