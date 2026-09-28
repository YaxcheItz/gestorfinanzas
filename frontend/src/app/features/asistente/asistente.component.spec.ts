import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { FinanzasService } from '../../core/services/finanzas.service';
import { AsistenteComponent } from './asistente.component';

describe('AsistenteComponent', () => {
  let finanzasService: {
    getAiConnectionStatus: ReturnType<typeof vi.fn>;
    verifyAiConnection: ReturnType<typeof vi.fn>;
    chatWithAi: ReturnType<typeof vi.fn>;
    confirmAiAction: ReturnType<typeof vi.fn>;
  };

  const deleteProposal = {
    id: 'proposal-1',
    type: 'DELETE_TRANSACTION',
    summary: 'Eliminar el gasto de comida',
    data: { transaccionId: 43, descripcion: 'Comida', monto: 250 }
  };

  beforeEach(() => {
    finanzasService = {
      getAiConnectionStatus: vi.fn(() => of({
        success: true,
        message: '',
        data: { provider: 'gemini', model: 'gemini-2.5-flash', configured: true }
      })),
      verifyAiConnection: vi.fn(() => of({
        success: true,
        message: '',
        data: { provider: 'gemini', model: 'gemini-2.5-flash', connected: true }
      })),
      chatWithAi: vi.fn(() => of({
        success: true,
        message: '',
        data: { answer: 'Este mes registraste gastos.', action: null }
      })),
      confirmAiAction: vi.fn(() => of({
        success: true,
        message: 'Listo. El movimiento se eliminó.',
        data: { completed: true }
      }))
    };

    TestBed.configureTestingModule({
      imports: [AsistenteComponent],
      providers: [{ provide: FinanzasService, useValue: finanzasService }]
    });
  });

  it('verifies the provider automatically when the assistant opens', () => {
    const fixture = TestBed.createComponent(AsistenteComponent);
    fixture.detectChanges();

    expect(finanzasService.getAiConnectionStatus).toHaveBeenCalledTimes(1);
    expect(finanzasService.verifyAiConnection).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.textContent).toContain('Gemini está listo');
    expect(fixture.nativeElement.textContent).not.toContain('Probar conexión');
  });

  it('sends the message through the unified chat and shows the answer', () => {
    const fixture = TestBed.createComponent(AsistenteComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.entrada.set('  ¿Cuánto gasté este mes?  ');

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(finanzasService.chatWithAi).toHaveBeenCalledWith([
      { role: 'USER', content: '¿Cuánto gasté este mes?' }
    ]);
    expect(component.enviando()).toBe(false);
    expect(component.mensajes()).toEqual([
      { role: 'USER', content: '¿Cuánto gasté este mes?' },
      { role: 'ASSISTANT', content: 'Este mes registraste gastos.', action: undefined }
    ]);
    expect(fixture.nativeElement.textContent).toContain('Este mes registraste gastos.');
  });

  it('keeps the failed question available to retry without corrupting chat history', () => {
    finanzasService.chatWithAi.mockReturnValue(throwError(() => ({
      error: { message: 'Gemini no está disponible.' }
    })));
    const fixture = TestBed.createComponent(AsistenteComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.entrada.set('¿Cuál es mi saldo?');

    component.enviarMensaje();
    fixture.detectChanges();

    expect(component.entrada()).toBe('¿Cuál es mi saldo?');
    expect(component.mensajes()).toEqual([]);
    expect(component.errorChat()).toBe('Gemini no está disponible.');
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.className).toContain('dark:text-rose-200');
  });

  it('uses dark-mode surfaces and readable text in the chat', () => {
    const fixture = TestBed.createComponent(AsistenteComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('section')?.className).toContain('dark:bg-slate-900');
    expect(fixture.nativeElement.querySelector('textarea')?.className).toContain('dark:text-slate-100');
  });

  it('shows a proposed change in chat and executes only after confirmation', () => {
    finanzasService.chatWithAi.mockReturnValue(of({
      success: true,
      message: '',
      data: { answer: 'Voy a eliminar el movimiento indicado.', action: deleteProposal }
    }));
    const fixture = TestBed.createComponent(AsistenteComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.entrada.set('Elimina el gasto de comida');
    component.enviarMensaje();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Propuesta para revisar');
    expect(fixture.nativeElement.textContent).toContain('Aún no se ha ejecutado ningún cambio.');
    expect(finanzasService.confirmAiAction).not.toHaveBeenCalled();

    component.solicitarConfirmacionBorrado(1);
    component.confirmarAccion(1);
    fixture.detectChanges();

    expect(finanzasService.confirmAiAction).toHaveBeenCalledWith('proposal-1');
    expect(component.mensajes()[1].confirmed).toBe(true);
    expect(component.mensajes()[1].content).toContain('El movimiento se eliminó.');
  });

  it('requires the additional confirmation step before deleting', () => {
    finanzasService.chatWithAi.mockReturnValue(of({
      success: true,
      message: '',
      data: { answer: 'Voy a eliminar el movimiento.', action: deleteProposal }
    }));
    const fixture = TestBed.createComponent(AsistenteComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.entrada.set('Elimina el gasto');
    component.enviarMensaje();
    fixture.detectChanges();

    component.confirmarAccion(1);
    expect(finanzasService.confirmAiAction).not.toHaveBeenCalled();

    const continueButton = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find(button => button.textContent?.includes('Revisé; continuar con el borrado')) as HTMLButtonElement;
    continueButton.click();
    fixture.detectChanges();
    expect(finanzasService.confirmAiAction).not.toHaveBeenCalled();

    const confirmButton = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find(button => button.textContent?.includes('Confirmar borrado')) as HTMLButtonElement;
    confirmButton.click();
    fixture.detectChanges();
    expect(finanzasService.confirmAiAction).toHaveBeenCalledTimes(1);
  });

  it('cancels a proposed action without calling the backend', () => {
    finanzasService.chatWithAi.mockReturnValue(of({
      success: true,
      message: '',
      data: { answer: 'Puedo eliminarlo.', action: deleteProposal }
    }));
    const fixture = TestBed.createComponent(AsistenteComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.entrada.set('Elimina el gasto');
    component.enviarMensaje();

    component.cancelarAccion(1);

    expect(component.mensajes()[1].action).toBeUndefined();
    expect(component.mensajes()[1].content).toContain('Acción cancelada');
    expect(finanzasService.confirmAiAction).not.toHaveBeenCalled();
  });
});
