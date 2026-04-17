import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Unregister any stale service workers (e.g. cached from GitHub Pages deployment)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const reg of registrations) {
      reg.unregister();
    }
  });
}

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
