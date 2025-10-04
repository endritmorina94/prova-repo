import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSelectorComponent } from './shared/components/language-selector/language-selector.component';
import { TranslationService } from './core/translation.service';

interface NavItem {
  path: string;
  icon: string;
  labelKey: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    TranslateModule,
    LanguageSelectorComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  protected readonly translationService = inject(TranslationService);

  // Signal per gestire l'apertura della sidebar
  protected sidenavOpened = signal(true);

  // Menu di navigazione
  protected readonly navItems: NavItem[] = [
    { path: '/dashboard', icon: 'dashboard', labelKey: 'nav.dashboard' },
    { path: '/patients', icon: 'people', labelKey: 'nav.patients' },
    { path: '/reports', icon: 'description', labelKey: 'nav.reports' },
    { path: '/invoices', icon: 'receipt', labelKey: 'nav.invoices' },
    { path: '/settings', icon: 'settings', labelKey: 'nav.settings' }
  ];

  /**
   * Toggle sidebar
   */
  protected toggleSidenav(): void {
    this.sidenavOpened.update(opened => !opened);
  }
}
