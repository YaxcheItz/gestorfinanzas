import { test, expect } from '@playwright/test';
import { createSectionsFixture } from './secciones-fixture';

test('tema oscuro legible en superficies, campos y acciones; claro conservado', async ({browser,baseURL})=>{
  const {c,p,origin,writes,pageErrors}=await createSectionsFixture(browser,baseURL!);
  try {
    for(const route of ['dashboard','cuentas','reportes','configuracion','categorias','asistente','metas']){
      await p.goto(origin+'/'+route);
      await expect(p.locator('#main-content')).toBeVisible();
      await p.evaluate(()=>document.documentElement.classList.add('dark'));
      await p.evaluate(()=>document.fonts.ready);
      await expect(p.locator('.monai-theme')).toHaveCSS('font-family',/Manrope/);
      expect(await p.evaluate(()=>document.fonts.check('16px "Manrope Variable"'))).toBe(true);
      const ratios=await p.evaluate(()=>{
        const s=getComputedStyle(document.documentElement);
        const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
        const ctx=canvas.getContext('2d')!;
        const lum=(token:string)=>{
          ctx.fillStyle=s.getPropertyValue('--kaptal-'+token).trim();ctx.fillRect(0,0,1,1);
          const rgb=[...ctx.getImageData(0,0,1,1).data].slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
          return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
        };
        const pairs=[...['canvas','surface','surface-subtle'].flatMap(bg=>['content','content-muted','brand-ink'].map(fg=>({fg,bg,min:4.5}))),{fg:'on-brand',bg:'brand',min:4.5},{fg:'on-voice',bg:'voice',min:4.5},{fg:'brand',bg:'surface-subtle',min:3},{fg:'control-border',bg:'surface-subtle',min:3},{fg:'focus',bg:'surface-subtle',min:3}];
        return {canvas:lum('canvas'),surface:lum('surface'),pairs:pairs.map(pair=>{const a=lum(pair.fg),b=lum(pair.bg);return {...pair,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};})};
      });
      expect(ratios.canvas).toBeGreaterThan(0);expect(ratios.canvas).toBeLessThan(.03);
      expect(ratios.surface).toBeGreaterThan(ratios.canvas);
      for(const pair of ratios.pairs)expect(pair.ratio,route+' '+pair.fg+'/'+pair.bg).toBeGreaterThanOrEqual(pair.min);
      if(route==='reportes'){
        expect(await p.locator('input[type=month]').evaluate(e=>{
          const probe=document.createElement('div');probe.style.backgroundColor='var(--kaptal-surface-subtle)';document.body.append(probe);
          const same=getComputedStyle(e).backgroundColor===getComputedStyle(probe).backgroundColor;probe.remove();return same;
        }),'El campo debe usar la superficie común, sin verde heredado').toBe(true);
      }
      if(route==='asistente'){
        expect(await p.locator('[aria-relevant="additions text"]').evaluate(e=>{
          const probe=document.createElement('div');probe.style.backgroundColor='var(--kaptal-canvas)';document.body.append(probe);
          const same=getComputedStyle(e).backgroundColor===getComputedStyle(probe).backgroundColor;probe.remove();return same;
        }),'El hilo debe usar el fondo común, sin azul heredado').toBe(true);
      }
      if(route==='metas'){
        expect(await p.locator('app-metas form').first().evaluate(e=>{
          const probe=document.createElement('div');probe.style.color='var(--kaptal-border)';document.body.append(probe);
          const same=getComputedStyle(e).borderColor===getComputedStyle(probe).color;probe.remove();return same;
        }),'El borde decorativo debe usar el separador común').toBe(true);
      }
      await p.evaluate(()=>document.documentElement.classList.remove('dark'));
      await expect(p.locator('body')).toHaveCSS('background-color','rgb(255, 255, 255)');
      await expect(p.locator('.monai-theme')).toHaveCSS('font-family',/Segoe UI/);
    }
    expect(writes).toEqual([]);expect(pageErrors).toEqual([]);
  } finally {await c.close();}
});

test('acceso discreto al formulario mantiene foco, área táctil y texto del chat',async({browser,baseURL},info)=>{
  const {c,p,origin,writes,pageErrors}=await createSectionsFixture(browser,baseURL!);
  try {
    await p.emulateMedia({reducedMotion:'reduce'});
    for(const [width,font] of [[390,'100%'],[1280,'100%'],[320,'200%']] as const){
      await p.setViewportSize({width,height:844});await p.goto(origin+'/dashboard');
      await p.evaluate(font=>{document.documentElement.style.fontSize=font;document.documentElement.classList.add('dark');},font);
      await p.locator('.capture-dock__manual').click();
      expect(await p.locator('#quick-capture-text').evaluate(e=>{
        const probe=document.createElement('div');probe.style.color='var(--kaptal-content-muted)';document.body.append(probe);
        const same=getComputedStyle(e,'::placeholder').color===getComputedStyle(probe).color;probe.remove();return same;
      }),'El placeholder del chat debe ser neutro, sin tinte verde').toBe(true);
      await p.locator('#quick-capture-text').fill('Texto ficticio sin enviar');
      const button=p.getByRole('button',{name:'Abrir formulario',exact:true});
      await expect(button).toHaveAttribute('title','Abrir formulario');await expect(button.locator('span')).toHaveCount(0);
      const rect=await button.boundingBox();expect(rect!.width).toBeGreaterThanOrEqual(44);expect(rect!.height).toBeGreaterThanOrEqual(44);expect(rect!.width).toBeLessThanOrEqual(48);
      await button.focus();await expect(button).toBeFocused();await button.press('Enter');
      const form=p.getByRole('dialog',{name:'Añadir movimiento',exact:true});await expect(form).toBeVisible();
      await form.getByRole('button',{name:'Cerrar registro',exact:true}).click();
      await p.locator('.capture-dock__manual').click();await expect(p.locator('#quick-capture-text')).toHaveValue('Texto ficticio sin enviar');
      expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await p.screenshot({path:info.outputPath('chat-'+width+'.png')});
    }
    expect(writes).toEqual([]);expect(pageErrors).toEqual([]);
  } finally {await c.close();}
});

test('categorías vacías caben al 200% incluso con fuente de reserva y sin conexión',async({browser,baseURL})=>{
  const {c,p,origin,writes,pageErrors}=await createSectionsFixture(browser,baseURL!);
  try{
    await p.setViewportSize({width:320,height:844});await p.goto(origin+'/categorias');
    await expect(p.getByText('Aún no has creado categorías personalizadas.',{exact:true})).toBeVisible();
    await p.evaluate(()=>{document.documentElement.style.fontSize='200%';document.documentElement.classList.add('dark');document.querySelector<HTMLElement>('.monai-theme')!.style.fontFamily='Arial, sans-serif';});
    await c.setOffline(true);
    expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const empty=p.getByText('Aún no has creado categorías personalizadas.',{exact:true});
    expect(await empty.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
    expect(writes).toEqual([]);expect(pageErrors).toEqual([]);
  }finally{await c.setOffline(false);await c.close();}
});

test('acceso, registro y recuperación usan el tema oscuro sin enviar formularios',async({browser,baseURL})=>{
  const origin=new URL(baseURL!).origin;
  for(const route of ['login','registro','recuperar-cuenta']){
    const c=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
    const writes:string[]=[];
    await c.route('**/*',r=>{
      const u=new URL(r.request().url());
      if(u.pathname.startsWith('/api/')){
        if(r.request().method()!=='GET'&&u.pathname!=='/api/auth/refresh')writes.push(u.pathname);
        return r.fulfill({status:401,json:{success:false,message:'Sin sesión ficticia'}});
      }
      return u.origin===origin?r.continue():r.abort();
    });
    try{
      const p=await c.newPage();await p.goto(origin+'/'+route);await expect(p).toHaveURL(origin+'/'+route);
      await p.evaluate(()=>document.documentElement.classList.add('dark'));await p.evaluate(()=>document.fonts.ready);
      await p.waitForTimeout(350);
      await expect(p.locator('.monai-theme')).toHaveCSS('font-family',/Manrope/);
      for(const field of await p.locator('input:not([type=checkbox])').all()){
        await expect(field).toBeEnabled();
        const luminance=await field.evaluate(e=>{
          const color=getComputedStyle(e).backgroundColor;
          const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
          const ctx=canvas.getContext('2d')!;ctx.fillStyle=color;ctx.fillRect(0,0,1,1);
          return [...ctx.getImageData(0,0,1,1).data].slice(0,3).reduce((sum,v)=>sum+v/3,0);
        });
        expect(luminance,route+' campo estable sin fondo claro').toBeLessThan(80);
      }
      await p.setViewportSize({width:320,height:844});await p.evaluate(()=>document.documentElement.style.fontSize='200%');
      expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route).toBe(true);
      expect(writes).toEqual([]);
    }finally{await c.close();}
  }
});
