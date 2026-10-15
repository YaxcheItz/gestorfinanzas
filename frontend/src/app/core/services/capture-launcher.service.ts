import { Injectable, signal } from '@angular/core';

export type CaptureSurface = 'manual' | 'chat';

/** Keeps the first request while Angular downloads a deferred capture surface. */
@Injectable({ providedIn: 'root' })
export class CaptureLauncherService {
  readonly manual = signal(false);
  readonly chat = signal(false);
  private readonly ready = new Set<CaptureSurface>();
  private readonly pending = new Map<CaptureSurface, Event>();

  request(surface: CaptureSurface, event: Event): void {
    if (this.ready.has(surface)) return;
    this.pending.set(surface, event);
    this[surface].set(true);
  }

  attach(surface: CaptureSurface): Event | undefined {
    this.ready.add(surface);
    const event = this.pending.get(surface);
    this.pending.delete(surface);
    return event;
  }

  detach(surface: CaptureSurface): void {
    this.ready.delete(surface);
    this.pending.delete(surface);
    this[surface].set(false);
  }
}
