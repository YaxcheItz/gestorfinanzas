import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/auth.models';
import {
  AiChatMessage,
  AiChatResponse,
  AiConnectionStatus,
  AiVerificationResult
} from '../models/ai.models';
import {
    AuditoriaTransaccion,
    AsientoContable,
    BackfillLibroDiario,
    LibroDiarioFiltro,
  Categoria,
  CategoriaPayload,
  Cuenta,
  CuentaPayload,
  DashboardComparacion,
  DashboardAnalitica,
  DashboardResumen,
  PlantillaRecurrente,
  PageResponse,
  Presupuesto,
  PresupuestoPayload,
  PresupuestoResumen,
  Transaccion,
  TransaccionFiltro,
  TransaccionPayload
} from '../models/finanzas.models';
import { getApiBaseUrl } from './api-base-url';

@Injectable({
  providedIn: 'root'
})
export class FinanzasService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = getApiBaseUrl();

  getAiConnectionStatus(): Observable<ApiResponse<AiConnectionStatus>> {
    return this.http.get<ApiResponse<AiConnectionStatus>>(`${this.baseUrl}/asistente/estado`);
  }

  verifyAiConnection(): Observable<ApiResponse<AiVerificationResult>> {
    return this.http.post<ApiResponse<AiVerificationResult>>(`${this.baseUrl}/asistente/verificar`, {});
  }

  chatWithAi(messages: AiChatMessage[]): Observable<ApiResponse<AiChatResponse>> {
    return this.http.post<ApiResponse<AiChatResponse>>(`${this.baseUrl}/asistente/chat`, { messages });
  }

  confirmAiAction(proposalId: string): Observable<ApiResponse<{ completed: boolean }>> {
    return this.http.post<ApiResponse<{ completed: boolean }>>(
      `${this.baseUrl}/asistente/acciones/${encodeURIComponent(proposalId)}/confirmar`,
      {}
    );
  }

  // --- Cuentas ---
  getCuentas(incluirInactivas = false): Observable<ApiResponse<Cuenta[]>> {
    const params = incluirInactivas ? new HttpParams().set('incluirInactivas', 'true') : undefined;
    return this.http.get<ApiResponse<Cuenta[]>>(`${this.baseUrl}/cuentas`, { params });
  }

  crearCuenta(payload: CuentaPayload): Observable<ApiResponse<Cuenta>> {
    return this.http.post<ApiResponse<Cuenta>>(`${this.baseUrl}/cuentas`, payload);
  }

  actualizarCuenta(id: number, payload: CuentaPayload): Observable<ApiResponse<Cuenta>> {
    return this.http.put<ApiResponse<Cuenta>>(`${this.baseUrl}/cuentas/${id}`, payload);
  }

  desactivarCuenta(id: number): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.baseUrl}/cuentas/${id}/desactivar`, {});
  }

  eliminarCuenta(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/cuentas/${id}`);
  }

  reactivarCuenta(id: number): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.baseUrl}/cuentas/${id}/reactivar`, {});
  }

  // --- Categorías ---
  getCategorias(): Observable<ApiResponse<Categoria[]>> {
    return this.http.get<ApiResponse<Categoria[]>>(`${this.baseUrl}/categorias`);
  }

  getMisCategorias(): Observable<ApiResponse<Categoria[]>> {
    return this.http.get<ApiResponse<Categoria[]>>(`${this.baseUrl}/categorias/mias`);
  }

  crearCategoria(payload: CategoriaPayload): Observable<ApiResponse<Categoria>> {
    return this.http.post<ApiResponse<Categoria>>(`${this.baseUrl}/categorias`, payload);
  }

  actualizarCategoria(id: number, payload: CategoriaPayload): Observable<ApiResponse<Categoria>> {
    return this.http.put<ApiResponse<Categoria>>(`${this.baseUrl}/categorias/${id}`, payload);
  }

  cambiarEstadoCategoria(id: number, activa: boolean): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.baseUrl}/categorias/${id}/estado`, {}, {
      params: new HttpParams().set('activa', activa)
    });
  }

  // --- Transacciones ---
  getTransaccionesRecientes(): Observable<ApiResponse<Transaccion[]>> {
    return this.http.get<ApiResponse<Transaccion[]>>(`${this.baseUrl}/transacciones/recientes`);
  }

  getTransaccionesPaginadas(filtros?: TransaccionFiltro, page = 0, size = 20): Observable<ApiResponse<PageResponse<Transaccion>>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (filtros) {
      if (filtros.id != null) params = params.set('id', filtros.id.toString());
      if (filtros.tipo) params = params.set('tipo', filtros.tipo);
      if (filtros.cuentaId != null) params = params.set('cuentaId', filtros.cuentaId.toString());
      if (filtros.categoriaId != null) params = params.set('categoriaId', filtros.categoriaId.toString());
      if (filtros.fechaInicio) params = params.set('fechaInicio', filtros.fechaInicio);
      if (filtros.fechaFin) params = params.set('fechaFin', filtros.fechaFin);
      if (filtros.busqueda && filtros.busqueda.trim()) params = params.set('busqueda', filtros.busqueda.trim());
    }

    return this.http.get<ApiResponse<PageResponse<Transaccion>>>(`${this.baseUrl}/transacciones`, { params });
  }

  exportarTransaccionesCsv(filtros?: TransaccionFiltro): Observable<HttpResponse<Blob>> {
    let params = new HttpParams();
    if (filtros) {
      if (filtros.id != null) params = params.set('id', filtros.id.toString());
      if (filtros.tipo) params = params.set('tipo', filtros.tipo);
      if (filtros.cuentaId != null) params = params.set('cuentaId', filtros.cuentaId.toString());
      if (filtros.categoriaId != null) params = params.set('categoriaId', filtros.categoriaId.toString());
      if (filtros.fechaInicio) params = params.set('fechaInicio', filtros.fechaInicio);
      if (filtros.fechaFin) params = params.set('fechaFin', filtros.fechaFin);
      if (filtros.busqueda?.trim()) params = params.set('busqueda', filtros.busqueda.trim());
    }
    return this.http.get(`${this.baseUrl}/transacciones/exportar`, {
      params,
      observe: 'response',
      responseType: 'blob'
    });
  }

  crearTransaccion(payload: TransaccionPayload): Observable<ApiResponse<Transaccion>> {
    return this.http.post<ApiResponse<Transaccion>>(`${this.baseUrl}/transacciones`, payload);
  }

  getTransaccion(id: number): Observable<ApiResponse<Transaccion>> {
    return this.http.get<ApiResponse<Transaccion>>(`${this.baseUrl}/transacciones/${id}`);
  }

  actualizarTransaccion(id: number, payload: TransaccionPayload): Observable<ApiResponse<Transaccion>> {
    return this.http.put<ApiResponse<Transaccion>>(`${this.baseUrl}/transacciones/${id}`, payload);
  }

  eliminarTransaccion(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/transacciones/${id}`);
  }

  // --- Dashboard Consolidado ---
  getDashboardResumen(mes?: number, anio?: number): Observable<ApiResponse<DashboardResumen>> {
    let params = new HttpParams();
    if (mes) params = params.set('mes', mes);
    if (anio) params = params.set('anio', anio);
    return this.http.get<ApiResponse<DashboardResumen>>(`${this.baseUrl}/dashboard/resumen`, { params });
  }

  getDashboardAnalitica(): Observable<ApiResponse<DashboardAnalitica>> {
    return this.http.get<ApiResponse<DashboardAnalitica>>(`${this.baseUrl}/dashboard/analitica`);
  }

  getDashboardComparacion(mes?: number, anio?: number): Observable<ApiResponse<DashboardComparacion>> {
    let params = new HttpParams();
    if (mes) params = params.set('mes', mes);
    if (anio) params = params.set('anio', anio);
    return this.http.get<ApiResponse<DashboardComparacion>>(`${this.baseUrl}/dashboard/comparacion`, { params });
  }

  getPlantillasRecurrentes(): Observable<ApiResponse<PlantillaRecurrente[]>> {
    return this.http.get<ApiResponse<PlantillaRecurrente[]>>(`${this.baseUrl}/recurrencias`);
  }

  descargarRespaldo(): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.baseUrl}/perfil/respaldo`, {
      observe: 'response',
      responseType: 'blob'
    });
  }

  getHistorialTransacciones(page = 0, size = 20): Observable<ApiResponse<PageResponse<AuditoriaTransaccion>>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<ApiResponse<PageResponse<AuditoriaTransaccion>>>(
      `${this.baseUrl}/perfil/historial`,
      { params }
    );
  }

  getLibroDiario(page = 0, size = 20, filtros: LibroDiarioFiltro = {}): Observable<ApiResponse<PageResponse<AsientoContable>>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filtros.desde) params = params.set('desde', filtros.desde);
    if (filtros.hasta) params = params.set('hasta', filtros.hasta);
    if (filtros.tipoEvento) params = params.set('tipoEvento', filtros.tipoEvento);
    if (filtros.tipoMovimiento) params = params.set('tipoMovimiento', filtros.tipoMovimiento);
    if (filtros.cuentaId != null) params = params.set('cuentaId', filtros.cuentaId);
    return this.http.get<ApiResponse<PageResponse<AsientoContable>>>(
      `${this.baseUrl}/libro-diario`,
      { params }
    );
  }

  getResumenBackfillLibroDiario(): Observable<ApiResponse<BackfillLibroDiario>> {
    return this.http.get<ApiResponse<BackfillLibroDiario>>(`${this.baseUrl}/libro-diario/backfill`);
  }

  ejecutarBackfillLibroDiario(): Observable<ApiResponse<BackfillLibroDiario>> {
    return this.http.post<ApiResponse<BackfillLibroDiario>>(
      `${this.baseUrl}/libro-diario/backfill`, { confirmar: true }
    );
  }

  registrarMovimientoRecurrente(id: number): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/recurrencias/${id}/registrar`, {});
  }

  cambiarEstadoPlantillaRecurrente(id: number, activa: boolean): Observable<ApiResponse<PlantillaRecurrente>> {
    return this.http.patch<ApiResponse<PlantillaRecurrente>>(
      `${this.baseUrl}/recurrencias/${id}/estado`,
      {},
      { params: new HttpParams().set('activa', activa) }
    );
  }

  eliminarPlantillaRecurrente(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/recurrencias/${id}`);
  }

  // --- Presupuestos ---
  getPresupuestos(mes?: number, anio?: number): Observable<ApiResponse<PresupuestoResumen>> {
    let params = new HttpParams();
    if (mes) params = params.set('mes', mes);
    if (anio) params = params.set('anio', anio);
    return this.http.get<ApiResponse<PresupuestoResumen>>(`${this.baseUrl}/presupuestos`, { params });
  }

  guardarPresupuesto(payload: PresupuestoPayload): Observable<ApiResponse<Presupuesto>> {
    return this.http.post<ApiResponse<Presupuesto>>(`${this.baseUrl}/presupuestos`, payload);
  }

  eliminarPresupuesto(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/presupuestos/${id}`);
  }
}
