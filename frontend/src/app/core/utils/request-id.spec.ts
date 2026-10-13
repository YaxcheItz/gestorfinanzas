import { crearIdSolicitud } from './request-id';

describe('crearIdSolicitud', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('usa el UUID nativo cuando está disponible', () => {
    const randomUUID = vi.fn(() => '12345678-1234-4234-8234-123456789012');
    vi.stubGlobal('crypto', {randomUUID});
    expect(crearIdSolicitud()).toBe('12345678-1234-4234-8234-123456789012');
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it('genera UUID v4 con aleatoriedad criptográfica cuando HTTP no ofrece randomUUID', () => {
    const getRandomValues = vi.fn((bytes: Uint8Array) => {bytes.fill(0xff);return bytes;});
    vi.stubGlobal('crypto', {getRandomValues});
    expect(crearIdSolicitud()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
    expect(getRandomValues).toHaveBeenCalledWith(expect.any(Uint8Array));
  });
});
