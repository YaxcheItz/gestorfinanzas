import { accionCaptura } from './accion-captura';

describe('acciones de captura desde el sistema', () => {
  it('admite únicamente las tres acciones del manifiesto', () => {
    for (const valor of ['nuevo-gasto','nuevo-ingreso','dictar']) expect(accionCaptura(valor)).toBe(valor);
    for (const valor of [null,undefined,'','https://otro.example','//otro.example','javascript:alert(1)',['dictar'],{}]) {
      expect(accionCaptura(valor)).toBeNull();
    }
  });
});
