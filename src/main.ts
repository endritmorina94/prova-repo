import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import 'zone.js';
import { AppComponent } from './app/app.component'; // <-- AGGIUNGI QUESTA RIGA

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
