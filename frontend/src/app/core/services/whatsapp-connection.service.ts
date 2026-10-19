import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {ApiResponse} from '../models/auth.models';
import {getApiBaseUrl} from './api-base-url';

export interface WhatsappConnection {
  disponible: boolean;
  operativo: boolean;
  estado: 'DESCONECTADA' | 'PENDIENTE' | 'CADUCADA' | 'VERIFICADA';
  conexionId: string | null;
  telefono: string | null;
  vence: string | null;
  verificada: string | null;
  generacion: number;
  guardarAutomaticamente: boolean;
}
export interface WhatsappChallenge {codigo: string; urlWhatsapp: string; vence: string;}

@Injectable({providedIn: 'root'})
export class WhatsappConnectionService {
  private readonly http = inject(HttpClient);
  private readonly url = getApiBaseUrl() + '/canales/whatsapp/conexion';
  estado() {return this.http.get<ApiResponse<WhatsappConnection>>(this.url);}
  iniciar(telefono: string, automatico: boolean) {
    return this.http.post<ApiResponse<WhatsappChallenge>>(this.url, {telefono, aceptarVinculacion: true, guardarAutomaticamente: automatico});
  }
  desconectar() {return this.http.delete<ApiResponse<WhatsappConnection>>(this.url);}
  preferencias(automatico: boolean) {return this.http.patch<ApiResponse<WhatsappConnection>>(this.url + '/preferencias', {guardarAutomaticamente: automatico});}
}
