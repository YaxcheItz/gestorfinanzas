import { Injectable, inject } from '@angular/core';
import { getApiBaseUrl } from './api-base-url';
import { HttpClient, HttpParams } from '@angular/common/http';
import { AvisoFinanciero, ClaseAviso, DatosAviso } from '../models/avisos.models';
import { ApiResponse } from '../models/auth.models';

@Injectable({providedIn:'root'})
export class AvisosService {
  private readonly http=inject(HttpClient);
  private readonly url=`${getApiBaseUrl()}/avisos`;
  listar(estado:string,page=0) { return this.http.get<ApiResponse<{content:AvisoFinanciero[];totalPages:number}>>(this.url,{params:new HttpParams().set('estado',estado).set('page',page)}); }
  recibir(body:{origen:string;identificador:string;resumen:string;clase:ClaseAviso;moneda:string;datos:DatosAviso}) {return this.http.post<ApiResponse<AvisoFinanciero>>(this.url,body);}
  editar(id:string,body:{version:number;clase:ClaseAviso;moneda:string;datos:DatosAviso}) {return this.http.put<ApiResponse<AvisoFinanciero>>(`${this.url}/${id}`,body);}
  decidir(aviso:AvisoFinanciero,accion:'confirmar'|'descartar',aceptarPosibleDuplicado=false) {return this.http.post<ApiResponse<AvisoFinanciero>>(`${this.url}/${aviso.id}/${accion}`,{version:aviso.version,aceptarPosibleDuplicado});}
}
