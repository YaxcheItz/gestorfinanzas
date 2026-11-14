import { test, expect } from '@playwright/test';
import { createSectionsFixture } from './secciones-fixture';
import fs from 'node:fs';

test('acciones inferiores solo en Inicio y sin hueco reservado fuera',async({browser,baseURL},info)=>{
  const {c,p,origin,writes,pageErrors}=await createSectionsFixture(browser,baseURL!);
  try{
    for(const route of ['dashboard','cuentas','transacciones','reportes','presupuestos','configuracion']){
      await p.goto(origin+'/'+route);await expect(p.locator('h1').first()).toBeVisible();
      await expect(p.locator('.capture-dock')).toHaveCount(route==='dashboard'?1:0);
      expect(await p.locator('#main-content').evaluate(e=>e.classList.contains('app-content-with-bottom-nav'))).toBe(route==='dashboard');
      if(route!=='dashboard')await expect(p.locator('app-navbar a[aria-label="Inicio"]')).toBeVisible();
      await p.screenshot({path:info.outputPath(route+'.png')});
    }
    expect(writes).toEqual([]);expect(pageErrors).toEqual([]);
  }finally{await c.close();}
});

test('chat adaptable, inicios sin envío y propuestas revisables',async({browser,baseURL},info)=>{
  test.setTimeout(120000);
  const {c,p,origin,writes,pageErrors}=await createSectionsFixture(browser,baseURL!);
  const sizes=[[320,640],[390,844],[390,400],[1280,800]] as const;
  const measurements=[];let posts=0;
  await p.route('**/api/asistente/captura-rapida',async r=>{posts++;return r.fulfill({json:{success:true,data:{answer:'Revisa esta propuesta ficticia.',engine:'REGLAS',actions:[{id:'qa-chat',type:'CREATE_TRANSACTION',summary:'Compra ficticia · MX$45.00',data:{tipo:'GASTO',monto:45,moneda:'MXN',cuentaId:11,categoriaId:1,fecha:'2026-11-13'}}]}}});});
  try{
    await p.emulateMedia({reducedMotion:'reduce'});
    for(const dark of [false,true])for(const [width,height] of sizes){
      await p.setViewportSize({width,height});await p.goto(origin+'/dashboard');
      await p.evaluate(dark=>document.documentElement.classList.toggle('dark',dark),dark);
      await p.locator('.capture-dock__manual').click();
      const panel=p.locator('#quick-capture-panel');await expect(panel).toBeVisible();
      await expect(panel).toHaveCSS('font-family', dark ? /Manrope/ : /Segoe UI/);
      const box=await panel.boundingBox();expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(height*(width<640?.95:.7));
      expect(box!.y).toBeGreaterThanOrEqual(-1);expect(box!.y+box!.height).toBeLessThanOrEqual(height+1);
      const before=posts;await p.getByRole('button',{name:'Registrar gasto',exact:true}).click();
      await expect(p.locator('#quick-capture-text')).toHaveValue('Gasté ');expect(posts).toBe(before);
      await p.screenshot({path:info.outputPath(`empty-${width}-${height}-${dark}.png`)});
      await p.locator('#quick-capture-text').fill('Compra ficticia para la reunión');await p.locator('.capture-chat__send').click();
      const save=panel.getByRole('button',{name:'Guardar movimiento',exact:true});await expect(save).toBeVisible();
      await save.scrollIntoViewIfNeeded();await p.screenshot({path:info.outputPath(`proposal-${width}-${height}-${dark}.png`)});
      await panel.getByRole('button',{name:'Editar propuesta',exact:true}).click();
      const update=panel.getByRole('button',{name:'Actualizar propuesta',exact:true});await expect(update).toBeVisible();
      const action=await update.boundingBox();expect(action!.y+action!.height).toBeLessThanOrEqual(height+1);
      expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      measurements.push({dark,width,height,panel:box,update:action,posts});
      await p.screenshot({path:info.outputPath(`editor-${width}-${height}-${dark}.png`)});
      await panel.getByRole('button',{name:'Cancelar edición',exact:true}).click();
      await panel.getByRole('button',{name:'Cerrar',exact:true}).click();
    }
    fs.writeFileSync(info.outputPath('geometry.json'),JSON.stringify(measurements,null,2));
    expect(posts).toBe(8);expect(writes).toEqual([]);expect(pageErrors).toEqual([]);
  }finally{await c.close();}
});

test('chat con texto al 200% mantiene compositor y permite leer el inicio',async({browser,baseURL},info)=>{
  const {c,p,origin,writes,pageErrors}=await createSectionsFixture(browser,baseURL!);
  try{
    await p.setViewportSize({width:320,height:640});await p.goto(origin+'/dashboard');
    await p.evaluate(()=>{document.documentElement.style.fontSize='200%';document.documentElement.classList.add('dark');});
    await p.locator('.capture-dock__manual').click();const panel=p.locator('#quick-capture-panel');
    const send=panel.getByRole('button',{name:'Enviar movimiento',exact:true});
    fs.writeFileSync(info.outputPath('layout.json'),JSON.stringify(await panel.evaluate(e=>[e,...e.children].map(e=>({tag:e.tagName,classes:e.className,rect:e.getBoundingClientRect().toJSON(),minHeight:getComputedStyle(e).minHeight,height:getComputedStyle(e).height,flex:getComputedStyle(e).flex,margin:getComputedStyle(e).margin}))),null,2));
    await p.screenshot({path:info.outputPath('chat-texto-200.png')});
    const box=await send.boundingBox();expect(box).not.toBeNull();expect(box!.y+box!.height).toBeLessThanOrEqual(640);
    const suggestion=panel.getByRole('button',{name:'Registrar ingreso',exact:true});await suggestion.scrollIntoViewIfNeeded();await expect(suggestion).toBeInViewport();
    expect(await panel.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
    await p.screenshot({path:info.outputPath('chat-texto-200.png')});
    fs.writeFileSync(info.outputPath('typeface.json'),JSON.stringify(await panel.evaluate(e=>({panel:getComputedStyle(e).fontFamily,heading:getComputedStyle(e.querySelector('h2')!).fontFamily,body:getComputedStyle(e.querySelector('.capture-chat__intro p')!).fontFamily})),null,2));
    expect(writes).toEqual([]);expect(pageErrors).toEqual([]);
  }finally{await c.close();}
});
