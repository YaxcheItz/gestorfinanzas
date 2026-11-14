import { expect, test, Locator } from '@playwright/test';
import { createSectionsFixture } from './secciones-fixture';
import fs from 'node:fs';

async function contrast(scope: Locator, icons = false, selector = 'input,select,textarea') {
  return scope.evaluate((root, {icons,selector}) => {
    const ctx = document.createElement('canvas').getContext('2d')!;
    const rgba = (value: string) => { ctx.clearRect(0,0,1,1);ctx.fillStyle=value;ctx.fillRect(0,0,1,1);const a=[...ctx.getImageData(0,0,1,1).data];return [a[0],a[1],a[2],a[3]/255]; };
    const blend=(a:number[],b:number[])=>[0,1,2].map(i=>a[i]*a[3]+b[i]*(1-a[3])).concat(1);
    const bg=(e:Element|null):number[]=>e?blend(rgba(getComputedStyle(e).backgroundColor),bg(e.parentElement)):[255,255,255,1];
    const lum=(a:number[])=>a.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
    const ratio=(a:number[],b:number[])=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
    return [...root.querySelectorAll(icons?'button svg,a svg':selector)].flatMap(e=>{
      if(!(e as HTMLElement).checkVisibility({checkOpacity:true,checkVisibilityCSS:true})||e.matches(':disabled,[type=hidden],[type=checkbox],[type=radio],[type=color]'))return [];
      const s=getComputedStyle(e),inside=bg(e),outside=bg(e.parentElement);
      const color=icons?(s.stroke==='none'?s.color:s.stroke):s.borderTopColor;
      return [{label:e.getAttribute('aria-label')||e.closest('label')?.textContent?.trim().slice(0,65)||e.getAttribute('name')||e.textContent?.trim()||e.tagName,color,background:inside,borderWidth:s.borderTopWidth,textRatio:ratio(blend(rgba(s.color),inside),inside),ratio:Math.min(ratio(blend(rgba(color),inside),inside),ratio(blend(rgba(color),outside),outside))}];
    });
  },{icons,selector});
}

for(const dark of [false,true])test(`bordes e iconos en ${dark?'oscuro':'claro'}`,async({browser,baseURL},info)=>{
  const {c,p,origin,writes,pageErrors}=await createSectionsFixture(browser,baseURL!);
  const evidence=[];
  try{
    await p.emulateMedia({reducedMotion:'reduce'});
    for(const route of ['cuentas','presupuestos','etiquetas','metas','libro-diario','reportes','configuracion']){
      await p.goto(origin+'/'+route);
      await p.evaluate(dark=>document.documentElement.classList.toggle('dark',dark),dark);
      if(route==='cuentas')await p.getByRole('button',{name:'+ Agregar cuenta',exact:true}).click();
      if(route==='presupuestos')await p.getByRole('button',{name:'Fijar Presupuesto',exact:true}).click();
      if(route==='configuracion')await p.locator('#profile summary').click();
      const scope=['cuentas','presupuestos'].includes(route)?p.getByRole('dialog'):p.locator('#main-content');
      await expect(scope.locator('input:visible,select:visible,textarea:visible').first()).toBeVisible();
      await p.locator('#main-content').focus();
      await p.waitForTimeout(400); // Dejar terminar las transiciones de color antes de medir.
      const fields=await contrast(scope),icons=await contrast(p.locator('.workspace-tools'),true);
      expect(fields.length).toBeGreaterThan(0);expect(icons.length).toBeGreaterThan(0);
      evidence.push({route,dark,fields,icons});
      await p.screenshot({path:info.outputPath(route+'.png'),fullPage:true});
    }
    fs.writeFileSync(info.outputPath('contraste.json'),JSON.stringify(evidence,null,2));
    expect(evidence.flatMap(e=>[...e.fields,...e.icons].filter(f=>f.ratio<3).map(f=>({route:e.route,...f})))).toEqual([]);
    expect(writes).toEqual([]);expect(pageErrors).toEqual([]);
  }finally{await c.close();}
});

for(const theme of ['CLARO','OSCURO','AUTO'])test(`selección de tema ${theme} sin guardar preferencias`,async({browser,baseURL},info)=>{
  const {c,p,origin,writes}=await createSectionsFixture(browser,baseURL!);
  try{
    await p.route('**/api/perfil',r=>r.fulfill({json:{success:true,data:{id:995,nombre:'Prueba visual',email:'ui@example.test',tema:theme,monedaPredeterminada:'MXN'}}}));
    await p.goto(origin+'/configuracion#appearance');
    const selected=p.locator('.settings-theme-choices [aria-pressed=true]');
    await expect(selected).toHaveCount(1);
    await p.waitForTimeout(400);
    const values=await contrast(p.locator('.settings-theme-choices'),false,'[aria-pressed=true]');
    await p.screenshot({path:info.outputPath('seleccion.png'),fullPage:true});
    fs.writeFileSync(info.outputPath('seleccion.json'),JSON.stringify(values,null,2));
    expect(values).toHaveLength(1);expect(values[0].ratio).toBeGreaterThanOrEqual(3);expect(values[0].textRatio).toBeGreaterThanOrEqual(4.5);
    expect(writes).toEqual([]);
  }finally{await c.close();}
});

test('fechas de Libro diario con texto ampliado',async({browser,baseURL},info)=>{
  const {c,p,origin,writes}=await createSectionsFixture(browser,baseURL!);
  try{
    await p.setViewportSize({width:320,height:844});await p.goto(origin+'/libro-diario');
    await p.evaluate(()=>{document.documentElement.style.fontSize='200%';document.documentElement.classList.add('dark');});
    await p.getByLabel('Desde',{exact:true}).fill('2026-10-01');
    await p.getByLabel('Hasta',{exact:true}).fill('2026-11-12');
    await expect(p.locator('#ledger-date-range')).toContainText('desde 2026-10-01 hasta 2026-11-12');
    await expect(p.getByLabel('Desde',{exact:true})).toHaveAccessibleDescription(/2026-10-01/);
    expect(await p.locator('#ledger-date-range').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
    await p.screenshot({path:info.outputPath('fechas-200.png'),fullPage:true});
    await p.getByLabel('Desde',{exact:true}).fill('');await p.getByLabel('Hasta',{exact:true}).fill('');
    await expect(p.locator('#ledger-date-range')).toContainText('desde sin límite hasta sin límite');
    expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect(writes).toEqual([]);
  }finally{await c.close();}
});

test('etiqueta de captura seleccionable con teclado y fecha legible',async({browser,baseURL},info)=>{
  const {c,p,origin,writes}=await createSectionsFixture(browser,baseURL!);
  try{
    await p.emulateMedia({reducedMotion:'reduce'});await p.setViewportSize({width:320,height:844});await p.goto(origin+'/dashboard');
    await p.evaluate(()=>{document.documentElement.style.fontSize='200%';document.documentElement.classList.add('dark');});
    await p.locator('.capture-dock__manual').click();
    await p.getByRole('button',{name:'Abrir formulario',exact:true}).click();
    const dialog=p.getByRole('dialog');await expect(dialog).toBeVisible();
    await p.screenshot({path:info.outputPath('captura-abierta.png'),fullPage:true});
    await dialog.locator('.entry-details summary').click();
    const chip=dialog.getByRole('button',{name:'#familia',exact:true});await chip.focus();await p.keyboard.press('Space');
    await dialog.getByLabel('Fecha',{exact:true}).fill('2026-11-12');
    await expect(dialog.locator('#quick-entry-selected-date')).toContainText('2026-11-12');
    await expect(dialog.getByLabel('Fecha',{exact:true})).toHaveAccessibleDescription(/2026-11-12/);
    expect(await dialog.locator('#quick-entry-selected-date').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
    await dialog.locator('#quick-entry-selected-date').scrollIntoViewIfNeeded();
    await expect(dialog.locator('#quick-entry-selected-date')).toBeInViewport();
    await p.screenshot({path:info.outputPath('captura-200.png'),fullPage:true});
    const values=await contrast(dialog,false,'.entry-tag-chip');
    fs.writeFileSync(info.outputPath('etiquetas.json'),JSON.stringify(values,null,2));
    expect(values.find(v=>v.label==='#familia')!.textRatio).toBeGreaterThanOrEqual(4.5);
    await expect(chip).toHaveAttribute('aria-pressed','true');
    await chip.focus();await p.keyboard.press('Space');await expect(chip).toHaveAttribute('aria-pressed','false');
    expect(writes).toEqual([]);
  }finally{await c.close();}
});

test('fechas y selección de filtros avanzados con teclado',async({browser,baseURL},info)=>{
  const {c,p,origin,writes}=await createSectionsFixture(browser,baseURL!);
  try{
    await p.emulateMedia({reducedMotion:'reduce'});await p.setViewportSize({width:320,height:844});await p.goto(origin+'/transacciones');
    await p.evaluate(()=>{document.documentElement.style.fontSize='200%';document.documentElement.classList.add('dark');});
    await p.getByRole('button',{name:'Abrir filtros avanzados'}).click();const dialog=p.getByRole('dialog');
    const chip=dialog.getByRole('button',{name:'Solo gastos',exact:true});await chip.focus();await p.keyboard.press('Space');
    await dialog.getByLabel('Desde',{exact:true}).fill('2026-10-01');await dialog.getByLabel('Hasta',{exact:true}).fill('2026-11-12');
    await p.screenshot({path:info.outputPath('filtros-200.png'),fullPage:true});
    await expect(chip).toHaveAttribute('aria-pressed','true');
    await expect(dialog.locator('#movement-date-range')).toContainText('2026-10-01 hasta 2026-11-12');
    await dialog.locator('#movement-date-range').scrollIntoViewIfNeeded();await expect(dialog.locator('#movement-date-range')).toBeInViewport();
    expect(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
    expect(await dialog.locator('.ledger-filter-sheet__body').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
    await p.screenshot({path:info.outputPath('fechas-completas.png'),fullPage:true});
    const selected=await contrast(dialog,false,'[aria-pressed=true]');expect(selected).toHaveLength(1);expect(selected[0].ratio).toBeGreaterThanOrEqual(3);
    expect(writes).toEqual([]);
  }finally{await c.close();}
});

test('fechas libres y de anclaje en Inicio',async({browser,baseURL},info)=>{
  const {c,p,origin,writes}=await createSectionsFixture(browser,baseURL!);
  try{
    await p.emulateMedia({reducedMotion:'reduce'});await p.setViewportSize({width:320,height:844});await p.goto(origin+'/dashboard');
    await p.evaluate(()=>{document.documentElement.style.fontSize='200%';document.documentElement.classList.add('dark');});
    await p.locator('.time-dropdown-btn').click();const dialog=p.getByRole('dialog');
    await dialog.getByRole('tab',{name:'Rango libre'}).click();
    await dialog.getByLabel('Desde',{exact:true}).fill('2026-10-01');await dialog.getByLabel('Hasta',{exact:true}).fill('2026-11-12');
    await p.screenshot({path:info.outputPath('rango-200.png'),fullPage:true});
    await dialog.getByRole('tab',{name:'Frecuencias'}).click();await dialog.locator('input[value=SEMANA]').check();
    await dialog.getByLabel('Fecha de anclaje',{exact:true}).fill('2026-11-02');
    await p.screenshot({path:info.outputPath('anclaje-200.png'),fullPage:true});
    await expect(dialog.getByLabel('Fecha de anclaje',{exact:true})).toHaveValue('2026-11-02');
    await dialog.getByRole('tab',{name:'Rango libre'}).click();
    await expect(dialog.getByLabel('Desde',{exact:true})).toHaveValue('2026-10-01');await expect(dialog.getByLabel('Hasta',{exact:true})).toHaveValue('2026-11-12');
    expect(writes).toEqual([]);
  }finally{await c.close();}
});

test('fecha del editor de propuesta ficticia sin confirmar',async({browser,baseURL},info)=>{
  const {c,p,origin,writes}=await createSectionsFixture(browser,baseURL!);let mocked=0;
  try{
    await p.route('**/api/asistente/captura-rapida',r=>{expect(r.request().method()).toBe('POST');mocked++;return r.fulfill({json:{success:true,data:{answer:'Propuesta ficticia para revisar',engine:'REGLAS',action:{id:'qa-date',type:'CREATE_TRANSACTION',summary:'Compra ficticia',data:{tipo:'GASTO',monto:25,moneda:'MXN',cuentaId:11,categoriaId:1,descripcion:'Compra ficticia',fecha:'2026-11-11'}}}}});});
    await p.emulateMedia({reducedMotion:'reduce'});await p.setViewportSize({width:320,height:844});await p.goto(origin+'/dashboard');
    await p.evaluate(()=>{document.documentElement.style.fontSize='200%';document.documentElement.classList.add('dark');});
    await p.locator('.capture-dock__manual').click();await p.locator('#quick-capture-text').fill('Compra ficticia 25');await p.locator('.capture-chat__send').click();
    await p.getByRole('button',{name:'Editar propuesta',exact:true}).click();
    const field=p.locator('input[name=editFecha]');await field.fill('2026-11-12');await field.scrollIntoViewIfNeeded();
    await p.screenshot({path:info.outputPath('editor-fecha-200.png'),fullPage:true});
    await expect(field).toHaveValue('2026-11-12');
    expect(await field.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);expect(mocked).toBe(1);expect(writes).toEqual([]);
    await p.getByRole('button',{name:'Cancelar edición',exact:true}).click();
  }finally{await c.close();}
});

test('fecha de aviso manual sin guardar revisión',async({browser,baseURL},info)=>{
  const {c,p,origin,writes,pageErrors}=await createSectionsFixture(browser,baseURL!);
  try{
    await p.emulateMedia({reducedMotion:'reduce'});await p.setViewportSize({width:320,height:844});await p.goto(origin+'/avisos');
    await p.evaluate(()=>{document.documentElement.style.fontSize='200%';document.documentElement.classList.add('dark');});
    await p.getByRole('button',{name:'Añadir aviso',exact:true}).click();const dialog=p.getByRole('dialog');
    const field=dialog.getByLabel('Fecha',{exact:true});await field.fill('2026-11-12');await field.scrollIntoViewIfNeeded();
    await p.screenshot({path:info.outputPath('aviso-fecha-200.png'),fullPage:true});
    await expect(field).toHaveValue('2026-11-12');expect(await field.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
    await dialog.getByRole('button',{name:'Cerrar aviso'}).click();expect(writes).toEqual([]);expect(pageErrors).toEqual([]);
  }finally{await c.close();}
});
