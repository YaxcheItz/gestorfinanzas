import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { signal } from '@angular/core';
import { AuthService } from './core/services/auth.service';
import { PerfilService } from './core/services/perfil.service';
import { CaptureLauncherService } from './core/services/capture-launcher.service';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('discards a deferred capture payload on a direct account change', () => {
    const usuario = signal<{ id: number } | null>({ id: 1 });
    TestBed.overrideProvider(AuthService, { useValue: { currentUser: usuario, isAuthenticated: () => !!usuario() } });
    TestBed.overrideProvider(PerfilService, { useValue: { cargar: vi.fn(), limpiar: vi.fn() } });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const launcher = TestBed.inject(CaptureLauncherService);
    launcher.request('manual', new CustomEvent('capture', { detail: { tipo: 'GASTO', repetir: { id: 9 } } }));
    usuario.set({ id: 2 });
    fixture.detectChanges();
    expect(launcher.attach('manual')).toBeUndefined();
    expect(launcher.manual()).toBe(false);
  });

  it('should link the Kaptal brand to login for a visitor without a session', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const brandLink = compiled.querySelector('a[aria-label="Kaptal, inicio"]');
    expect(brandLink?.textContent).toContain('Kaptal');
    expect(brandLink?.getAttribute('href')).toBe('/login');
  });
});
