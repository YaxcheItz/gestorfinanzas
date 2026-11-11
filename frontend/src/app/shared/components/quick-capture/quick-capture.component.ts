import { ListaContextoService } from '../../../core/services/lista-contexto.service';
import { extraerEtiquetasCaptura } from '../../../core/utils/etiquetas';
import { FeatureStylesService } from '../../../core/services/feature-styles.service';
import { AuthService } from '../../../core/services/auth.service';
import { PrivacidadService } from '../../../core/services/privacidad.service';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, ElementRef, HostListener, OnDestroy, ViewChild, afterNextRender, afterRenderEffect, computed, effect, inject, signal, untracked } from '@angular/core';
import { CaptureLauncherService } from '../../../core/services/capture-launcher.service';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription, finalize } from 'rxjs';
import { Router } from '@angular/router';
import { AiActionProposal, AiChatMessage, AiReportWidget, AiEvidence } from '../../../core/models/ai.models';
import { Categoria, Cuenta, Transaccion } from '../../../core/models/finanzas.models';
import { FinanzasService } from '../../../core/services/finanzas.service';
import { PerfilService } from '../../../core/services/perfil.service';
import { ToastService } from '../../../core/services/toast.service';
import { MontoPipe } from '../../../core/pipes/monto.pipe';
import { TextoFinancieroPipe } from '../../../core/pipes/texto-financiero.pipe';
import { CategoriaIconoComponent } from '../categoria-icono/categoria-icono.component';
import { MontoPrivadoDirective } from '../../directives/monto-privado.directive';
import { MovimientosOfflineService, BorradorChat } from '../../../core/services/movimientos-offline.service';
import { ActualizacionPwaService } from '../../../core/services/actualizacion-pwa.service';
import { prepararCapturaOffline, validarPayloadOffline } from '../../../core/utils/captura-offline';
import { DialogViewportDirective } from '../../directives/dialog-viewport.directive';

type CaptureMode = 'CAPTURE' | 'REPORT';
/** Estado del panel de procesamiento de voz */
type ProcessingStep = 'TRANSCRIBIENDO' | 'CATEGORIZANDO' | null;
interface AssistantMessage extends AiChatMessage { actions?: AiActionProposal[]; evidence?: AiEvidence[]; }
interface CaptureTurn { id: number; user: string; answer: string; actions: AiActionProposal[]; voice: boolean; report?: AiReportWidget | null; evidence?: AiEvidence[]; suggestions?: string[]; engine?: string; confirmaciones?: {id:string; estado:'SERVIDOR'|'DISPOSITIVO'; accion?:boolean}[]; }
interface WeeklyCategory { name: string; amount: number; percent: number; currency: string; }
@Component({
  selector: 'app-quick-capture',
  standalone: true,
  imports: [CommonModule, FormsModule, MontoPipe, TextoFinancieroPipe, CategoriaIconoComponent, MontoPrivadoDirective, DialogViewportDirective],
  template: `
    <!-- Processing Sheet: aparece al soltar el FAB de voz, muestra el progreso y permite cancelar -->
    @if (processingStep()) {
      <div class="processing-sheet" role="status" aria-live="polite" aria-label="Estado del procesamiento de voz">
        <div class="processing-sheet__inner">
          <div class="processing-sheet__status">
            <span class="processing-sheet__spinner" aria-hidden="true"></span>
            <div class="processing-sheet__copy">
              <strong>{{ processingStep() === 'TRANSCRIBIENDO' ? 'Transcribiendo...' : 'Categorizando...' }}</strong>
              <small>{{ processingStep() === 'TRANSCRIBIENDO' ? 'Convirtiendo tu voz a texto' : 'Reconociendo el mensaje con reglas e historial' }}</small>
            </div>
          </div>
            <button type="button" class="processing-sheet__cancel" (click)="cancelarTranscripcion()" aria-label="Cancelar procesamiento">
              Cancelar
            </button>
        </div>
      </div>
    }

    @if (pantallaVoz()) {
      <div class="voice-dialog-backdrop" (click)="cerrarPantallaVoz()"></div>
      <section appDialogViewport class="voice-screen" role="dialog" aria-modal="true" aria-labelledby="voice-title" (keydown.escape)="cerrarPantallaVoz()" tabindex="-1" id="voice-screen">
        <header><div><small>CAPTURA POR VOZ</small><h2 id="voice-title">{{ escuchando() ? 'Te escucho' : transcribiendoVoz() ? 'Transcribiendo…' : 'Cuéntame tu movimiento' }}</h2></div><button type="button" (click)="cerrarPantallaVoz()" aria-label="Cerrar voz">×</button></header>
        <p class="voice-screen__hint">{{ escuchando() ? 'Habla con naturalidad. Toca el micrófono para detener la grabación.' : 'Habla de un gasto, ingreso o pregunta sobre tus finanzas.' }}</p>
        <button type="button" class="voice-screen__mic" (click)="toggleVoice()" [disabled]="transcribiendoVoz() || stopping()" [attr.aria-label]="escuchando() ? 'Detener grabación' : 'Iniciar grabación'">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8"/></svg>
        </button>
        <p class="voice-screen__status" role="status">{{ escuchando() ? 'Grabando · ' + cronometro() : transcribiendoVoz() ? 'Convirtiendo audio a texto…' : 'Toca el micrófono para comenzar' }}</p>
        @if (escuchando()) {<div class="voice-screen__levels" aria-hidden="true">@for (nivel of nivelesAudio(); track $index) {<i [style.height.px]="4 + nivel * 24"></i>}</div>}
        @if (permisoVoz()) {<div class="voice-permission"><p>El audio se enviará periódicamente a Groq para mostrar una transcripción y al terminar para revisarla. Recordaremos tu permiso en este dispositivo.</p><button type="button" (click)="permitirVoz()">Permitir audio y grabar</button></div>}
        @if (error()) {<p class="capture-error" role="alert">{{ error() }}</p>}
        @if (voiceMessage()) {<p role="status">{{ voiceMessage() }}</p>}
        @if (guardadoVozCompletado()) {<button type="button" class="voice-screen__text" (click)="revisarMovimientosVoz()">Revisar movimientos</button>}
        @if (transcripcionLista()) {
          <label for="voice-transcript">Revisa y edita tu transcripción</label>
          <textarea id="voice-transcript" class="voice-screen__transcript" [(ngModel)]="content" rows="4"></textarea>
          <button type="button" class="voice-screen__text" [disabled]="!content.trim() || loading() || catalogoCargando() || confirming() !== null" (click)="continuarConVoz()">Continuar con este texto</button>
          <button type="button" class="voice-screen__text" [disabled]="loading() || confirming() !== null" (click)="abrirEscrituraDesdeVoz()">Escribir en el chat</button>
        } @else {
        <div class="voice-screen__transcript" aria-label="Transcripción provisional" aria-live="polite">{{ transcripcionParcial() || (escuchando() ? 'Las palabras aparecerán aquí con unos segundos de retraso.' : 'Tu transcripción aparecerá aquí.') }}</div>
        }
        @if (error() && transcripcionParcial() && !escuchando() && !transcribiendoVoz()) {<button type="button" class="voice-screen__text" (click)="usarTranscripcionParcial()">Revisar texto parcial</button>}
      </section>
    }

    <!-- Voice Waveform: solo durante grabación activa -->
    @if (open()) {
      <div class="voice-dialog-backdrop" (click)="close()"></div>
      <section appDialogViewport role="dialog" aria-modal="true" tabindex="-1" (keydown)="tecladoPanel($event)" id="quick-capture-panel" class="capture-panel" [class.capture-panel--compact]="!captureTurns().length && !pendingCaptureText() && !loading() && !editando()" aria-label="Kaptal, captura y reportes">
        <header class="capture-panel__head">
          <div><strong>{{ escuchando() ? 'Te escucho' : transcribiendoVoz() ? 'Transcribiendo' : loading() ? 'Organizando' : 'Añadir movimiento' }}</strong></div>
          <button type="button" (click)="close()" aria-label="Cerrar">×</button>
        </header>
        <div class="capture-panel__tools">
          <button type="button" class="capture-manual" (click)="abrirConTeclado()" [disabled]="loading() || confirming() !== null || escuchando()">Introducir datos manualmente</button>
        </div>

    @if (escuchando()) {
      <div class="voice-waveform" role="status" aria-live="polite">
        <span class="voice-waveform__bars" aria-hidden="true">@for (nivel of nivelesAudio(); track $index) { <i [style.height.px]="4 + nivel * 24" style="animation: none"></i> }</span>
        <span>Escuchando</span><strong>{{ cronometro() }}</strong>
      </div>
    }


        @if(!offline.conexion()){<p role="status">Sin conexión. Revisa y confirma para guardar en este dispositivo; se enviará al volver la conexión.</p>}
        @if(errorBorrador()){<p class="capture-error" role="alert">{{ errorBorrador() }}</p>}
        @if(offline.pendientes().length){<p role="status">{{ offline.pendientes().length }} movimiento(s) guardados en este dispositivo, pendientes del servidor.</p>}

        @if (mode() === 'CAPTURE') {
          @if (editando()) {
            <form class="capture-editor" (ngSubmit)="guardarEdicion()" (input)="marcarBorrador()" (change)="marcarBorrador()" aria-label="Editar propuesta">
              <strong>Editar antes de guardar</strong>
              <label>Tipo<select name="editTipo" [(ngModel)]="borrador['tipo']"><option value="GASTO">Gasto</option><option value="INGRESO">Ingreso</option><option value="TRANSFERENCIA">Transferencia</option></select></label>
              <label>Monto<input appMontoPrivado name="editMonto" type="number" min="0.01" step="0.01" inputmode="decimal" [(ngModel)]="borrador['monto']" required></label>
              <label>Fecha<input name="editFecha" type="date" [(ngModel)]="borrador['fecha']" required></label>
              <label>Cuenta<select name="editCuenta" [(ngModel)]="borrador['cuentaId']" required>@for(cuenta of cuentasEdicion();track cuenta.id){<option [ngValue]="cuenta.id">{{ cuenta.nombre }} · {{ cuenta.moneda }}</option>}</select></label>
              @if(borrador['tipo']==='TRANSFERENCIA'){
                <label>Cuenta destino<select name="editDestino" [(ngModel)]="borrador['cuentaDestinoId']" required>@for(cuenta of cuentasEdicion();track cuenta.id){<option [ngValue]="cuenta.id">{{ cuenta.nombre }} · {{ cuenta.moneda }}</option>}</select></label>
                <label>Tasa de cambio<input name="editTasa" type="number" step="0.00000001" min="0.00000001" [(ngModel)]="borrador['tasaCambio']"></label>
              }
              @if(borrador['tipo']!=='TRANSFERENCIA'){
                <label>Categoría<select name="editCategoria" [(ngModel)]="borrador['categoriaId']"><option [ngValue]="null">Sin categoría</option>@for(categoria of categories();track categoria.id){@if(categoria.activo && categoria.tipo===borrador['tipo']){<option [ngValue]="categoria.id">{{ categoria.nombre }}</option>}}</select></label>
              }
              <label>Descripción<input name="editDescripcion" maxlength="200" [(ngModel)]="borrador['descripcion']"></label>
              <label>Notas<input name="editNotas" maxlength="500" [(ngModel)]="borrador['notas']"></label>
              <div class="capture-proposal__actions"><button type="button" class="capture-cancel" (click)="editando.set(null)">Cancelar edición</button><button type="submit" class="capture-save" [disabled]="confirming()!==null">Actualizar propuesta</button></div>
              <p>Actualizar prepara la propuesta. Confirma después para registrar el movimiento.</p>
            </form>
          } @else {
          <div #chatScroll id="capture-chat-thread" class="capture-chat" (scroll)="actualizarSeguimiento($event)" aria-live="polite" aria-relevant="additions text" [attr.aria-busy]="loading()">
            @if (captureTurns().length === 0 && !pendingCaptureText()) {
              <div class="capture-chat__intro"><div><strong>Cuéntame tu movimiento</strong><p>Escribe un gasto, ingreso o pregunta.</p></div></div>
            }
            @for (turn of turnosVisibles(); track turn.id) {
              <article class="capture-chat__user"><span>{{ turn.user | textoFinanciero }}</span></article>
              <article class="capture-chat__assistant"><span class="capture-chat__avatar" aria-hidden="true">✦</span><div class="capture-chat__reply"><p>{{ turn.answer | textoFinanciero }}</p>
                @for (confirmacion of turn.confirmaciones ?? []; track confirmacion.id) {<p class="capture-receipt" [class.capture-receipt--local]="confirmacion.estado === 'DISPOSITIVO'">{{ confirmacion.estado === 'SERVIDOR' ? (confirmacion.accion ? '✓ Acción completada' : '✓ Movimiento confirmado en tus cuentas') : '✓ Guardado en este dispositivo. Revisa el estado de envío en pendientes.' }}</p>}
                @if (turn.report; as report) {
                  <section class="chat-local-report" aria-label="Reporte financiero"><h3>{{ report.title | textoFinanciero }}</h3>
                    @for (label of report.labels; track $index; let i = $index) {<div class="chat-local-report__row"><span>{{ label | textoFinanciero }}</span><strong>{{ report.values[i] | monto:(report.unit || 'MXN') }}</strong><div class="chat-local-report__track"><i [style.width.%]="anchoReporte(report, i)"></i></div></div>}
                    <button type="button" (click)="exportarReporte(report)">Exportar gráfico</button>
                  </section>
                }
                @if (turn.evidence?.length) {
                  <div class="chat-evidence" aria-label="Datos de la respuesta">
                    @for (item of turn.evidence; track $index) {<button type="button" (click)="verEvidencia(item)">{{ item.label }} · {{ item.operaciones }} operaciones · {{ item.moneda }}<small>{{ item.desde }} al {{ item.hasta }} · Ver movimientos</small></button>}
                  </div>
                }
                @if (turn.suggestions?.length) {<div class="chat-followups">@for (suggestion of turn.suggestions; track suggestion) {<button type="button" (click)="usarSugerencia(suggestion)" [disabled]="loading() || confirming() !== null">{{ suggestion | textoFinanciero }}</button>}</div>}
                @for (proposal of turn.actions; track proposal.id) {
                  @if (proposal.type === 'CREATE_TRANSACTION') {<button type="button" class="capture-cancel" style="min-height:44px" (click)="abrirEdicion(proposal)" [disabled]="confirming()!==null">Editar propuesta</button>}
                  @if (etiquetasPropuesta(proposal).length) {<p>Etiquetas: {{ etiquetasPropuesta(proposal).join(', ') }}</p>}
                  @if (necesitaCategoria(proposal)) {
                    <section class="categorization-review" aria-label="Elige una categoría">
                      <article class="categorization-review__expense" draggable="true" (dragstart)="iniciarArrastre($event, proposal)" [attr.aria-label]="turn.user | textoFinanciero"><span class="categorization-review__grip" aria-hidden="true">⠿</span><div><small>Movimiento</small><strong>{{ proposal.summary | textoFinanciero }}</strong></div></article>
                      <p class="categorization-review__hint">Puedes elegir una categoría o guardarlo sin categoría:</p>
                      <div class="categorization-review__grid">
                        @for (categoria of categoriasPara(proposal); track categoria.id) {
                          <button
                            type="button"
                            class="categorization-review__drop"
                            [class.is-active]="dropActivo() === categoriaDropKey(proposal.id, categoria.id)"
                            (dragenter)="activarDrop($event, proposal.id, categoria.id)"
                            (dragover)="activarDrop($event, proposal.id, categoria.id)"
                            (dragleave)="desactivarDrop($event, proposal.id, categoria.id)"
                            (drop)="soltarEnCategoria($event, proposal, categoria, turn.user)"
                            (click)="asignarCategoria(proposal, categoria, turn.user)">
                            @if (categoria.icono) {
                              <app-categoria-icono [icono]="categoria.icono" [tipo]="categoria.tipo"/>
                            } @else {
                              <svg class="categorization-review__drop-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>
                            }
                            <small>{{ categoria.nombre }}</small>
                          </button>
                        }
                      </div>
                      <button type="button" class="capture-save" (click)="confirm(proposal)" [disabled]="confirming() !== null">Guardar sin categoría</button>
                    </section>
                  } @else if (proposal.type !== 'CREATE_TRANSACTION') {
                    <article class="capture-proposal"><div><small>Revisa la acción antes de ejecutarla</small><strong>{{ proposal.summary | textoFinanciero }}</strong>
                      @for (campo of camposAccion(proposal); track campo.key) {<p>{{ campo.key }}: {{ mostrarCampoAccion(campo.key, campo.value) | textoFinanciero }}</p>}
                    </div><div class="capture-proposal__actions"><button type="button" class="capture-cancel" (click)="dismiss(proposal.id)">Descartar</button>
                    @if (proposal.type.startsWith('DELETE_') && borradoPendiente() !== proposal.id) {<button type="button" class="capture-save" (click)="borradoPendiente.set(proposal.id)">Revisar eliminación</button>}
                    @else {<button type="button" class="capture-save" (click)="confirm(proposal)" [disabled]="confirming() !== null">{{ proposal.type.startsWith('DELETE_') ? 'Confirmar eliminación' : 'Confirmar acción' }}</button>}</div></article>
                  } @else {
                    <article class="capture-proposal"><div><small>Confirma para guardar</small><strong>{{ proposal.summary | textoFinanciero }}</strong></div><div class="capture-proposal__actions"><button type="button" class="capture-cancel" (click)="dismiss(proposal.id)">Descartar</button><button type="button" class="capture-save" (click)="confirm(proposal)" [disabled]="confirming() !== null">{{ confirming() === proposal.id ? 'Guardando…' : 'Guardar movimiento' }}</button></div></article>
                  }
                }
              </div></article>
            }
            @if (pendingCaptureText()) {<article class="capture-chat__user"><span>{{ pendingCaptureText() | textoFinanciero }}</span></article>}
            @if (loading()) {<article class="capture-chat__assistant"><span class="capture-chat__avatar" aria-hidden="true">✦</span><div class="capture-chat__reply capture-chat__typing"><i></i><i></i><i></i><span>Revisando movimiento</span></div></article>}
            @if (error()) {<p class="capture-error" role="alert">{{ error() }}</p>}
            @if (aiConsentRequired()) {
              <section class="capture-ai-consent" aria-label="Permiso para usar inteligencia artificial">
                <p>El registro local no reconoció el mensaje. ¿Quieres permitir que la IA lo interprete? El movimiento aún no se ha guardado.</p>
                <button type="button" (click)="permitirIaYReintentar()" [disabled]="loading()">Permitir y continuar</button>
              </section>
            }
          </div>
          @if (!seguirFinal()) {<button type="button" class="capture-jump-latest" (click)="irAlFinal()">Ir al último mensaje ↓</button>}
          @if (permisoVoz()) {<section class="voice-permission" role="status"><p>El audio se enviará para transcribirlo. Revisa el movimiento antes de guardarlo.</p><button type="button" (click)="permitirVoz()">Permitir audio y grabar</button></section>}
          @if (etiquetasPersonales().length) {
            <div class="capture-tags" aria-label="Etiquetas disponibles">
              @for (etiqueta of etiquetasPersonales(); track etiqueta.id) {
                <button type="button" (click)="insertarEtiqueta(etiqueta.nombre)" [disabled]="loading()" [attr.aria-label]="'Añadir etiqueta ' + etiqueta.nombre">#{{ etiqueta.nombre }}</button>
              }
            </div>
          }
          <form class="capture-chat__composer" (ngSubmit)="submit()">
            <label class="sr-only" for="quick-capture-text">Escribe el movimiento que quieres registrar</label>
            <textarea id="quick-capture-text" name="content" [(ngModel)]="content" (ngModelChange)="alCambiarTexto()" (keydown.enter)="enviarConEnter($event)" rows="1" maxlength="1200" enterkeyhint="send" placeholder="Ej. Café 45 #trabajo" [readOnly]="loading() || escuchando() || stopping()" [attr.aria-busy]="loading()"></textarea>
            <button type="button" class="capture-mic" (click)="toggleVoice()" [class.is-listening]="escuchando()" [disabled]="loading() || transcribiendoVoz() || stopping()" [attr.aria-label]="escuchando() ? 'Detener dictado' : 'Dictar movimiento'"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8"/></svg></button>
            <button type="submit" class="capture-chat__send" [disabled]="loading() || catalogoCargando() || escuchando() || stopping() || !content.trim()" aria-label="Enviar movimiento"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 14-7-5 14-3-6-6-1Z"/><path d="m11 13 4-4"/></svg></button>
          </form>
          @if (voiceMessage()) { <p class="voice-transcribed" role="status">{{ voiceMessage() }}</p> }
          <details class="capture-options"><summary>Opciones de inteligencia artificial</summary><p>Si no se reconoce la categoría, se envían a Groq el concepto y tus categorías compatibles para clasificarlo.</p><label class="capture-consent capture-chat__consent"><input type="checkbox" [(ngModel)]="consent" name="captureConsent"><span>Permitir IA con mi contexto financiero para consultas complejas</span></label></details>
          }
        } @else {
          <div class="report-thread" aria-live="polite" aria-relevant="additions text" [attr.aria-busy]="reportLoading()">
            @if (reportMessages().length === 0) {
              <div class="report-welcome"><strong>¿Qué quieres entender?</strong><p>Pregunta sobre tus gastos, ingresos y hábitos. También puedes ver el resumen de la última semana.</p><button type="button" (click)="preguntaSugerida('¿En qué gasté más esta semana?')">¿En qué gasté más esta semana?</button></div>
            }
            @for (message of reportMessages(); track $index; let messageIndex = $index) {
              <article class="report-message" [class.is-user]="message.role === 'USER'">
                <div class="report-message__bubble"><small>{{ message.role === 'USER' ? 'Tú' : 'Kaptal IA' }}</small><p>{{ message.content | textoFinanciero }}</p>
                  @if (message.evidence?.length) {
                    <div class="chat-evidence" aria-label="Datos de la respuesta">
                      @for (item of message.evidence; track $index) {<button type="button" (click)="verEvidencia(item)">{{ item.label }} · {{ item.operaciones }} operaciones · {{ item.moneda }}<small>{{ item.desde }} al {{ item.hasta }} · Ver movimientos</small></button>}
                    </div>
                  }
                  @if (message.role === 'ASSISTANT' && !message.evidence?.length && weeklyCategories().length > 0) {
                    <div class="report-chart">
                      <h4 class="report-chart__heading">Desglose Semanal</h4>
                      <div class="report-chart__bars">
                        @for (item of weeklyCategories().slice(0, 5); track item.name) {
                          <div class="report-chart__track">
                            <div class="report-chart__fill" [style.width.%]="item.percent"></div>
                            <div class="report-chart__labels" [class.is-wide]="item.percent >= 38">
                              <span class="report-chart__category">{{ item.name }}</span>
                              <span class="report-chart__amount">{{ item.amount | monto:item.currency:'symbol':'1.0-2' }}</span>
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                  }
                  @for (action of message.actions ?? []; track action.id) {<div class="capture-proposal"><strong>{{ action.summary | textoFinanciero }}</strong><div class="capture-proposal__actions"><button type="button" class="capture-save" (click)="confirmReportAction(messageIndex, action)" [disabled]="confirming() === action.id">{{ confirming() === action.id ? 'Guardando…' : 'Confirmar' }}</button></div></div>}
                </div>
              </article>
            }
            @if (reportLoading()) {<p class="report-loading" role="status">Estoy revisando tus movimientos…</p>}
          </div>
          @if (reportError()) {<p class="capture-error" role="alert">{{ reportError() }}</p>}
          <label class="capture-consent"><input type="checkbox" [(ngModel)]="consent" name="reportConsent"><span>Autorizo compartir mi pregunta y el contexto financiero necesario con la IA.</span></label>
          <form class="capture-composer" (ngSubmit)="askReport()"><label class="sr-only" for="report-question">Pregunta sobre tus finanzas</label><textarea id="report-question" name="reportQuestion" [(ngModel)]="reportQuestion" rows="1" maxlength="1200" placeholder="Pregunta sobre tus finanzas…" [disabled]="reportLoading()"></textarea><button type="submit" class="capture-send" [disabled]="reportLoading() || !reportQuestion.trim() || !consent">{{ reportLoading() ? 'Consultando…' : 'Enviar' }}<span aria-hidden="true">↗</span></button></form>
        }
      </section>
    }
  `,
  styles:[`.capture-editor{display:grid;gap:12px;max-height:55dvh;overflow:auto;padding:16px;border:1px solid var(--border-color,#777);border-radius:16px}.capture-editor label{display:grid;gap:4px}.capture-editor input,.capture-editor select{min-height:44px;font-size:16px;padding:8px;background:var(--surface-color,transparent);color:inherit;border:1px solid #888;border-radius:8px}.capture-editor button{min-height:44px}`]
})
export class QuickCaptureComponent implements OnDestroy {
  private readonly changeDetector = inject(ChangeDetectorRef);
  readonly pantallaVoz = signal(false);
  readonly transcripcionParcial = signal('');
  readonly transcripcionLista = signal(false);
  readonly etiquetasPersonales = signal<{id:number; nombre:string}[]>([]);
  private readonly styleAssets = inject(FeatureStylesService).load('capture');
  private readonly captureLauncher = inject(CaptureLauncherService);
  readonly offline=inject(MovimientosOfflineService);
  readonly listas = inject(ListaContextoService);
  private readonly actualizacion=inject(ActualizacionPwaService);
  readonly errorBorrador=signal('');
  private readonly borradorRestaurado=signal(false);
  private readonly revisionBorrador=signal(0);
  private guardadoBorrador:Promise<void>=Promise.resolve();
  private guardadoTimer:ReturnType<typeof setTimeout>|null=null;
  private quitarProtector:()=>void=()=>{};
  private operaciones = new Subscription();
  private chatGeneration = 0;
  readonly recuperando = signal(false);
  readonly editando = signal<AiActionProposal | null>(null);
  readonly cuentasEdicion = signal<Cuenta[]>([]);
  borrador: Record<string, unknown> = {};
  private readonly finanzas = inject(FinanzasService);
  private readonly auth = inject(AuthService);
  readonly privacidad = inject(PrivacidadService);
  private readonly perfil = inject(PerfilService);
  private readonly toast = inject(ToastService);
  private contexto: string | null = null;
  voiceConsent = false;
  private confirmarVozAlResolver = false;
  private guardadoVozId: string | null = null;
  readonly borradoPendiente = signal<string | null>(null);
  readonly guardadoVozCompletado = signal(false);
  private usuarioChat: number | null = null;
  private destruido = false;
  @ViewChild('chatScroll') private chatScroll?: ElementRef<HTMLElement>;
  readonly seguirFinal = signal(true);

  actualizarSeguimiento(event: Event): void {
    const element = event.target as HTMLElement;
    this.seguirFinal.set(element.scrollHeight - element.scrollTop - element.clientHeight < 48);
  }

  irAlFinal(): void {
    this.seguirFinal.set(true);
    const element = this.chatScroll?.nativeElement;
    if (element) element.scrollTop = element.scrollHeight;
  }

  constructor() {
    const launcher = this.captureLauncher;
    inject(DestroyRef).onDestroy(() => launcher.detach('chat'));
    afterNextRender(() => {
      const pending = launcher.attach('chat');
      if (pending) this.abrirCapturaDesdeAcceso(pending);
    });
    afterRenderEffect(onCleanup => {
      this.open(); this.captureTurns(); this.loading();
      const element = this.chatScroll?.nativeElement;
      if (!element) return;
      const ajustar = () => { if (untracked(this.seguirFinal)) element.scrollTop = element.scrollHeight; };
      ajustar();
      if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(ajustar);
        observer.observe(element);
        onCleanup(() => observer.disconnect());
      }
    });
    this.quitarProtector=this.actualizacion.proteger(async()=>{
      const generation = this.chatGeneration;
      const estado = () => JSON.stringify({texto:this.content,acciones:this.captureTurns().flatMap(t=>t.actions),contexto:this.contexto,editando:this.editando()?.id,edicion:this.borrador});
      const antes = estado();
      if(this.loading()||this.confirming()||this.listening()||this.stopping())return false;
      await this.guardarBorradorAhora();
      return generation === this.chatGeneration && !this.destruido && antes === estado()
        && !this.loading() && !this.confirming() && !this.listening() && !this.stopping();
    });
    effect(() => { this.sincronizarUsuario(this.auth.currentUser()?.id ?? null); });
    effect(()=>{
      this.revisionBorrador();this.captureTurns();this.editando();
      if(this.borradorRestaurado())this.programarBorrador();
    });
  }
  private sincronizarUsuario(usuarioId: number | null): void {
      if (this.usuarioChat !== usuarioId) {
        if(this.guardadoTimer)clearTimeout(this.guardadoTimer);this.guardadoTimer=null;
        this.borradorRestaurado.set(false);this.errorBorrador.set('');
        this.chatGeneration++;
        this.confirmarVozAlResolver = false; this.guardadoVozId = null; this.guardadoVozCompletado.set(false);
        this.operaciones.unsubscribe(); this.operaciones=new Subscription();
        this.confirming.set(null); this.reportMessages.set([]); this.weeklyTransactions.set([]);
        this.categories.set([]); this.cuentasEdicion.set([]); this.etiquetasPersonales.set([]); this.borrador={};
        this.pendingCaptureText.set(''); this.sourceInput.set(''); this.voiceMessage.set(''); this.transcripcionParcial.set(''); this.aiConsentRequired.set(false);
        this.reportLoading.set(false); this.reportError.set(''); this.error.set(''); this.editando.set(null);
        this.recuperando.set(false);
        this.usuarioChat = usuarioId; this.captureTurns.set([]); this.content = ''; this.contexto = null; this.consent = false; this.voiceConsent = false;
        if (usuarioId !== null) {
          try { this.voiceConsent = localStorage.getItem(`kaptal.voice-consent.${usuarioId}`) === '1'; } catch { /* Solicitar consentimiento si no se puede leer. */ }
        }
        this.capturaSub?.unsubscribe(); this.transcripcionSub?.unsubscribe(); this.stopVoice(true); this.loading.set(false); this.processingStep.set(null); this.open.set(false); this.pantallaVoz.set(false);
        if (usuarioId!==null) void this.restaurarBorrador(usuarioId,this.chatGeneration);
      }
  }
  marcarBorrador():void{this.revisionBorrador.update(n=>n+1);}
  private programarBorrador():void{
    if(this.guardadoTimer)clearTimeout(this.guardadoTimer);
    this.guardadoTimer=setTimeout(()=>{this.guardadoTimer=null;void this.guardarBorradorAhora().catch(()=>{});},120);
  }
  private async guardarBorradorAhora():Promise<void>{
    if(this.guardadoTimer)clearTimeout(this.guardadoTimer);this.guardadoTimer=null;
    const usuarioId=this.usuarioChat,generation=this.chatGeneration;
    if(usuarioId===null||!this.borradorRestaurado())return;
    const snapshot:BorradorChat={usuarioId,texto:this.content,acciones:this.captureTurns().flatMap(t=>t.actions),contexto:this.contexto,
      editandoId:this.editando()?.id??null,edicion:this.editando()?structuredClone(this.borrador):undefined,actualizadoEn:new Date().toISOString()};
    const guardado=this.guardadoBorrador.catch(()=>{}).then(async()=>{
      if(generation!==this.chatGeneration)return;
      await this.offline.guardarBorrador(snapshot);
      if(generation===this.chatGeneration)this.errorBorrador.set('');
    });
    this.guardadoBorrador=guardado;
    try{await guardado;}catch(error){if(generation===this.chatGeneration)this.errorBorrador.set(error instanceof Error?error.message:'No se pudo guardar el borrador. Conserva el texto antes de cerrar.');throw error;}
  }
  private async restaurarBorrador(usuarioId:number,generation:number):Promise<void>{
    try{
      const b=await this.offline.leerBorrador(usuarioId),catalogo=await this.offline.leerCatalogo(usuarioId);
      if(generation!==this.chatGeneration || this.destruido)return;
      if(catalogo){this.cuentasEdicion.set(catalogo.cuentas);this.categories.set(catalogo.categorias);}
      if(b){this.content=b.texto;this.contexto=b.contexto??null;
        if(b.acciones.length)this.captureTurns.set([{id:++this.captureTurnId,user:'Borrador recuperado',answer:'Revisa antes de confirmar. No se ha registrado todavía.',actions:b.acciones,voice:false}]);
        const editando=b.acciones.find(p=>p.id===b.editandoId);if(editando){this.borrador=b.edicion??{...editando.data};this.editando.set(editando);}
      }
    }catch{if(generation===this.chatGeneration)this.errorBorrador.set('No se pudo recuperar el borrador local.');}
    finally{if(generation===this.chatGeneration && !this.destruido){this.borradorRestaurado.set(true);if(this.offline.conexion()){this.recuperarPropuestas();this.cargarCatalogoChat();}}}
  }
  private cargarCatalogoChat():void{
    const generation=this.chatGeneration,uid=this.usuarioChat;if(uid===null)return;
    let cuentasListas=false,categoriasListas=false;
    let pendientes=2;this.catalogoCargando.set(true);
    const terminar=()=>{if(generation===this.chatGeneration && --pendientes===0)this.catalogoCargando.set(false);};
    const persistir=()=>{if(cuentasListas&&categoriasListas)this.persistirCatalogo();};
    this.operaciones.add(this.finanzas.getCuentas().pipe(finalize(terminar)).subscribe({next:r=>{if(generation!==this.chatGeneration||!r.success||!r.data)return;this.cuentasEdicion.set(r.data);cuentasListas=true;persistir();},error:()=>{}}));
    this.operaciones.add(this.finanzas.getCategorias().pipe(finalize(terminar)).subscribe({next:r=>{if(generation!==this.chatGeneration||!r.success||!r.data)return;this.categories.set(r.data);categoriasListas=true;persistir();},error:()=>{}}));
  }
  private persistirCatalogo():void{
    const uid=this.usuarioChat;if(uid!==null)void this.offline.guardarCatalogo(uid,this.cuentasEdicion(),this.categories()).catch(()=>{});
  }
  private esPedidoNuevo(texto: string): boolean { return /^(?:por favor\s+)?(?:gast[eé]|gasto|pagu[eé]|compr[eé]|compra\b|me gast[eé]|me cost[oó]|me costaron|me cobraron|desembols[eé]|se me fueron|recib[ií]|ingres[eé]|ingreso|transfer|reporte|resumen|saldo|top|alertas)/i.test(texto); }
  usarSugerencia(texto: string): void { this.contexto = null; this.content = texto; this.voiceCapture.set(false); this.submit(); }
  limpiarChat(): void { if (this.loading() || this.confirming() || this.listening()) return; this.captureTurns.set([]); this.contexto = null; this.content = ''; this.error.set(''); this.aiConsentRequired.set(false); }
  anchoReporte(report: AiReportWidget, index: number): number { if (this.privacidad.ocultarMontos()) return 0; const max=Math.max(0,...report.values); return max>0?Math.max(0,Math.min(100,report.values[index]/max*100)):0; }
  async exportarReporte(report: AiReportWidget): Promise<void> {
    try {
      const canvas=document.createElement('canvas');canvas.width=720;canvas.height=120+report.labels.length*56;
      const ctx=canvas.getContext('2d');if(!ctx)throw new Error('No se puede generar la imagen.');
      const ocultar=this.privacidad.ocultarMontos();const texto=(v:string)=>ocultar?v.replace(/\d+(?:[.,]\d+)*/g,'•••'):v;
      ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#252522';ctx.font='600 20px sans-serif';ctx.fillText(texto(report.title).slice(0,64),24,40);
      report.labels.forEach((label,i)=>{const y=95+i*56;ctx.font='16px sans-serif';ctx.fillStyle='#252522';ctx.fillText(texto(label).slice(0,35),24,y);const valor=ocultar?'•••':new Intl.NumberFormat('es-MX',{style:'currency',currency:report.unit||'MXN'}).format(report.values[i]);ctx.fillText(valor,490,y);ctx.fillStyle='#994530';ctx.fillRect(24,y+10,650*this.anchoReporte(report,i)/100,6);});
      const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('No se pudo generar el PNG.')),'image/png'));
      const file=new File([blob],'reporte-kaptal.png',{type:'image/png'});
      if(navigator.share&&navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:report.title});return;}catch(e){if(e instanceof DOMException&&e.name==='AbortError')return;}}
      const url=URL.createObjectURL(file);const link=document.createElement('a');link.href=url;link.download=file.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch { this.toast.error('No se pudo exportar el gráfico.'); }
  }
  readonly open = signal(false);
  readonly mode = signal<CaptureMode>('CAPTURE');
  readonly loading = signal(false);
  readonly catalogoCargando = signal(false);
  readonly reportLoading = signal(false);
  readonly confirming = signal<string | null>(null);
  readonly aiConsentRequired = signal(false);
  readonly listening = signal(false);
  readonly transcribiendoVoz = signal(false);
  /** Paso activo del panel de procesamiento de voz */
  readonly processingStep = signal<ProcessingStep>(null);
  readonly voiceMessage = signal('');
  readonly cronometro = signal('00:00');
  readonly error = signal('');
  readonly reportError = signal('');
  readonly captureTurns = signal<CaptureTurn[]>([]);
  readonly mostrarHistorial = signal(false);
  readonly turnosVisibles = computed(() => {
    const turnos = this.captureTurns();
    if (this.mostrarHistorial()) return turnos;
    return turnos.filter((turno, indice) => indice === turnos.length - 1 || turno.actions.length > 0);
  });
  readonly pendingCaptureText = signal('');
  readonly categories = signal<Categoria[]>([]);
  readonly reportMessages = signal<AssistantMessage[]>([]);
  readonly weeklyTransactions = signal<Transaccion[]>([]);
  readonly sourceInput = signal('');
  readonly voiceCapture = signal(false);
  readonly reportCurrency = signal('MXN');
  readonly dropActivo = signal<string | null>(null);
  readonly weeklyCategories = computed<WeeklyCategory[]>(() => {
    const groups = new Map<string, WeeklyCategory>();
    const currency = this.reportCurrency();
    for (const transaction of this.weeklyTransactions()) {
      if (transaction.tipo !== 'GASTO' || transaction.moneda !== currency) continue;
      const name = transaction.categoriaNombre || 'Sin categoría';
      const current = groups.get(name) ?? { name, amount: 0, percent: 0, currency };
      current.amount += transaction.monto;
      groups.set(name, current);
    }
    const result = [...groups.values()].sort((a, b) => b.amount - a.amount).slice(0, 3);
    const max = result[0]?.amount ?? 0;
    return result.map(item => ({ ...item, percent: max > 0 ? item.amount / max * 100 : 0 }));
  });
  readonly escuchando = this.listening;
  content = '';
  reportQuestion = '';
  consent = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private discardAudio = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  private voiceStartedAt = 0;
  private pointerGesture = false;
  private holdStarted = false;
  private suppressNextClick = false;
  private captureTurnId = 0;
  /** Suscripción activa de transcripción de audio (permite cancelar) */
  private transcripcionSub: Subscription | null = null;
  private transcripcionParcialSub: Subscription | null = null;
  private transcripcionParcialOcupada = false;
  private ultimaVistaPrevia = 0;
  private capturaSub: Subscription | null = null;
  private readonly router = inject(Router);
  readonly nivelesAudio = signal<number[]>(Array(7).fill(0));
  private audioContext: AudioContext | null = null;
  private audioFrame: number | null = null;
  private voiceGeneration = 0;

  ngOnDestroy(): void {
    this.destruido = true;
    if(this.guardadoTimer)clearTimeout(this.guardadoTimer);this.quitarProtector();
    void this.guardarBorradorAhora().catch(()=>{});
    this.operaciones.unsubscribe();
    this.transcripcionSub?.unsubscribe();
    this.transcripcionParcialSub?.unsubscribe();
    this.capturaSub?.unsubscribe();
    this.limpiarHoldTimer();
    this.stopVoice(true);
  }

  /** Cancela la transcripción en curso y cierra el Processing Sheet */
  cancelarTranscripcion(): void {
    this.confirmarVozAlResolver = false;
    this.transcripcionSub?.unsubscribe();
    this.transcripcionSub = null;
    this.capturaSub?.unsubscribe();
    this.capturaSub = null;
    this.loading.set(false);
    this.pendingCaptureText.set('');
    this.processingStep.set(null);
    this.transcribiendoVoz.set(false);
    this.voiceMessage.set('');
    this.toast.info('Procesamiento cancelado. No se guardó ningún movimiento.', 'Cancelado');
  }

  tecladoPanel(event: KeyboardEvent): void {
    if (event.key === 'Escape') { event.preventDefault(); this.close(); }
    if (event.key !== 'Tab') return;
    const elementos = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('button, input, textarea, select, a[href], summary')]
      .filter(elemento => !elemento.matches(':disabled') && elemento.tabIndex >= 0 && elemento.checkVisibility({ visibilityProperty: true }));
    const primero = elementos[0], ultimo = elementos.at(-1);
    if (event.shiftKey && (document.activeElement === primero || document.activeElement === event.currentTarget)) { event.preventDefault(); ultimo?.focus(); }
    else if (!event.shiftKey && document.activeElement === ultimo) { event.preventDefault(); primero?.focus(); }
  }
  toggle(): void { this.open.update(value => !value); }
  alCambiarTexto(): void { this.voiceCapture.set(false); this.error.set(''); this.aiConsentRequired.set(false);this.marcarBorrador(); }
  enviarConEnter(inputEvent: Event): void {
    const event = inputEvent as KeyboardEvent;
    if (event.shiftKey || event.isComposing) return;
    event.preventDefault();
    (event.target as HTMLTextAreaElement).form?.requestSubmit();
  }
  usarEjemplo(text: string): void {
    this.content = text;
    requestAnimationFrame(() => document.getElementById('quick-capture-text')?.focus());
  }
  close(): void { this.confirmarVozAlResolver = false; this.limpiarHoldTimer(); this.pointerGesture = false; this.stopVoice(true); if (this.processingStep()) this.cancelarTranscripcion(); this.open.set(false); this.pantallaVoz.set(false); this.changeDetector.detectChanges(); }
  cerrarPantallaVoz(): void { this.permisoVoz.set(false); this.close(); this.transcripcionParcial.set(''); this.transcripcionLista.set(false); }
  usarTranscripcionParcial(): void { this.content = this.transcripcionParcial(); this.voiceCapture.set(true); this.transcripcionLista.set(true); }
  abrirEscrituraDesdeVoz(): void { this.stopVoice(true); if (this.processingStep()) this.cancelarTranscripcion(); this.voiceCapture.set(false); this.permisoVoz.set(false); this.pantallaVoz.set(false); this.open.set(true); this.mode.set('CAPTURE'); this.changeDetector.detectChanges(); requestAnimationFrame(() => document.getElementById('quick-capture-text')?.focus()); }
  continuarConVoz(): void {
    if (!this.content.trim() || this.loading() || this.catalogoCargando() || this.confirming() !== null || !this.offline.conexion()) {
      if (!this.offline.conexion()) this.error.set('Conéctate para guardar la captura de voz.');
      return;
    }
    this.guardadoVozCompletado.set(false); this.voiceCapture.set(true); this.confirmarVozAlResolver = true;
    this.voiceMessage.set('Interpretando tu mensaje…');
    this.submit();
    if (!this.loading() && this.confirmarVozAlResolver) { this.confirmarVozAlResolver = false; this.voiceMessage.set(''); }
  }
  revisarMovimientosVoz(): void { this.close(); void this.router.navigate(['/transacciones']); }
  cambiarModo(mode: CaptureMode): void {
    this.stopVoice(true);
    if (this.processingStep()) this.cancelarTranscripcion();
    this.mode.set(mode);
    this.error.set(''); this.reportError.set('');
    if (mode === 'REPORT') this.loadWeeklyTransactions();
  }

  submit(): void {
    const listaId = this.listas.activaId();
    if (listaId != null && !this.listas.puedeEscribir()) { this.error.set('Elige una lista donde puedas registrar.'); return; }
    const value = this.content.trim();
    if (!value || this.loading() || this.catalogoCargando() || this.listening() || this.stopping() || this.confirming() !== null) return;
    const pendientes = this.captureTurns().flatMap(turn => turn.actions).filter(proposal => this.necesitaCategoria(proposal));
    if (!this.confirmarVozAlResolver && pendientes.length === 1) {
      const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      const respuesta = normalizar(value).replace(/^(?:fue\s+)?(?:en\s+|de\s+|categoria\s+)?/, '').trim();
      const categorias = this.categoriasPara(pendientes[0]);
      let opciones = categorias.filter(categoria => normalizar(categoria.nombre) === respuesta);
      if (!opciones.length && /^(?:comida|restaurante|restaurantes)$/.test(respuesta)) {
        opciones = categorias.filter(categoria => /^(?:comida|alimentacion|alimentos)(?:\b|$)/.test(normalizar(categoria.nombre)));
        const especificas = opciones.filter(categoria => /^(?:comida|alimentacion)$/.test(normalizar(categoria.nombre)));
        if (especificas.length === 1) opciones = especificas;
      }
      if (opciones.length > 1) { this.error.set('Hay varias categorías posibles. Elige una de las opciones de la propuesta.'); return; }
      if (opciones.length === 1) {
        this.actualizarPropuesta(pendientes[0], {...pendientes[0].data, categoriaId: opciones[0].id}, () => {
          if (this.content.trim() === value) this.content = '';
          this.marcarBorrador();
        });
        return;
      }
    }
    this.seguirFinal.set(true);
    if(!this.offline.conexion()){
      this.prepararEnDispositivo(value, listaId);return;
    }
    this.aiConsentRequired.set(false);
    this.sourceInput.set(value); this.pendingCaptureText.set(value); this.loading.set(true); this.error.set('');
    const capturedByVoice = this.voiceCapture();
    this.processingStep.set('CATEGORIZANDO');
    this.scrollCaptureToBottom();
    const historial: AiChatMessage[] = this.consent ? this.captureTurns().filter(t => !!t.user.trim() && !!t.answer?.trim()).slice(-4)
      .flatMap(t => [{role:'USER' as const, content:t.user.slice(0,1200)}, {role:'ASSISTANT' as const, content:t.answer.slice(0,1200)}]) : [];
    const contexto = this.confirmarVozAlResolver || this.esPedidoNuevo(value) ? null : this.contexto;
    this.capturaSub = this.finanzas.capturaRapidaAi(value, this.consent, this.voiceCapture(), contexto, listaId, historial).subscribe({
      next: response => {
        const guardarVoz = capturedByVoice && this.confirmarVozAlResolver;
        this.confirmarVozAlResolver = false;
        this.processingStep.set(null);
        this.loading.set(false);
        this.pendingCaptureText.set('');
        if (!response.success || !response.data) {
          const message = response.message || 'No pude preparar este movimiento.';
          if (/no encontr[eé] una regla local/i.test(message)) this.aiConsentRequired.set(true);
          else this.error.set(message);
          return;
        }
        this.contexto = response.data.contexto ?? null;
        const proposals = response.data.actions?.length ? response.data.actions : response.data.action ? [response.data.action] : [];
        this.captureTurns.update(turns => [...turns, { id: ++this.captureTurnId, user: value, answer: response.data!.answer, actions: proposals, voice: capturedByVoice, report: response.data!.report, evidence: response.data!.evidence, suggestions: response.data!.suggestions, engine: response.data!.engine }]);
        const guardarClasificado = response.data.engine === 'GROQ_CATEGORIA' && proposals.length === 1
          && !proposals[0].data['msi'] && this.puedeGuardarVoz(proposals[0], `${contexto ?? ''} ${value}`);
        if ((guardarVoz && response.data.engine === 'REGLAS' && proposals.length === 1 && this.puedeGuardarVoz(proposals[0], value)) || guardarClasificado) {
          if (guardarVoz) { this.guardadoVozId = proposals[0].id; this.voiceMessage.set('Guardando movimiento…'); }
          this.confirm(proposals[0]);
        } else if (guardarVoz) {
          this.pantallaVoz.set(false); this.open.set(true);
          if (proposals.length) this.error.set('Revisa los datos que faltan o necesitan aclaración antes de guardar.');
        }
        this.content = '';
        this.voiceCapture.set(false);
        this.scrollCaptureToBottom();
      },
      error: error => {
        const eraVoz=this.confirmarVozAlResolver; this.confirmarVozAlResolver = false;
        this.processingStep.set(null);
        this.loading.set(false); this.pendingCaptureText.set('');
        // onLine puede seguir siendo true aunque Firefox no alcance el servidor.
        // Preparar una propuesta local nunca registra dinero sin confirmación.
        if (error instanceof HttpErrorResponse && error.status === 0) {
          if (eraVoz) { this.pantallaVoz.set(false); this.open.set(true); }
          this.prepararEnDispositivo(value, listaId);return;
        }
        const message = this.errorMessage(error);
        if (/no encontr[eé] una regla local/i.test(message)) this.aiConsentRequired.set(true);
        else this.error.set(message);
      }
    });
  }

  private puedeGuardarVoz(propuesta: AiActionProposal, texto: string): boolean {
    const d = propuesta.data;
    const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const textoNormal = normalizar(texto);
    // Un ejemplo, una pregunta o una negacion no constituye una orden inequívoca de registro.
    if (/[¿?]/.test(texto) || /\b(no|nunca|ni|si|quizas|ojala|ejemplo|prueba|simula|simular|simulado|supongamos|imagina|hipotetico|podria|seria|cancela|cancelar|cuanto|cuanta|cuantos|cuantas)\b/.test(textoNormal)) return false;
    // "Compré 50 tacos" puede indicar unidades, no pesos; pedir revisión si no hay una señal monetaria.
    if (!/\b(gaste|gasto|pague|pago|me gaste|me cobraron|recibi|ingrese|me pagaron|cobre|depositaron)\b/.test(textoNormal)
        && !/(?:\$|\b(?:pesos?|mxn)\b|\b\d+(?:[.,]\d+)?\s+(?:en|por)\b)/.test(textoNormal)) return false;
    if (propuesta.local || propuesta.type !== 'CREATE_TRANSACTION' || !['GASTO','INGRESO'].includes(String(d['tipo'])) ||
        !Number.isFinite(Number(d['monto'])) || Number(d['monto']) <= 0 || !d['categoriaId'] || !d['cuentaId'] || !d['fecha']) return false;
    if (!this.categories().some(c => c.activo && c.tipo === d['tipo'] && c.id === d['categoriaId'])) return false;
    const activas = this.cuentasEdicion().filter(c => c.activo);
    const cuenta = activas.find(c => c.id === d['cuentaId']);
    if (!cuenta) return false;
    if (activas.length === 1) return true;
    const nombre = normalizar(cuenta.nombre);
    const nombreLiteral=nombre.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    return new RegExp(`(?:^|[^\\p{L}\\d])${nombreLiteral}(?=$|[^\\p{L}\\d])`,'u').test(textoNormal)
      || (/\bamex\b/.test(textoNormal) && /\bamerican express\b/.test(nombre));
  }

  private prepararEnDispositivo(value: string, listaId: number | null): void {
    try {
      if (!this.cuentasEdicion().length) throw new Error('Abre la app con conexión para guardar primero tus cuentas.');
      const { texto, etiquetas } = extraerEtiquetasCaptura(value);
      const proposal = prepararCapturaOffline(texto, this.cuentasEdicion(), this.categories());
      proposal.data = { ...proposal.data, ...(listaId == null ? {} : { listaId }), etiquetas };
      this.captureTurns.update(turns => [...turns, {id:++this.captureTurnId,user:value,
        answer:'Preparado en este dispositivo. Revisa la cuenta y la categoría; confirma para guardarlo y enviarlo al recuperar conexión.',
        actions:[proposal],voice:false,engine:'REGLAS'}]);
      this.content='';this.error.set('');this.marcarBorrador();this.scrollCaptureToBottom();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo preparar el movimiento.');
    }
  }

  permitirIaYReintentar(): void {
    this.consent = true;
    this.aiConsentRequired.set(false);
    this.submit();
  }

  private scrollCaptureToBottom(): void {
    requestAnimationFrame(() => {
      if (this.seguirFinal()) this.irAlFinal();
    });
  }

  etiquetasPropuesta(proposal: AiActionProposal): string[] {
    const etiquetas = proposal.data['etiquetas'];
    return Array.isArray(etiquetas) ? etiquetas.filter((value): value is string => typeof value === 'string') : [];
  }
  camposAccion(proposal: AiActionProposal): {key: string; value: unknown}[] {
    return Object.entries(proposal.data).filter(([, valor]) => valor !== null && valor !== undefined)
      .map(([key, value]) => ({key, value}));
  }
  mostrarCampoAccion(campo: string, valor: unknown): string {
    if (this.privacidad.ocultarMontos() && (/^(monto|saldo|total|importe|precio|deuda|limite|disponible|ingresos|gastos|balance|patrimonio)/i.test(campo) || typeof valor === 'object')) return '•••';
    return typeof valor === 'object' ? JSON.stringify(valor) : String(valor);
  }
  insertarEtiqueta(nombre: string): void {
    const existente = new Set((this.content.match(/(?<![\p{L}\p{N}_])#[\p{L}\p{N}][\p{L}\p{N}_-]*/gu) ?? []).map(tag => tag.slice(1).toLocaleLowerCase()));
    if (existente.has(nombre.toLocaleLowerCase())) return;
    const siguiente = `${this.content.trim()} #${nombre}`.trim();
    if (siguiente.length > 1200) { this.error.set('El mensaje es demasiado largo para a?adir la etiqueta.'); return; }
    this.content = siguiente; this.alCambiarTexto();
  }
  necesitaCategoria(proposal: AiActionProposal): boolean {
    return proposal.type === 'CREATE_TRANSACTION' && proposal.data['tipo'] !== 'TRANSFERENCIA' && !proposal.data['categoriaId'];
  }
  categoriasPara(proposal: AiActionProposal): Categoria[] {
    const type = proposal.data['tipo'];
    return this.categories().filter(category => category.activo && category.tipo === type);
  }
  categoriaDropKey(proposalId: string, categoriaId: number): string {
    return `${proposalId}:${categoriaId}`;
  }

  iniciarArrastre(event: DragEvent, proposal: AiActionProposal): void {
    event.dataTransfer?.setData('text/plain', proposal.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  activarDrop(event: DragEvent, proposalId: string, categoriaId: number): void {
    event.preventDefault();
    this.dropActivo.set(this.categoriaDropKey(proposalId, categoriaId));
  }

  desactivarDrop(event: DragEvent, proposalId: string, categoriaId: number): void {
    const key = this.categoriaDropKey(proposalId, categoriaId);
    if (this.dropActivo() === key) this.dropActivo.set(null);
  }

  soltarEnCategoria(event: DragEvent, proposal: AiActionProposal, categoria: Categoria, source: string): void {
    event.preventDefault();
    this.dropActivo.set(null);
    if (event.dataTransfer?.getData('text/plain') !== proposal.id) return;
    this.asignarCategoria(proposal, categoria, source);
  }
  asignarCategoria(proposal: AiActionProposal, categoria: Categoria, source: string): void {
    this.actualizarPropuesta(proposal,{...proposal.data,categoriaId:categoria.id});
  }
  dismiss(id: string): void {
    if (this.confirming()) return;
    const propuesta=this.captureTurns().flatMap(t=>t.actions).find(p=>p.id===id);
    if(propuesta?.local){this.captureTurns.update(turns=>turns.map(t=>({...t,actions:t.actions.filter(p=>p.id!==id)})));this.marcarBorrador();return;}
    if(!this.offline.conexion()){this.error.set('Descartar una propuesta del servidor necesita conexión.');return;}
    this.confirming.set(id);
    const generation=this.chatGeneration;
    this.operaciones.add(this.finanzas.descartarPropuestaAi(id).subscribe({
      next: response => { if (generation!==this.chatGeneration) return; this.confirming.set(null);
        if (!response.success) { this.error.set(response.message||'No se pudo descartar. Reintenta.'); return; }
        this.captureTurns.update(turns => turns.map(turn => ({...turn,actions:turn.actions.filter(action => action.id!==id)})));
      }, error: error => { if (generation!==this.chatGeneration) return; this.confirming.set(null); this.error.set(this.errorMessage(error)); }
    }));
  }

  recuperarPropuestas(): void {
    if(!this.offline.conexion())return;
    if (this.recuperando() || this.confirming() || this.loading()) return;
    this.recuperando.set(true); const generation=this.chatGeneration;
    this.operaciones.add(this.finanzas.getPropuestasAi().subscribe({
      next: response => { if (generation!==this.chatGeneration) return; this.recuperando.set(false);
        if (!response.success || !response.data) { this.error.set(response.message||'No pude recuperar propuestas. Reintenta.'); return; }
        const pendientes=response.data.filter(p=>p.type==='CREATE_TRANSACTION'); const ids=new Set(pendientes.map(p => p.id));
        this.captureTurns.update(turns => turns.map(turn => ({...turn, actions:turn.actions.filter(p => p.local||ids.has(p.id)).map(p => p.local?p:pendientes.find(n => n.id===p.id)!)})));
        const visibles=new Set(this.captureTurns().flatMap(t => t.actions.map(p => p.id)));
        const nuevas=pendientes.filter(p => !visibles.has(p.id));
        if (nuevas.length) this.captureTurns.update(turns => [...turns,{id:++this.captureTurnId,user:'Propuestas recuperadas',answer:'Revisa antes de guardar. Prepararlas no modifica tus cuentas.',actions:nuevas,voice:false}]);
      }, error: error => { if (generation!==this.chatGeneration) return; this.recuperando.set(false); this.error.set(this.errorMessage(error)); }
    }));
  }
  abrirEdicion(proposal: AiActionProposal): void {
    if (this.confirming()) return;
    this.borrador={...proposal.data}; this.editando.set(proposal);
    if(!this.offline.conexion())return;
    const generation=this.chatGeneration;
    this.operaciones.add(this.finanzas.getCuentas().subscribe({next:r => { if (generation===this.chatGeneration) this.cuentasEdicion.set(r.data??[]); },error:e => { if(generation===this.chatGeneration) this.error.set(this.errorMessage(e)); }}));
  }
  guardarEdicion(): void {
    const p=this.editando(); if (!p) return;
    const datos={...this.borrador};
    if(datos['tipo']==='TRANSFERENCIA')datos['categoriaId']=null;
    else { datos['cuentaDestinoId']=null; datos['tasaCambio']=null;
      if(datos['tipo']!==p.data['tipo'] && !this.categories().some(c=>c.activo && c.tipo===datos['tipo'] && c.id===datos['categoriaId']))datos['categoriaId']=null;
    }
    this.actualizarPropuesta(p,datos);
  }
  private actualizarPropuesta(proposal:AiActionProposal,datos:Record<string,unknown>,alActualizar?:()=>void):void {
    if (this.confirming()) return;
    if(proposal.local){
      const cuenta=this.cuentasEdicion().find(c=>c.id===datos['cuentaId'])?.nombre??'Cuenta por seleccionar';
      const destino=datos['tipo']==='TRANSFERENCIA'?' a '+(this.cuentasEdicion().find(c=>c.id===datos['cuentaDestinoId'])?.nombre??'destino por seleccionar'):'';
      const p={...proposal,data:{...datos},version:(proposal.version??0)+1,summary:`${datos['tipo']} de ${datos['monto']} · ${cuenta}${destino} · ${datos['fecha']}`};
      this.captureTurns.update(turns=>turns.map(t=>({...t,actions:t.actions.map(previo=>previo.id===p.id?p:previo)})));
      this.editando.set(null);this.marcarBorrador();alActualizar?.();return;
    }
    if(!this.offline.conexion()){this.error.set('Editar una propuesta del servidor requiere conexión.');return;}
    this.confirming.set(proposal.id); const generation=this.chatGeneration;
    this.operaciones.add(this.finanzas.editarPropuestaAi(proposal.id,datos,proposal.version??0).subscribe({
      next:r => { if(generation!==this.chatGeneration)return; this.confirming.set(null);
        if(!r.success||!r.data){this.error.set(r.message||'No se pudo editar.');return;}
        this.captureTurns.update(turns=>turns.map(t=>({...t,actions:t.actions.map(p=>p.id===proposal.id?r.data!:p)})));
        this.editando.set(null);this.error.set('');alActualizar?.();
      },error:e=>{if(generation!==this.chatGeneration)return;this.confirming.set(null);this.error.set(this.errorMessage(e));}
    }));
  }

  confirm(proposal: AiActionProposal): void {
    if (this.confirming()) return;
    if(proposal.local||!this.offline.conexion()){void this.confirmarEnDispositivo(proposal);return;}
    this.confirming.set(proposal.id); this.error.set('');
    const generation=this.chatGeneration;
    this.operaciones.add(this.finanzas.confirmAiAction(proposal.id,proposal.version??0).subscribe({
      next: result => {
        if(generation!==this.chatGeneration)return;
        this.confirming.set(null);
        if (!result.success) {
          if (this.guardadoVozId === proposal.id) { this.guardadoVozId = null; this.voiceMessage.set('No se pudo guardar. Revisa el mensaje e inténtalo de nuevo.'); }
          const msg = result.message || 'No se guardó el movimiento.';
          this.error.set(msg);
          this.toast.error(msg, '⚠️ Error al guardar');
          return;
        }
        this.captureTurns.update(turns => turns.map(turn => turn.actions.some(action => action.id === proposal.id)
          ? { ...turn, confirmaciones: [...(turn.confirmaciones ?? []), {id:proposal.id,estado:'SERVIDOR' as const,...(proposal.type !== 'CREATE_TRANSACTION' ? {accion:true} : {})}], actions: turn.actions.filter(action => action.id !== proposal.id) }
          : turn));
        window.dispatchEvent(new Event('kaptal-movimiento-guardado'));
        if (this.guardadoVozId === proposal.id) { this.guardadoVozId = null; this.transcripcionLista.set(false); this.transcripcionParcial.set(''); this.guardadoVozCompletado.set(true); this.voiceMessage.set('Listo, movimiento guardado.'); }
        this.toast.success(proposal.type === 'CREATE_TRANSACTION' ? 'Movimiento guardado con éxito.' : 'Acción completada.', '✅ Listo');
      },
      error: error => {
        if (this.guardadoVozId === proposal.id) {
          this.guardadoVozId = null; this.transcripcionLista.set(false);
          this.pantallaVoz.set(false); this.open.set(true);
          this.voiceMessage.set('No se pudo confirmar el guardado. Revisa Actividad antes de volver a intentarlo.');
        }
        if(generation!==this.chatGeneration)return;
        this.confirming.set(null);
        const msg = this.errorConfirmacion(error);
        this.error.set(msg);
        this.toast.error(msg, '⚠️ Error de conexión');
      }
    }));
  }

  verEvidencia(item: AiEvidence): void {
    this.close();
    void this.router.navigate(['/transacciones'], { queryParams: {
      alcance: 'propio', fechaInicio: item.desde, fechaFin: item.hasta,
      moneda: item.moneda, tipo: item.tipo
    }});
  }

  preguntaSugerida(question: string): void { this.reportQuestion = question; this.askReport(); }
  askReport(): void {
    const content = this.reportQuestion.trim();
    if (!content || !this.consent || this.reportLoading()) return;
    const history: AiChatMessage[] = this.reportMessages().slice(-8).map(({ role, content: text }) => ({ role, content: text }));
    history.push({ role: 'USER', content });
    this.reportMessages.update(messages => [...messages, { role: 'USER', content }]);
    this.reportQuestion = ''; this.reportLoading.set(true); this.reportError.set('');
    const generation=this.chatGeneration;
    this.operaciones.add(this.finanzas.chatWithAi(history, true).subscribe({
      next: response => {
        if(generation!==this.chatGeneration)return;
        this.reportLoading.set(false);
        if (!response.success || !response.data) { this.reportMessages.update(m=>m.slice(0,-1));this.reportError.set(response.message || 'No pude preparar el informe.'); return; }
        const actions = response.data.actions?.length ? response.data.actions : response.data.action ? [response.data.action] : [];
        this.reportMessages.update(messages => [...messages, { role: 'ASSISTANT', content: response.data!.answer, actions, evidence: response.data!.evidence }]);
        if (this.reportMessages().length > 12) this.reportMessages.update(messages => messages.slice(-12));
      },
      error: error => { if(generation!==this.chatGeneration)return; this.reportMessages.update(m=>m.slice(0,-1));this.reportLoading.set(false); this.reportError.set(this.errorMessage(error)); }
    }));
  }

  confirmReportAction(messageIndex: number, proposal: AiActionProposal): void {
    if (this.confirming()) return;
    this.confirming.set(proposal.id);
    const generation=this.chatGeneration;
    this.operaciones.add(this.finanzas.confirmAiAction(proposal.id,proposal.version??0).subscribe({
      next: response => {
        if(generation!==this.chatGeneration)return;
        this.confirming.set(null);
        if (!response.success) { this.reportError.set(response.message || 'No se pudo completar el cambio.'); return; }
        this.reportMessages.update(messages => messages.map((message, index) => index === messageIndex
          ? { ...message, content: `${message.content}\n\n${response.message || 'Listo, cambio guardado.'}`, actions: message.actions?.filter(action => action.id !== proposal.id) }
          : message));
        window.dispatchEvent(new Event('kaptal-movimiento-guardado'));
      },
      error: error => { if(generation!==this.chatGeneration)return; this.confirming.set(null); this.reportError.set(this.errorConfirmacion(error)); }
    }));
  }

  private loadWeeklyTransactions(): void {
    if (this.weeklyTransactions().length) return;
    const until = new Date();
    const from = new Date(until.getFullYear(), until.getMonth(), until.getDate() - 6);
    const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const generation=this.chatGeneration;
    this.operaciones.add(this.finanzas.getTransaccionesPaginadas({ fechaInicio: iso(from), fechaFin: iso(until) }, 0, 100).subscribe({
      next: response => {
        if(generation!==this.chatGeneration)return;
        const transactions = response.data?.content ?? [];
        this.weeklyTransactions.set(transactions);
        const preferred = this.perfil.perfil()?.monedaPredeterminada;
        this.reportCurrency.set(transactions.some(item => item.moneda === preferred) ? preferred! : transactions[0]?.moneda ?? 'MXN');
      }
    }));
  }

  @HostListener('window:kaptal-abrir-captura-chat', ['$event'])
  abrirCapturaDesdeAcceso(event: Event): void {
    // Sincronizar identidad antes de abrir evita que el efecto inicial cierre el panel recién abierto.
    this.sincronizarUsuario(this.auth.currentUser()?.id ?? null);
    this.captureLauncher.attach('chat');
    this.seguirFinal.set(true);
    this.cargarCategoriasCaptura();
    const generacion=this.chatGeneration;
    this.operaciones.add(this.finanzas.getEtiquetasPersonales().subscribe({
      next:r=>{if(generacion===this.chatGeneration)this.etiquetasPersonales.set(r.data??[]);},
      error:()=>{if(generacion===this.chatGeneration)this.etiquetasPersonales.set([]);}
    }));
    const detail = (event as CustomEvent<{ tipo?: string; content?: string; voz?: boolean; historial?: boolean }>).detail;
    this.mostrarHistorial.set(detail?.historial === true);
    if (detail?.voz === true) { this.transcripcionLista.set(false); this.transcripcionParcial.set(''); this.guardadoVozCompletado.set(false); this.voiceMessage.set(''); }
    this.pantallaVoz.set(detail?.voz === true);
    this.open.set(detail?.voz !== true);
    this.mode.set('CAPTURE');
    this.error.set('');
    if (detail?.content) { this.usarSugerencia(detail.content); }
    if (detail?.tipo) {
      const label = detail.tipo === 'INGRESO' ? 'ingreso' : detail.tipo === 'TRANSFERENCIA' ? 'transferencia' : 'gasto';
      this.captureHint.set(`Cuéntame qué ${label} quieres registrar.`);
    } else {
      this.captureHint.set('Hoy se usa por defecto. Indica ayer, una fecha o una cuenta si lo necesitas.');
    }
    requestAnimationFrame(() => {
      const target = detail?.voz ? 'voice-screen' : window.matchMedia('(pointer: coarse)').matches ? 'quick-capture-panel' : 'quick-capture-text';
      document.getElementById(target)?.focus({ preventScroll: true });
    });
  }

  readonly captureHint = signal('Hoy se usa por defecto. Puedes indicar ayer, una fecha, tu cuenta o categoría.');

  iniciarPorPresion(event: PointerEvent): void {
    if (!event.isPrimary || event.button !== 0) return;
    this.suppressNextClick = false;
    this.pointerGesture = true;
    this.holdStarted = false;
    (event.currentTarget as HTMLButtonElement).setPointerCapture?.(event.pointerId);
    this.holdTimer = setTimeout(() => {
      if (!this.pointerGesture) return;
      this.holdStarted = true;
      this.suppressNextClick = true;
      this.open.set(true);
      this.mode.set('CAPTURE');
      this.startVoice();
    }, 280);
  }
  detenerPorPresion(event: PointerEvent): void {
    if (!this.pointerGesture) return;
    this.pointerGesture = false;
    this.limpiarHoldTimer();
    if (this.holdStarted) this.stopVoice();
  }
  cancelarPresion(): void {
    this.pointerGesture = false;
    this.limpiarHoldTimer();
    if (this.holdStarted) this.stopVoice(true);
    this.suppressNextClick = false;
  }
  abrirConTeclado(): void {
    if (this.suppressNextClick) { this.suppressNextClick = false; return; }
    this.close();
    window.dispatchEvent(new CustomEvent('kaptal-abrir-registro-rapido', {detail:{preservar:true}}));
  }
  private limpiarHoldTimer(): void { if (this.holdTimer) clearTimeout(this.holdTimer); this.holdTimer = null; }
  readonly stopping = signal(false);
  readonly permisoVoz = signal(false);
  permitirVoz(): void {
    this.voiceConsent = true;
    if (this.usuarioChat !== null) {
      try { localStorage.setItem(`kaptal.voice-consent.${this.usuarioChat}`, '1'); } catch { /* El permiso se mantiene durante esta sesion. */ }
    }
    this.permisoVoz.set(false); void this.startVoice();
  }
  revocarVoz(): void {
    this.stopVoice(true); this.voiceConsent = false;
    if (this.usuarioChat !== null) {
      try { localStorage.removeItem(`kaptal.voice-consent.${this.usuarioChat}`); } catch { /* No hay almacenamiento disponible. */ }
    }
    this.permisoVoz.set(true);
  }
  toggleVoice(): void {
    if (this.listening()) { this.stopVoice(); return; }
    if (!this.voiceConsent) { this.permisoVoz.set(true); this.changeDetector.detectChanges(); return; }
    void this.startVoice();
  }
  private async startVoice(): Promise<void> {
    if (!this.offline.conexion()) { this.error.set('La transcripción necesita conexión. Puedes escribir el movimiento.'); return; }
    if (this.listening() || this.stopping() || this.loading() || this.transcribiendoVoz()) return;
    const generation = ++this.voiceGeneration;
    this.error.set(''); this.voiceMessage.set('');
    if (!this.voiceConsent) { this.error.set('Activa el consentimiento para enviar el audio y transcribirlo.'); return; }
    if (!window.isSecureContext) { this.error.set('El navegador necesita una conexión segura para usar el micrófono. En el teléfono abre Kaptal con HTTPS; en esta computadora puedes usar localhost.'); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      this.error.set('Este navegador no permite grabar audio. Actualiza el navegador o escribe el movimiento.'); return;
    }
    this.discardAudio = false;
    this.audioChunks = [];
    this.transcripcionParcial.set(''); this.transcripcionLista.set(false); this.ultimaVistaPrevia = 0;
    this.cargarCategoriasCaptura();
    this.voiceCapture.set(true);
    this.voiceStartedAt = Date.now(); this.listening.set(true); this.updateTimer();
    if (this.pantallaVoz()) this.changeDetector.detectChanges();
    this.timer = setInterval(() => {
      this.updateTimer();
      if (this.pantallaVoz() && !this.destruido) this.changeDetector.detectChanges();
      const segundos = Math.floor((Date.now() - this.voiceStartedAt) / 1000);
      if (this.pantallaVoz() && segundos >= 5 && segundos - this.ultimaVistaPrevia >= 8) {
        this.ultimaVistaPrevia = segundos; this.previsualizarAudio(generation);
      }
      if (Date.now() - this.voiceStartedAt >= 45_000) this.stopVoice();
    }, 250);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
      if (!this.listening() || generation !== this.voiceGeneration) { stream.getTracks().forEach(track => track.stop()); return; }
      this.audioStream = stream;
      this.iniciarNivelesAudio(stream);
      const supported = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find(type => MediaRecorder.isTypeSupported(type));
      const recorder = supported ? new MediaRecorder(stream, { mimeType: supported }) : new MediaRecorder(stream);
      this.mediaRecorder = recorder;
      recorder.ondataavailable = event => { if (event.data.size) this.audioChunks.push(event.data); };
      recorder.onerror = () => { this.error.set('No pude grabar el audio. Revisa el permiso del micrófono.'); this.stopVoice(true); };
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        if (this.mediaRecorder !== recorder) return;
        this.stopping.set(false);
        this.procesarGrabacion(recorder.mimeType || 'audio/webm');
      };
      recorder.start(250);
    } catch (cause) {
      if (generation !== this.voiceGeneration) return;
      this.stopVoice(true);
      const name = cause instanceof DOMException ? cause.name : '';
      this.error.set(name === 'NotAllowedError' ? 'El acceso al micrófono está bloqueado. Revisa los permisos de Kaptal o del navegador y vuelve a intentarlo.' :
        name === 'NotFoundError' ? 'No encontré un micrófono disponible.' : 'No pude iniciar el micrófono. Revisa los permisos del navegador.');
      if (this.pantallaVoz() && !this.destruido) this.changeDetector.detectChanges();
    }
  }
  private stopVoice(discard = false): void {
    ++this.voiceGeneration;
    this.transcripcionParcialSub?.unsubscribe(); this.transcripcionParcialSub = null; this.transcripcionParcialOcupada = false;
    this.detenerNivelesAudio();
    this.discardAudio ||= discard;
    this.listening.set(false); this.finishTimer();
    if (this.pantallaVoz() && !this.destruido) this.changeDetector.detectChanges();
    const recorder = this.mediaRecorder;
    if (recorder?.state === 'recording') { this.stopping.set(true); recorder.stop(); return; }
    if (this.stopping()) return;
    this.audioStream?.getTracks().forEach(track => track.stop());
    this.audioStream = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
  }
  private previsualizarAudio(generation: number): void {
    if (this.transcripcionParcialOcupada || !this.listening() || !this.audioChunks.length || !this.mediaRecorder) return;
    const audio = new Blob(this.audioChunks, {type:this.mediaRecorder.mimeType || 'audio/webm'});
    if (!audio.size || audio.size > 5 * 1024 * 1024) return;
    this.transcripcionParcialOcupada = true;
    const sub = this.finanzas.transcribirAudio(audio).pipe(finalize(() => { this.transcripcionParcialOcupada = false; })).subscribe({
      next: response => {
        if (generation !== this.voiceGeneration || !this.listening()) return;
        const texto = response.success ? response.data?.trim() : '';
        if (texto) { this.transcripcionParcial.set(texto); if (this.pantallaVoz() && !this.destruido) this.changeDetector.detectChanges(); }
      },
      error: () => { /* La transcripción final conserva el audio completo. */ }
    });
    this.transcripcionParcialSub = sub.closed ? null : sub;
  }
  private procesarGrabacion(mimeType: string): void {
    this.audioStream?.getTracks().forEach(track => track.stop());
    this.audioStream = null;
    this.mediaRecorder = null;
    const audio = new Blob(this.audioChunks, { type: mimeType });
    this.audioChunks = [];
    if (this.discardAudio || !audio.size) return;
    if (!this.voiceConsent) { this.error.set('Activa el consentimiento para transcribir este audio.'); return; }
    // Mostrar Processing Sheet — paso 1: Transcribiendo
    this.transcribiendoVoz.set(true);
    this.processingStep.set('TRANSCRIBIENDO');
    this.voiceMessage.set('Enviando audio para transcribir…');
    if (this.pantallaVoz()) this.changeDetector.detectChanges();
    // Guardamos la suscripción para permitir cancelación
    this.transcripcionSub = this.finanzas.transcribirAudio(audio).subscribe({
      next: response => {
        this.processingStep.set(null);
        this.transcribiendoVoz.set(false);
        this.transcripcionSub = null;
        const text = response.data?.trim();
        if (!response.success || !text) {
          const msg = response.message || 'No detecté voz clara. Inténtalo de nuevo.';
          this.error.set(msg);
          this.voiceMessage.set('');
          this.toast.warning(msg, '⚠️ Sin voz detectada');
          if (this.pantallaVoz() && !this.destruido) this.changeDetector.detectChanges();
          return;
        }
        this.content = text;
        this.voiceCapture.set(true);
        this.voiceMessage.set('Transcripción lista. Revisa el texto antes de continuar.');
        if (this.pantallaVoz()) {
          this.transcripcionLista.set(true);
          this.changeDetector.detectChanges();
        } else {
          this.open.set(true);
          this.mode.set('CAPTURE');
          this.changeDetector.detectChanges();
          requestAnimationFrame(() => document.getElementById('quick-capture-text')?.focus());
        }
      },
      error: error => {
        this.processingStep.set(null);
        this.transcribiendoVoz.set(false);
        this.transcripcionSub = null;
        this.voiceMessage.set('');
        const msg = this.errorMessage(error);
        this.error.set(msg);
        this.toast.error(msg, '⚠️ Error de conexión');
        if (this.pantallaVoz() && !this.destruido) this.changeDetector.detectChanges();
      }
    });
  }
  private updateTimer(): void {
    const seconds = Math.floor((Date.now() - this.voiceStartedAt) / 1000);
    this.cronometro.set(`${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`);
  }
  private cargarCategoriasCaptura(): void {
    const generation=this.chatGeneration;
    this.operaciones.add(this.finanzas.getCategorias().subscribe({
      next: response => { if (generation===this.chatGeneration && response.success && response.data) this.categories.set(response.data); },
      error: () => {if(generation===this.chatGeneration)this.error.set('No se pudieron cargar las categorías. Reintenta la captura.');}
    }));
  }
  private iniciarNivelesAudio(stream: MediaStream): void {
    try {
      const context = new AudioContext();
      this.audioContext = context;
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      context.createMediaStreamSource(stream).connect(analyser);
      void context.resume().catch(() => undefined);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!this.listening() || this.audioContext !== context) return;
        analyser.getByteFrequencyData(data);
        this.nivelesAudio.set(Array.from({ length: 7 }, (_, index) => {
          const start = Math.floor(index * data.length / 7);
          const end = Math.floor((index + 1) * data.length / 7);
          let sum = 0;
          for (let i = start; i < end; i++) sum += data[i];
          return sum / Math.max(1, end - start) / 255;
        }));
        this.audioFrame = requestAnimationFrame(tick);
      };
      tick();
    } catch { this.detenerNivelesAudio(); }
  }
  private detenerNivelesAudio(): void {
    if (this.audioFrame !== null) cancelAnimationFrame(this.audioFrame);
    this.audioFrame = null;
    void this.audioContext?.close().catch(() => undefined);
    this.audioContext = null;
    this.nivelesAudio.set(Array(7).fill(0));
  }
  private finishTimer(): void { if (this.timer) clearInterval(this.timer); this.timer = null; }
  private errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { message?: string } | string | null;
      if (typeof body === 'string' && body.trim()) return body;
      if (body && typeof body === 'object' && body.message) return body.message;
      if (error.status === 0) return 'No pude conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
      if (error.status === 401) return 'Tu sesión venció. Vuelve a iniciar sesión para enviar el movimiento.';
      if (error.status === 413) return 'El mensaje o audio es demasiado grande. Redúcelo e inténtalo de nuevo.';
      if (error.status >= 500) return 'El servidor no pudo procesar el mensaje. No se guardó ningún movimiento; inténtalo de nuevo.';
    }
    if (typeof error === 'object' && error !== null) {
      const body = (error as { error?: { message?: string } | string }).error;
      if (typeof body === 'string') return body;
      if (body?.message) return body.message;
    }
    return 'No pude procesar la solicitud. Inténtalo de nuevo.';
  }
  private async confirmarEnDispositivo(proposal:AiActionProposal):Promise<void>{
    const uid=this.usuarioChat,generation=this.chatGeneration;if(uid===null){this.error.set('Inicia sesión para guardar en este dispositivo.');return;}
    this.confirming.set(proposal.id);this.error.set('');
    try{
      const payload=validarPayloadOffline(proposal.data,this.cuentasEdicion(),this.categories());
      await this.guardarBorradorAhora();
      if(generation!==this.chatGeneration)return;
      if(proposal.local)await this.offline.guardarPendiente(uid,proposal.id,payload);
      else await this.offline.guardarConfirmacion(uid,proposal,payload);
      if(generation!==this.chatGeneration)return;
      this.captureTurns.update(turns=>turns.map(t=>t.actions.some(p=>p.id===proposal.id)?({...t,confirmaciones:[...(t.confirmaciones??[]),{id:proposal.id,estado:'DISPOSITIVO' as const}],actions:t.actions.filter(p=>p.id!==proposal.id)}):t));
      this.toast.info('Guardado en este dispositivo. Falta confirmación del servidor.');
      this.marcarBorrador();if(this.offline.conexion())void this.offline.sincronizar();
    }catch(error){if(generation===this.chatGeneration)this.error.set(error instanceof Error?error.message:'No se pudo guardar localmente. La propuesta sigue disponible.');}
    finally{if(generation===this.chatGeneration)this.confirming.set(null);}
  }
  private errorConfirmacion(error:unknown):string {
    if(error instanceof HttpErrorResponse && (error.status===0 || error.status>=500))
      return 'No pude comprobar el resultado. Reintenta esta misma propuesta; si ya se guardó, no se duplicará.';
    return this.errorMessage(error);
  }
  @HostListener('document:keydown.escape') closeOnEscape(): void { this.close(); }
}
