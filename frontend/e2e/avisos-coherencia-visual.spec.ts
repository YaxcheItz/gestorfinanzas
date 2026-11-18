import {expect,test} from '@playwright/test';
import {syntheticAndroid} from './avisos-compartidos-fixture';
import {createSectionsFixture} from './secciones-fixture';

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

for (const dark of [false, true]) {
  test(`Revisar aviso distingue cuentas y categorías con el mismo prefijo · ${dark ? 'oscuro' : 'claro'}`, async ({ browser, baseURL }, info) => {
    const { c, p, writes, pageErrors } = await createSectionsFixture(browser, baseURL!);
    const accounts = ['Cuenta ficticia para gastos del hogar', 'Cuenta ficticia para gastos del trabajo'];
    const categories = ['Compras familiares de primera necesidad', 'Compras familiares de celebración'];
    await p.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (route.request().method() !== 'GET') return route.fallback();
      if (path === '/api/avisos') return route.fulfill({ json: { success: true, data: {
        totalPages: 1,
        content: [{
          id: 'qa-1', version: 1, origen: 'MANUAL', clase: 'COMPRA', estado: 'PENDIENTE', moneda: 'MXN',
          resumen: 'Compra ficticia', coincidencias: [],
          datos: { cuentaId: 11, categoriaId: 21, tipo: 'GASTO', monto: 50, fecha: '2026-11-17', descripcion: 'Compra ficticia' },
        }],
      } } });
      if (path === '/api/cuentas') return route.fulfill({ json: { success: true, data: accounts.map((nombre, index) => ({
        id: 11 + index, nombre, moneda: 'MXN', tipo: 'DEBITO', activo: true,
      })) } });
      if (path === '/api/categorias') return route.fulfill({ json: { success: true, data: categories.map((nombre, index) => ({
        id: 21 + index, nombre, tipo: 'GASTO', activo: true,
      })) } });
      return route.fallback();
    });

    try {
      for (const [width, scale] of [[320, 200], [390, 100], [1280, 100]]) {
        await p.setViewportSize({ width, height: 844 });
        await p.goto('/avisos');
        const trigger = p.getByRole('button', { name: 'Revisar y corregir' });
        await trigger.click();
        const editor = p.getByRole('dialog', { name: 'Revisar aviso' });
        await p.evaluate(({ scale, dark }) => {
          document.documentElement.style.fontSize = scale + '%';
          document.documentElement.classList.toggle('dark', dark);
        }, { scale, dark });
        await p.evaluate(() => document.fonts.ready);
        const account = editor.getByRole('combobox', { name: 'Cuenta', exact: true });
        const category = editor.getByRole('combobox', { name: 'Categoría', exact: true });
        const accountText = editor.locator('[name="cuenta"] + .select-value');
        const categoryText = editor.locator('[name="categoria"] + .select-value');
        await account.scrollIntoViewIfNeeded();
        if (width === 320) await p.screenshot({ path: info.outputPath('seleccion-original.png') });
        await expect(accountText).toHaveText(accounts[0] + ' · MXN');
        await expect(categoryText).toHaveText(categories[0]);

        await editor.locator('[name="moneda"]').focus();
        await p.keyboard.press('Tab');
        await expect(account).toBeFocused();
        await expect(accountText).toHaveCSS('outline-style', 'solid');
        await account.selectOption({ label: accounts[1] + ' · MXN' });
        await category.selectOption({ label: categories[1] });
        await expect(accountText).toHaveText(accounts[1] + ' · MXN');
        await expect(categoryText).toHaveText(categories[1]);
        for (const value of [accountText, categoryText]) {
          await expect(value).toHaveCSS('font-size', `${16 * scale / 100}px`);
          const fits = await value.evaluate(el => {
            const box = el.getBoundingClientRect();
            const range = document.createRange();
            range.selectNodeContents(el);
            return [...range.getClientRects()].every(line => line.left >= box.left && line.right <= box.right + 1);
          });
          expect(fits).toBe(true);
          if (width === 320) {
            expect(await value.evaluate(el => el.clientHeight)).toBeGreaterThan(64);
          }
        }
        await category.scrollIntoViewIfNeeded();
        if (width === 320) await p.screenshot({ path: info.outputPath('seleccion-cambiada.png') });
        expect(await editor.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
        await account.selectOption({ label: 'Por elegir' });
        await category.selectOption({ label: 'Sin categoría' });
        await expect(accountText).toHaveText('Por elegir');
        await expect(categoryText).toHaveText('Sin categoría');
        await p.keyboard.press('Escape');
        await expect(editor).toHaveCount(0);
        await expect(trigger).toBeFocused();
      }
      expect(writes).toEqual([]);
      expect(pageErrors).toEqual([]);
    } finally {
      await c.close();
    }
  });
}
