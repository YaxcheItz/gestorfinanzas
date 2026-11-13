import { expect, Locator, test } from '@playwright/test';
import { createSectionsFixture } from './secciones-fixture';
import fs from 'node:fs';

async function contrast(locator:Locator,property:'backgroundColor'|'outlineColor'|'color'='backgroundColor'){
  return locator.evaluate((e,property)=>{
    const ctx=document.createElement('canvas').getContext('2d')!;
    const rgba=(s:string)=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=s;ctx.fillRect(0,0,1,1);const c=[...ctx.getImageData(0,0,1,1).data];return [c[0],c[1],c[2],c[3]/255];};
    const blend=(a:number[],b:number[])=>[0,1,2].map(i=>a[i]*a[3]+b[i]*(1-a[3])).concat(1);
    const bg=(el:Element|null):number[]=>el?blend(rgba(getComputedStyle(el).backgroundColor),bg(el.parentElement)):[255,255,255,1];
    const lum=(a:number[])=>a.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
    const s=getComputedStyle(e),b=bg(property==='color'?e:e.parentElement),f=blend(rgba(s[property]),b),x=lum(f),y=lum(b);
    return {color:s[property],background:b,ratio:(Math.max(x,y)+.05)/(Math.min(x,y)+.05),outlineStyle:s.outlineStyle,outlineWidth:s.outlineWidth};
  },property);
}

async function focus(locator:Locator){
  await locator.focus();await locator.page().keyboard.press('Shift');await expect(locator).toBeFocused();
  const style=await locator.evaluate(e=>{const s=getComputedStyle(e);return {visible:e.matches(':focus-visible'),outline:s.outlineStyle,width:s.outlineWidth,shadow:s.boxShadow};});
  expect(style.visible).toBe(true);expect(style.outline!=='none'&&style.width!=='0px'||style.shadow!=='none').toBe(true);
  if(style.outline!=='none'&&style.width!=='0px')expect((await contrast(locator,'outlineColor')).ratio).toBeGreaterThanOrEqual(3);
}

for(const dark of [false,true]){
  const mode=dark?'oscuro':'claro';
  test(`casillas y radios con teclado en ${mode}`,async({browser,baseURL},info)=>{
    const {c,p,origin,writes,pageErrors}=await createSectionsFixture(browser,baseURL!);
    try{
      await p.emulateMedia({reducedMotion:'reduce'});await p.setViewportSize({width:320,height:844});
      await p.route('**/api/libro-diario/backfill',r=>{expect(r.request().method()).toBe('GET');return r.fulfill({json:{success:true,data:{totalEvaluados:1,pendientes:1,yaContabilizados:0,omitidos:0,procesados:0,conciliacion:{},conciliacionCuentas:[],motivosOmitidos:{}}}});});
      for(const route of ['configuracion#profile','categorias','libro-diario','transacciones']){
        if(route==='transacciones')await p.route('**/api/categorias/mias',r=>r.fulfill({json:{success:true,data:[{id:1,nombre:'Categoría ficticia',tipo:'GASTO',color:'#ee7777',icono:'🍎',activo:true}]}}));
        await p.goto(origin+'/'+route);await p.evaluate(dark=>{document.documentElement.style.fontSize='200%';document.documentElement.classList.toggle('dark',dark);},dark);
        if(route==='categorias')await p.getByRole('button',{name:/Nueva categor/}).click();
        if(route==='libro-diario'){await p.getByText('Historial anterior',{exact:true}).click();await p.getByRole('button',{name:'Revisar historial',exact:true}).click();}
        if(route==='transacciones')await p.getByRole('button',{name:'Abrir filtros avanzados'}).click();
        const checkbox=p.locator('input[type=checkbox]:visible').first();await expect(checkbox).toBeVisible();
        const initial=await checkbox.isChecked();await focus(checkbox);await p.keyboard.press('Space');expect(await checkbox.isChecked()).toBe(!initial);
        await checkbox.screenshot({path:info.outputPath(route.split('#')[0]+'-cambiado.png')});
        await p.screenshot({path:info.outputPath(route.split('#')[0]+'-200.png'),fullPage:true});
        await p.keyboard.press('Space');expect(await checkbox.isChecked()).toBe(initial);
        await checkbox.screenshot({path:info.outputPath(route.split('#')[0]+'-restaurado.png')});
      }
      await p.goto(origin+'/dashboard');await p.evaluate(dark=>{document.documentElement.style.fontSize='200%';document.documentElement.classList.toggle('dark',dark);},dark);
      await p.locator('.time-dropdown-btn').click();const dialog=p.getByRole('dialog');await dialog.getByRole('tab',{name:'Frecuencias'}).click();
      const week=dialog.locator('input[value=SEMANA]');await focus(week);await p.keyboard.press('Space');await expect(week).toBeChecked();await p.keyboard.press('ArrowRight');
      await expect(dialog.locator('input[value=CATORCENA]')).toBeChecked();await expect(week).not.toBeChecked();
      await p.screenshot({path:info.outputPath('radios-200.png'),fullPage:true});
      expect(writes).toEqual([]);expect(pageErrors).toEqual([]);
    }finally{await c.close();}
  });

  test(`selección de color con marca visible en ${mode}`,async({browser,baseURL},info)=>{
    const {c,p,origin,writes}=await createSectionsFixture(browser,baseURL!);
    try{
      await p.setViewportSize({width:320,height:844});await p.goto(origin+'/categorias');await p.evaluate(dark=>{document.documentElement.style.fontSize='200%';document.documentElement.classList.toggle('dark',dark);},dark);
      await p.getByRole('button',{name:/Nueva categor/}).click();const dialog=p.getByRole('dialog');
      const colors=dialog.getByRole('button',{name:/^Color #/});await expect(colors.first()).toBeVisible();expect(await colors.count()).toBeGreaterThan(1);
      const target=colors.nth(1);await focus(target);await p.keyboard.press('Space');await expect(target).toHaveAttribute('aria-pressed','true');
      await p.screenshot({path:info.outputPath('color-selected.png'),fullPage:true});
      await expect(target.locator('.category-choice-check')).toBeVisible();expect((await contrast(target.locator('.category-choice-check'),'color')).ratio).toBeGreaterThanOrEqual(4.5);
      await target.hover();await expect(target.locator('.category-choice-check')).toBeVisible();
      await focus(colors.nth(2));await expect(target.locator('.category-choice-check')).toBeVisible();
      const icon=dialog.getByRole('button',{name:/^Icono /}).nth(1);await focus(icon);await p.keyboard.press('Space');await expect(icon).toHaveAttribute('aria-pressed','true');await expect(icon.locator('.category-choice-check')).toBeVisible();
      await p.screenshot({path:info.outputPath('icon-selected.png'),fullPage:true});expect(writes).toEqual([]);
      const emoji=dialog.getByRole('button',{name:/^Usar emoji /}).first();await focus(emoji);await p.keyboard.press('Space');
      await expect(emoji).toHaveAttribute('aria-pressed','true');await expect(emoji.locator('.category-choice-check')).toBeVisible();
      await expect(icon).toHaveAttribute('aria-pressed','false');await expect(icon.locator('.category-choice-check')).toHaveCount(0);
      await p.screenshot({path:info.outputPath('emoji-selected.png'),fullPage:true});expect(writes).toEqual([]);
    }finally{await c.close();}
  });

  test(`barras de Reportes distinguibles sin color en ${mode}`,async({browser,baseURL},info)=>{
    const {c,p,origin,writes}=await createSectionsFixture(browser,baseURL!);
    try{
      await p.route('**/api/dashboard/analitica*',r=>r.fulfill({json:{success:true,data:{gastosPorCategoria:[],ultimosSeisMeses:[{anio:2026,mes:10,ingresos:100,gastos:100,moneda:'MXN'},{anio:2026,mes:11,ingresos:0,gastos:50,moneda:'MXN'}]}}}));
      await p.setViewportSize({width:320,height:844});await p.goto(origin+'/reportes');await p.evaluate(dark=>{document.documentElement.style.fontSize='200%';document.documentElement.classList.toggle('dark',dark);},dark);
      await expect(p.locator('.expense-bar').first()).toBeVisible();await p.locator('.trend-chart').scrollIntoViewIfNeeded();
      await p.screenshot({path:info.outputPath('reportes.png'),fullPage:true});
      expect(await p.locator('.expense-bar').first().evaluate(e=>getComputedStyle(e).backgroundImage)).not.toBe('none');
      expect(await p.locator('.income-bar').first().evaluate(e=>getComputedStyle(e).backgroundImage)).toBe('none');
      const summary=p.getByText('Ver cifras por mes',{exact:true});await focus(summary);await p.keyboard.press('Enter');await expect(p.getByRole('table')).toBeVisible();
      await expect(p.getByRole('table')).toContainText('Ingresos');await expect(p.getByRole('table')).toContainText('Gastos');
      await expect(p.getByRole('table').getByRole('row')).toHaveCount(3);expect(writes).toEqual([]);
    }finally{await c.close();}
  });

  for(const view of ['dashboard','presupuestos'])test(`presupuesto normal, cerca y excedido en ${view}/${mode}`,async({browser,baseURL},info)=>{
    const {c,p,origin,writes}=await createSectionsFixture(browser,baseURL!);
    try{
      await p.route('**/api/presupuestos*',r=>r.fulfill({json:{success:true,data:{mes:11,anio:2026,presupuestos:[50,85,110].map((value,i)=>({id:51+i,categoriaId:i+1,categoriaNombre:['Normal ficticio','Cerca ficticio','Excedido ficticio'][i],montoLimite:100,montoGastado:value,montoDisponible:100-value,porcentajeConsumido:value,moneda:'MXN',mes:11,anio:2026,estado:value>=100?'EXCEDIDO':value>=80?'ALERTA':'NORMAL'})),resumenPorMoneda:[]}}}));
      await p.setViewportSize({width:320,height:844});await p.goto(origin+'/'+view);await p.evaluate(dark=>{document.documentElement.style.fontSize='200%';document.documentElement.classList.toggle('dark',dark);},dark);
      const bars=p.getByRole('progressbar');await expect(bars).toHaveCount(3);const values=[];
      for(const bar of await bars.all()){
        const fill=view==='dashboard'?bar.locator('.home-budget-progress__fill'):bar.locator('div').first();await bar.scrollIntoViewIfNeeded();
        values.push(await contrast(fill));
      }
      await p.screenshot({path:info.outputPath('presupuestos.png'),fullPage:true});fs.writeFileSync(info.outputPath('contraste.json'),JSON.stringify(values,null,2));
      expect(values.filter(v=>v.ratio<3)).toEqual([]);expect(writes).toEqual([]);
    }finally{await c.close();}
  });

  test(`categoría de Inicio anuncia selección y permite quitarla en ${mode}`,async({browser,baseURL},info)=>{
    const {c,p,origin,writes}=await createSectionsFixture(browser,baseURL!);
    try{
      await p.setViewportSize({width:320,height:844});await p.goto(origin+'/dashboard');await p.evaluate(dark=>{document.documentElement.style.fontSize='200%';document.documentElement.classList.toggle('dark',dark);},dark);
      const button=p.locator('.home-category__bar-button').first();await expect(button).toBeVisible();await focus(button);await p.keyboard.press('Enter');
      await p.screenshot({path:info.outputPath('categoria-selected.png'),fullPage:true});await expect(button).toHaveAttribute('aria-pressed','true');
      const fill=button.locator('.home-category__bar'),value=await contrast(fill),outline=await contrast(fill,'outlineColor');
      expect(value.ratio>=3||outline.outlineStyle!=='none'&&outline.outlineWidth!=='0px'&&outline.ratio>=3).toBe(true);
      await p.keyboard.press('Enter');await expect(button).toHaveAttribute('aria-pressed','false');expect(writes).toEqual([]);
    }finally{await c.close();}
  });
}
