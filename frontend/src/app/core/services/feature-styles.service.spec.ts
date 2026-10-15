import { TestBed } from '@angular/core/testing';
import { FeatureStylesService } from './feature-styles.service';

describe('feature style assets', () => {
  beforeEach(() => document.querySelectorAll('link[data-kaptal-style]').forEach(link => link.remove()));
  afterEach(() => document.querySelectorAll('link[data-kaptal-style]').forEach(link => link.remove()));
  it('loads each local stylesheet once across route changes', () => {
    const service = TestBed.inject(FeatureStylesService);
    service.load('dashboard', 'capture');
    service.load('capture');
    const links = document.querySelectorAll<HTMLLinkElement>('link[data-kaptal-style]');
    expect(links.length).toBe(2);
    expect([...links].every(link => new URL(link.href).origin === new URL(document.baseURI).origin)).toBe(true);
    expect(links[0].getAttribute('rel')).toBe('stylesheet');
  });
});
