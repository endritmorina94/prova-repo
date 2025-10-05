import { Injectable } from '@angular/core';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';

@Injectable({
  providedIn: 'root'
})
export class FileSaverService {
  /**
   * Salva un file (compatibile browser e Tauri)
   */
  async saveFile(data: Uint8Array, defaultFilename: string): Promise<void> {
    if (this.isTauri()) {
      await this.saveTauriFile(data, defaultFilename);
    } else {
      this.saveBrowserFile(data, defaultFilename);
    }
  }

  /**
   * Verifica se l'app è in esecuzione in Tauri
   */
  private isTauri(): boolean {
    const isTauriEnv = !!(window as any).__TAURI_INTERNALS__;
    console.log('🔍 Tauri detected:', isTauriEnv);
    return isTauriEnv;
  }

  /**
   * Salva file in Tauri usando dialog
   */
  private async saveTauriFile(uint8Array: Uint8Array, defaultFilename: string): Promise<void> {
    console.log('istauri');
    try {
      // Mostra dialogo di salvataggio
      const selectedPath = await save({
        defaultPath: defaultFilename,
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      });

      if (!selectedPath) return;

      // Scrivi il file
      await writeFile(selectedPath, uint8Array);

      console.log('✅ File salvato con successo:', selectedPath);
    } catch (error) {
      console.error('❌ Errore durante il salvataggio del file:', error);
      throw error;
    }
  }

  /**
   * Salva file nel browser
   */
  private saveBrowserFile(data: Uint8Array, filename: string): void {
    const blob = this.convertToBlob(data);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Converte i dati in Blob
   */
  private convertToBlob(data: Uint8Array): Blob {
    return new Blob([data as BlobPart], { type: 'application/pdf' });
  }
}
