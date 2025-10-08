import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PdfPreviewData, PdfPreviewDialogComponent } from '../../shared/components/pdf-preview-dialog/pdf-preview-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class PdfPreviewService {
  private readonly dialog = inject(MatDialog);

  openPreview(pdfData: Uint8Array, filename: string): void {
    this.dialog.open(PdfPreviewDialogComponent, {
      data: { pdfData, filename } as PdfPreviewData,
      width: '90vw',
      maxWidth: '1200px',
      height: '90vh',
      panelClass: 'pdf-preview-dialog',
      disableClose: false
    });
  }
}
