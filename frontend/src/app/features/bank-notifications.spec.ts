import { TestBed } from '@angular/core/testing';
import { BankNotificationsService } from '../core/services/bank-notifications';
import { BankNotificationsComponent } from './bank-notifications';

describe('Diagnóstico de avisos', () => {
  it('no afirma que la tarjeta sea distinta cuando el aviso puede no mostrar terminación', () => {
    TestBed.configureTestingModule({providers:[{provide:BankNotificationsService,useValue:{}}]});
    const component=TestBed.runInInjectionContext(()=>new BankNotificationsComponent());
    expect(component.automaticReason('card_mismatch')).toContain('no aparecer en el aviso');
  });
});
