import { Capacitor } from '@capacitor/core';
import { nativeSessionBridge, prepareNativeSession } from './native-session';

describe('Estado de sesión al arrancar Android',()=>{
  beforeEach(()=>{
    vi.spyOn(Capacitor,'getPlatform').mockReturnValue('android');
    localStorage.setItem('finanzas_user',JSON.stringify({id:71}));localStorage.setItem('finanzas_token','token-qa');
  });
  afterEach(()=>{vi.restoreAllMocks();localStorage.clear();});
  it('un cierre nativo impide recuperar las credenciales antiguas de WebView',async()=>{
    vi.spyOn(nativeSessionBridge,'read').mockResolvedValue({closed:true,userId:0});
    await prepareNativeSession();expect(localStorage.getItem('finanzas_token')).toBeNull();expect(localStorage.getItem('finanzas_user')).toBeNull();
  });
  it('descarta un usuario antiguo si Android conserva otra identidad mas reciente',async()=>{
    vi.spyOn(nativeSessionBridge,'read').mockResolvedValue({closed:false,userId:72});
    await prepareNativeSession();expect(localStorage.getItem('finanzas_token')).toBeNull();
  });
  it('conserva la sesion propia y migra instalaciones sin marca nativa',async()=>{
    const read=vi.spyOn(nativeSessionBridge,'read').mockResolvedValue({closed:false,userId:71});
    await prepareNativeSession();expect(localStorage.getItem('finanzas_token')).toBe('token-qa');
    read.mockResolvedValue({closed:false,userId:0});await prepareNativeSession();expect(localStorage.getItem('finanzas_token')).toBe('token-qa');
  });
});
