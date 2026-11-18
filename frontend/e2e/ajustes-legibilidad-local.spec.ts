import {test,expect,Page} from '@playwright/test';
import {createSettingsFixture,recurringNotes,settingsEmail,settingsName} from './ajustes-fixture';

const layouts=[[320,'200%',true],[320,'200%',false],[390,'100%',true],[1280,'100%',true],[375,'200%',true],[375,'200%',false],[844,'200%',true],[844,'200%',false]] as const;
async function openSettings(p:Page,width:number,font:string,dark:boolean,id='') {
  await p.setViewportSize({width,height:width===844?390:844});await p.goto('/configuracion'+(id?'#'+id:''));
  await expect(p.locator('input[name=nombre]')).toHaveValue(settingsName);
  await expect.poll(()=>p.locator('link[data-kaptal-style=settings]').evaluate((e:HTMLLinkElement)=>!!e.sheet)).toBe(true);
  await p.evaluate(({font,dark})=>{document.documentElement.style.fontSize=font;document.documentElement.classList.toggle('dark',dark);},{font,dark});
  await p.evaluate(()=>document.fonts.ready);await p.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));
}

test('Seguridad conserva el correo largo sin desbordar en web y Android ficticio',async({browser,baseURL})=>{
  for(const native of [false,true]) {
    const {c,p,writes,previews,pageErrors}=await createSettingsFixture(browser,baseURL!,native);
    try {
      for(const[width,font,dark]of layouts) {
        await openSettings(p,width,font,dark,'security');const email=p.locator('#security p').filter({hasText:settingsEmail});await expect(email).toBeVisible();
        expect(await email.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);expect(await p.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
        if(native){await expect(p.getByRole('switch',{name:'Bloquear Kaptal al salir'})).toHaveAttribute('aria-checked','false');await expect(p.getByRole('switch',{name:'Proteger pantalla en este Android'})).toHaveAttribute('aria-checked','false');}
      }
      expect(writes).toEqual([]);expect(previews).toEqual([]);expect(pageErrors).toEqual([]);
      if(native)expect(await p.evaluate(()=>(window as any).__nativeCalls.filter((x:any)=>['configure','clear','update','settings','retry','retryAutomatic','discard'].includes(x.method)))).toEqual([]);
    }finally{await c.close();}
  }
});

test('Ajustes mantiene descripciones, perfil y herramientas dentro de sus paneles',async({browser,baseURL})=>{
  const {c,p,writes,pageErrors}=await createSettingsFixture(browser,baseURL!);
  try {
    for(const[width,font,dark]of layouts) {
      await openSettings(p,width,font,dark);
      for(const description of await p.locator('.settings-disclosure > summary span').all())expect(await description.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
      expect(await p.locator('.settings-management nav').evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
      const tools=p.getByRole('navigation').filter({has:p.getByRole('link',{name:'Cuentas y tarjetas'})});
      for(const link of await tools.getByRole('link').all())expect(await link.evaluate(e=>{const a=e.getBoundingClientRect(),b=e.parentElement!.getBoundingClientRect();return a.left>=b.left-1&&a.right<=b.right+1;})).toBe(true);
      for(const label of await p.locator('.settings-disclosure > summary strong,.settings-disclosure > summary span,.settings-management a').all()) {
        const splitWords=await label.evaluate(e=>{const node=e.firstChild!;return [...(node.textContent??'').matchAll(/\S{5,}/g)].filter(m=>{const range=document.createRange();range.setStart(node,m.index!);range.setEnd(node,m.index!+m[0].length);return range.getClientRects().length>1;}).map(m=>m[0]);});
        expect(splitWords).toEqual([]);
      }
      const summary=p.locator('#profile > summary');await summary.focus();await p.keyboard.press('Enter');await expect(p.locator('#profile')).toHaveAttribute('open','');
      const description=p.locator('#profile .settings-disclosure__content > div:first-child p');
      expect(await description.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
      if(font==='200%')expect((await description.boundingBox())!.width).toBeGreaterThan(130);
      await summary.focus();await p.keyboard.press('Enter');await expect(p.locator('#profile')).not.toHaveAttribute('open','');expect(await p.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
    }
    expect(writes).toEqual([]);expect(pageErrors).toEqual([]);
  }finally{await c.close();}
});

test('Recurrencias conserva las notas completas sin ejecutar acciones financieras',async({browser,baseURL})=>{
  const {c,p,writes,pageErrors}=await createSettingsFixture(browser,baseURL!);
  try {
    for(const[width,font,dark]of layouts) {
      await openSettings(p,width,font,dark,'recurring');const notes=p.getByText(recurringNotes,{exact:true});await expect(notes).toHaveCount(2);
      for(const note of await notes.all())expect(await note.evaluate(e=>({clipped:e.scrollWidth>e.clientWidth+1,nowrap:getComputedStyle(e).whiteSpace==='nowrap'}))).toEqual({clipped:false,nowrap:false});
      await expect(p.getByRole('button',{name:'Registrar ahora',exact:true})).toBeVisible();await expect(p.getByRole('button',{name:'Pausar',exact:true})).toBeVisible();await expect(p.getByRole('button',{name:'Reanudar',exact:true})).toBeVisible();
      expect(await p.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
    }
    expect(writes).toEqual([]);expect(pageErrors).toEqual([]);
  }finally{await c.close();}
});

for(const state of ['DESCONECTADA','VERIFICADA','PENDIENTE']as const)test(`WhatsApp ${state}: texto ampliado sin vincular ni cambiar preferencias`,async({browser,baseURL})=>{
  const {c,p,writes,pageErrors,setWhatsapp}=await createSettingsFixture(browser,baseURL!);
  try {
    setWhatsapp(state);
    for(const[width,font,dark]of layouts) {
      await openSettings(p,width,font,dark,'profile');
      if(state==='VERIFICADA')await expect(p.locator('.wa .status')).toContainText('+15555550123');else if(state==='PENDIENTE')await expect(p.locator('.wa .pending')).toBeVisible();else await expect(p.locator('.wa input[type=tel]')).toBeVisible();
      const scale=font==='200%'?2:1;
      for(const[selector,size]of [['.wa h3',18],['.wa p:not(.hint):not(.error)',14],['.wa .hint',12],['.wa label',14],['.wa button',14],['.wa h4',14],['.wa ul',13],['.wa .pending strong',14]]as const)
        for(const e of await p.locator(selector).all())expect(await e.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBe(size*scale);
      for(const e of await p.locator('.wa p,.wa h3,.wa h4,.wa label,.wa button').all())expect(await e.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
      expect(await p.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
    }
    expect(writes).toEqual([]);expect(pageErrors).toEqual([]);
  }finally{await c.close();}
});

test('El error de WhatsApp tiene contraste legible en ambos temas',async({browser,baseURL})=>{
  for(const dark of [true,false]) {
    const {c,p,writes,pageErrors,setWhatsapp,setTheme}=await createSettingsFixture(browser,baseURL!);
    try {
      setWhatsapp('error');setTheme(dark);await openSettings(p,320,'200%',dark,'profile');const alert=p.locator('.wa').getByRole('alert');await expect(alert).toBeVisible();
      expect(await p.evaluate(()=>document.documentElement.classList.contains('dark'))).toBe(dark);
      const ratio=await alert.evaluate(e=>{
        const luminance=(color:string)=>{const rgb=color.match(/[\d.]+/g)!.slice(0,3).map(Number).map(v=>{const c=v/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
        let node:Element|null=e;while(node&&getComputedStyle(node).backgroundColor==='rgba(0, 0, 0, 0)')node=node.parentElement;
        const a=luminance(getComputedStyle(e).color),b=luminance(getComputedStyle(node!).backgroundColor);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
      });expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(writes).toEqual([]);expect(pageErrors).toEqual([]);
    }finally{await c.close();}
  }
});
