import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from './auth.service';
import { SharedNoticeService, SHARED_NOTICE_NATIVE } from './shared-notice.service';

const plugin={read:vi.fn(),discard:vi.fn(),addListener:vi.fn()};

describe('Textos compartidos nativos',()=>{
  const user=signal<{id:number}|null>({id:71});
  beforeEach(()=>{
    vi.clearAllMocks();user.set({id:71});
    plugin.read.mockResolvedValue({pending:{id:'qa',text:'Texto QA'}});
    plugin.addListener.mockResolvedValue({remove:vi.fn()});plugin.discard.mockResolvedValue(undefined);
    TestBed.configureTestingModule({providers:[{provide:AuthService,useValue:{currentUser:user}},
      {provide:SHARED_NOTICE_NATIVE,useValue:plugin}]});
  });
  it('oculta inmediatamente el texto cuando cambia la cuenta e ignora respuestas anteriores',async()=>{
    const service=TestBed.inject(SharedNoticeService);TestBed.tick();await service.refresh();
    expect(service.pending()?.text).toBe('Texto QA');
    let finish!:(value:unknown)=>void;
    plugin.read.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
    const stale=service.refresh();user.set({id:72});
    expect(service.pending()).toBeUndefined();expect(service.isCurrent('qa')).toBe(false);
    plugin.read.mockResolvedValue({pending:{id:'qa',anotherUser:true}});
    await service.refresh();finish({pending:{id:'qa',text:'Texto anterior'}});await stale;
    expect(service.pending()?.text).toBeUndefined();expect(service.pending()?.anotherUser).toBe(true);
  });
  it('descartar confirma la clave y vuelve a leer el estado nativo',async()=>{
    const service=TestBed.inject(SharedNoticeService);TestBed.tick();await service.refresh();
    plugin.read.mockResolvedValue({});await service.discard('qa');
    expect(plugin.discard).toHaveBeenCalledWith({id:'qa'});expect(service.pending()).toBeUndefined();
  });
});
