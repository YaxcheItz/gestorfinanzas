import { AfterViewInit, Component, DestroyRef, ElementRef, ViewChild, effect, inject, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ListasService } from '../../../core/services/listas.service';
import { ListaFinanciera, ListaPayload } from '../../../core/models/listas.models';
import { ApiResponse } from '../../../core/models/auth.models';

@Component({
  selector: 'app-listas-sheet',
  imports: [FormsModule],
  templateUrl: './listas-sheet.component.html',
  styles: `
  dialog{width:min(calc(100% - 24px),480px);max-height:85dvh;margin:auto auto 0;padding:24px 20px calc(24px + env(safe-area-inset-bottom));border:0;border-radius:30px 30px 0 0;background:var(--kaptal-surface);color:var(--kaptal-content);overflow:auto}dialog::backdrop{background:rgb(0 0 0/.3);backdrop-filter:blur(8px)}header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:24px}h2{font-size:28px;font-weight:700;letter-spacing:-.04em}header button,.opciones{width:44px;height:44px;border-radius:50%;background:var(--kaptal-surface-subtle);flex-shrink:0}button{min-height:44px;touch-action:manipulation}.fila{display:flex;align-items:center;gap:8px;margin:8px 0}.elegir{display:flex;align-items:center;gap:12px;flex:1;min-width:0;text-align:left;padding:8px 0}.emoji{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:#EFE4CC;font-size:24px;flex-shrink:0}.texto{min-width:0;flex:1}.texto strong,.texto small{display:block;overflow-wrap:anywhere}strong{font-size:16px;font-weight:600}small,p{font-size:13px;color:var(--kaptal-content-muted);line-height:1.5}.check{color:var(--kaptal-brand)}.herramientas,.secundario{width:100%;border-radius:16px;background:var(--kaptal-surface-subtle);padding:12px;margin-top:12px;text-align:left}label{display:grid;gap:8px;font-size:14px;margin:16px 0}input,select,textarea{width:100%;min-width:0;min-height:48px;padding:12px;border:1px solid var(--kaptal-border);border-radius:14px;background:var(--kaptal-surface-subtle);color:var(--kaptal-content);font:inherit;font-size:16px;box-sizing:border-box}.guardar{width:100%;border-radius:16px;min-height:52px;background:var(--kaptal-brand);color:var(--kaptal-on-brand);font-weight:600;margin-top:12px}.error,.peligro{color:var(--kaptal-expense)}.error{margin:12px 0}button:disabled{opacity:.5}.miembro{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0}.miembro span{min-width:0;overflow-wrap:anywhere}.codigo{font-family:ui-monospace,monospace;font-size:13px;resize:vertical}details{margin-top:16px}summary{min-height:44px;align-content:center;font-size:14px;cursor:pointer}button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--kaptal-focus);outline-offset:3px}
  `,
})
export class ListasSheetComponent implements AfterViewInit {
  @ViewChild('sheet') private sheet?: ElementRef<HTMLDialogElement>;
  @ViewChild('codigo') private campoCodigo?: ElementRef<HTMLTextAreaElement>;
  readonly servicio = inject(ListasService);
  readonly contexto = this.servicio.contexto;
  readonly herramientas = output<void>();
  readonly editando = signal<ListaFinanciera | 'NUEVA' | null>(null);
  readonly ocupada = signal(false);
  readonly error = signal('');
  readonly invitacion = signal<{ codigo: string; vence: string; rol: string } | null>(null);
  readonly mostrarUnion = signal(false);
  readonly confirmarArchivo = signal(false);
  private readonly destroyRef = inject(DestroyRef);
  datos: ListaPayload = { nombre: '', emoji: '🌿', moneda: 'MXN' };
  rol: 'EDITOR' | 'LECTOR' = 'EDITOR';
  codigoUnion = '';
  constructor() {
    effect(() => { const abierta = this.servicio.abierta(); untracked(() => abierta ? this.mostrar() : this.sheet?.nativeElement.close()); });
  }
  ngAfterViewInit(): void { this.mostrar(); }
  private mostrar(): void {
    if (this.servicio.abierta() && this.sheet && !this.sheet.nativeElement.open) {
      this.volver(); this.sheet.nativeElement.showModal();
    }
  }
  cerrar(): void { if (!this.ocupada()) this.sheet?.nativeElement.close(); }
  alCerrar(): void { this.servicio.abierta.set(false); this.invitacion.set(null); }
  cancelar(event: Event): void { if (this.ocupada()) event.preventDefault(); }
  fondo(event: MouseEvent): void {
    const dialog = this.sheet?.nativeElement; if (event.target !== dialog || !dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) this.cerrar();
  }
  seleccionar(lista: ListaFinanciera): void { this.contexto.seleccionar(lista.id); this.cerrar(); }
  editar(lista: ListaFinanciera | 'NUEVA'): void {
    this.editando.set(lista); this.error.set(''); this.invitacion.set(null); this.confirmarArchivo.set(false);
    this.datos = lista === 'NUEVA' ? { nombre: '', emoji: '🌿', moneda: this.contexto.activa()?.moneda ?? 'MXN' } : { nombre: lista.nombre, emoji: lista.emoji, moneda: lista.moneda };
  }
  volver(): void { this.editando.set(null); this.mostrarUnion.set(false); this.error.set(''); this.invitacion.set(null); this.confirmarArchivo.set(false); }
  seleccionEditada(): ListaFinanciera | null { const lista = this.editando(); return lista && lista !== 'NUEVA' ? lista : null; }
  guardar(): void {
    if (!this.datos.nombre.trim() || !this.datos.emoji.trim()) { this.error.set('Escribe un nombre y un emoji.'); return; }
    const actual = this.seleccionEditada();
    this.ejecutar(actual ? this.servicio.editar(actual.id, this.datos) : this.servicio.crear(this.datos), response => {
      this.contexto.aplicar([...this.contexto.listas().filter(l => l.id !== response.id), response]);
      this.contexto.seleccionar(response.id); this.volver();
    });
  }
  archivar(): void {
    const actual = this.seleccionEditada(); if (!actual) return;
    this.ejecutar(this.servicio.archivar(actual.id, !actual.archivada), () => {
      if (this.contexto.activaId() === actual.id && !actual.archivada) {
        const personal = this.contexto.listas().find(l => l.personal); if (personal) this.contexto.seleccionar(personal.id);
      }
      this.volver();
    });
  }
  invitar(): void { const actual = this.seleccionEditada(); if (actual) this.ejecutar(this.servicio.invitar(actual.id, this.rol), i => this.invitacion.set(i)); }
  revocar(): void { const actual = this.seleccionEditada(); if (actual) this.ejecutar(this.servicio.revocar(actual.id), () => this.invitacion.set(null)); }
  quitar(id: number): void { const actual = this.seleccionEditada(); if (actual) this.ejecutar(this.servicio.quitar(actual.id, id), () => this.volver()); }
  unirse(): void {
    this.ejecutar(this.servicio.unirse(this.codigoUnion.trim()), lista => {
      this.contexto.aplicar([...this.contexto.listas().filter(l => l.id !== lista.id), lista]); this.contexto.seleccionar(lista.id); this.codigoUnion = ''; this.volver();
    });
  }
  async copiar(): Promise<void> {
    const codigo = this.invitacion()?.codigo; if (!codigo) return;
    try { await navigator.clipboard.writeText(codigo); }
    catch { this.campoCodigo?.nativeElement.focus(); this.campoCodigo?.nativeElement.select(); this.error.set('Selecciona el código y cópialo para compartirlo.'); }
  }
  abrirHerramientas(): void { this.cerrar(); this.herramientas.emit(); }
  private ejecutar<T>(request: Observable<ApiResponse<T>>, listo: (data: T) => void): void {
    if (this.ocupada()) return;
    const usuario = this.contexto.usuarioId(); this.ocupada.set(true); this.error.set('');
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        this.ocupada.set(false); if (usuario !== this.contexto.usuarioId()) return;
        if (!response.success) { this.error.set(response.message || 'No se pudo completar.'); return; }
        listo(response.data); this.servicio.recargar();
      },
      error: error => { this.ocupada.set(false); if (usuario === this.contexto.usuarioId()) this.error.set(error.error?.message || 'No se pudo guardar. Revisa la conexión y vuelve a intentar.'); }
    });
  }
}
