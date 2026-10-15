import { CaptureLauncherService } from './capture-launcher.service';

describe('deferred capture requests', () => {
  it('preserves the first click and its payload until the surface is ready', () => {
    const launcher = new CaptureLauncherService();
    const event = new CustomEvent('capture', { detail: { tipo: 'INGRESO', repetir: { id: 9 } } });
    launcher.request('manual', event);
    expect(launcher.manual()).toBe(true);
    expect(launcher.attach('manual')).toBe(event);
    expect(launcher.attach('manual')).toBeUndefined();
  });
  it('does not replay clicks already handled by a mounted component', () => {
    const launcher = new CaptureLauncherService();
    launcher.attach('chat');
    launcher.request('chat', new Event('capture'));
    expect(launcher.attach('chat')).toBeUndefined();
  });
  it('clears pending data when a surface is destroyed on logout', () => {
    const launcher = new CaptureLauncherService();
    launcher.request('manual', new Event('capture'));
    launcher.detach('manual');
    expect(launcher.manual()).toBe(false);
    expect(launcher.attach('manual')).toBeUndefined();
  });
});
