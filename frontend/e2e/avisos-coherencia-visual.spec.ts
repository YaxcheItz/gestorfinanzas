import {expect,test} from '@playwright/test';
import {syntheticAndroid} from './avisos-compartidos-fixture';

for(const dark of [false,true])test(`Avisos comparte la jerarquía de títulos sin cambiar los controles · ${dark?'oscuro':'claro'}`,async({browser,baseURL})=>{
 const context=await browser.newContext({serviceWorkers:'block'}),p=await context.newPage(),errors:string[]=[];
 p.on('pageerror',e=>errors.push(e.message));const writes=await syntheticAndroid(p,baseURL!,dark,false,false,true);
 try{
  for(const[width,scale]of[[320,100],[320,200],[390,100],[390,200],[1280,100],[1280,200]]){
   await p.setViewportSize({width,height:844});await p.goto('/avisos');
   const h1=p.getByRole('heading',{name:'Bandeja de avisos',exact:true});await expect(h1).toBeVisible();
   await p.evaluate(({scale,dark})=>{document.documentElement.style.fontSize=scale+'%';document.documentElement.classList.toggle('dark',dark);},{scale,dark});await p.evaluate(()=>document.fonts.ready);
   await expect(h1).toHaveCSS('font-weight',dark?'600':'700');
   await expect(h1).toHaveCSS('font-size',`${(width>=768?28:width>=375?24:22)*scale/100}px`);
   await expect(p.locator('.inbox')).toHaveCSS('padding-left',width<360?'16px':'20px');
   await expect(p.getByRole('heading',{name:'Revisiones en tu cuenta',exact:true})).toHaveCSS('font-weight',dark?'600':'700');
   await expect(p.getByRole('heading',{name:'Avisos de este teléfono',exact:true})).toHaveCSS('font-weight',dark?'600':'700');
   const add=p.getByRole('button',{name:'Añadir aviso',exact:true});await add.click();const dialog=p.getByRole('dialog');
   await expect(dialog.getByRole('heading')).toHaveCSS('font-weight',dark?'600':'700');
   await dialog.locator('[name=resumen]').fill('Texto ficticio sin enviar');await dialog.locator('[name=descripcion]').fill('Descripción ficticia local');
   for(const control of await dialog.locator('input,select,textarea').all())await expect(control).toHaveCSS('font-size',`${16*scale/100}px`);
   await p.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(add).toBeFocused();
   const banks=p.getByRole('button',{name:'Bancos y cuentas',exact:true});await banks.focus();await p.keyboard.press('Enter');
   await expect(p.getByRole('heading',{name:'Registro automático',exact:true})).toHaveCSS('font-weight',dark?'600':'700');
   await p.getByRole('button',{name:'Avisos',exact:true}).click();expect(await p.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
   expect(await p.evaluate(()=>(window as any).__nativeCalls.filter((c:any)=>['configure','retry','clear','discard','settings','retryAutomatic','update'].includes(c.method)))).toEqual([]);
  }
  expect(writes).toEqual([]);expect(errors).toEqual([]);
 }finally{await context.close();}
});

for(const dark of [false,true])test(`el editor de asociaciones conserva Cancelar completo al ampliar · ${dark?'oscuro':'claro'}`,async({browser,baseURL})=>{
 const context=await browser.newContext({serviceWorkers:'block'}),p=await context.newPage(),errors:string[]=[];
 p.on('pageerror',e=>errors.push(e.message));const writes=await syntheticAndroid(p,baseURL!,dark,false,false,true);
 try{
  for(const[width,scale]of[[320,200],[320,100],[390,100],[390,200],[1280,100],[1280,200]]){
   await p.setViewportSize({width,height:844});await p.goto('/avisos');await p.getByRole('button',{name:'Bancos y cuentas',exact:true}).click();
   await p.evaluate(({scale,dark})=>{document.documentElement.style.fontSize=scale+'%';document.documentElement.classList.toggle('dark',dark);},{scale,dark});
   await p.getByText('Administrar bancos y cuentas',{exact:true}).click();
   for(const edit of [false,true]){
    await p.getByRole('button',edit?{name:'Editar asociación de Santander con Crédito QA',exact:true}:{name:'Añadir asociación',exact:true}).click();
    const editor=p.getByRole('group',{name:edit?'Editar asociación':'Nueva asociación',exact:true});
    const cancel=editor.getByRole('button',{name:'Cancelar',exact:true});
    await expect(cancel).toHaveCSS('font-size',`${16*scale/100}px`);
    await p.evaluate(()=>document.fonts.ready);
    const lines=await cancel.evaluate(e=>{const r=document.createRange();r.selectNodeContents(e);return new Set([...r.getClientRects()].map(b=>Math.round(b.top))).size;});
    expect(lines,`Cancelar a${width}px/${scale}%`).toBe(1);
    const save=editor.getByRole('button',{name:'Guardar asociación',exact:true});
    await expect(save).toBeDisabled();
    const associationLines=await save.evaluate(e=>{const node=e.firstChild!,start=node.textContent!.indexOf('asociación'),r=document.createRange();r.setStart(node,start);r.setEnd(node,start+'asociación'.length);return new Set([...r.getClientRects()].map(b=>Math.round(b.top))).size;});
    expect(associationLines,`asociación a${width}px/${scale}%`).toBe(1);
    expect(await editor.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
    await cancel.click();await expect(editor).toHaveCount(0);
   }
   expect(await p.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
   expect(await p.evaluate(()=>(window as any).__nativeCalls.filter((c:any)=>['configure','retry','clear','discard','settings','retryAutomatic','update'].includes(c.method)))).toEqual([]);
  }
  expect(writes).toEqual([]);expect(errors).toEqual([]);
 }finally{await context.close();}
});
