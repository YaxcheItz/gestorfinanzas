import { expect, test } from '@playwright/test';
import { createSectionsFixture } from './secciones-fixture';

for (const item of [
  { section: 'profile', api: '/perfil', data: { id: 995, nombre: 'Prueba visual', email: 'ui@example.test', tema: 'CLARO', monedaPredeterminada: 'MXN' } },
  { section: 'recurring', api: '/recurrencias', data: [] },
  { section: 'notifications', api: '/notificaciones/push/configuracion', data: { configurado: false, clavePublica: null } },
]) {
  test(`Configuración ${item.section}: lectura y recuperación sin escrituras`, async ({ browser, baseURL }, info) => {
    const { c, p, origin, writes, pageErrors } = await createSectionsFixture(browser, baseURL!);
    let release = () => {};
    let gate: Promise<void>;
    let result: 'server'|'logical'|'success'|'offline' = 'server';
    const hold = (value: typeof result) => { result = value; gate = new Promise<void>(resolve => { release = resolve; }); };
    hold('server');
    await p.route('**/api/**', async r => {
      if (new URL(r.request().url()).pathname !== '/api'+item.api) return r.fallback();
      expect(r.request().method()).toBe('GET'); const value=result; await gate;
      if(value==='offline')return r.abort('internetdisconnected');
      return r.fulfill({status:value==='server'?503:200,json:value==='success'?{success:true,data:item.data}:{success:false,message:'Consulta ficticia temporalmente no disponible',data:null}});
    });
    try {
      await p.setViewportSize({width:320,height:844});
      await p.goto(origin+'/configuracion#'+item.section);
      await p.evaluate(()=>{document.documentElement.style.fontSize='200%';document.documentElement.classList.add('dark');});
      const section=p.locator('#'+item.section), alert=p.locator('#main-content').getByRole('alert').first();
      const loading=section.getByRole('status').filter({hasText:/Cargando|Consultando/});
      const retry=p.locator('#main-content').getByRole('button',{name:/Reintentar/}).first();
      await expect(loading).toBeVisible();await p.screenshot({path:info.outputPath('loading.png'),fullPage:true});
      release();await expect(alert).toBeVisible();
      if(item.section==='notifications')await expect(section.getByText(/todavía no tiene claves Web Push/)).toHaveCount(0);
      await p.screenshot({path:info.outputPath('error.png'),fullPage:true});
      expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      for(const mode of ['logical','offline','success'] as const){
        hold(mode); if(mode==='offline')await c.setOffline(true);else await c.setOffline(false);
        await retry.focus();await p.keyboard.press('Enter');await expect(loading).toBeVisible();await expect(alert).toBeHidden();release();
        if(mode!=='success')await expect(alert).toBeVisible();else {await expect(alert).toBeHidden();await expect(loading).toHaveCount(0);}
      }
      if(item.section==='profile')await expect(section.getByLabel('Nombre',{exact:true})).toHaveValue('Prueba visual');
      if(item.section==='recurring')await expect(section.getByText(/Aún no hay movimientos recurrentes/)).toBeVisible();
      if(item.section==='notifications')await expect(section.getByText(/todavía no tiene claves Web Push/)).toBeVisible();
      await p.screenshot({path:info.outputPath('recovered.png'),fullPage:true});
      expect(writes).toEqual([]);expect(pageErrors).toEqual([]);
    } finally {release();await c.close();}
  });
}

test('apartados de Configuración con teclado y texto ampliado',async({browser,baseURL},info)=>{
  const {c,p,origin,writes,pageErrors}=await createSectionsFixture(browser,baseURL!);
  try{
    await p.emulateMedia({reducedMotion:'reduce'});await p.setViewportSize({width:320,height:844});await p.goto(origin+'/configuracion');
    await p.evaluate(()=>{document.documentElement.style.fontSize='200%';document.documentElement.classList.add('dark');});
    for(const id of ['profile','security','appearance','notifications','categories','recurring','backup','danger']){
      const section=p.locator('#'+id),summary=section.locator('summary');await summary.focus();await p.keyboard.press('Enter');await expect(section).toHaveAttribute('open','');
      expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),id).toBe(true);
      for(let n=0;n<40;n++){
        await p.keyboard.press('Tab');
        const f=await section.evaluate(e=>{const a=document.activeElement as HTMLElement;if(!e.contains(a))return null;const s=getComputedStyle(a);return {focused:a.matches(':focus-visible'),outline:s.outlineStyle,shadow:s.boxShadow};});
        if(!f)break;expect(f.focused).toBe(true);expect(f.outline!=='none'||f.shadow!=='none').toBe(true);
      }
      await summary.focus();await p.keyboard.press('Enter');await expect(section).not.toHaveAttribute('open','');
    }
    await p.screenshot({path:info.outputPath('settings-200.png'),fullPage:true});expect(writes).toEqual([]);expect(pageErrors).toEqual([]);
  }finally{await c.close();}
});

test('mes y año legibles aunque el control nativo recorte su texto',async({browser,baseURL},info)=>{
  const {c,p,origin,writes}=await createSectionsFixture(browser,baseURL!);
  try{
    await p.setViewportSize({width:320,height:844});await p.goto(origin+'/reportes');
    await p.evaluate(()=>{document.documentElement.style.fontSize='200%';document.documentElement.classList.add('dark');});
    const input=p.getByLabel('Mes',{exact:true});await input.fill('2027-02');
    await expect(p.locator('#reports-current-period')).toContainText('febrero de 2027');
    expect(await p.locator('#reports-current-period').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
    await p.screenshot({path:info.outputPath('period-200.png'),fullPage:true});expect(writes).toEqual([]);
  }finally{await c.close();}
});
