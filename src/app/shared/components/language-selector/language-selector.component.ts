import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import {Language, LanguageOption, TranslationService} from '../../../core/translation.service';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatMenuModule,
    MatIconModule
  ],
  templateUrl: './language-selector.component.html',
  styleUrl: './language-selector.component.css'
})
export class LanguageSelectorComponent {
  protected readonly translationService = inject(TranslationService);

  /**
   * Cambia la lingua dell'applicazione
   */
  protected changeLanguage(lang: Language): void {
    this.translationService.setLanguage(lang);
  }

  /**
   * Ottiene l'opzione lingua corrente
   */
  protected get currentLanguageOption(): LanguageOption {
    const currentLang = this.translationService.currentLanguage();
    return this.translationService.availableLanguages.find(
      lang => lang.code === currentLang
    ) || this.translationService.availableLanguages[0];
  }

  /**
   * Ottiene tutte le lingue disponibili
   */
  protected get availableLanguages(): LanguageOption[] {
    return this.translationService.availableLanguages;
  }
}
