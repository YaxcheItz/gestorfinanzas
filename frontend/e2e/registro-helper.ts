import { test, type APIRequestContext } from '@playwright/test';

// Las altas de prueba respetan el mismo presupuesto que los usuarios reales.
export async function registrarPrueba(request: APIRequestContext, data: {
  nombre: string; email: string; password: string;
}) {
  let response = await request.post('/api/auth/registro', { data });
  if (response.status() === 429) {
    const seconds = Number(response.headers()['retry-after']);
    if (Number.isInteger(seconds) && seconds > 0 && seconds <= 60) {
      test.setTimeout(120_000);
      await new Promise(resolve => setTimeout(resolve, (seconds + 1) * 1000));
      response = await request.post('/api/auth/registro', { data });
    }
  }
  return response;
}
