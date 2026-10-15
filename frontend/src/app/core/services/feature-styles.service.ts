import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

type FeatureStyle = 'dashboard' | 'home' | 'activity' | 'capture' | 'settings';
const ASSETS: Record<FeatureStyle, string> = {
  dashboard: 'styles/dashboard.css', home: 'styles/home.css', activity: 'styles/activity.css',
  capture: 'styles/capture.css', settings: 'styles/settings.css'
};

/** Public style assets are prefetched by ngsw for offline use, and applied once. */
@Injectable({ providedIn: 'root' })
export class FeatureStylesService {
  private readonly document = inject(DOCUMENT);

  load(...features: FeatureStyle[]): void {
    for (const feature of features) {
      if (!Object.hasOwn(ASSETS, feature) || this.document.querySelector(`link[data-kaptal-style="${feature}"]`)) continue;
      const link = this.document.createElement('link');
      link.rel = 'stylesheet';
      link.href = new URL(ASSETS[feature], this.document.baseURI).href;
      link.dataset['kaptalStyle'] = feature;
      this.document.head.appendChild(link);
    }
  }
}
