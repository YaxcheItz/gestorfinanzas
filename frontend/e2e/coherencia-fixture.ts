import {Browser} from '@playwright/test';
import {createSectionsFixture} from './secciones-fixture';
import {sharedData} from './avisos-compartidos-fixture';

export const coherenceCategory='Categoría ficticia para gastos familiares';
export async function coherenceFixture(browser:Browser,baseURL:string) {
 const fixture=await createSectionsFixture(browser,baseURL);
 const category={id:1,nombre:coherenceCategory,tipo:'GASTO',color:'#ee7777',icono:'🍎',esPersonalizada:true,activo:true};
 const movement={id:71,cuentaId:11,cuentaNombre:'Cuenta ficticia del hogar',categoriaId:1,categoriaNombre:coherenceCategory,categoriaIcono:'🍎',categoriaColor:'#ee7777',tipo:'GASTO',monto:125.4,moneda:'MXN',fecha:'2026-11-14',descripcion:'Compra ficticia para reunión familiar',fechaCreacion:'2026-11-14T12:00:00Z'};
 const budgets={mes:11,anio:2026,presupuestos:[{id:51,categoriaId:1,categoriaNombre:coherenceCategory,montoLimite:2000,montoGastado:500,montoDisponible:1500,porcentajeConsumido:25,moneda:'MXN',mes:11,anio:2026,estado:'NORMAL'}],resumenPorMoneda:[{moneda:'MXN',totalPresupuestado:2000,totalGastado:500,totalDisponible:1500,porcentajeConsumido:25}]};
 const data:Record<string,unknown>={'/api/categorias':[category],'/api/categorias/mias':[category],'/api/pareja':sharedData(),'/api/presupuestos':budgets,'/api/transacciones':{content:[movement],totalPages:1,totalElements:1,number:0,size:20,first:true,last:true,empty:false},'/api/transacciones/recientes':[movement]};
 await fixture.p.route('**/api/**',r=>{const item=data[new URL(r.request().url()).pathname];return r.request().method()==='GET'&&item!==undefined?r.fulfill({json:{success:true,data:item}}):r.fallback();});
 return fixture;
}
