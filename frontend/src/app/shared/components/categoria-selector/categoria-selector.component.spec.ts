import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CategoriaPreferidaService } from '../../../core/services/categoria-preferida.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { FinanzasService } from '../../../core/services/finanzas.service';
import { ToastService } from '../../../core/services/toast.service';
import { Categoria, TipoTransaccion } from '../../../core/models/finanzas.models';
import { CategoriaSelectorComponent } from './categoria-selector.component';

describe('CategoriaSelectorComponent', () => {
  let fixture: ComponentFixture<CategoriaSelectorComponent>;
  let component: CategoriaSelectorComponent;
  let preferida: CategoriaPreferidaService;

  const categorias: Categoria[] = [
    { id: 1, nombre: 'Comida', tipo: 'GASTO', icono: 'utensils', activo: true, esPersonalizada: false },
    { id: 2, nombre: 'Transporte', tipo: 'GASTO', icono: 'car', activo: true, esPersonalizada: false },
    { id: 3, nombre: 'Casita', tipo: 'GASTO', icono: 'home', activo: true, esPersonalizada: true },
    { id: 4, nombre: 'Salario', tipo: 'INGRESO', icono: 'trending-up', activo: true, esPersonalizada: false }
  ];

  const mosaico = () => fixture.nativeElement.querySelector('#categoriaId') as HTMLButtonElement;
  const opciones = () => fixture.nativeElement.querySelector('#categoriaId-opciones') as HTMLElement;
  const botonPorNombre = (nombre: string) =>
    fixture.nativeElement.querySelector(`#categoriaId-opciones button[title="${nombre}"]`) as HTMLButtonElement;

  /**
   * `selectedId` es un @Input: cambiarlo a mano dentro del ciclo de deteccion
   * dispara NG0100. Se marca sucio antes de volver a comprobar.
   */
  const elegir = (id: number | null, tipo: TipoTransaccion = 'GASTO') => {
    fixture.componentRef.setInput('tipo', tipo);
    fixture.componentRef.setInput('selectedId', id);
    fixture.detectChanges();
  };

  let cambiarEstadoCategoria: ReturnType<typeof vi.fn>;
  let confirmar: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    localStorage.clear();
    cambiarEstadoCategoria = vi.fn(() => of({ success: true, message: '', data: undefined }));
    confirmar = vi.fn(() => Promise.resolve(true));
    await TestBed.configureTestingModule({
      imports: [CategoriaSelectorComponent],
      providers: [
        {
          provide: FinanzasService,
          useValue: {
            crearCategoria: vi.fn(),
            actualizarCategoria: vi.fn(),
            cambiarEstadoCategoria
          }
        },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: ConfirmDialogService, useValue: { confirm: confirmar } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CategoriaSelectorComponent);
    component = fixture.componentInstance;
    preferida = TestBed.inject(CategoriaPreferidaService);
    preferida.aplicarDesdeCache(7);

    component.categorias = categorias;
    component.tipo = 'GASTO';
    component.selectedId = 1;
    fixture.detectChanges();
  });

  it('arranca mostrando solo la categoria elegida, no la rejilla completa', () => {
    // Con veinte iconos abiertos, el formulario queda tapado y no hay nada que decidir:
    // casi siempre se repite la misma categoria.
    expect(mosaico()).toBeTruthy();
    expect(mosaico().textContent).toContain('Comida');
    expect(opciones()).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Transporte');
  });

  it('no rotula el mosaico con la palabra Categoria', () => {
    // El nombre del mosaico ya se lee solo; anteponer "Categoria:" es ruido.
    expect(mosaico().textContent).not.toContain('Categoría');
    expect(mosaico().textContent.trim()).toBe('Comida');
  });

  it('abre el menu con todas las categorias al pulsarlo', () => {
    mosaico().click();
    fixture.detectChanges();

    const lista = opciones();
    expect(lista).toBeTruthy();
    expect(lista.getAttribute('role')).toBe('listbox');
    expect(lista.textContent).toContain('Transporte');
    expect(lista.textContent).toContain('Casita');
  });

  it('solo muestra categorias del tipo del movimiento', () => {
    mosaico().click();
    fixture.detectChanges();

    expect(opciones().textContent).not.toContain('Salario');
  });

  it('ofrece crear y habilita editar tarjetas personalizadas', () => {
    mosaico().click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nueva');
    expect(fixture.nativeElement.querySelector('#categoriaId-opciones [aria-label^="Editar"]')).toBeNull();

    const editar = Array.from(fixture.nativeElement.querySelectorAll('button'))
      .find((boton: any) => boton.textContent?.trim() === 'Editar') as HTMLButtonElement;
    editar.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#categoriaId-opciones [aria-label^="Editar"]')).toBeTruthy();
  });

  it('vuelve al mosaico al elegir, dejando la eleccion a la vista', () => {
    mosaico().click();
    fixture.detectChanges();
    const emitida: number[] = [];
    component.selectedIdChange.subscribe((id: number | null) => emitida.push(id as number));

    opciones().querySelectorAll('button')[2].click();
    elegir(3);

    expect(emitida).toEqual([3]);
    expect(opciones()).toBeNull();
    expect(mosaico().textContent).toContain('Casita');
  });

  it('recuerda la categoria elegida para la proxima vez', () => {
    mosaico().click();
    fixture.detectChanges();

    opciones().querySelectorAll('button')[2].click();

    expect(preferida.preferida('GASTO')).toBe(3);
  });

  it('no ofrece la opcion Sin categoria', () => {
    mosaico().click();
    fixture.detectChanges();

    expect(opciones().textContent).not.toContain('Sin categoria');

    // Volver a "sin categoría" es una decision activa: guardarla haria que el
    // formulario se abriera sin categoria, que no es lo que se suele querer.
    expect(preferida.preferida('GASTO')).toBeNull;
  });

  it('recuerda por tipo, no una sola categoria para todo', () => {
    mosaico().click();
    fixture.detectChanges();
    opciones().querySelectorAll('button')[2].click();

    elegir(null, 'INGRESO');
    mosaico().click();
    fixture.detectChanges();
    opciones().querySelectorAll('button')[0].click();

    expect(preferida.preferida('GASTO')).toBe(3);
    expect(preferida.preferida('INGRESO')).toBe(4);
  });

  it('pide elegir categoria cuando no hay ninguna elegida', () => {
    elegir(null);

    expect(mosaico().textContent).toContain('Elige una');
  });

  it('describe el mosaico para quien no ve el icono', () => {
    expect(mosaico().getAttribute('aria-label')).toBe('Categoría: Comida. Cambiar');
    expect(mosaico().getAttribute('aria-haspopup')).toBe('listbox');
  });

  it('mantiene el mosaico en objetivo tactil de 44px o mas', () => {
    expect(mosaico().className).toContain('min-h-16');
    expect(mosaico().className).toContain('cursor-pointer');
  });

  it('avisa que el menu esta cerrado mientras no se abre', () => {
    expect(mosaico().getAttribute('aria-expanded')).toBe('false');

    mosaico().click();
    fixture.detectChanges();

    expect(opciones()).toBeTruthy();
  });

  it('expone cada categoria como opcion marcada, no como radio suelta', () => {
    mosaico().click();
    fixture.detectChanges();

    const marcadas = opciones().querySelectorAll('[role="option"][aria-selected="true"]');
    expect(marcadas.length).toBe(1);
    expect(marcadas[0].textContent).toContain('Comida');
  });

  it('muestra controles de edición en las tarjetas personalizadas', () => {
    mosaico().click();
    fixture.detectChanges();
    const editar = Array.from(fixture.nativeElement.querySelectorAll('button'))
      .find((boton: any) => boton.textContent?.trim() === 'Editar') as HTMLButtonElement;
    editar.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#categoriaId-opciones [aria-label^="Editar"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#categoriaId-opciones [aria-label^="Eliminar"]')).toBeTruthy();
  });

  describe('eliminar categoria', () => {
    const abrirEditor = (id: number) => {
      elegir(id);
      mosaico().click();
      fixture.detectChanges();
      const editar = Array.from(
        fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
      ).find(boton => boton.textContent?.trim() === 'Editar');
      editar?.click();
      fixture.detectChanges();
    };

    const botonEliminar = () =>
      fixture.nativeElement.querySelector('#categoriaId-opciones [aria-label^="Eliminar"]') as HTMLButtonElement | null;

    it('no ofrece eliminar mientras se crea una categoria nueva', () => {
      elegir(3);
      mosaico().click();
      fixture.detectChanges();
      const nueva = Array.from(
        fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
      ).find(boton => boton.textContent?.trim() === 'Nueva');
      nueva?.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.quick-category-editor [aria-label^="Eliminar"]')).toBeNull();
    });

    it('desactiva la categoria, la saca de la lista y olvida la preferida', async () => {
      elegir(3);
      preferida.recordar('GASTO', 3);
      abrirEditor(3);
      expect(botonEliminar()).toBeTruthy();

      // La lista sin la borrada se emite hacia el host, que es quien la guarda.
      const emitidas: Categoria[][] = [];
      component.categoriasChange.subscribe(lista => emitidas.push(lista));

      botonEliminar()!.click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(confirmar).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Eliminar categoría' })
      );
      // Borrado lógico: los movimientos historicos conservan su categoría.
      expect(cambiarEstadoCategoria).toHaveBeenCalledWith(3, false);
      const idsEmitidos = emitidas[0]?.map(categoria => categoria.id) ?? [];
      expect(idsEmitidos).not.toContain(3);
      expect(idsEmitidos).toEqual([1, 2, 4]);
      expect(preferida.preferida('GASTO')).toBe(1);
    });

    it('no toca nada si el usuario cancela la confirmacion', async () => {
      confirmar.mockResolvedValueOnce(false);
      abrirEditor(3);

      botonEliminar()!.click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(cambiarEstadoCategoria).not.toHaveBeenCalled();
      expect(component.categorias.map(categoria => categoria.id)).toContain(3);
      expect(botonEliminar()).toBeTruthy();
    });

    it('avisa en el editor cuando el servidor rechaza el borrado', async () => {
      cambiarEstadoCategoria.mockReturnValueOnce(
        of({ success: false, message: 'La categoría tiene movimientos.', data: undefined })
      );
      abrirEditor(3);

      botonEliminar()!.click();
      await fixture.whenStable();
      fixture.detectChanges();

      const alerta = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
      expect(alerta.textContent).toContain('La categoría tiene movimientos.');
    });
  });
});
