import { HttpErrorResponse } from '@angular/common/http';

/**
 * Extrae el mensaje real de una respuesta de error del backend.
 *
 * El backend responde con la forma { success, message, data }. Ese message
 * suele ser la única información útil: por ejemplo, "Ya existe una cuenta con
 * el nombre 'Ahorro'" o "El límite de crédito debe ser mayor a 0". Cuando un
 * componente lo reemplaza por un texto genérico, el usuario ve algo que no
 * describe lo que falló y el diagnóstico se vuelve imposible.
 *
 * Estos fallbacks solo aplican cuando no hay nada mejor que mostrar:
 * - 0    -> la petición nunca salió: CORS, DNS, o el servicio está caído
 * - >=500 -> error del servidor que no trae cuerpo interpretable
 */
export function mensajeDeError(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const cuerpo = error.error;

    if (typeof cuerpo === 'string' && cuerpo.trim().length > 0) {
      try {
        const parseado = JSON.parse(cuerpo) as { message?: string };
        if (parseado?.message) {
          return parseado.message;
        }
      } catch {
        // No es JSON. Si parece HTML hay un proxy en medio, no el backend.
        if (!cuerpo.trimStart().startsWith('<')) {
          return cuerpo;
        }
      }
    }

    if (cuerpo && typeof cuerpo === 'object' && 'message' in cuerpo) {
      const mensaje = (cuerpo as { message?: unknown }).message;
      if (typeof mensaje === 'string' && mensaje.trim().length > 0) {
        return mensaje;
      }
    }

    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. Revisa tu conexión a internet.';
    }
  }

  return fallback;
}
