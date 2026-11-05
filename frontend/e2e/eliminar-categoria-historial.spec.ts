import { expect, test } from '@playwright/test';
import { registrarPrueba } from './registro-helper';
test('eliminar categoria conserva movimiento historico y respaldo', async ({ page, baseURL }) => {
  expect(['localhost','127.0.0.1']).toContain(new URL(baseURL!).hostname);
  const registro=await registrarPrueba(page.request,{nombre:'Prueba local',email:`categoria-${crypto.randomUUID()}@example.test`,password:'Password123'});
  expect(registro.ok()).toBeTruthy(); const headers={Authorization:`Bearer ${(await registro.json()).data.token}`};
  const categoria=await page.request.post('/api/categorias',{headers,data:{nombre:'Origen ficticio',tipo:'GASTO',icono:'shopping-cart',color:'#123456'}});
  expect(categoria.ok()).toBeTruthy(); const origen=(await categoria.json()).data;
  const cuenta=await page.request.post('/api/cuentas',{headers,data:{nombre:'Prueba local',tipo:'DEBITO',moneda:'MXN',saldoInicial:100}});
  expect(cuenta.ok()).toBeTruthy(); const cuentaId=(await cuenta.json()).data.id;
  const movimiento=await page.request.post('/api/transacciones',{headers,data:{cuentaId,categoriaId:origen.id,tipo:'GASTO',monto:10,fecha:'2026-10-01',descripcion:'Ensayo ficticio'}});
  expect(movimiento.ok()).toBeTruthy(); const id=(await movimiento.json()).data.id;
  const eliminado=await page.request.delete(`/api/categorias/${origen.id}`,{headers}); expect(eliminado.ok()).toBeTruthy();
  const despues=await page.request.get(`/api/transacciones/${id}`,{headers}); expect(despues.ok()).toBeTruthy();
  expect((await despues.json()).data.categoriaNombre).toBe(origen.nombre);
  const respaldo=await page.request.get('/api/perfil/respaldo',{headers}); expect(respaldo.ok()).toBeTruthy();
  const copia=await respaldo.json(); const guardado=copia.transacciones.find((t:{id:number})=>t.id===id);
  expect(guardado.categoriaNombre).toBe(origen.nombre);
});
