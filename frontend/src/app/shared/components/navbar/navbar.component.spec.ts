import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { NavbarComponent } from './navbar.component';
import { ListasService } from '../../../core/services/listas.service';

describe('Navbar: acciones solo en Inicio',()=>{
  beforeEach(async()=>{
    await TestBed.configureTestingModule({imports:[NavbarComponent],providers:[provideHttpClient(),provideRouter([]),
      {provide:ListasService,useValue:{abierta:signal(false),contexto:{activa:()=>({nombre:'Lista ficticia'}),activaId:()=>21,puedeEscribir:()=>true}}}]}).compileComponents();
  });
  for(const url of ['/dashboard','/dashboard?mes=11','/dashboard#resumen','/cuentas','/transacciones','/reportes','/configuracion']){
    it(url,()=>{
      vi.spyOn(TestBed.inject(Router),'url','get').mockReturnValue(url);
      const fixture=TestBed.createComponent(NavbarComponent);fixture.detectChanges();
      const home=url.split(/[?#]/)[0]==='/dashboard';
      expect(!!fixture.nativeElement.querySelector('.capture-dock')).toBe(home);
      expect(!!fixture.nativeElement.querySelector('a[aria-label="Inicio"]')).toBe(!home);
    });
  }
});
