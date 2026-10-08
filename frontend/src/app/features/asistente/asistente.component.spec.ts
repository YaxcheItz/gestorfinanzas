import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { FinanzasService } from '../../core/services/finanzas.service';
import { PrivacidadService } from '../../core/services/privacidad.service';
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
  const createProposal = {
    id: 'proposal-create-1',
    type: 'CREATE_TRANSACTION',
    summary: 'Registrar gasto de comida',
    data: { cuentaId: 1, tipo: 'GASTO', monto: 250 }
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

  it('loads configuration without calling the external provider', () => {
    const fixture = TestBed.createComponent(AsistenteComponent);
    fixture.detectChanges();

    expect(finanzasService.getAiConnectionStatus).toHaveBeenCalledTimes(1);
    expect(finanzasService.verifyAiConnection).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Google Gemini');
    expect(fixture.nativeElement.textContent).not.toContain('Probar conexión');
  });

  it('tapa solo los campos de dinero de la accion, no los identificadores', () => {
    const privacidad = TestBed.inject(PrivacidadService);
    const component = TestBed.createComponent(AsistenteComponent).componentInstance;

    privacidad.aplicar(1, false);
    expect(component.mostrarValor('monto', 250)).toBe('250');
    expect(component.mostrarValor('transaccionId', 43)).toBe('43');

    privacidad.aplicar(1, true);
    expect(component.mostrarValor('monto', 250)).toBe('•••');
    expect(component.mostrarValor('transaccionId', 43)).toBe('43');
    expect(component.mostrarValor('descripcion', 'Comida')).toBe('Comida');
  });

  it('sigue informando la ausencia de un campo aunque este oculto', () => {
    const privacidad = TestBed.inject(PrivacidadService);
    privacidad.aplicar(1, true);
    const component = TestBed.createComponent(AsistenteComponent).componentInstance;

    expect(component.mostrarValor('monto', null)).toBe('Sin dato');
  });

  it('sends the message through the unified chat and shows the answer', () => {
    const fixture = TestBed.createComponent(AsistenteComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.consienteDatosFinancieros.set(true);
    component.entrada.set('  ¿Cuánto gasté este mes?  ');

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(finanzasService.chatWithAi).toHaveBeenCalledWith([
      { role: 'USER', content: '¿Cuánto gasté este mes?' }
    ], true);
    expect(component.enviando()).toBe(false);
    expect(component.mensajes()).toEqual([
      { role: 'USER', content: '¿Cuánto gasté este mes?' },
      { role: 'ASSISTANT', content: 'Este mes registraste gastos.', action: undefined }
    ]);
    expect(fixture.nativeElement.textContent).toContain('Este mes registraste gastos.');
  });

  it('sends financial-report suggestions immediately and keeps them in a horizontal strip', () => {
    const fixture = TestBed.createComponent(AsistenteComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.consienteDatosFinancieros.set(true);

    const suggestions = fixture.nativeElement.querySelector('.ai-report-prompts') as HTMLElement;
    expect(suggestions).toBeTruthy();
    expect(suggestions.className).toContain('overflow-x-auto');
    fixture.detectChanges();
    const fixedExpenses = Array.from(suggestions.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find(button => button.textContent?.includes('Gastos fijos'));
    expect(fixedExpenses).toBeTruthy();

    fixedExpenses?.click();
    fixture.detectChanges();

    expect(finanzasService.chatWithAi).toHaveBeenCalledWith([
      { role: 'USER', content: 'Analiza mis gastos fijos del periodo actual y resume cuánto representan.' }
    ], true);
    expect(component.entrada()).toBe('');
    expect(component.mensajes()[0].content).toContain('gastos fijos');
  });

  it('clears only local chat messages', () => {
    const fixture = TestBed.createComponent(AsistenteComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.mensajes.set([
      { role: 'USER', content: '¿Qué categoría gastó más?' },
      { role: 'ASSISTANT', content: 'Transporte.' }
    ]);

    component.limpiarHistorial();

    expect(component.mensajes()).toEqual([]);
    expect(finanzasService.chatWithAi).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[aria-label="Limpiar historial del chat"]')).toBeTruthy();
  });

  it('renders a financial report widget with values and an export action', () => {
    finanzasService.chatWithAi.mockReturnValue(of({
      success: true,
      message: '',
      data: {
        answer: 'Aquí está la distribución.',
        action: null,
        report: {
          title: 'Gastos por categoría',
          labels: ['Comida', 'Transporte'],
          values: [1200, 800],
          unit: 'MXN'
        }
      }
    }));
    const fixture = TestBed.createComponent(AsistenteComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.consienteDatosFinancieros.set(true);
    component.entrada.set('Muéstrame una gráfica de gastos por categoría');
    component.enviarMensaje();
    fixture.detectChanges();

    const widget = fixture.nativeElement.querySelector('[data-report-widget]') as HTMLElement;
    expect(widget).toBeTruthy();
    expect(widget.textContent).toContain('Gastos por categoría');
    expect(widget.textContent).toContain('Comida');
    expect(widget.querySelector('button[aria-label="Exportar gráfico Gastos por categoría"]')).toBeTruthy();
  });

  it('keeps the failed question available to retry without corrupting chat history', () => {
    finanzasService.chatWithAi.mockReturnValue(throwError(() => ({
      error: { message: 'Gemini no está disponible.' }
    })));
    const fixture = TestBed.createComponent(AsistenteComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.consienteDatosFinancieros.set(true);
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
    component.consienteDatosFinancieros.set(true);
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

  it('keeps a single proposal returned inside the actions collection actionable', () => {
    finanzasService.chatWithAi.mockReturnValue(of({
      success: true,
      message: '',
      data: { answer: 'Revisa este movimiento.', action: null, actions: [createProposal] }
    }));
    const fixture = TestBed.createComponent(AsistenteComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.consienteDatosFinancieros.set(true);
    component.entrada.set('Elimina el gasto de comida');
    component.enviarMensaje();
    fixture.detectChanges();

    expect(component.mensajes()[1].actions).toEqual([createProposal]);
    expect(fixture.nativeElement.textContent).toContain('Revisa cada movimiento antes de guardarlo');
    expect(fixture.nativeElement.textContent).toContain('Confirmar movimiento');
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
    component.consienteDatosFinancieros.set(true);
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
    component.consienteDatosFinancieros.set(true);
    component.entrada.set('Elimina el gasto');
    component.enviarMensaje();

    component.cancelarAccion(1);

    expect(component.mensajes()[1].action).toBeUndefined();
    expect(component.mensajes()[1].content).toContain('Acción cancelada');
    expect(finanzasService.confirmAiAction).not.toHaveBeenCalled();
  });
});
