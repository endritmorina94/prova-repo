// pdf-preview-dialog.component.ts
import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { FileSaverService } from '../../../core/services/file-saver.service';

export interface PdfPreviewData {
  pdfData: Uint8Array;
  filename: string;
}

@Component({
  selector: 'app-pdf-preview-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    NgxExtendedPdfViewerModule
  ],
  templateUrl: './pdf-preview-dialog.component.html',
  styleUrl: './pdf-preview-dialog.component.css'
})
export class PdfPreviewDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<PdfPreviewDialogComponent>);
  private readonly data = inject<PdfPreviewData>(MAT_DIALOG_DATA);
  protected readonly pdfSrc = signal<Uint8Array>(this.data.pdfData);
  private readonly fileSaver = inject(FileSaverService);

  close(): void {
    this.dialogRef.close();
  }

  async download(): Promise<void> {
    try {
      await this.fileSaver.saveFile(this.data.pdfData, this.data.filename);
      this.dialogRef.close();
    } catch (error) {
      console.error('Errore durante il download:', error);
    }
  }
}
