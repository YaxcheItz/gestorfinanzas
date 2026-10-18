import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { VincularCanalComponent } from './vincular-canal.component';

describe('VincularCanalComponent', () => {
  const original = window.location.href;
  const currentUser = signal<{ id: number; email: string } | null>(null);
  let http: HttpTestingController;
  beforeEach(() => {
    window.history.replaceState(null, '', '#challenge=' + 'a'.repeat(43));
    currentUser.set({ id: 7, email: 'owner@example.test' });
    TestBed.configureTestingModule({ imports: [VincularCanalComponent], providers: [
      provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide: AuthService, useValue: { currentUser, isAuthenticated: () => !!currentUser(), googleConfig: () => of({ success: true, data: { enabled: false } }),
        loginWithGoogle: () => { currentUser.set({ id: 7, email: 'owner@example.test' }); return of({ success: true }); } } }
    ] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); window.history.replaceState(null, '', original); });

  it('requires explicit consent and shows account and matching reference', () => {
    const fixture = TestBed.createComponent(VincularCanalComponent); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('owner@example.test');
    expect(fixture.nativeElement.textContent).toContain('aaaaaaaa');
    http.expectNone(r => r.url.includes('/aprobar'));
    fixture.componentInstance.approve();
    const request = http.expectOne(r => r.url.endsWith('/canales/vinculacion/aprobar'));
    expect(request.request.body).toEqual({ challenge: 'a'.repeat(43) });
    request.flush({ success: true, data: { codigo: 'c'.repeat(43) } });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input').value).toBe('c'.repeat(43));
  });
  it('does not approve an invalid browser link', () => {
    window.history.replaceState(null, '', '#challenge=bad');
    const fixture = TestBed.createComponent(VincularCanalComponent); fixture.detectChanges();
    fixture.componentInstance.approve();
    expect(fixture.nativeElement.textContent).toContain('comando de vinculación');
    http.expectNone(r => r.url.includes('/aprobar'));
  });
  it('never displays a delayed code after switching accounts', () => {
    const fixture = TestBed.createComponent(VincularCanalComponent); fixture.detectChanges();
    fixture.componentInstance.approve();
    const request = http.expectOne(r => r.url.endsWith('/aprobar'));
    currentUser.set({ id: 8, email: 'other@example.test' });
    request.flush({ success: true, data: { codigo: 'c'.repeat(43) } });
    fixture.detectChanges();
    expect(fixture.componentInstance.code()).toBe('');
    expect(fixture.nativeElement.querySelector('input')).toBeNull();
  });
  it('keeps errors recoverable without showing server details', () => {
    const fixture = TestBed.createComponent(VincularCanalComponent); fixture.detectChanges();
    fixture.componentInstance.approve();
    http.expectOne(r => r.url.endsWith('/aprobar')).flush({ secret: 'private' }, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(fixture.componentInstance.busy()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Revisa tu sesión');
    expect(fixture.nativeElement.textContent).not.toContain('private');
  });
  it('offers Google sign-in without approving anything automatically', () => {
    currentUser.set(null);
    const fixture = TestBed.createComponent(VincularCanalComponent); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No necesitas una contraseña nueva');
    fixture.componentInstance.approve();
    http.expectNone(r => r.url.includes('/aprobar'));
  });
  it('keeps consent separate after Google sign-in', () => {
    currentUser.set(null);
    const fixture = TestBed.createComponent(VincularCanalComponent); fixture.detectChanges();
    fixture.componentInstance.google('synthetic-google-credential'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('owner@example.test');
    expect(fixture.nativeElement.textContent).toContain('Autorizar conexión');
    expect(fixture.componentInstance.busy()).toBe(false);
    http.expectNone(r => r.url.includes('/aprobar'));
  });
});
