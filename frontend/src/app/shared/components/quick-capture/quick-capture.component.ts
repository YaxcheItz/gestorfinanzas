import { AuthService } from '../../../core/services/auth.service';
import { PrivacidadService } from '../../../core/services/privacidad.service';
import { PrivacyToggleComponent } from '../privacy-toggle/privacy-toggle.component';
import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { AiActionProposal, AiChatMessage, AiReportWidget } from '../../../core/models/ai.models';
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

type CaptureMode = 'CAPTURE' | 'REPORT';
/** Estado del panel de procesamiento de voz */
type ProcessingStep = 'TRANSCRIBIENDO' | 'CATEGORIZANDO' | null;
interface AssistantMessage extends AiChatMessage { actions?: AiActionProposal[]; }
interface CaptureTurn { id: number; user: string; answer: string; actions: AiActionProposal[]; voice: boolean; report?: AiReportWidget | null; suggestions?: string[]; engine?: string; }
interface WeeklyCategory { name: string; amount: number; percent: number; currency: string; }
@Component({
  selector: 'app-quick-capture',
  standalone: true,
  imports: [PrivacyToggleComponent, CommonModule, FormsModule, MontoPipe, TextoFinancieroPipe, CategoriaIconoComponent, MontoPrivadoDirective],
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

    <!-- Voice Waveform: solo durante grabación activa -->
    @if (escuchando()) {
      <div class="voice-waveform" role="status" aria-live="polite">
        <span class="voice-waveform__bars" aria-hidden="true">@for (nivel of nivelesAudio(); track $index) { <i [style.height.px]="4 + nivel * 24" style="animation: none"></i> }</span>
        <span>Escuchando</span><strong>{{ cronometro() }}</strong>
      </div>
    }

    @if (open()) {
      <div class="voice-dialog-backdrop" (click)="close()"></div>
      <section role="dialog" aria-modal="true" (keydown)="tecladoPanel($event)" id="quick-capture-panel" class="capture-panel" aria-label="Kaptal, captura y reportes">
        <header class="capture-panel__head">
          <div><span class="capture-panel__spark">✦</span><div><strong>Kaptal</strong><small>{{ mode() === 'CAPTURE' ? 'Tu chat financiero' : 'Tus finanzas, en contexto' }}</small></div></div>
          <button type="button" class="capture-clear" (click)="limpiarChat()" [disabled]="loading() || confirming() !== null || escuchando()" aria-label="Limpiar historial del chat" title="Limpiar chat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6m4-6v6"/></svg></button><app-privacy-toggle/><button type="button" (click)="close()" aria-label="Cerrar">×</button>
        </header>
        <p class="capture-instructions">Registra movimientos y pide reportes. Primero reglas e historial; IA solo cuando hace falta y la autorizas.</p>
        @if(!offline.conexion()){<p role="status">Sin conexión. Revisa y confirma para guardar en este dispositivo; se enviará al volver la conexión.</p>}
        @if(errorBorrador()){<p class="capture-error" role="alert">{{ errorBorrador() }}</p>}
        @if(offline.pendientes().length){<p role="status">{{ offline.pendientes().length }} movimiento(s) guardados en este dispositivo, pendientes del servidor.</p>}

        @if (mode() === 'CAPTURE') {
          <button type="button" class="capture-cancel" style="min-height:44px;color:inherit" (click)="recuperarPropuestas()" [disabled]="recuperando() || loading() || confirming() !== null">{{ recuperando() ? 'Recuperando…' : 'Recuperar propuestas pendientes' }}</button>
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
              <label>Descripción<input name="editDescripcion" maxlength="200" [(ngModel)]="borrador['descripcion']"></label>
              <label>Notas<input name="editNotas" maxlength="500" [(ngModel)]="borrador['notas']"></label>
              <div class="capture-proposal__actions"><button type="button" class="capture-cancel" (click)="editando.set(null)">Cancelar edición</button><button type="submit" class="capture-save" [disabled]="confirming()!==null">Actualizar propuesta</button></div>
              <p>Actualizar prepara la propuesta. Confirma después para registrar el movimiento.</p>
            </form>
          } @else {
          <div id="capture-chat-thread" class="capture-chat" aria-live="polite" aria-relevant="additions text" [attr.aria-busy]="loading()">
            @if (captureTurns().length === 0 && !pendingCaptureText()) {
              <div class="capture-chat__intro"><span class="capture-chat__avatar" aria-hidden="true">✦</span><div><strong>¿Qué anotamos o consultamos?</strong><p>{{ captureHint() }} Ejemplos:</p><div class="capture-chat__suggestions"><button type="button" (click)="usarEjemplo('Gasté 180 en comida')">Gasté $180 en comida</button><button type="button" (click)="usarEjemplo('Recibí 8500 de nómina')">Recibí $8,500 de nómina</button></div></div></div>
            }
            @for (turn of captureTurns(); track turn.id) {
              <article class="capture-chat__user"><span>{{ turn.user | textoFinanciero }}</span></article>
              <article class="capture-chat__assistant"><span class="capture-chat__avatar" aria-hidden="true">✦</span><div class="capture-chat__reply"><small class="chat-engine">{{ turn.engine === 'IA' ? 'Interpretado con IA' : 'Reglas e historial' }}</small><p>{{ turn.answer | textoFinanciero }}</p>
                @if (turn.report; as report) {
                  <section class="chat-local-report" aria-label="Reporte financiero"><h3>{{ report.title | textoFinanciero }}</h3>
                    @for (label of report.labels; track $index; let i = $index) {<div class="chat-local-report__row"><span>{{ label | textoFinanciero }}</span><strong>{{ report.values[i] | monto:(report.unit || 'MXN') }}</strong><div class="chat-local-report__track"><i [style.width.%]="anchoReporte(report, i)"></i></div></div>}
                    <button type="button" (click)="exportarReporte(report)">Exportar gráfico</button>
                  </section>
                }
                @if (turn.suggestions?.length) {<div class="chat-followups">@for (suggestion of turn.suggestions; track suggestion) {<button type="button" (click)="usarSugerencia(suggestion)" [disabled]="loading() || confirming() !== null">{{ suggestion | textoFinanciero }}</button>}</div>}
                @for (proposal of turn.actions; track proposal.id) {
                  <button type="button" class="capture-cancel" style="min-height:44px" (click)="abrirEdicion(proposal)" [disabled]="confirming()!==null">Editar propuesta</button>
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
          @if (permisoVoz()) {<section class="voice-permission" role="status"><p>El audio se enviará para transcribirlo. Revisa el movimiento antes de guardarlo.</p><button type="button" (click)="permitirVoz()">Permitir audio y grabar</button></section>}
          <button type="button" class="voice-record-button" (click)="toggleVoice()" [disabled]="loading() || transcribiendoVoz() || stopping()" [attr.aria-pressed]="escuchando()">{{ escuchando() ? 'Detener y revisar' : 'Grabar movimiento' }}</button>
          <div class="chat-local-prompts" aria-label="Consultas y registros sugeridos"><button type="button" (click)="usarSugerencia('Reporte de hoy')" [disabled]="loading()">Hoy</button><button type="button" (click)="usarSugerencia('Top categorías de este mes')" [disabled]="loading()">Top categorías</button><button type="button" (click)="usarSugerencia('Alertas de presupuesto')" [disabled]="loading()">Presupuestos</button><button type="button" (click)="usarSugerencia('Saldo')" [disabled]="loading()">Saldos</button></div>
          <form class="capture-chat__composer" (ngSubmit)="submit()">
            <label class="sr-only" for="quick-capture-text">Escribe el movimiento que quieres registrar</label>
            <textarea id="quick-capture-text" name="content" [(ngModel)]="content" (ngModelChange)="alCambiarTexto()" (keydown.enter)="enviarConEnter($event)" rows="1" maxlength="1200" placeholder="Gasté 80 en tacos, recibí 900 o reporte de hoy…" [disabled]="loading() || escuchando() || stopping()"></textarea>
            <button type="button" class="capture-mic" (click)="toggleVoice()" [class.is-listening]="escuchando()" [disabled]="loading() || transcribiendoVoz() || stopping()" [attr.aria-label]="escuchando() ? 'Detener dictado' : 'Dictar movimiento'"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8"/></svg></button>
            <button type="submit" class="capture-chat__send" [disabled]="loading() || escuchando() || stopping() || !content.trim()" aria-label="Enviar movimiento"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 14-7-5 14-3-6-6-1Z"/><path d="m11 13 4-4"/></svg></button>
          </form>
          @if (voiceMessage()) { <p class="voice-transcribed" role="status">{{ voiceMessage() }}</p> }
          <label class="capture-consent capture-chat__consent"><input type="checkbox" [(ngModel)]="consent" name="captureConsent"><span>Permitir IA y compartir contexto financiero solo para solicitudes complejas</span></label>
          }
        } @else {
          <div class="report-thread" aria-live="polite" aria-relevant="additions text" [attr.aria-busy]="reportLoading()">
            @if (reportMessages().length === 0) {
              <div class="report-welcome"><strong>¿Qué quieres entender?</strong><p>Pregunta sobre tus gastos, ingresos y hábitos. También puedes ver el resumen de la última semana.</p><button type="button" (click)="preguntaSugerida('¿En qué gasté más esta semana?')">¿En qué gasté más esta semana?</button></div>
            }
            @for (message of reportMessages(); track $index; let messageIndex = $index) {
              <article class="report-message" [class.is-user]="message.role === 'USER'">
                <div class="report-message__bubble"><small>{{ message.role === 'USER' ? 'Tú' : 'Kaptal IA' }}</small><p>{{ message.content | textoFinanciero }}</p>
                  @if (message.role === 'ASSISTANT' && weeklyCategories().length > 0) {
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
  readonly offline=inject(MovimientosOfflineService);
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
  private voiceConsent = false;
  private usuarioChat: number | null = null;
  private destruido = false;
  constructor() {
    this.quitarProtector=this.actualizacion.proteger(async()=>{
      const generation = this.chatGeneration;
      const estado = () => JSON.stringify({texto:this.content,acciones:this.captureTurns().flatMap(t=>t.actions),contexto:this.contexto,editando:this.editando()?.id,edicion:this.borrador});
      const antes = estado();
      if(this.loading()||this.confirming()||this.listening()||this.stopping())return false;
      await this.guardarBorradorAhora();
      return generation === this.chatGeneration && !this.destruido && antes === estado()
        && !this.loading() && !this.confirming() && !this.listening() && !this.stopping();
    });
    effect(() => {
      const usuarioId = this.auth.currentUser()?.id ?? null;
      if (this.usuarioChat !== usuarioId) {
        if(this.guardadoTimer)clearTimeout(this.guardadoTimer);this.guardadoTimer=null;
        this.borradorRestaurado.set(false);this.errorBorrador.set('');
        this.chatGeneration++;
        this.operaciones.unsubscribe(); this.operaciones=new Subscription();
        this.confirming.set(null); this.reportMessages.set([]); this.weeklyTransactions.set([]);
        this.categories.set([]); this.cuentasEdicion.set([]); this.borrador={};
        this.pendingCaptureText.set(''); this.sourceInput.set(''); this.voiceMessage.set(''); this.aiConsentRequired.set(false);
        this.reportLoading.set(false); this.reportError.set(''); this.error.set(''); this.editando.set(null);
        this.recuperando.set(false);
        this.usuarioChat = usuarioId; this.captureTurns.set([]); this.content = ''; this.contexto = null; this.consent = false; this.voiceConsent = false;
        this.capturaSub?.unsubscribe(); this.transcripcionSub?.unsubscribe(); this.stopVoice(true); this.loading.set(false); this.processingStep.set(null); this.open.set(false);
        if (usuarioId!==null) void this.restaurarBorrador(usuarioId,this.chatGeneration);
      }
    });
    effect(()=>{
      this.revisionBorrador();this.captureTurns();this.editando();
      if(this.borradorRestaurado())this.programarBorrador();
    });
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
    const persistir=()=>{if(cuentasListas&&categoriasListas)this.persistirCatalogo();};
    this.operaciones.add(this.finanzas.getCuentas().subscribe({next:r=>{if(generation!==this.chatGeneration||!r.success||!r.data)return;this.cuentasEdicion.set(r.data);cuentasListas=true;persistir();},error:()=>{}}));
    this.operaciones.add(this.finanzas.getCategorias().subscribe({next:r=>{if(generation!==this.chatGeneration||!r.success||!r.data)return;this.categories.set(r.data);categoriasListas=true;persistir();},error:()=>{}}));
  }
  private persistirCatalogo():void{
    const uid=this.usuarioChat;if(uid!==null)void this.offline.guardarCatalogo(uid,this.cuentasEdicion(),this.categories()).catch(()=>{});
  }
  private esPedidoNuevo(texto: string): boolean { return /^(?:por favor\s+)?(?:gast[eé]|gasto|pagu[eé]|recib[ií]|ingreso|transfer|reporte|resumen|saldo|top|alertas)/i.test(texto); }
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
    this.capturaSub?.unsubscribe();
    this.limpiarHoldTimer();
    this.stopVoice(true);
  }

  /** Cancela la transcripción en curso y cierra el Processing Sheet */
  cancelarTranscripcion(): void {
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
    const elementos = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href]')];
    const primero = elementos[0], ultimo = elementos.at(-1);
    if (event.shiftKey && document.activeElement === primero) { event.preventDefault(); ultimo?.focus(); }
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
  close(): void { this.limpiarHoldTimer(); this.pointerGesture = false; this.stopVoice(true); if (this.processingStep()) this.cancelarTranscripcion(); this.open.set(false); }
  cambiarModo(mode: CaptureMode): void {
    this.stopVoice(true);
    if (this.processingStep()) this.cancelarTranscripcion();
    this.mode.set(mode);
    this.error.set(''); this.reportError.set('');
    if (mode === 'REPORT') this.loadWeeklyTransactions();
  }

  submit(): void {
    const value = this.content.trim();
    if (!value || this.loading() || this.listening() || this.stopping() || this.confirming() !== null) return;
    if(!this.offline.conexion()){
      try{
        if(!this.cuentasEdicion().length)throw new Error('Abre la app con conexión para guardar primero tus cuentas.');
        const p=prepararCapturaOffline(value,this.cuentasEdicion(),this.categories());
        this.captureTurns.update(turns=>[...turns,{id:++this.captureTurnId,user:value,answer:'Preparado en este dispositivo. Edita la cuenta si falta y confirma antes de enviarlo.',actions:[p],voice:false,engine:'REGLAS'}]);
        this.content='';this.error.set('');this.marcarBorrador();
      }catch(error){this.error.set(error instanceof Error?error.message:'No se pudo preparar el movimiento.');}return;
    }
    this.aiConsentRequired.set(false);
    this.sourceInput.set(value); this.pendingCaptureText.set(value); this.loading.set(true); this.error.set('');
    const capturedByVoice = this.voiceCapture();
    this.processingStep.set('CATEGORIZANDO');
    this.scrollCaptureToBottom();
    this.capturaSub = this.finanzas.capturaRapidaAi(value, this.consent, this.voiceCapture(), this.esPedidoNuevo(value) ? null : this.contexto).subscribe({
      next: response => {
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
        this.captureTurns.update(turns => [...turns, { id: ++this.captureTurnId, user: value, answer: response.data!.answer, actions: proposals, voice: capturedByVoice, report: response.data!.report, suggestions: response.data!.suggestions, engine: response.data!.engine }]);
        this.content = '';
        this.voiceCapture.set(false);
        this.scrollCaptureToBottom();
      },
      error: error => {
        this.processingStep.set(null);
        this.loading.set(false); this.pendingCaptureText.set('');
        const message = this.errorMessage(error);
        if (/no encontr[eé] una regla local/i.test(message)) this.aiConsentRequired.set(true);
        else this.error.set(message);
      }
    });
  }

  permitirIaYReintentar(): void {
    this.consent = true;
    this.aiConsentRequired.set(false);
    this.submit();
  }

  private scrollCaptureToBottom(): void {
    requestAnimationFrame(() => {
      const thread = document.getElementById('capture-chat-thread');
      if (thread) thread.scrollTo({ top: thread.scrollHeight, behavior: 'smooth' });
    });
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
      if(datos['tipo']!==p.data['tipo'])datos['categoriaId']=null;
    }
    this.actualizarPropuesta(p,datos);
  }
  private actualizarPropuesta(proposal:AiActionProposal,datos:Record<string,unknown>):void {
    if (this.confirming()) return;
    if(proposal.local){
      const cuenta=this.cuentasEdicion().find(c=>c.id===datos['cuentaId'])?.nombre??'Cuenta por seleccionar';
      const destino=datos['tipo']==='TRANSFERENCIA'?' a '+(this.cuentasEdicion().find(c=>c.id===datos['cuentaDestinoId'])?.nombre??'destino por seleccionar'):'';
      const p={...proposal,data:{...datos},version:(proposal.version??0)+1,summary:`${datos['tipo']} de ${datos['monto']} · ${cuenta}${destino} · ${datos['fecha']}`};
      this.captureTurns.update(turns=>turns.map(t=>({...t,actions:t.actions.map(previo=>previo.id===p.id?p:previo)})));
      this.editando.set(null);this.marcarBorrador();return;
    }
    if(!this.offline.conexion()){this.error.set('Editar una propuesta del servidor requiere conexión.');return;}
    this.confirming.set(proposal.id); const generation=this.chatGeneration;
    this.operaciones.add(this.finanzas.editarPropuestaAi(proposal.id,datos,proposal.version??0).subscribe({
      next:r => { if(generation!==this.chatGeneration)return; this.confirming.set(null);
        if(!r.success||!r.data){this.error.set(r.message||'No se pudo editar.');return;}
        this.captureTurns.update(turns=>turns.map(t=>({...t,actions:t.actions.map(p=>p.id===proposal.id?r.data!:p)})));
        this.editando.set(null);this.error.set('');
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
          const msg = result.message || 'No se guardó el movimiento.';
          this.error.set(msg);
          this.toast.error(msg, '⚠️ Error al guardar');
          return;
        }
        this.captureTurns.update(turns => turns.map(turn => turn.actions.some(action => action.id === proposal.id)
          ? { ...turn, answer: `${turn.answer}\n${result.message || 'Movimiento guardado.'}`, actions: turn.actions.filter(action => action.id !== proposal.id) }
          : turn));
        window.dispatchEvent(new Event('kaptal-movimiento-guardado'));
        this.toast.success('Movimiento guardado con éxito.', '✅ Listo');
      },
      error: error => {
        if(generation!==this.chatGeneration)return;
        this.confirming.set(null);
        const msg = this.errorConfirmacion(error);
        this.error.set(msg);
        this.toast.error(msg, '⚠️ Error de conexión');
      }
    }));
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
        this.reportMessages.update(messages => [...messages, { role: 'ASSISTANT', content: response.data!.answer, actions }]);
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
    this.cargarCategoriasCaptura();
    const detail = (event as CustomEvent<{ tipo?: string; content?: string }>).detail;
    this.open.set(true);
    this.mode.set('CAPTURE');
    this.error.set('');
    if (detail?.content) { this.usarSugerencia(detail.content); }
    if (detail?.tipo) {
      const label = detail.tipo === 'INGRESO' ? 'ingreso' : detail.tipo === 'TRANSFERENCIA' ? 'transferencia' : 'gasto';
      this.captureHint.set(`Cuéntame qué ${label} quieres registrar.`);
    } else {
      this.captureHint.set('Hoy se usa por defecto. Indica ayer, una fecha o una cuenta si lo necesitas.');
    }
    requestAnimationFrame(() => document.getElementById('quick-capture-text')?.focus());
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
    void this.router.navigate(['/transacciones']).then(() => {
      window.dispatchEvent(new Event('kaptal-abrir-registro-manual'));
    });
  }
  private limpiarHoldTimer(): void { if (this.holdTimer) clearTimeout(this.holdTimer); this.holdTimer = null; }
  readonly stopping = signal(false);
  readonly permisoVoz = signal(false);
  permitirVoz(): void { this.voiceConsent = true; this.permisoVoz.set(false); void this.startVoice(); }
  toggleVoice(): void {
    if (this.listening()) { this.stopVoice(); return; }
    if (!this.consent && !this.voiceConsent) { this.permisoVoz.set(true); return; }
    void this.startVoice();
  }
  private async startVoice(): Promise<void> {
    if (!this.offline.conexion()) { this.error.set('La transcripción necesita conexión. Puedes escribir el movimiento.'); return; }
    if (this.listening() || this.stopping() || this.loading() || this.transcribiendoVoz()) return;
    const generation = ++this.voiceGeneration;
    this.error.set(''); this.voiceMessage.set('');
    if (!this.consent && !this.voiceConsent) { this.error.set('Activa el consentimiento para enviar el audio y transcribirlo.'); return; }
    if (!window.isSecureContext) { this.error.set('Firefox bloquea el micr\u00f3fono porque abriste Kaptal desde una IP local HTTP. En el tel\u00e9fono necesitas abrirlo con HTTPS; en esta computadora puedes usar localhost.'); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      this.error.set('Este navegador no permite grabar audio. Actualiza Firefox o escribe el movimiento.'); return;
    }
    this.discardAudio = false;
    this.audioChunks = [];
    this.cargarCategoriasCaptura();
    this.voiceCapture.set(true);
    this.voiceStartedAt = Date.now(); this.listening.set(true); this.updateTimer();
    this.timer = setInterval(() => {
      this.updateTimer();
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
      this.error.set(name === 'NotAllowedError' ? 'Firefox bloqueó el micrófono. Permite el acceso en los permisos del sitio.' :
        name === 'NotFoundError' ? 'No encontré un micrófono disponible.' : 'No pude iniciar el micrófono. Revisa los permisos del navegador.');
    }
  }
  private stopVoice(discard = false): void {
    ++this.voiceGeneration;
    this.detenerNivelesAudio();
    this.discardAudio ||= discard;
    this.listening.set(false); this.finishTimer();
    const recorder = this.mediaRecorder;
    if (recorder?.state === 'recording') { this.stopping.set(true); recorder.stop(); return; }
    if (this.stopping()) return;
    this.audioStream?.getTracks().forEach(track => track.stop());
    this.audioStream = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
  }
  private procesarGrabacion(mimeType: string): void {
    this.audioStream?.getTracks().forEach(track => track.stop());
    this.audioStream = null;
    this.mediaRecorder = null;
    const audio = new Blob(this.audioChunks, { type: mimeType });
    this.audioChunks = [];
    if (this.discardAudio || !audio.size) return;
    if (!this.consent && !this.voiceConsent) { this.error.set('Activa el consentimiento para transcribir este audio.'); return; }
    // Mostrar Processing Sheet — paso 1: Transcribiendo
    this.transcribiendoVoz.set(true);
    this.processingStep.set('TRANSCRIBIENDO');
    this.voiceMessage.set('Enviando audio para transcribir…');
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
          return;
        }
        this.content = text;
        this.voiceCapture.set(true);
        this.voiceMessage.set('Transcripción lista. Revisa la propuesta antes de guardarla.');
        this.open.set(true);
        this.mode.set('CAPTURE');
        this.submit();
        requestAnimationFrame(() => document.getElementById('quick-capture-text')?.focus());
      },
      error: error => {
        this.processingStep.set(null);
        this.transcribiendoVoz.set(false);
        this.transcripcionSub = null;
        this.voiceMessage.set('');
        const msg = this.errorMessage(error);
        this.error.set(msg);
        this.toast.error(msg, '⚠️ Error de conexión');
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
      this.captureTurns.update(turns=>turns.map(t=>({...t,actions:t.actions.filter(p=>p.id!==proposal.id)})));
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
