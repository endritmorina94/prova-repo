import { Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type Language = 'it' | 'en' | 'sq';

export interface LanguageOption {
  code: Language;
  name: string;
  flag: string;
}

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  // Signal per la lingua corrente
  currentLanguage = signal<Language>('it');

  // Lingue disponibili
  readonly availableLanguages: LanguageOption[] = [
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'sq', name: 'Shqip', flag: '🇦🇱' }
  ];

  constructor(private translate: TranslateService) {
    // Imposta le lingue disponibili
    this.translate.addLangs(['it', 'en', 'sq']);

    // Carica la lingua salvata o usa default
    const savedLang = this.getSavedLanguage();
    this.setLanguage(savedLang);
  }

  /**
   * Cambia la lingua dell'applicazione
   */
  setLanguage(lang: Language): void {
    this.translate.use(lang);
    this.currentLanguage.set(lang);
    this.saveLanguage(lang);
  }

  /**
   * Ottiene la lingua corrente
   */
  getCurrentLanguage(): Language {
    return this.currentLanguage();
  }

  /**
   * Salva la lingua in localStorage
   */
  private saveLanguage(lang: Language): void {
    localStorage.setItem('app_language', lang);
  }

  /**
   * Recupera la lingua salvata da localStorage
   */
  private getSavedLanguage(): Language {
    const saved = localStorage.getItem('app_language') as Language;
    return saved && this.translate.getLangs().includes(saved) ? saved : 'it';
  }

  /**
   * Ottiene una traduzione istantanea
   */
  instant(key: string, params?: any): string {
    return this.translate.instant(key, params);
  }
}
