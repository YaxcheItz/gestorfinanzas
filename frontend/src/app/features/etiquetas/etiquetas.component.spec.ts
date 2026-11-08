import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { FinanzasService } from '../../core/services/finanzas.service';
import { EtiquetasComponent } from './etiquetas.component';
describe('EtiquetasComponent', () => {
 it('distingue carga, error y lista vacia', async () => {
  const pendiente=new Subject<any>(); const api={getEtiquetasPersonales:vi.fn().mockReturnValueOnce(pendiente).mockReturnValueOnce(of({success:true,data:[]}))};
  await TestBed.configureTestingModule({imports:[EtiquetasComponent],providers:[{provide:FinanzasService,useValue:api}]}).compileComponents();
  const fixture=TestBed.createComponent(EtiquetasComponent); fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('[aria-label="Cargando etiquetas"]')).not.toBeNull();
  expect(fixture.nativeElement.textContent).not.toContain('Aún no tienes etiquetas');
  pendiente.error({status:503});fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
  expect(fixture.nativeElement.textContent).not.toContain('Aún no tienes etiquetas');
  fixture.componentInstance.cargar();fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toContain('Aún no tienes etiquetas');fixture.destroy();
 });
 it('crea y elimina etiquetas del catalogo con confirmacion', async () => {
  const api={getEtiquetasPersonales:vi.fn(()=>of({success:true,data:[{id:4,nombre:'viaje'}]})), crearEtiquetaPersonal:vi.fn(()=>of({success:true,data:{id:5,nombre:'trabajo'}})), eliminarEtiquetaPersonal:vi.fn(()=>of({success:true,data:null}))};
  await TestBed.configureTestingModule({imports:[EtiquetasComponent],providers:[{provide:FinanzasService,useValue:api}]}).compileComponents();
  const fixture=TestBed.createComponent(EtiquetasComponent); fixture.detectChanges(); const component=fixture.componentInstance;
  component.nombre='trabajo'; component.crear(); expect(api.crearEtiquetaPersonal).toHaveBeenCalledWith('trabajo');
  const confirmar=vi.spyOn(window,'confirm').mockReturnValue(true); component.eliminar({id:4,nombre:'viaje'});
  expect(api.eliminarEtiquetaPersonal).toHaveBeenCalledWith(4); confirmar.mockRestore(); fixture.destroy();
 });
});
