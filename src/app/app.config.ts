// src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling, withViewTransitions } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideTranslateService } from "@ngx-translate/core";
import { provideTranslateHttpLoader } from "@ngx-translate/http-loader";
import { routes } from './app.routes';
import { DatabaseService } from './core/database/database.service';
import { SqliteDbService } from './core/database/sqlite-db.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideTranslateService({
      loader: provideTranslateHttpLoader({
        prefix: '/assets/i18n/',
        suffix: '.json'
      }),
      fallbackLang: 'it',
      lang: 'it'
    }),
    provideRouter(
      routes,
      withInMemoryScrolling({scrollPositionRestoration: 'enabled'}),
      withViewTransitions(),
      withComponentInputBinding()
    ),

    // ✅ Usa SQLite senza migrazione
    { provide: DatabaseService, useClass: SqliteDbService }
  ]
};
