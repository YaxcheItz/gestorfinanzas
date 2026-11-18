import { Browser } from '@playwright/test';
import { createSectionsFixture } from './secciones-fixture';
import { syntheticAndroid } from './avisos-compartidos-fixture';
import { PlantillaRecurrente } from '../src/app/core/models/finanzas.models';

export const settingsName = 'Persona ficticia con nombre extenso para revisar las preferencias de su cuenta';
export const settingsEmail = 'personaficticiaconuncorreolargoparacomprobarladistribuciondeltextoenpreferencias@example.test';
export const recurringNotes = 'Movimiento ficticio con notas extensas para comprobar que toda la información sigue disponible al ampliar la letra en las preferencias de la cuenta.';
export const recurringCategory = 'Servicios y suministros del hogar con un nombre ficticio extenso';

export async function createSettingsFixture(browser: Browser, baseURL: string, native = false) {
  const fixture = await createSectionsFixture(browser, baseURL);
  const { p } = fixture;
  const writes = native ? await syntheticAndroid(p, baseURL) : fixture.writes;
  const previews: string[] = [];
  let whatsapp: 'DESCONECTADA' | 'VERIFICADA' | 'PENDIENTE' | 'error' = 'DESCONECTADA';
  let theme: 'CLARO' | 'OSCURO' = 'CLARO';
  const recurring: PlantillaRecurrente[] = [
    { id: 71, cuentaId: 11, cuentaNombre: 'Cuenta ficticia para gastos y servicios del hogar', categoriaId: 1, categoriaNombre: recurringCategory, tipo: 'GASTO', monto: 3456.78, moneda: 'MXN', notas: recurringNotes, frecuencia: 'MENSUAL', siguienteFecha: '2026-11-01', activa: true },
    { id: 72, cuentaId: 11, cuentaNombre: 'Cuenta ficticia para gastos y servicios del hogar', categoriaId: 1, categoriaNombre: 'Plan ficticio pausado', tipo: 'GASTO', monto: 8765.43, moneda: 'MXN', notas: recurringNotes, frecuencia: 'MENSUAL', siguienteFecha: '2027-01-01', activa: false },
  ];
  await p.route('**/api/**', async r => {
    const request=r.request(), path=new URL(request.url()).pathname;
    if (request.method()==='POST' && path==='/api/perfil/respaldo/previsualizar') {
      previews.push(path);
      return r.fulfill({json:{success:true,data:{version:1,generadoEn:'2026-11-14T12:00:00Z',cuentas:3,categorias:7,presupuestos:2,recurrencias:2,transacciones:43,eventosHistorial:56,asientosContables:86,parejas:0,aportesPareja:0,gastosPareja:0,pagosPareja:0,destinoVacio:true,puedeRestaurar:true,advertencias:['Previsualización ficticia; ningún dato se restaurará durante esta revisión.']}}});
    }
    if (request.method()!=='GET') return r.fallback();
    let data: unknown;
    if(path==='/api/perfil') data={id:995,nombre:settingsName,email:settingsEmail,telefono:null,notificacionesWhatsapp:false,tema:theme,monedaPredeterminada:'MXN'};
    if(path==='/api/recurrencias') data=recurring;
    if(path==='/api/notificaciones/push/configuracion') data={configurado:false,clavePublica:null};
    if(path==='/api/canales/whatsapp/conexion') {
      if(whatsapp==='error')return r.fulfill({status:503,json:{success:false,message:'Error ficticio al consultar la conexión de WhatsApp.'}});
      data={disponible:true,operativo:whatsapp==='VERIFICADA',estado:whatsapp,conexionId:'qa-settings',telefono:whatsapp==='VERIFICADA'?'+15555550123':null,vence:'2099-01-01T00:00:00Z',verificada:null,generacion:1,guardarAutomaticamente:false};
    }
    return data===undefined?r.fallback():r.fulfill({json:{success:true,data}});
  });
  return {...fixture,writes,previews,setWhatsapp:(state:typeof whatsapp)=>{whatsapp=state;},setTheme:(dark:boolean)=>{theme=dark?'OSCURO':'CLARO';}};
}
