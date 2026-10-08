import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/auth.models';
import {
  AportacionParejaPayload,
  GastoParejaPayload,
  PagoParejaPayload,
  Pareja,
  ParejaCrearPayload
} from '../models/pareja.models';
import { InvitacionPareja, HistorialPareja } from '../models/pareja.models';
import { getApiBaseUrl } from './api-base-url';

@Injectable({
  providedIn: 'root'
})
export class ParejaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = getApiBaseUrl();

  /**
   * Resuelve en `null` cuando todavia no hay pareja, que es el estado inicial
   * normal y no un error.
   */
  obtener(): Observable<ApiResponse<Pareja | null>> {
    return this.http.get<ApiResponse<Pareja | null>>(`${this.baseUrl}/pareja`);
  }

  crear(payload: ParejaCrearPayload): Observable<ApiResponse<InvitacionPareja>> {
    return this.http.post<ApiResponse<InvitacionPareja>>(`${this.baseUrl}/pareja`, payload);
  }

  invitaciones(): Observable<ApiResponse<InvitacionPareja[]>> {
    return this.http.get<ApiResponse<InvitacionPareja[]>>(`${this.baseUrl}/pareja/invitaciones`);
  }
  aceptar(id: number): Observable<ApiResponse<Pareja>> {
    return this.http.post<ApiResponse<Pareja>>(`${this.baseUrl}/pareja/invitaciones/${id}/aceptar`, {});
  }
  resolverInvitacion(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/pareja/invitaciones/${id}`);
  }
  historiales(): Observable<ApiResponse<HistorialPareja[]>> {
    return this.http.get<ApiResponse<HistorialPareja[]>>(`${this.baseUrl}/pareja/historial`);
  }
  historial(id: number): Observable<ApiResponse<Pareja>> {
    return this.http.get<ApiResponse<Pareja>>(`${this.baseUrl}/pareja/historial/${id}`);
  }

  agregarAporte(payload: AportacionParejaPayload): Observable<ApiResponse<Pareja>> {
    return this.http.post<ApiResponse<Pareja>>(`${this.baseUrl}/pareja/aportes`, payload);
  }

  eliminarAporte(id: number): Observable<ApiResponse<Pareja>> {
    return this.http.delete<ApiResponse<Pareja>>(`${this.baseUrl}/pareja/aportes/${id}`);
  }

  agregarGasto(payload: GastoParejaPayload): Observable<ApiResponse<Pareja>> {
    return this.http.post<ApiResponse<Pareja>>(`${this.baseUrl}/pareja/gastos`, payload);
  }

  eliminarGasto(id: number): Observable<ApiResponse<Pareja>> {
    return this.http.delete<ApiResponse<Pareja>>(`${this.baseUrl}/pareja/gastos/${id}`);
  }

  registrarPago(payload: PagoParejaPayload): Observable<ApiResponse<Pareja>> {
    return this.http.post<ApiResponse<Pareja>>(`${this.baseUrl}/pareja/pagos`, payload);
  }

  eliminarPago(id: number): Observable<ApiResponse<Pareja>> {
    return this.http.delete<ApiResponse<Pareja>>(`${this.baseUrl}/pareja/pagos/${id}`);
  }

  desvincular(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/pareja/${id}`);
  }
}
