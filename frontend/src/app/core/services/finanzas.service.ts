import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/auth.models';
import {
  Categoria,
  Cuenta,
  CuentaPayload,
  DashboardResumen,
  Presupuesto,
  PresupuestoPayload,
  PresupuestoResumen,
  Transaccion,
  TransaccionPayload
} from '../models/finanzas.models';

@Injectable({
  providedIn: 'root'
})
export class FinanzasService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api';

  // --- Cuentas ---
  getCuentas(): Observable<ApiResponse<Cuenta[]>> {
    return this.http.get<ApiResponse<Cuenta[]>>(`${this.baseUrl}/cuentas`);
  }

  crearCuenta(payload: CuentaPayload): Observable<ApiResponse<Cuenta>> {
    return this.http.post<ApiResponse<Cuenta>>(`${this.baseUrl}/cuentas`, payload);
  }

  desactivarCuenta(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/cuentas/${id}`);
  }

  // --- Categorías ---
  getCategorias(): Observable<ApiResponse<Categoria[]>> {
    return this.http.get<ApiResponse<Categoria[]>>(`${this.baseUrl}/categorias`);
  }

  // --- Transacciones ---
  getTransaccionesRecientes(): Observable<ApiResponse<Transaccion[]>> {
    return this.http.get<ApiResponse<Transaccion[]>>(`${this.baseUrl}/transacciones/recientes`);
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

