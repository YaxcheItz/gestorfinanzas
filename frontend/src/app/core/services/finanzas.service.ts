import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/auth.models';
import {
  Categoria,
  CategoriaPayload,
  Cuenta,
  CuentaPayload,
  DashboardAnalitica,
  DashboardResumen,
  PageResponse,
  Presupuesto,
  PresupuestoPayload,
  PresupuestoResumen,
  Transaccion,
  TransaccionFiltro,
  TransaccionPayload
} from '../models/finanzas.models';

@Injectable({
  providedIn: 'root'
})
export class FinanzasService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api';

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
      if (filtros.tipo) params = params.set('tipo', filtros.tipo);
      if (filtros.cuentaId != null) params = params.set('cuentaId', filtros.cuentaId.toString());
      if (filtros.categoriaId != null) params = params.set('categoriaId', filtros.categoriaId.toString());
      if (filtros.fechaInicio) params = params.set('fechaInicio', filtros.fechaInicio);
      if (filtros.fechaFin) params = params.set('fechaFin', filtros.fechaFin);
      if (filtros.busqueda && filtros.busqueda.trim()) params = params.set('busqueda', filtros.busqueda.trim());
    }

    return this.http.get<ApiResponse<PageResponse<Transaccion>>>(`${this.baseUrl}/transacciones`, { params });
  }

  crearTransaccion(payload: TransaccionPayload): Observable<ApiResponse<Transaccion>> {
    return this.http.post<ApiResponse<Transaccion>>(`${this.baseUrl}/transacciones`, payload);
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
