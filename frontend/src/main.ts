import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';

if (Capacitor.isNativePlatform()) {
  void NativeApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else void NativeApp.minimizeApp();
  });
}

bootstrapApplication(App, appConfig)
  .catch((err) => {
    console.error(err);
    const root = document.querySelector('app-root');
    if (!root) return;
    const screen = document.createElement('div');
    screen.className = 'kaptal-launch';
    screen.setAttribute('role', 'alert');
    const title = document.createElement('strong');
    title.textContent = 'No pudimos abrir Kaptal';
    const message = document.createElement('p');
    message.textContent = 'Comprueba tu conexión y vuelve a intentarlo.';
    const retry = document.createElement('a');
    retry.href = window.location.href;
    retry.textContent = 'Volver a intentar';
    screen.append(title, message, retry);
    root.replaceChildren(screen);
  });
