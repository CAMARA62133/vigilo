import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';

// --- AJOUTS POUR LE FRANÇAIS ---
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';

// On enregistre les données de langue française auprès d'Angular
registerLocaleData(localeFr);
// -------------------------------

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'fr-FR' },

    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    importProvidersFrom(ZXingScannerModule),
  ],
};
