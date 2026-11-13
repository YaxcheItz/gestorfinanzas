import { expect, test } from '@playwright/test';
import { createSectionsFixture } from './secciones-fixture';
import fs from 'node:fs';

test('Reportes cabe a 320 px con letra ampliada y fuentes alternativas',async({browser,baseURL},info)=>{
  const {c,p,origin,writes,pageErrors}=await createSectionsFixture(browser,baseURL!);
  const evidence=[];
  try{
    await p.emulateMedia({reducedMotion:'reduce'});await p.setViewportSize({width:320,height:844});await p.goto(origin+'/reportes');
    await expect(p.locator('.reports-summary')).toBeVisible();
    for(const dark of [false,true])for(const font of ['Arial','Verdana','Tahoma']){
      await p.evaluate(({dark,font})=>{document.documentElement.classList.toggle('dark',dark);document.documentElement.style.fontSize='200%';(document.querySelector('.monai-theme') as HTMLElement).style.fontFamily=font;},{dark,font});
      await p.evaluate(()=>document.fonts.ready);
      const data=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll<HTMLElement>('#main-content *')].filter(e=>e.getBoundingClientRect().right>innerWidth+.5).map(e=>({tag:e.tagName,classes:e.className,text:e.textContent?.trim().slice(0,60),rect:e.getBoundingClientRect().toJSON(),minWidth:getComputedStyle(e).minWidth,overflow:getComputedStyle(e).overflowX}))}));
      evidence.push({dark,font,...data});await p.screenshot({path:info.outputPath(font+'-'+dark+'.png'),fullPage:true});
    }
    fs.writeFileSync(info.outputPath('ancho.json'),JSON.stringify(evidence,null,2));
    expect(evidence.filter(e=>e.scroll>e.width)).toEqual([]);expect(writes).toEqual([]);expect(pageErrors).toEqual([]);
  }finally{await c.close();}
});
