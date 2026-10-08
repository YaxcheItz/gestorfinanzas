import { TextoFinancieroPipe } from '../../core/pipes/texto-financiero.pipe';
﻿import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AiActionProposal, AiChatMessage, AiConnectionStatus, AiReportWidget } from '../../core/models/ai.models';
import { FinanzasService } from '../../core/services/finanzas.service';
import { PrivacidadService } from '../../core/services/privacidad.service';

interface ChatEntry extends AiChatMessage {
  action?: AiActionProposal;
  actions?: AiActionProposal[];
  report?: AiReportWidget | null;
  confirmedActions?: string[];
  cancelledActions?: string[];
  confirmed?: boolean;
  awaitingDeleteConfirmation?: boolean;
}

@Component({
  selector: 'app-asistente',
  standalone: true,
  imports: [TextoFinancieroPipe, CommonModule, FormsModule],
  template: `
    <main class="finance-page mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-5xl flex-1 items-stretch px-3 py-3 sm:min-h-[calc(100dvh-6rem)] sm:px-6 sm:py-6 lg:px-8">
      <section class="flex w-full min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs dark:border-slate-700 dark:bg-slate-900">
        <header class="flex items-start justify-between gap-3 border-b border-slate-100 bg-[#f7f8f4] p-4 sm:p-6 dark:border-slate-700 dark:bg-slate-900">
          <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">AI Reports · Chat Financiero</p>
          <h1 class="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Informes financieros</h1>
          <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Pregunta sobre tus finanzas o pide una acción. Revisa la propuesta antes de confirmar cualquier cambio.
          </p>
          <p role="status" class="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
            @if (cargando()) { Cargando preferencias... }
            @else if (estado()?.configured && conectado()) { {{ nombreProveedor() }} est&aacute; listo }
            @else if (estado()?.configured && !conectado()) { Reglas listas; {{ nombreProveedor() }} disponible con permiso }
            @else { Reglas listas; la IA opcional no está configurada }
          </p>
          </div>
          <button type="button" (click)="limpiarHistorial()" [disabled]="mensajes().length === 0 || enviando() || confirmandoId() !== null"
                  aria-label="Limpiar historial del chat" title="Limpiar historial del chat"
                  class="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-rose-950">
            <svg aria-hidden="true" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3"/></svg>
            <span class="hidden sm:inline">Limpiar</span>
          </button>
        </header>

        <div class="flex min-h-0 flex-1 flex-col p-3 sm:p-5">
          @if (error()) {
            <p role="alert" class="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200">{{ error() }}</p>
          }

          <div aria-live="polite" aria-relevant="additions text" [attr.aria-busy]="enviando()" class="mb-3 min-h-56 flex-1 space-y-4 overflow-y-auto overscroll-contain rounded-2xl bg-slate-50/80 p-3 sm:p-5 dark:bg-slate-950/60">
            @if (mensajes().length === 0) {
              <div class="flex min-h-56 flex-col items-center justify-center px-4 py-8 text-center">
                <span class="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800" aria-hidden="true">
                  <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3m0 12v3M4.2 6l2.1 2.1m11.4 7.8 2.1 2.1M3 12h3m12 0h3M4.2 18l2.1-2.1m11.4-7.8L19.8 6"/><circle cx="12" cy="12" r="4"/></svg>
                </span>
                <h2 class="text-base font-bold text-slate-900 dark:text-white">¿Qué quieres resolver?</h2>
                <p class="mt-1 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">Pídele que registre un movimiento o te explique tus gastos. Antes de guardar, podrás revisar y confirmar.</p>
              </div>
            }
            @for (message of mensajes(); track $index) {
              <article class="flex" [class.justify-end]="message.role === 'USER'">
                <div class="w-fit max-w-[95%] rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[85%]"
                     [class.rounded-br-md]="message.role === 'USER'"
                     [class.bg-emerald-700]="message.role === 'USER'"
                     [class.text-white]="message.role === 'USER'"
                     [class.rounded-bl-md]="message.role === 'ASSISTANT'"
                     [class.border]="message.role === 'ASSISTANT'"
                     [class.border-slate-200]="message.role === 'ASSISTANT'"
                     [class.bg-white]="message.role === 'ASSISTANT'"
                     [class.text-slate-800]="message.role === 'ASSISTANT'"
                     [class.dark:border-slate-700]="message.role === 'ASSISTANT'"
                     [class.dark:bg-slate-800]="message.role === 'ASSISTANT'"
                     [class.dark:text-slate-100]="message.role === 'ASSISTANT'">
                  <span class="mb-1 block text-[11px] font-semibold uppercase tracking-wide opacity-70">
                    {{ message.role === 'USER' ? 'Tú' : 'Kaptal IA' }}
                  </span>
                  <p class="whitespace-pre-wrap break-words">{{ message.content | textoFinanciero }}</p>

                  @if (message.report; as report) {
                    <section data-report-widget class="ai-report-widget mt-3" [attr.aria-labelledby]="'ai-report-title-' + $index">
                      <header class="ai-report-widget__header">
                        <h3 [id]="'ai-report-title-' + $index">{{ report.title }}</h3>
                        <button type="button" (click)="exportarGrafico($index)"
                                [disabled]="exportandoGrafico() === $index"
                                [attr.aria-label]="'Exportar gráfico ' + report.title"
                                class="ai-report-widget__export">
                          @if (exportandoGrafico() === $index) { Preparando... } @else { Exportar Gráfico }
                        </button>
                      </header>
                      <svg [id]="'ai-report-chart-' + $index" class="ai-report-widget__chart"
                           xmlns="http://www.w3.org/2000/svg" [attr.viewBox]="'0 0 560 ' + altoGrafico(report)"
                           role="img" [attr.aria-label]="'Gráfico de barras: ' + report.title">
                        <title>{{ report.title }}</title>
                        @for (label of report.labels; track $index) {
                          <g>
                            <text x="0" [attr.y]="coordenadaBarra($index) + 17" class="ai-report-widget__label">{{ label }}</text>
                            <rect x="190" [attr.y]="coordenadaBarra($index)" [attr.width]="anchoBarra(report, report.values[$index])"
                                  height="22" rx="6" class="ai-report-widget__bar" />
                            <text x="550" [attr.y]="coordenadaBarra($index) + 17" text-anchor="end" class="ai-report-widget__value">
                              {{ valorReporte(report, report.values[$index]) }}
                            </text>
                          </g>
                        }
                      </svg>
                      <ul class="ai-report-widget__data" aria-label="Datos del gráfico">
                        @for (label of report.labels; track $index) {
                          <li><span>{{ label }}</span><strong>{{ valorReporte(report, report.values[$index]) }}</strong></li>
                        }
                      </ul>
                    </section>
                  }

                  @if (message.actions?.length) {
                    <div class="mt-3 space-y-2" aria-label="Movimientos propuestos">
                      <h2 class="font-bold">Revisa cada movimiento antes de guardarlo</h2>
                      @for (action of message.actions; track action.id; let actionIndex = $index) {
                        <section class="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100" [attr.aria-label]="'Movimiento ' + (actionIndex + 1) + ' de ' + (message.actions?.length ?? 0)">
                          <p class="font-semibold">{{ (action.summary) | textoFinanciero }}</p>
                          <dl class="mt-2 space-y-1 border-t border-amber-200 pt-2 text-xs dark:border-amber-800">
                            @for (field of action.data | keyvalue; track field.key) {
                              <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-3"><dt class="font-medium">{{ etiquetaCampo(field.key) }}</dt><dd class="break-all text-right">{{ mostrarValor(field.key, field.value) }}</dd></div>
                            }
                          </dl>
                          @if (message.confirmedActions?.includes(action.id)) {
                            <p class="mt-3 font-semibold text-emerald-800 dark:text-emerald-300">Movimiento guardado.</p>
                          } @else if (message.cancelledActions?.includes(action.id)) {
                            <p class="mt-3 text-xs">Movimiento descartado; no se guard&oacute;.</p>
                          } @else {
                            <div class="mt-3 flex flex-wrap gap-2">
                              <button type="button" (click)="confirmarPropuesta($index, action)" [disabled]="confirmandoId() === action.id" class="min-h-11 rounded-lg bg-emerald-700 px-3 py-2 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{{ confirmandoId() === action.id ? 'Guardando...' : 'Confirmar movimiento' }}</button>
                              <button type="button" (click)="cancelarPropuesta($index, action.id)" [disabled]="confirmandoId() === action.id" class="min-h-11 rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:bg-white dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">Descartar</button>
                            </div>
                          }
                        </section>
                      }
                    </div>
                  }

                  @if (message.action; as action) {
                    <div class="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
                      <h2 class="font-bold">Propuesta para revisar</h2>
                      <p class="mt-1">{{ (action.summary) | textoFinanciero }}</p>
                      @if (!message.confirmed) {
                        <p class="mt-2 text-xs font-medium">A&#250;n no se ha ejecutado ning&#250;n cambio.</p>
                      }
                      <dl class="mt-2 space-y-1 border-t border-amber-200 pt-2 text-xs dark:border-amber-800">
                        @for (field of action.data | keyvalue; track field.key) {
                          <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                            <dt class="font-medium">{{ etiquetaCampo(field.key) }}</dt>
                            <dd class="break-all text-right">{{ mostrarValor(field.key, field.value) }}</dd>
                          </div>
                        }
                      </dl>
                      @if (message.confirmed) {
                        <p class="mt-3 font-semibold text-emerald-800 dark:text-emerald-300">Acción confirmada y completada.</p>
                      } @else if (isDelete(action.type) && !message.awaitingDeleteConfirmation) {
                        <button type="button" (click)="solicitarConfirmacionBorrado($index)"
                                [disabled]="confirmandoId() === action.id"
                                class="mt-3 min-h-11 rounded-lg bg-rose-700 px-3 py-2 font-semibold text-white hover:bg-rose-800 disabled:opacity-50">
                          Revis&eacute;; continuar con el borrado
                        </button>
                      } @else {
                        @if (isDelete(action.type)) {
                          <p class="mt-3 font-semibold">Este borrado puede ser irreversible. Confirma una vez más.</p>
                        }
                        <div class="mt-3 flex flex-wrap gap-2">
                          <button type="button" (click)="confirmarAccion($index)"
                                  [disabled]="confirmandoId() === action.id"
                                  class="min-h-11 rounded-lg px-3 py-2 font-semibold text-white disabled:opacity-50"
                                  [class.bg-rose-700]="isDelete(action.type)"
                                  [class.hover:bg-rose-800]="isDelete(action.type)"
                                  [class.bg-emerald-700]="!isDelete(action.type)"
                                  [class.hover:bg-emerald-800]="!isDelete(action.type)">
                            {{ confirmandoId() === action.id ? 'Procesando...' : isDelete(action.type) ? 'Confirmar borrado' : 'Confirmar y ejecutar' }}
                          </button>
                          <button type="button" (click)="cancelarAccion($index)"
                                  class="min-h-11 rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:bg-white dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
                            Cancelar
                          </button>
                        </div>
                      }
                    </div>
                  }
                </div>
              </article>
            }
            @if (enviando()) {
              <p role="status" class="text-sm text-slate-500 dark:text-slate-400">Kaptal está revisando tu mensaje...</p>
            }
          </div>

          @if (errorChat()) {
            <p role="alert" class="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200">{{ errorChat() }}</p>
          }
          <div class="ai-chat-composer">
          <section aria-labelledby="ai-data-sharing-title" class="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100">
            <h2 id="ai-data-sharing-title" class="font-semibold">Tus datos se compartirán con {{ nombreProveedor() }}</h2>
            <p class="mt-1 text-xs leading-5">
              Si una consulta necesita IA, {{ nombreProveedor() }} recibe tus mensajes y el contexto financiero necesario para responder. No se envía nada hasta que escribes y envías una consulta.
            </p>
            <details class="mt-2 text-xs leading-5">
              <summary class="min-h-11 cursor-pointer py-3 font-semibold underline decoration-amber-500 underline-offset-2">Ver qué datos puede usar</summary>
              <p id="ai-data-sharing-details" class="pb-2">
              Los comandos claros de registro pueden resolverse dentro de Kaptal. Si una petición necesita IA, {{ nombreProveedor() }} recibirá los mensajes de este chat y contexto financiero para responder:
              cuentas y saldos, movimientos recientes con descripción e importe, categorías, presupuestos,
              recurrencias y tendencias de ingresos y gastos. «Ocultar montos» solo los oculta en pantalla.
              </p>
            </details>
            <label class="mt-3 flex min-h-11 cursor-pointer items-start gap-2.5 font-medium">
              <input type="checkbox" [checked]="consienteDatosFinancieros()" (change)="cambiarConsentimiento($event)"
                     aria-describedby="ai-data-sharing-details"
                     class="mt-0.5 h-4 w-4 shrink-0 rounded border-amber-500 text-emerald-700 focus:ring-emerald-600" />
              <span>Entiendo y autorizo compartir estos datos con {{ nombreProveedor() }} cuando una petición necesite IA.</span>
            </label>
          </section>
          <div class="ai-report-prompts flex max-w-full gap-2 overflow-x-auto" role="group" tabindex="0" aria-label="Consultas financieras sugeridas">
            <button type="button" (click)="usarSugerencia('Analiza mis gastos fijos del periodo actual y resume cuánto representan.')"
                    [disabled]="enviando() || confirmandoId() !== null">💳 Gastos fijos</button>
            <button type="button" (click)="usarSugerencia('Muéstrame un reporte de mis principales categorías de gasto y sus montos.')"
                    [disabled]="enviando() || confirmandoId() !== null">📊 Top categorías</button>
            <button type="button" (click)="usarSugerencia('Revisa mis presupuestos y dime cuáles están cerca o por encima del límite.')"
                    [disabled]="enviando() || confirmandoId() !== null">🚨 Alertas de presupuesto</button>
          </div>
          <form (ngSubmit)="enviarMensaje()" class="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label for="mensaje-asistente" class="sr-only">Escribe tu mensaje para Kaptal IA</label>
            <textarea id="mensaje-asistente" rows="2" maxlength="1200"
                      [value]="entrada()" (input)="actualizarEntrada($event)"
                      [disabled]="enviando() || confirmandoId() !== null"
                      placeholder="Pregunta o pide una acción..."
                      class="min-h-12 flex-1 resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800">
            </textarea>
            <button type="submit"
                    [disabled]="enviando() || confirmandoId() !== null || !entrada().trim()"
                    class="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
              {{ enviando() ? 'Enviando...' : 'Enviar' }}
            </button>
          </form>
          </div>
        </div>
      </section>
    </main>
  `
})
export class AsistenteComponent implements OnInit {
  private readonly finanzasService = inject(FinanzasService);
  private readonly privacidad = inject(PrivacidadService);
  readonly estado = signal<AiConnectionStatus | null>(null);
  readonly conectado = signal(false);
  readonly cargando = signal(true);
  readonly enviando = signal(false);
  readonly mensajes = signal<ChatEntry[]>([]);
  readonly entrada = signal('');
  readonly consienteDatosFinancieros = signal(false);
  readonly confirmandoId = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly errorChat = signal<string | null>(null);
  readonly exportandoGrafico = signal<number | null>(null);

  nombreProveedor(): string {
    const proveedor = this.estado()?.provider;
    if (proveedor === 'groq') return 'Groq';
    if (proveedor === 'openai') return 'OpenAI';
    return 'Google Gemini';
  }

  usarSugerencia(sugerencia: string): void {
    if (this.enviando() || this.confirmandoId() !== null) return;
    this.entrada.set(sugerencia);
    this.enviarMensaje();
  }

  limpiarHistorial(): void {
    if (this.enviando() || this.confirmandoId() !== null) return;
    this.mensajes.set([]);
    this.entrada.set('');
    this.errorChat.set(null);
  }

  altoGrafico(report: AiReportWidget): number {
    return Math.max(120, report.labels.length * 42 + 24);
  }

  coordenadaBarra(index: number): number {
    return index * 42 + 8;
  }

  anchoBarra(report: AiReportWidget, value: number): number {
    if (this.privacidad.ocultarMontos()) return 0;
    const max = Math.max(1, ...report.values.map(item => Math.abs(item)));
    return 280 * Math.abs(value) / max;
  }

  valorReporte(report: AiReportWidget, value: number): string {
    if (!Number.isFinite(value)) return 'Sin dato';
    if (this.privacidad.ocultarMontos()) return '\u2022\u2022\u2022';
    if (report.unit && /^[A-Z]{3}$/.test(report.unit)) {
      try {
        return new Intl.NumberFormat('es-MX', {
          style: 'currency',
          currency: report.unit,
          maximumFractionDigits: 2
        }).format(value);
      } catch {
        return `${value} ${report.unit}`;
      }
    }
    return `${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(value)}${report.unit ? ` ${report.unit}` : ''}`;
  }

  async exportarGrafico(messageIndex: number): Promise<void> {
    const report = this.mensajes()[messageIndex]?.report;
    const svg = document.getElementById(`ai-report-chart-${messageIndex}`);
    if (!report || !(svg instanceof SVGSVGElement)) return;

    this.exportandoGrafico.set(messageIndex);
    this.errorChat.set(null);
    try {
      const png = await this.convertirGraficoPng(svg);
      const safeTitle = report.title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'reporte-financiero';
      const file = new File([png], `${safeTitle}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        try {
          await navigator.share({ title: report.title, files: [file] });
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          this.descargarGrafico(file);
        }
      } else {
        this.descargarGrafico(file);
      }
    } catch (error) {
      this.errorChat.set(this.mensajeError(error, 'No se pudo exportar el gráfico como imagen.'));
    } finally {
      this.exportandoGrafico.set(null);
    }
  }

  private descargarGrafico(file: File): void {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private async convertirGraficoPng(svg: SVGSVGElement): Promise<Blob> {
    const source = new Blob([new XMLSerializer().serializeToString(svg)], {
      type: 'image/svg+xml;charset=utf-8'
    });
    const sourceUrl = URL.createObjectURL(source);
    try {
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('No se pudo preparar la imagen del gráfico.'));
        image.src = sourceUrl;
      });

      const viewBox = svg.viewBox.baseVal;
      const width = Math.max(560, viewBox.width);
      const height = Math.max(120, viewBox.height);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Este navegador no permite exportar la imagen.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(blob => blob
          ? resolve(blob)
          : reject(new Error('No se pudo generar la imagen PNG.')), 'image/png');
      });
    } finally {
      URL.revokeObjectURL(sourceUrl);
    }
  }

  ngOnInit(): void {
    this.cargarEstadoYProbarConexion();
  }

  private cargarEstadoYProbarConexion(): void {
    this.cargando.set(true);
    this.finanzasService.getAiConnectionStatus().subscribe({
      next: response => {
        this.cargando.set(false);
        if (!response.success || !response.data) {
          this.error.set(response.message || 'No se pudo consultar la configuración de IA.');
          return;
        }
        this.estado.set(response.data);

      },
      error: error => {
        this.cargando.set(false);
        this.error.set(this.mensajeError(error, 'No se pudo consultar la configuración de IA.'));
      }
    });
  }

  actualizarEntrada(event: Event): void {
    this.entrada.set((event.target as HTMLTextAreaElement).value);
  }

  cambiarConsentimiento(event: Event): void {
    this.consienteDatosFinancieros.set((event.target as HTMLInputElement).checked);
  }

  enviarMensaje(): void {
    const content = this.entrada().trim();
    if (!content || this.enviando() || this.confirmandoId() !== null) {
      return;
    }
    const requestMessages: AiChatMessage[] = this.mensajes()
      .map(({ role, content: messageContent }) => ({ role, content: messageContent }));
    requestMessages.push({ role: 'USER', content });
    if (requestMessages.length > 10) {
      requestMessages.splice(0, requestMessages.length - 10);
    }
    if (requestMessages[0]?.role === 'ASSISTANT') {
      requestMessages.shift();
    }

    this.mensajes.update(messages => [...messages, { role: 'USER', content }]);
    this.entrada.set('');
    this.enviando.set(true);
    this.errorChat.set(null);
    this.finanzasService.chatWithAi(requestMessages, this.consienteDatosFinancieros()).subscribe({
      next: response => {
        this.enviando.set(false);
        if (!response.success || !response.data?.answer?.trim()) {
          this.revertirMensajeFallido(content);
          this.errorChat.set(response.message || 'El asistente no devolvió una respuesta.');
          return;
        }
        this.conectado.set(true);
        this.mensajes.update(messages => [...messages, {
          role: 'ASSISTANT',
          content: response.data.answer.trim(),
          action: response.data.action ?? undefined,
          actions: response.data.actions?.length
            ? response.data.actions
            : undefined,
          report: response.data.report ?? undefined
        }]);
      },
      error: error => {
        this.enviando.set(false);
        this.revertirMensajeFallido(content);
        this.errorChat.set(this.mensajeError(error, 'No se pudo enviar el mensaje al asistente.'));
      }
    });
  }

  private revertirMensajeFallido(content: string): void {
    this.mensajes.update(messages => messages.at(-1)?.role === 'USER' && messages.at(-1)?.content === content
      ? messages.slice(0, -1)
      : messages);
    this.entrada.set(content);
  }

  solicitarConfirmacionBorrado(index: number): void {
    this.mensajes.update(messages => messages.map((message, current) =>
      current === index ? { ...message, awaitingDeleteConfirmation: true } : message
    ));
  }

  cancelarAccion(index: number): void {
    this.mensajes.update(messages => messages.map((message, current) =>
      current === index ? { ...message, action: undefined, content: `${message.content}\n\nAcci\u00f3n cancelada; no se hicieron cambios.` } : message
    ));
  }

  confirmarAccion(index: number): void {
    const message = this.mensajes()[index];
    const action = message?.action;
    if (!action || (this.isDelete(action.type) && !message.awaitingDeleteConfirmation)) {
      return;
    }
    this.confirmandoId.set(action.id);
    this.errorChat.set(null);
    this.finanzasService.confirmAiAction(action.id,action.version??0).subscribe({
      next: response => {
        this.confirmandoId.set(null);
        if (!response.success) {
          this.errorChat.set(response.message || 'No se pudo ejecutar la acción.');
          return;
        }
        this.mensajes.update(messages => messages.map((entry, current) =>
          current === index
            ? {
                ...entry,
                confirmed: true,
                content: `${entry.content}\n\n${response.message || 'La acción se completó correctamente.'}`
              }
            : entry
        ));
      },
      error: error => {
        this.confirmandoId.set(null);
        this.errorChat.set(this.mensajeError(error, 'No se pudo ejecutar la acción.'));
      }
    });
  }

  confirmarPropuesta(messageIndex: number, action: AiActionProposal): void {
    if (this.confirmandoId() !== null) return;
    this.confirmandoId.set(action.id);
    this.errorChat.set(null);
    this.finanzasService.confirmAiAction(action.id,action.version??0).subscribe({
      next: response => {
        this.confirmandoId.set(null);
        if (!response.success) {
          this.errorChat.set(response.message || 'No se pudo guardar este movimiento.');
          return;
        }
        this.mensajes.update(messages => messages.map((message, index) => index === messageIndex
          ? { ...message, confirmedActions: [...(message.confirmedActions ?? []), action.id] }
          : message));
      },
      error: error => {
        this.confirmandoId.set(null);
        this.errorChat.set(this.mensajeError(error, 'No se pudo guardar este movimiento.'));
      }
    });
  }

  cancelarPropuesta(messageIndex: number, actionId: string): void {
    this.mensajes.update(messages => messages.map((message, index) => index === messageIndex
      ? { ...message, cancelledActions: [...(message.cancelledActions ?? []), actionId] }
      : message));
  }

  isDelete(type: string): boolean {
    return type.startsWith('DELETE_');
  }

  etiquetaCampo(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/Id/g, ' ID')
      .replace(/^./, character => character.toUpperCase());
  }

  /**
   * Campos que el asistente propone y que son dinero. Se tapan por nombre y no
   * por tipo de valor: las acciones tambien traen identificadores y fechas, y
   * esos no son secretos que haya que esconder.
   */
  private static readonly CAMPOS_MONTO =
    /^(monto|saldo|total|importe|precio|deuda|limite|disponible|ingresos|gastos|balance|patrimonio)/i;

  mostrarValor(campo: string, value: unknown): string {
    if (value === null || value === undefined || value === '') return 'Sin dato';
    if (this.privacidad.ocultarMontos() && AsistenteComponent.CAMPOS_MONTO.test(campo)) return '\u2022\u2022\u2022';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  private mensajeError(error: unknown, fallback: string): string {
    if (typeof error !== 'object' || error === null) return fallback;
    const response = error as { error?: unknown; message?: unknown };
    if (typeof response.error === 'string' && response.error.trim()) return response.error;
    if (typeof response.error === 'object' && response.error !== null) {
      const body = response.error as { message?: unknown };
      if (typeof body.message === 'string' && body.message.trim()) return body.message;
    }
    return typeof response.message === 'string' && response.message.trim()
      ? response.message
      : fallback;
  }
}
