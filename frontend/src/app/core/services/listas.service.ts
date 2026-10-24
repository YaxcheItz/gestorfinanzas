import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { ApiResponse } from '../models/auth.models';
import { ListaFinanciera, ListaPayload } from '../models/listas.models';
import { ListaContextoService } from './lista-contexto.service';
import { getApiBaseUrl } from './api-base-url';

@Injectable({ providedIn: 'root' })
export class ListasService {
  private readonly http = inject(HttpClient);
  readonly contexto = inject(ListaContextoService);
  readonly abierta = signal(false);
  private readonly url = `${getApiBaseUrl()}/listas`;
  private version = 0;
  iniciar(usuarioId: number): void { this.contexto.iniciar(usuarioId); this.recargar(); }
  limpiar(): void { this.version++; this.abierta.set(false); this.contexto.limpiar(); }
  recargar(): void {
    const version = ++this.version, usuario = this.contexto.usuarioId();
    if (usuario === null) return;
    this.contexto.cargando.set(true); this.contexto.error.set('');
    this.http.get<ApiResponse<ListaFinanciera[]>>(this.url).subscribe({
      next: response => {
        if (version !== this.version || usuario !== this.contexto.usuarioId()) return;
        this.contexto.cargando.set(false);
        if (response.success && Array.isArray(response.data)) this.contexto.aplicar(response.data);
        else this.contexto.error.set('No pudimos cargar tus listas.');
      },
      error: () => { if (version === this.version && usuario === this.contexto.usuarioId()) { this.contexto.cargando.set(false); this.contexto.error.set('Sin conexión a tus listas. Conservamos la selección guardada en este dispositivo.'); } }
    });
  }
  crear(payload: ListaPayload) { return this.http.post<ApiResponse<ListaFinanciera>>(this.url, payload); }
  editar(id: number, payload: ListaPayload) { return this.http.put<ApiResponse<ListaFinanciera>>(`${this.url}/${id}`, payload); }
  archivar(id: number, archivada: boolean) { return this.http.patch<ApiResponse<void>>(`${this.url}/${id}/estado`, { archivada }); }
  invitar(id: number, rol: 'EDITOR' | 'LECTOR') { return this.http.post<ApiResponse<{ codigo: string; vence: string; rol: string }>>(`${this.url}/${id}/invitacion`, { rol }); }
  revocar(id: number) { return this.http.delete<ApiResponse<void>>(`${this.url}/${id}/invitacion`); }
  quitar(id: number, miembro: number) { return this.http.delete<ApiResponse<void>>(`${this.url}/${id}/miembros/${miembro}`); }
  cambiarRol(id: number, miembro: number, rol: 'EDITOR' | 'LECTOR') { return this.http.patch<ApiResponse<ListaFinanciera>>(`${this.url}/${id}/miembros/${miembro}/rol`, { rol }); }
  unirse(codigo: string) { return this.http.post<ApiResponse<ListaFinanciera>>(`${this.url}/unirse`, { codigo }); }
  etiquetas(id: number) { return this.http.get<ApiResponse<string[]>>(`${this.url}/${id}/etiquetas`); }
}
