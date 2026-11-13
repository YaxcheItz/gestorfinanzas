import { test, expect } from '@playwright/test';

test('listas e invitaciones ficticias: tamaños, permisos, error y foco', async ({page,baseURL}, info) => {
 const origin=new URL(baseURL!).origin;
 const writes:string[]=[];
 const members=[{id:995,nombre:'Propietaria ficticia de la lista familiar',rol:'PROPIETARIO'},{id:996,nombre:'Participante ficticio con nombre muy largo para comprobar acciones',rol:'EDITOR'}];
 const lists=[{id:21,nombre:'Personal QA',emoji:'🌿',moneda:'MXN',personal:true,archivada:false,rol:'PROPIETARIO',miembros:[members[0]]},{id:22,nombre:'Vacaciones familiares compartidas de prueba',emoji:'🏖️',moneda:'MXN',personal:false,archivada:false,rol:'PROPIETARIO',miembros:members}];
 await page.addInitScript(()=>{localStorage.setItem('finanzas_token',`qa.${btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))}.synthetic`);localStorage.setItem('finanzas_user',JSON.stringify({id:995,nombre:'QA',email:'ui@example.test'}));});
 await page.route('**/*',async r=>{
 const u=new URL(r.request().url());
 if(!u.pathname.startsWith('/api/'))return u.origin===origin?r.continue():r.abort();
 if(r.request().method()!=='GET'){
 writes.push(r.request().method()+' '+u.pathname);
 if(u.pathname==='/api/listas/22/invitacion'&&r.request().method()==='POST')return r.fulfill({json:{success:true,data:{codigo:'CODIGO-FICTICIO-SIN-VALIDEZ-EXTERNA',vence:'2026-11-19',rol:'LECTOR'}}});
 return r.fulfill({status:503,json:{success:false,message:'Servicio ficticio no disponible'}});
 }
 let data:any=[];
 if(u.pathname.endsWith('/perfil'))data={id:995,nombre:'QA',email:'ui@example.test',tema:'CLARO',monedaPredeterminada:'MXN'};
 if(u.pathname==='/api/listas')data=lists;
 return r.fulfill({json:{success:true,data}});
 });
 await page.setViewportSize({width:320,height:640});await page.goto('/cuentas');
 await page.getByRole('button',{name:'Cambiar lista',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Tus listas'});await expect(dialog).toBeVisible();
 await page.keyboard.press('Tab');expect(await page.locator('dialog').evaluate(e=>e.contains(document.activeElement))).toBe(true);
 await page.screenshot({path:info.outputPath('listas-320.png')});
 await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 await page.getByRole('button',{name:'Opciones de lista '+lists[1].nombre}).click();
 await page.getByText('Participantes · 2',{exact:true}).click();
 await page.getByText('Compartir lista',{exact:true}).click();
 await page.getByRole('button',{name:'Cambiar a lector a '+members[1].nombre,exact:true}).scrollIntoViewIfNeeded();
 await page.screenshot({path:info.outputPath('participantes-200.png')});
 const geometry=await page.locator('dialog').evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth,fonts:[...e.querySelectorAll('strong,summary,input')].map(x=>getComputedStyle(x).fontSize)}));
 expect(geometry.scroll).toBeLessThanOrEqual(geometry.width+1);
 expect(geometry.fonts).toContain('32px');
 const memberName=await page.locator('.miembro>span').last().boundingBox();
 expect(memberName!.width).toBeGreaterThan(180);
 for(const button of await page.locator('.miembro>button').all()){const b=await button.boundingBox();expect(b!.height).toBeGreaterThanOrEqual(44);}
 await page.getByRole('combobox',{name:'Acceso',exact:true}).selectOption('LECTOR');
 await expect(page.locator('#rol-invitacion-ayuda')).toHaveText('S\u00f3lo puede consultar.');
 await page.getByRole('button',{name:'Crear código de invitación',exact:true}).click();
 await expect(page.getByLabel('Código para compartir')).toHaveValue('CODIGO-FICTICIO-SIN-VALIDEZ-EXTERNA');
 await page.screenshot({path:info.outputPath('invitacion-200.png')});
 await page.keyboard.press('Escape');await expect(page.locator('dialog')).not.toBeVisible();
 await expect(page.getByRole('button',{name:'Cambiar lista',exact:true})).toBeFocused();
 await page.getByRole('button',{name:'Cambiar lista',exact:true}).click();
 await page.getByRole('button',{name:'Tengo un código de invitación'}).click();
 await page.getByLabel('Código de invitación',{exact:true}).fill('CODIGO-FICTICIO');
 await page.getByRole('button',{name:'Unirme',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Servicio ficticio');
 await expect(page.getByLabel('Código de invitación',{exact:true})).toHaveValue('CODIGO-FICTICIO');
 await page.screenshot({path:info.outputPath('union-error-200.png')});
 await page.keyboard.press('Escape');
 for(const width of [390,1280]){
 await page.setViewportSize({width,height:844});await page.evaluate(()=>{document.documentElement.style.fontSize='100%';document.documentElement.classList.add('dark');});
 await page.getByRole('button',{name:'Cambiar lista',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Tus listas'})).toBeVisible();
 await page.screenshot({path:info.outputPath('listas-dark-'+width+'.png')});await page.keyboard.press('Escape');
 }
 lists[1].rol='LECTOR';
 await page.getByRole('button',{name:'Cambiar lista',exact:true}).click();
 await page.getByRole('button',{name:'Opciones de lista '+lists[1].nombre}).click();
 await expect(page.getByRole('button',{name:'Guardar lista',exact:true})).toHaveCount(0);
 await expect(page.getByText('Compartir lista',{exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Salir de esta lista'})).toBeVisible();
 expect(writes).toEqual(['POST /api/listas/22/invitacion','POST /api/listas/unirse']);
});
