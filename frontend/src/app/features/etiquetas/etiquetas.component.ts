import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FinanzasService } from '../../core/services/finanzas.service';
import { mensajeDeError } from '../../core/utils/mensaje-error';

@Component({selector:'app-etiquetas', standalone:true, imports:[FormsModule], template:`
<main class="finance-page max-w-2xl mx-auto px-4 py-6 space-y-5">
  <header><h1 class="text-2xl font-bold">Mis etiquetas</h1><p class="text-sm text-slate-500 mt-1">Crea etiquetas para organizarte.</p></header>
  <form (ngSubmit)="crear()" class="flex flex-wrap gap-2">
    <label for="etiqueta-nueva" class="sr-only">Nombre de la etiqueta</label>
    <input id="etiqueta-nueva" name="nombre" [(ngModel)]="nombre" maxlength="32" placeholder="Nueva etiqueta" class="min-h-11 flex-1 min-w-0 rounded-xl border border-slate-300 px-3" />
    <button type="submit" [disabled]="ocupado()" class="min-h-11 rounded-xl bg-emerald-700 px-4 font-semibold text-white">Añadir</button>
  </form>
  @if (error()) {<div role="alert" class="flex flex-wrap items-center gap-3 text-rose-700"><span>{{error()}}</span>@if (errorCarga()) {<button type="button" (click)="cargar()" [disabled]="cargando()" class="min-h-11 font-semibold underline">Reintentar</button>}</div>}
  <p class="text-sm text-slate-500">Eliminar una etiqueta de esta lista no cambia los movimientos anteriores.</p>
  @if (cargando()) {<div class="finance-loading-card" role="status" aria-label="Cargando etiquetas"><span class="loading-placeholder" aria-hidden="true"></span></div>} @else if (!errorCarga() && !etiquetas().length) {<p class="rounded-2xl border p-5 text-slate-500">Aún no tienes etiquetas en tu lista.</p>}
  @if (!cargando() && !errorCarga()) {<ul class="space-y-2">@for (etiqueta of etiquetas(); track etiqueta.id) {
    <li class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2">
      <span class="font-semibold break-all">#{{etiqueta.nombre}}</span>
      <button type="button" (click)="eliminar(etiqueta)" [disabled]="ocupado()" [attr.aria-label]="'Eliminar etiqueta ' + etiqueta.nombre" class="min-h-11 px-3 text-rose-700 font-semibold">Eliminar</button>
    </li>
  }</ul>}
</main>`})
export class EtiquetasComponent {
  private readonly api=inject(FinanzasService);
  readonly etiquetas=signal<{id:number; nombre:string}[]>([]);
  readonly error=signal(''); readonly errorCarga=signal(false); readonly cargando=signal(true); readonly ocupado=signal(false);
  nombre=''; private versionCarga=0;
  constructor() { this.cargar(); }
  cargar(): void { const version=++this.versionCarga;this.cargando.set(true);this.errorCarga.set(false);this.error.set('');this.api.getEtiquetasPersonales().subscribe({next:r=>{if(version!==this.versionCarga)return;if(!r.success){this.errorCarga.set(true);this.error.set(r.message || 'No se pudieron cargar las etiquetas.');}else this.etiquetas.set(r.data??[]);this.cargando.set(false);},error:e=>{if(version!==this.versionCarga)return;this.errorCarga.set(true);this.error.set(mensajeDeError(e,'No se pudieron cargar las etiquetas.'));this.cargando.set(false);}}); }
  crear(): void {
    const nombre=this.nombre.trim(); if(!nombre) {this.error.set('Escribe una etiqueta.');return;}
    this.error.set('');this.ocupado.set(true);
    this.api.crearEtiquetaPersonal(nombre).subscribe({next:r=>{this.ocupado.set(false);if(!r.success){this.error.set(r.message);return;}this.nombre='';this.cargar();},error:e=>{this.ocupado.set(false);this.error.set(mensajeDeError(e,'No se pudo crear la etiqueta.'));}});
  }
  eliminar(etiqueta:{id:number; nombre:string}): void {
    if(!window.confirm(`¿Eliminar la etiqueta #${etiqueta.nombre} de esta lista?`))return;
    this.error.set('');this.ocupado.set(true);this.api.eliminarEtiquetaPersonal(etiqueta.id).subscribe({next:r=>{this.ocupado.set(false);if(!r.success){this.error.set(r.message);return;}this.cargar();},error:e=>{this.ocupado.set(false);this.error.set(mensajeDeError(e,'No se pudo eliminar la etiqueta.'));}});
  }
}
