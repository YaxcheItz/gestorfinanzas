import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { CategoriaOrdenService } from './categoria-orden.service';

describe('CategoriaOrdenService', () => {
  let service: CategoriaOrdenService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        CategoriaOrdenService,
        { provide: AuthService, useValue: { currentUser: () => ({ id: 5 }) } }
      ]
    });
    service = TestBed.inject(CategoriaOrdenService);
  });

  it('persists a category order per account and keeps newly added categories at the end', () => {
    const original = [{ id: 3 }, { id: 1 }, { id: 2 }];

    service.guardarOrden([2, 3]);

    expect(service.ordenar(original).map(item => item.id)).toEqual([2, 3, 1]);
  });
});
