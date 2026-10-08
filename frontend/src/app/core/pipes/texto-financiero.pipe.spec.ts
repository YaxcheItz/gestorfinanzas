import { TestBed } from '@angular/core/testing';
import { PrivacidadService } from '../services/privacidad.service';
import { TextoFinancieroPipe } from './texto-financiero.pipe';
it('oculta importes en texto y vuelve a mostrarlos al cambiar privacidad',()=>{
 const pipe=TestBed.runInInjectionContext(()=>new TextoFinancieroPipe());const privacidad=TestBed.inject(PrivacidadService);
 const texto='Gasto $1,250.50 MXN; saldo 900';expect(pipe.transform(texto)).toBe(texto);
 privacidad.aplicar(1,true);expect(pipe.transform(texto)).not.toMatch(/\d/);
 privacidad.aplicar(1,false);expect(pipe.transform(texto)).toBe(texto);
});
