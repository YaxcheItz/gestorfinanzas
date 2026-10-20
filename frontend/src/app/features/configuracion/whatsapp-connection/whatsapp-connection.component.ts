import {Component, DestroyRef, inject, OnInit, signal} from '@angular/core';
import {DOCUMENT, DatePipe} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {finalize} from 'rxjs';
import {WhatsappConnectionService, WhatsappConnection, WhatsappChallenge} from '../../../core/services/whatsapp-connection.service';
import {ConfirmDialogService} from '../../../core/services/confirm-dialog.service';
import {mensajeDeError} from '../../../core/utils/mensaje-error';

@Component({
  selector: 'app-whatsapp-connection',
  imports: [FormsModule, DatePipe],
  template: `
    <section class="wa" aria-labelledby="wa-title">
      <header><span class="emoji" aria-hidden="true">💬</span><div><h3 id="wa-title">WhatsApp</h3><p>Consulta tu dinero y registra movimientos por mensaje.</p></div></header>
      @if (cargando() && !estado()) {<p role="status">Consultando conexión…</p>}
      @if (error()) {<p class="error" role="alert">{{error()}}</p>}
      @if (estado(); as s) {
        @if (!s.disponible) {
          <p>La conexión desde la app se está preparando. Tu configuración actual no cambia.</p>
        } @else {
          @if (s.estado === 'VERIFICADA') {
            <p class="status" role="status">{{s.operativo ? 'Conectado' : 'Número verificado'}} · {{s.telefono}}</p>
            @if (!s.operativo) {<p>El registro por mensajes estará disponible cuando termine la activación del servicio.</p>}
            <div class="guide-box">
              <h4>Comandos en WhatsApp</h4>
              <ul>
                <li>💬 <strong>Registrar:</strong> «Gasté 180 en comida con MiCuenta»</li>
                <li>🎤 <strong>Nota de voz:</strong> Envíala y responde «confirmar»</li>
                <li>↩️ <strong>Deshacer:</strong> Escribe «deshacer» para revisar el último movimiento; confirma antes de eliminarlo</li>
                <li>📊 <strong>Consultar:</strong> «saldo» o «resumen de este mes»</li>
              </ul>
            </div>
            <button type="button" role="switch" class="secondary" [attr.aria-checked]="s.guardarAutomaticamente" (click)="preferencias(!s.guardarAutomaticamente)" [disabled]="ocupado()">Autoguardado: {{s.guardarAutomaticamente ? 'Activado' : 'Desactivado'}}</button>
            <p class="hint">Los movimientos ambiguos o parecidos a otros quedan en Avisos para revisarlos.</p>
            <button type="button" class="secondary" (click)="desconectar()" [disabled]="ocupado()">Desconectar WhatsApp</button>
          } @else {
            <form (ngSubmit)="iniciar()">
              <label>Número de WhatsApp<input name="wa-number" type="tel" autocomplete="tel" inputmode="tel" [(ngModel)]="telefono" required pattern="[+][1-9][0-9]{7,14}" maxlength="16" placeholder="+525512345678" [disabled]="ocupado()" /></label>
              <p class="hint">Incluye + y el código de país. El número debe ser tuyo.</p>
              <label class="check"><input type="checkbox" name="wa-consent" [(ngModel)]="consentimiento" [disabled]="ocupado()"/>Permito consultar y registrar movimientos de mi cuenta desde este número.</label>
              <label class="check"><input type="checkbox" name="wa-auto" [(ngModel)]="automatico" [disabled]="ocupado()"/>Guardar automáticamente los movimientos reconocidos</label>
              <p class="hint">Si lo desactivas, las propuestas quedan en Avisos para confirmar.</p>
              <button type="submit" [disabled]="ocupado() || !consentimiento || !numeroValido()">{{ocupado() ? 'Preparando…' : s.estado === 'PENDIENTE' ? 'Generar otro enlace' : 'Conectar WhatsApp'}}</button>
            </form>
            @if (s.estado === 'PENDIENTE') {
              <div class="pending" role="status"><strong>Falta enviar el mensaje de verificación</strong><p>Abre WhatsApp y envía el mensaje tal como aparece. El enlace vence a las {{s.vence | date:'shortTime'}}.</p>
                @if (desafio(); as d) {<a [href]="d.urlWhatsapp" target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a>}
                @else {<p>Si cerraste esta pantalla, genera otro enlace para continuar.</p>}
              </div>
              <button type="button" class="secondary" (click)="desconectar()" [disabled]="ocupado()">Cancelar vinculación</button>
            }
            @if (s.estado === 'CADUCADA') {<p role="status">El enlace venció. Genera uno nuevo para verificar tu número.</p>}
          }
        }
      }
      <button type="button" class="quiet" (click)="actualizar()" [disabled]="cargando() || ocupado()">{{cargando() ? 'Consultando…' : 'Actualizar estado'}}</button>
    </section>
  `,
  styles: `
    :host{display:block;min-width:0}.wa{margin-top:24px;padding-top:24px;border-top:1px solid var(--kaptal-border,#eee);color:var(--kaptal-content,#111)}
    header{display:flex;align-items:center;gap:12px;margin-bottom:16px}.emoji{display:grid;place-items:center;width:44px;height:44px;background:#CBEFDE;border-radius:50%;flex-shrink:0}
    h3{font-size:18px;font-weight:650;margin:0}p{font-size:14px;line-height:1.5;color:var(--kaptal-content-muted,#737373);margin:8px 0}.status{color:var(--kaptal-content,#111);font-weight:600}.hint{font-size:12px}
    form{display:grid;gap:12px}label{font-size:14px;display:grid;gap:8px}input[type=tel]{font-size:16px;min-height:48px;padding:12px;border:1px solid var(--kaptal-border,#ddd);border-radius:16px;background:var(--kaptal-surface-subtle,#f7f7f7);color:inherit;width:100%;box-sizing:border-box}
    .check{display:flex;align-items:flex-start;gap:12px;min-height:44px;line-height:1.5}.check input{width:20px;height:20px;flex-shrink:0;margin-top:2px;accent-color:#b9413c}
    button,a{font-size:14px;font-weight:600;min-height:44px;padding:12px 20px;border-radius:999px;border:0;background:#b9413c;color:white;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;touch-action:manipulation}
    .guide-box{margin:16px 0;padding:16px;background:var(--kaptal-surface-subtle,#f7f7f7);border-radius:16px;border:1px solid var(--kaptal-border,#eee)}.guide-box h4{margin:0 0 8px;font-size:14px;font-weight:600;color:var(--kaptal-content,#111)}.guide-box ul{margin:0;padding-left:18px;font-size:13px;line-height:1.6;color:var(--kaptal-content-muted,#555)}.guide-box li{margin-bottom:4px}
    button:disabled{opacity:.5;cursor:default}.secondary{background:var(--kaptal-surface-subtle,#f2f2f2);color:inherit;margin-top:8px}.quiet{background:transparent;color:inherit;padding-left:0;margin-top:8px}.pending{padding:16px;background:var(--kaptal-surface-subtle,#f7f7f7);border-radius:20px;margin-top:16px}.pending strong{font-size:14px}.error{color:#b42318}button:focus-visible,a:focus-visible,input:focus-visible{outline:2px solid #b9413c;outline-offset:3px}
  `,
})
export class WhatsappConnectionComponent implements OnInit {
  private readonly api = inject(WhatsappConnectionService);
  private readonly destroy = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly confirm = inject(ConfirmDialogService);
  readonly estado = signal<WhatsappConnection | null>(null);
  readonly desafio = signal<WhatsappChallenge | null>(null);
  readonly cargando = signal(false);
  readonly ocupado = signal(false);
  readonly error = signal<string | null>(null);
  telefono = '';
  consentimiento = false;
  automatico = false;
  private timer?: ReturnType<typeof setInterval>;
  constructor() {this.destroy.onDestroy(() => {if(this.timer)clearInterval(this.timer);});}
  ngOnInit() {this.actualizar();}
  numeroValido() {return /^\+[1-9][0-9]{7,14}$/.test(this.telefono);}
  private aplicar(s: WhatsappConnection) {
    this.estado.set(s);
    if (s.estado !== 'PENDIENTE') {this.desafio.set(null);if(this.timer)clearInterval(this.timer);this.timer=undefined;}
    else if (!this.timer) this.timer=setInterval(() => {
      const current=this.estado();
      if(current?.vence&&Date.parse(current.vence)<=Date.now()){this.aplicar({...current,estado:'CADUCADA'});return;}
      if(!this.document.hidden&&!this.cargando()&&!this.ocupado())this.actualizar();
    },3000);
  }
  actualizar() {
    if(this.cargando())return;
    this.cargando.set(true);this.error.set(null);
    this.api.estado().pipe(takeUntilDestroyed(this.destroy),finalize(()=>this.cargando.set(false))).subscribe({
      next:r=>{if(r.success&&r.data)this.aplicar(r.data);else this.error.set(r.message||'No se pudo consultar la conexión.');},
      error:e=>this.error.set(mensajeDeError(e,'No se pudo consultar la conexión.'))
    });
  }
  iniciar() {
    if(this.ocupado()||!this.consentimiento||!this.numeroValido())return;
    this.ocupado.set(true);this.error.set(null);this.desafio.set(null);
    this.api.iniciar(this.telefono,this.automatico).pipe(takeUntilDestroyed(this.destroy),finalize(()=>this.ocupado.set(false))).subscribe({
      next:r=>{
        let valid=false;try{const u=new URL(r.data?.urlWhatsapp??'');valid=u.protocol==='https:'&&u.hostname==='wa.me'&&/^\/[1-9][0-9]{7,14}$/.test(u.pathname);}catch{/* Reject malformed provider links. */}
        if(!r.success||!valid){this.error.set('No se pudo preparar el enlace de WhatsApp.');return;}
        this.desafio.set(r.data);this.actualizar();
      },error:e=>this.error.set(mensajeDeError(e,'No se pudo preparar la vinculación.'))
    });
  }
  async desconectar() {
    if(this.ocupado())return;
    const pending=this.estado()?.estado==='PENDIENTE';
    if(!pending&&!await this.confirm.confirm({title:'¿Desconectar WhatsApp?',message:'Este número dejará de consultar y registrar movimientos. Tus datos se conservan.',confirmText:'Desconectar',type:'warning'}))return;
    if(this.destroy.destroyed)return;
    this.ocupado.set(true);this.error.set(null);
    this.api.desconectar().pipe(takeUntilDestroyed(this.destroy),finalize(()=>this.ocupado.set(false))).subscribe({next:r=>{if(r.success){this.aplicar(r.data);this.consentimiento=false;this.telefono='';}else this.error.set(r.message);},error:e=>this.error.set(mensajeDeError(e,'No se pudo desconectar WhatsApp.'))});
  }
  preferencias(value: boolean) {
    if(this.ocupado())return;this.ocupado.set(true);this.error.set(null);
    this.api.preferencias(value).pipe(takeUntilDestroyed(this.destroy),finalize(()=>this.ocupado.set(false))).subscribe({next:r=>{if(r.success)this.aplicar(r.data);else this.error.set(r.message);},error:e=>this.error.set(mensajeDeError(e,'No se pudieron guardar las preferencias.'))});
  }
}
