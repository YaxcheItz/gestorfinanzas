import { Injectable, InjectionToken, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { getApiBaseUrl } from './api-base-url';
import { ApiResponse } from '../models/auth.models';

export interface AutomaticState {
  deviceId: string; active: boolean; queued: number; registered: number; review: number; full: boolean; error: string;
  reason?: string;
  entries?: { id: string; proveedor: string; cuentaId: number; status: string; descripcion: string; monto: number; moneda: string; fecha: string }[];
  reviews?: { eventoId: string; descripcion: string; monto: number; moneda: string; fecha: string }[];
  rules?: AutomaticRule[];
}
export interface AutomaticRule {
  id: string; proveedor: string; paquete: string; remitente: string | null; terminacion: string | null;
  cuentaId: number; listaId: number; categoriaId: number | null;
}
interface Credential { id: string; clave: string; vence: string; reglas: AutomaticRule[]; }
interface AutomaticPlugin {
  read(options: { userId: number }): Promise<AutomaticState>;
  configure(options: { userId: number; consent: boolean; credential: Credential }): Promise<void>;
  clear(options: { userId: number }): Promise<void>;
  validate(options: { userId: number; consent: boolean; rules: AutomaticRule[] }): Promise<void>;
  retry(options: { userId: number }): Promise<void>;
}
export const AUTOMATIC_BANK_NATIVE = new InjectionToken<AutomaticPlugin | null>('AutomaticBank native', {
  providedIn: 'root', factory: () => Capacitor.getPlatform() === 'android' ? registerPlugin<AutomaticPlugin>('AutomaticBank') : null,
});

@Injectable({ providedIn: 'root' })
export class AutomaticBankService {
  private readonly native = inject(AUTOMATIC_BANK_NATIVE);
  private readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  readonly available = !!this.native;
  private readonly url = `${getApiBaseUrl()}/automatizacion/android`;
  async read(): Promise<AutomaticState | null> {
    const userId = this.auth.currentUser()?.id ?? 0;
    const state = await this.native?.read({ userId });
    return userId === (this.auth.currentUser()?.id ?? 0) ? state ?? null : null;
  }
  async configure(rules: AutomaticRule[], consent: boolean): Promise<void> {
    if (!this.native || !consent) throw new Error('Acepta el registro automático.');
    const userId = this.auth.currentUser()?.id ?? 0;
    const state = await this.read();
    if (!state || !userId || state.queued > 0) throw new Error('Espera a que terminen los envíos pendientes.');
    await this.save(state, rules, consent, userId);
  }
  async reconnect(consent: boolean): Promise<void> {
    const userId = this.auth.currentUser()?.id ?? 0;
    const state = await this.read();
    if (!this.native || !consent || !userId || !state?.rules?.length)
      throw new Error('Acepta restablecer las asociaciones guardadas.');
    await this.save(state, state.rules, consent, userId);
  }
  async retry(): Promise<void> {
    if (!this.native) return;
    const userId = this.auth.currentUser()?.id ?? 0;
    if (!userId) throw new Error('Abre tu sesión.');
    await this.native.retry({ userId });
  }
  private async save(state: AutomaticState, rules: AutomaticRule[], consent: boolean, userId: number): Promise<void> {
    if (!this.native) throw new Error('Requiere Android.');
    await this.native.validate({ userId, consent, rules });
    if (userId !== (this.auth.currentUser()?.id ?? 0)) throw new Error('La sesión cambió.');
    const response = await firstValueFrom(this.http.post<ApiResponse<Credential>>(this.url, {
      dispositivoId: state.deviceId, consentimiento: true, reglas: rules,
    }));
    if (!response.success || !response.data || userId !== (this.auth.currentUser()?.id ?? 0))
      throw new Error('La sesión cambió. Vuelve a conectar el dispositivo.');
    try { await this.native.configure({ userId, consent, credential: response.data }); }
    catch (error) {
      // Setup failed: revoke the newly issued capability instead of leaving an unseen connection.
      if (userId === (this.auth.currentUser()?.id ?? 0))
        await firstValueFrom(this.http.delete(`${this.url}/${state.deviceId}`)).catch(() => undefined);
      throw error;
    }
  }
  async disconnect(): Promise<void> {
    const userId = this.auth.currentUser()?.id ?? 0;
    const state = await this.read();
    if (!state || !this.native) return;
    await firstValueFrom(this.http.delete(`${this.url}/${state.deviceId}`));
    if (userId === (this.auth.currentUser()?.id ?? 0)) await this.native.clear({ userId });
  }
}
