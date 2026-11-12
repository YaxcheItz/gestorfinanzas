import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AvisosComponent } from './avisos.component';
import { BankNotificationsComponent } from './bank-notifications';
import { AvisosService } from '../core/services/avisos.service';
import { FinanzasService } from '../core/services/finanzas.service';
import { ListaContextoService } from '../core/services/lista-contexto.service';
import { SharedNoticeService } from '../core/services/shared-notice.service';
import { BankNotificationsService } from '../core/services/bank-notifications';

describe('Avisos estados visibles', () => {
  it('oculta avisos previos durante la carga y al fallar un filtro', async () => {
    const pendiente = new Subject<any>();
    const api = {listar: vi.fn().mockReturnValueOnce(of({success:true,data:{content:[{id:'1',resumen:'Aviso ficticio',origen:'MANUAL',clase:'COMPRA',estado:'PENDIENTE',moneda:'MXN',coincidencias:[]}],totalPages:1}})).mockReturnValueOnce(pendiente).mockReturnValueOnce(of({success:false,message:'Fallo lógico ficticio',data:null})).mockReturnValueOnce(of({success:true,data:{content:[],totalPages:0}}))};
    TestBed.configureTestingModule({imports:[AvisosComponent],providers:[provideRouter([]),
      {provide:AvisosService,useValue:api},
      {provide:SharedNoticeService,useValue:{pending:signal(null),error:signal('')}},
      {provide:BankNotificationsService,useValue:{}},
      {provide:FinanzasService,useValue:{getCuentas:()=>of({data:[]}),getCategorias:()=>of({data:[]})}},
      {provide:ListaContextoService,useValue:{activaId:signal(1),listas:signal([])}}
    ]}).overrideComponent(BankNotificationsComponent,{set:{template:''}});
    const fixture=TestBed.createComponent(AvisosComponent); await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Aviso ficticio');
    fixture.componentInstance.filtrar('REGISTRADO'); await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[aria-label="Cargando avisos"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Aviso ficticio');
    pendiente.error({status:503}); await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Aviso ficticio');
    expect(fixture.nativeElement.textContent).not.toContain('Sin revisiones en esta vista');
    fixture.componentInstance.cargar();await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Fallo lógico ficticio');
    expect(fixture.nativeElement.textContent).not.toContain('Sin revisiones en esta vista');
    expect(fixture.nativeElement.textContent).not.toContain('Aviso ficticio');
    fixture.componentInstance.cargar();await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Sin revisiones en esta vista');
    fixture.destroy();
  });
});
