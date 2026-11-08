import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { FinanzasService } from '../../core/services/finanzas.service';
import { FeatureStylesService } from '../../core/services/feature-styles.service';
import { LibroDiarioComponent } from './libro-diario.component';

describe('Libro diario en carga',()=>{
 it('oculta el resultado anterior mientras se consulta otro filtro',async()=>{
  const pendiente=new Subject<any>();
  TestBed.configureTestingModule({imports:[LibroDiarioComponent],providers:[provideRouter([]),
    {provide:FeatureStylesService,useValue:{load:()=>undefined}},
    {provide:FinanzasService,useValue:{getCuentas:()=>of({success:true,data:[]}),getLibroDiario:()=>pendiente}}
  ]});
  const fixture=TestBed.createComponent(LibroDiarioComponent);fixture.detectChanges();
  fixture.componentInstance.pagina.set({empty:true,content:[]} as any);fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('[aria-label="Cargando asientos"]')).not.toBeNull();
  expect(fixture.nativeElement.textContent).not.toContain('A\u00fan no hay asientos contables');
  pendiente.next({success:true,data:{empty:true,content:[]}});fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toContain('A\u00fan no hay asientos contables');fixture.destroy();
 });
});
