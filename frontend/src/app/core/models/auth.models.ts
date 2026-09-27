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
}

export interface PerfilActualizarPayload {
  nombre: string;
  email: string;
  tema: 'CLARO' | 'OSCURO';
  monedaPredeterminada: string;
}

export interface CambiarPasswordPayload {
  passwordActual: string;
  passwordNueva: string;
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
