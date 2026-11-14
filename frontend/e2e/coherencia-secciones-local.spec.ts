import {test,expect,Page} from '@playwright/test';
import {coherenceFixture,coherenceCategory} from './coherencia-fixture';

const layouts=[[320,'200%',true],[320,'200%',false],[390,'100%',true],[390,'100%',false],[1280,'100%',true],[1280,'100%',false]]as const;
async function open(p:Page,path:string,width:number,font:string,dark:boolean){
 await p.setViewportSize({width,height:844});await p.goto('/'+path);await expect(p.locator('#main-content h1').first()).toBeVisible();
 await p.evaluate(({font,dark})=>{document.documentElement.style.fontSize=font;document.documentElement.classList.toggle('dark',dark);},{font,dark});await p.evaluate(()=>document.fonts.ready);await p.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));
}

for(const path of ['cuentas','presupuestos','categorias','etiquetas','pareja','configuracion'])
test(`título de ${path} respeta el texto ampliado`,async({browser,baseURL})=>{
 const {c,p,writes,pageErrors}=await coherenceFixture(browser,baseURL!);
 try{
  for(const[width,font,dark]of layouts){
   await open(p,path,width,font,dark);expect(await p.locator('#main-content h1').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBe(font==='200%'?60:30);
   expect(await p.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
   if(path==='presupuestos')await expect(p.locator('.budget-period-controls span').filter({hasText:'|'})).toHaveAttribute('aria-hidden','true');
  }
  expect(writes).toEqual([]);expect(pageErrors).toEqual([]);
 }finally{await c.close();}
});

test('Inicio amplía selector, enlaces y títulos sin superponer acciones',async({browser,baseURL})=>{
 const {c,p,writes,pageErrors}=await coherenceFixture(browser,baseURL!);
 try{
  for(const[width,font,dark]of layouts){
   await open(p,'dashboard',width,font,dark);const scale=font==='200%'?2:1;
   const currency=p.getByRole('combobox',{name:'Moneda del balance',exact:true});expect(await currency.evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBe(11*scale);expect((await currency.boundingBox())!.height).toBeGreaterThanOrEqual(44);
   for(const e of await p.locator('.dashboard-screen__section-heading h2').all())expect(await e.evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBe(20*scale);
   for(const e of await p.locator('.dashboard-screen__text-link').all())expect(await e.evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBe(13*scale);
   for(const head of await p.locator('.dashboard-screen__section-heading').all())expect(await head.evaluate(e=>{const a=e.querySelector('h2')?.getBoundingClientRect(),b=e.querySelector('.dashboard-screen__text-link')?.getBoundingClientRect();return!a||!b||a.right<=b.left+1||a.bottom<=b.top+1||b.bottom<=a.top+1;})).toBe(true);
   expect(await p.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
  }
  expect(writes).toEqual([]);expect(pageErrors).toEqual([]);
 }finally{await c.close();}
});

test('nombre de categoría y explicación de Metas conservan todo el texto ampliado',async({browser,baseURL})=>{
 const {c,p,writes,pageErrors}=await coherenceFixture(browser,baseURL!);
 try{
  for(const[width,font,dark]of layouts){
   await open(p,'categorias',width,font,dark);const name=p.getByRole('heading',{name:coherenceCategory,exact:true});await expect(name).toBeVisible();expect(await name.evaluate(e=>({clipped:e.scrollWidth>e.clientWidth+1,nowrap:getComputedStyle(e).whiteSpace==='nowrap'}))).toEqual({clipped:false,nowrap:false});
   await open(p,'metas',width,font,dark);const note=p.getByText('Los movimientos aparecen en tu historial como transferencias.',{exact:false});expect(await note.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);expect(await p.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
  }
  expect(writes).toEqual([]);expect(pageErrors).toEqual([]);
 }finally{await c.close();}
});

test('aportes de Compartidos usan el color de ingreso y contraste legible',async({browser,baseURL})=>{
 const {c,p,writes,pageErrors}=await coherenceFixture(browser,baseURL!);
 try{
  for(const dark of [false,true])for(const width of [390,1280]){
   await open(p,'pareja',width,'100%',dark);const amount=p.locator('.shared-movement span').filter({hasText:'+MX$'}).first();await expect(amount).toBeVisible();
   const ratio=await amount.evaluate(e=>{const luminance=(s:string)=>{const a=s.match(/[\d.]+/g)!.slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return a[0]*.2126+a[1]*.7152+a[2]*.0722;};let parent:Element|null=e;while(parent&&getComputedStyle(parent).backgroundColor==='rgba(0, 0, 0, 0)')parent=parent.parentElement;const a=luminance(getComputedStyle(e).color),b=luminance(getComputedStyle(parent!).backgroundColor);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);});expect(ratio).toBeGreaterThanOrEqual(4.5);
  }
  expect(writes).toEqual([]);expect(pageErrors).toEqual([]);
 }finally{await c.close();}
});

test('referencia de Movimientos conserva tipografía y filas existentes',async({browser,baseURL})=>{
 const {c,p,writes,pageErrors}=await coherenceFixture(browser,baseURL!);
 try{
  for(const[width,font,dark]of layouts){await open(p,'transacciones',width,font,dark);expect(await p.locator('#main-content h1').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeCloseTo(width===1280?32:width===390?25.35:25,2);expect(await p.locator('.tx-item__title').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBe(15);expect(await p.locator('.tx-item__account').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBe(12);expect(await p.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);}
  expect(writes).toEqual([]);expect(pageErrors).toEqual([]);
 }finally{await c.close();}
});
