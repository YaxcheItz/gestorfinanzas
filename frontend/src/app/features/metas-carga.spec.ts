import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of, Subject } from 'rxjs';
import { FinanzasService } from '../core/services/finanzas.service';
import { MetasComponent } from './metas.component';

describe('Metas estados',()=>{
 it('distingue carga y fallo de ausencia de metas',async()=>{
  const pendiente=new Subject<any>();const api={getCuentas:vi.fn().mockReturnValueOnce(pendiente).mockReturnValueOnce(of({success:true,data:[]}))};
  await TestBed.configureTestingModule({imports:[MetasComponent],providers:[provideHttpClient(),{provide:FinanzasService,useValue:api}]}).compileComponents();
  const fixture=TestBed.createComponent(MetasComponent);fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('[aria-label="Cargando metas"]')).not.toBeNull();
  expect(fixture.nativeElement.textContent).not.toContain('Aún no tienes metas');
  pendiente.error({status:503});await fixture.whenStable();fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
  expect(fixture.nativeElement.textContent).not.toContain('Aún no tienes metas');
  await fixture.componentInstance.cargar();fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toContain('Aún no tienes metas');fixture.destroy();
 });
});
