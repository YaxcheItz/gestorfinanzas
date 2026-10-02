import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AiActionProposal, AiChatMessage, AiConnectionStatus } from '../../core/models/ai.models';
import { FinanzasService } from '../../core/services/finanzas.service';
import { PrivacidadService } from '../../core/services/privacidad.service';

interface ChatEntry extends AiChatMessage {
  action?: AiActionProposal;
  confirmed?: boolean;
  awaitingDeleteConfirmation?: boolean;
}

@Component({
  selector: 'app-asistente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="mx-auto flex w-full max-w-5xl flex-1 items-start px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      <section class="w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs dark:border-slate-700 dark:bg-slate-900">
        <header class="border-b border-slate-100 bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-5 sm:p-8 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
          <p class="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Kaptal inteligente</p>
          <h1 class="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Asistente IA</h1>
          <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Pregunta sobre tus finanzas o pide una acción. Revisa la propuesta antes de confirmar cualquier cambio.
          </p>
          <p role="status" class="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
            @if (cargando()) { Conectando con Gemini... }
            @else if (estado()?.configured && conectado()) { Gemini está listo }
            @else if (estado()?.configured && !conectado()) { No se pudo verificar Gemini; puedes intentarlo de nuevo enviando un mensaje }
            @else { Gemini no está configurado en el backend }
          </p>
        </header>

        <div class="p-4 sm:p-6">
          @if (error()) {
            <p role="alert" class="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200">{{ error() }}</p>
          }

          <div aria-live="polite" aria-relevant="additions text" [attr.aria-busy]="enviando()" class="mb-4 max-h-[62vh] min-h-64 space-y-4 overflow-y-auto rounded-2xl bg-slate-50/80 p-3 sm:p-5 dark:bg-slate-950/60">
            @if (mensajes().length === 0) {
              <div class="flex min-h-56 items-center justify-center px-4 text-center text-sm text-slate-500 dark:text-slate-400">
                <p>Escribe una pregunta o una instrucción. Por ejemplo: «¿Cuánto gasté este mes?», «Registra un gasto de 250 pesos en comida» o «Crea un presupuesto de 2,000 pesos para comida».</p>
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
                  <p class="whitespace-pre-wrap break-words">{{ message.content }}</p>

                  @if (message.action; as action) {
                    <div class="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
                      <h2 class="font-bold">Propuesta para revisar</h2>
                      <p class="mt-1">{{ action.summary }}</p>
                      @if (!message.confirmed) {
                        <p class="mt-2 text-xs font-medium">Aún no se ha ejecutado ningún cambio.</p>
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
                                class="mt-3 min-h-10 rounded-lg bg-rose-700 px-3 py-2 font-semibold text-white hover:bg-rose-800 disabled:opacity-50">
                          Revisé; continuar con el borrado
                        </button>
                      } @else {
                        @if (isDelete(action.type)) {
                          <p class="mt-3 font-semibold">Este borrado puede ser irreversible. Confirma una vez más.</p>
                        }
                        <div class="mt-3 flex flex-wrap gap-2">
                          <button type="button" (click)="confirmarAccion($index)"
                                  [disabled]="confirmandoId() === action.id"
                                  class="min-h-10 rounded-lg px-3 py-2 font-semibold text-white disabled:opacity-50"
                                  [class.bg-rose-700]="isDelete(action.type)"
                                  [class.hover:bg-rose-800]="isDelete(action.type)"
                                  [class.bg-emerald-700]="!isDelete(action.type)"
                                  [class.hover:bg-emerald-800]="!isDelete(action.type)">
                            {{ confirmandoId() === action.id ? 'Procesando...' : isDelete(action.type) ? 'Confirmar borrado' : 'Confirmar y ejecutar' }}
                          </button>
                          <button type="button" (click)="cancelarAccion($index)"
                                  class="min-h-10 rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:bg-white dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
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
          <section aria-labelledby="ai-data-sharing-title" class="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100">
            <h2 id="ai-data-sharing-title" class="font-semibold">Tus datos se compartirán con Google Gemini</h2>
            <p id="ai-data-sharing-details" class="mt-1 text-xs leading-5">
              Al enviar, Gemini recibirá los mensajes de este chat y contexto financiero para responder:
              cuentas y saldos, movimientos recientes con descripción e importe, categorías, presupuestos,
              recurrencias y tendencias de ingresos y gastos. «Ocultar montos» solo los oculta en pantalla.
            </p>
            <label class="mt-3 flex min-h-11 cursor-pointer items-start gap-2.5 font-medium">
              <input type="checkbox" [checked]="consienteDatosFinancieros()" (change)="cambiarConsentimiento($event)"
                     aria-describedby="ai-data-sharing-details"
                     class="mt-0.5 h-4 w-4 shrink-0 rounded border-amber-500 text-emerald-700 focus:ring-emerald-600" />
              <span>Entiendo y autorizo enviar estos datos a Gemini para esta conversación.</span>
            </label>
          </section>
          <form (ngSubmit)="enviarMensaje()" class="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label for="mensaje-asistente" class="sr-only">Escribe tu mensaje para Kaptal IA</label>
            <textarea id="mensaje-asistente" rows="2" maxlength="1200"
                      [value]="entrada()" (input)="actualizarEntrada($event)"
                      [disabled]="enviando() || confirmandoId() !== null"
                      placeholder="Pregunta o pide una acción..."
                      class="min-h-12 flex-1 resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800">
            </textarea>
            <button type="submit"
                    [disabled]="enviando() || confirmandoId() !== null || !entrada().trim() || !consienteDatosFinancieros()"
                    class="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
              {{ enviando() ? 'Enviando...' : 'Enviar' }}
            </button>
          </form>
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
        if (!response.data.configured) {
          return;
        }
        this.finanzasService.verifyAiConnection().subscribe({
          next: result => {
            this.conectado.set(result.success && result.data?.connected === true);
            if (!this.conectado()) {
              this.error.set(result.message || 'No se pudo verificar la conexión con Gemini.');
            }
          },
          error: error => {
            this.conectado.set(false);
            this.error.set(this.mensajeError(error, 'No se pudo verificar la conexión con Gemini.'));
          }
        });
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
    if (!content || this.enviando() || this.confirmandoId() !== null || !this.consienteDatosFinancieros()) {
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
          action: response.data.action ?? undefined
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
      current === index ? { ...message, action: undefined, content: `${message.content}\n\nAcción cancelada; no se hicieron cambios.` } : message
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
    this.finanzasService.confirmAiAction(action.id).subscribe({
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
    if (this.privacidad.ocultarMontos() && AsistenteComponent.CAMPOS_MONTO.test(campo)) return '•••';
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
