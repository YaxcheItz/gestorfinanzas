export interface Usuario {
  id: number;
  nombre: string;
  email: string;
}

export interface Perfil {
  id: number;
  nombre: string;
  email: string;
  tema: 'CLARO' | 'OSCURO';
  monedaPredeterminada: string;
  telefono?: string | null;
  notificacionesWhatsapp?: boolean;
}

export interface PerfilActualizarPayload {
  nombre: string;
  email: string;
  tema: 'CLARO' | 'OSCURO';
  monedaPredeterminada: string;
  telefono?: string | null;
  notificacionesWhatsapp?: boolean;
}

export interface CambiarPasswordPayload {
  passwordActual: string;
  passwordNueva: string;
}

export interface EliminarCuentaPayload {
  password: string;
}

export interface SolicitudRecuperacionPayload {
  email: string;
}

export interface RestablecerPasswordPayload {
  token: string;
  passwordNueva: string;
}

export interface RestauracionRespaldoPreview {
  version: number;
  generadoEn: string;
  cuentas: number;
  categorias: number;
  presupuestos: number;
  recurrencias: number;
  transacciones: number;
  eventosHistorial: number;
  asientosContables: number;
  destinoVacio: boolean;
  puedeRestaurar: boolean;
  advertencias: string[];
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  id: number;
  nombre: string;
  email: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegistroPayload {
  nombre: string;
  email: string;
  password: string;
}
