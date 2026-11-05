import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FinanzasService } from '../../core/services/finanzas.service';
import { EtiquetasComponent } from './etiquetas.component';
describe('EtiquetasComponent', () => {
 it('crea y elimina etiquetas del catalogo con confirmacion', async () => {
  const api={getEtiquetasPersonales:vi.fn(()=>of({success:true,data:[{id:4,nombre:'viaje'}]})), crearEtiquetaPersonal:vi.fn(()=>of({success:true,data:{id:5,nombre:'trabajo'}})), eliminarEtiquetaPersonal:vi.fn(()=>of({success:true,data:null}))};
  await TestBed.configureTestingModule({imports:[EtiquetasComponent],providers:[{provide:FinanzasService,useValue:api}]}).compileComponents();
  const fixture=TestBed.createComponent(EtiquetasComponent); fixture.detectChanges(); const component=fixture.componentInstance;
  component.nombre='trabajo'; component.crear(); expect(api.crearEtiquetaPersonal).toHaveBeenCalledWith('trabajo');
  const confirmar=vi.spyOn(window,'confirm').mockReturnValue(true); component.eliminar({id:4,nombre:'viaje'});
  expect(api.eliminarEtiquetaPersonal).toHaveBeenCalledWith(4); confirmar.mockRestore(); fixture.destroy();
 });
});
