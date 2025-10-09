import { inject, Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { TranslateService } from '@ngx-translate/core';
import { Invoice, Patient, Report, Studio } from '../../shared/models';
import { DatabaseService } from '../database/database.service';
import { firstValueFrom } from 'rxjs';
import { FileSaverService } from '../services/file-saver.service';

@Injectable({
  providedIn: 'root'
})
export class PdfGeneratorService {
  private translateService = inject(TranslateService);
  private db = inject(DatabaseService);
  private studioSettings: Studio | null = null;

  // Configurazione PDF
  private readonly PAGE_WIDTH = 210; // A4 width in mm
  private readonly PAGE_HEIGHT = 297; // A4 height in mm
  private readonly MARGIN = 20;
  private readonly LINE_HEIGHT = 7;
  // Colori
  private readonly PRIMARY_COLOR: [number, number, number] = [0, 137, 123]; // Teal
  private readonly TEXT_COLOR: [number, number, number] = [33, 33, 33];
  private readonly GRAY_COLOR: [number, number, number] = [117, 117, 117];

  private fileSaver = inject(FileSaverService);

  /**
   * Scarica PDF referto
   */
  async downloadReportPDF(report: Report, patient: Patient): Promise<void> {
    const doc = await this.generateReportPDF(report, patient);
    const filename = `Referto_${report.reportNumber}_${patient.lastName}_${patient.firstName}.pdf`;

    // Ottieni il PDF come Uint8Array
    const pdfData = doc.output('arraybuffer');
    const uint8Array = new Uint8Array(pdfData);

    await this.fileSaver.saveFile(uint8Array, filename);
  }

  /**
   * Scarica PDF fattura
   */
  async downloadInvoicePDF(invoice: Invoice, patient: Patient): Promise<void> {
    const doc = await this.generateInvoicePDF(invoice, patient);
    const filename = `Fattura_${invoice.invoiceNumber}_${patient.lastName}_${patient.firstName}.pdf`;

    const pdfData = doc.output('arraybuffer');
    const uint8Array = new Uint8Array(pdfData);

    await this.fileSaver.saveFile(uint8Array, filename);
  }

  /**
   * Genera PDF del referto
   */
  async generateReportPDF(report: Report, patient: Patient): Promise<jsPDF> {
    // Carica impostazioni studio PRIMA di generare il PDF
    const studio = await firstValueFrom(this.db.getStudioSettings());

    const doc = new jsPDF();
    let yPosition = this.MARGIN;

    yPosition = this.addHeader(doc, yPosition, studio);
    yPosition = this.addReportInfo(doc, report, yPosition);
    yPosition = this.addPatientSection(doc, patient, report, yPosition);
    yPosition = this.addExaminationSection(doc, report, yPosition);

    if (report.ultrasoundResult) {
      yPosition = this.addUltrasoundSection(doc, report, yPosition);
    }

    if (report.therapy) {
      yPosition = this.addTherapySection(doc, report, yPosition);
    }

    yPosition = this.addSignature(doc, report, yPosition, studio);

    return doc;
  }




  /**
   * Anteprima PDF referto
   */
  async previewReportPDF(report: Report, patient: Patient): Promise<void> {
    const doc = await this.generateReportPDF(report, patient);
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
  }

  /**
   * Genera PDF della fattura
   */
  async generateInvoicePDF(invoice: Invoice, patient: Patient): Promise<jsPDF> {
    // Carica impostazioni studio PRIMA di generare il PDF
    const studio = await firstValueFrom(this.db.getStudioSettings());

    const doc = new jsPDF();
    let yPosition = this.MARGIN;

    yPosition = this.addInvoiceHeader(doc, yPosition);
    yPosition = this.addInvoiceParties(doc, patient, yPosition, studio);
    yPosition = this.addInvoiceDetails(doc, invoice, yPosition);
    yPosition = this.addInvoiceItemsTable(doc, invoice, yPosition);
    yPosition = this.addInvoiceTotals(doc, invoice, yPosition);

    if (invoice.notes) {
      yPosition = this.addInvoiceNotes(doc, invoice, yPosition);
    }

    return doc;
  }

  /**
   * Anteprima PDF fattura
   */
  async previewInvoicePDF(invoice: Invoice, patient: Patient): Promise<void> {
    const doc = await this.generateInvoicePDF(invoice, patient);
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
  }

  /**
   * Header del documento
   */
  private addHeader(doc: jsPDF, yPosition: number, studio: Studio): number {
    doc.setFontSize(20);
    doc.setTextColor(...this.PRIMARY_COLOR);
    doc.setFont('helvetica', 'bold');
    doc.text('REFERTO MEDICO', this.PAGE_WIDTH / 2, yPosition, { align: 'center' });

    yPosition += 15;

    doc.setFontSize(11);
    doc.setTextColor(...this.TEXT_COLOR);
    doc.setFont('helvetica', 'bold');
    doc.text(studio.name, this.PAGE_WIDTH / 2, yPosition, { align: 'center' });

    yPosition += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const doctorInfo = `${studio.doctorName || 'Dr.ssa'} - ${studio.doctorTitle || 'Specialista in Ginecologia e Ostetricia'}`;
    doc.text(doctorInfo, this.PAGE_WIDTH / 2, yPosition, { align: 'center' });

    yPosition += 5;
    doc.setFontSize(9);
    doc.setTextColor(...this.GRAY_COLOR);

    if (studio.address) {
      const addressLine = `${studio.address}${studio.postalCode ? ' - ' + studio.postalCode : ''}${studio.city ? ' ' + studio.city : ''}`;
      doc.text(addressLine, this.PAGE_WIDTH / 2, yPosition, { align: 'center' });
      yPosition += 4;
    }

    const contactLine = `Tel: ${studio.phone || ''} | Email: ${studio.email || ''}`;
    doc.text(contactLine, this.PAGE_WIDTH / 2, yPosition, { align: 'center' });

    yPosition += 10;

    doc.setDrawColor(...this.PRIMARY_COLOR);
    doc.setLineWidth(0.5);
    doc.line(this.MARGIN, yPosition, this.PAGE_WIDTH - this.MARGIN, yPosition);

    yPosition += 8;

    return yPosition;
  }

  /**
   * Info referto (numero e data)
   */
  private addReportInfo(doc: jsPDF, report: Report, yPosition: number): number {
    doc.setFontSize(10);
    doc.setTextColor(...this.TEXT_COLOR);
    doc.setFont('helvetica', 'bold');
    doc.text(`Referto N.: ${report.reportNumber}`, this.MARGIN, yPosition);
    doc.text(`Data: ${this.formatDate(report.reportDate)}`, this.PAGE_WIDTH - this.MARGIN, yPosition, { align: 'right' });
    yPosition += 10;
    return yPosition;
  }

  /**
   * Sezione Dati Paziente
   */
  private addPatientSection(doc: jsPDF, patient: Patient, report: Report, yPosition: number): number {
    // Controlla se serve nuova pagina
    yPosition = this.checkPageBreak(doc, yPosition, 80);
    // Titolo sezione
    doc.setFillColor(...this.PRIMARY_COLOR);
    doc.rect(this.MARGIN, yPosition - 4, this.PAGE_WIDTH - 2 * this.MARGIN, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('DATI PAZIENTE', this.MARGIN + 2, yPosition + 1);
    yPosition += 10;
    // Dati
    doc.setTextColor(...this.TEXT_COLOR);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const patientData = [
      { label: 'Nome e Cognome:', value: `${patient.firstName} ${patient.lastName}` },
      {
        label: 'Data di Nascita:',
        value: `${this.formatDate(patient.birthDate)} (${this.calculateAge(patient.birthDate)} anni)`
      },
      { label: 'Codice Fiscale:', value: patient.fiscalCode || '-' },
      {
        label: 'Indirizzo:',
        value: patient.address ? `${patient.address}, ${patient.postalCode} ${patient.city}` : '-'
      },
      { label: 'Telefono:', value: patient.mobile || patient.phone || '-' },
      { label: 'Gruppo Sanguigno:', value: patient.bloodType || '-' },
      { label: 'Allergie:', value: patient.allergies || 'Nessuna allergia nota' },
      { label: 'Farmaci in uso:', value: patient.currentMedications || '-' },
      {
        label: 'Data ultima mestruazione:',
        value: patient.lastMenstruationDate ? this.formatDate(patient.lastMenstruationDate) : '-'
      }
    ];
    patientData.forEach(item => {
      doc.setFont('helvetica', 'bold');
      doc.text(item.label, this.MARGIN, yPosition);
      doc.setFont('helvetica', 'normal');
      const textLines = doc.splitTextToSize(item.value, this.PAGE_WIDTH - this.MARGIN * 2 - 50);
      doc.text(textLines, this.MARGIN + 50, yPosition);
      yPosition += this.LINE_HEIGHT * textLines.length;
    });
    yPosition += 5;
    return yPosition;
  }

  /**
   * Sezione Esame Obiettivo
   */
  private addExaminationSection(doc: jsPDF, report: Report, yPosition: number): number {
    yPosition = this.checkPageBreak(doc, yPosition, 40);
    // Titolo sezione
    doc.setFillColor(...this.PRIMARY_COLOR);
    doc.rect(this.MARGIN, yPosition - 4, this.PAGE_WIDTH - 2 * this.MARGIN, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('ESAME OBIETTIVO', this.MARGIN + 2, yPosition + 1);
    yPosition += 10;
    // Contenuto
    doc.setTextColor(...this.TEXT_COLOR);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const textLines = doc.splitTextToSize(report.examination, this.PAGE_WIDTH - 2 * this.MARGIN);
    textLines.forEach((line: string) => {
      yPosition = this.checkPageBreak(doc, yPosition, 10);
      doc.text(line, this.MARGIN, yPosition);
      yPosition += this.LINE_HEIGHT;
    });
    yPosition += 5;
    return yPosition;
  }

  /**
   * Sezione Risultato Ecografia
   */
  private addUltrasoundSection(doc: jsPDF, report: Report, yPosition: number): number {
    yPosition = this.checkPageBreak(doc, yPosition, 40);
    // Titolo sezione
    doc.setFillColor(...this.PRIMARY_COLOR);
    doc.rect(this.MARGIN, yPosition - 4, this.PAGE_WIDTH - 2 * this.MARGIN, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('RISULTATO ECOGRAFIA', this.MARGIN + 2, yPosition + 1);
    yPosition += 10;
    // Contenuto
    doc.setTextColor(...this.TEXT_COLOR);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const textLines = doc.splitTextToSize(report.ultrasoundResult!, this.PAGE_WIDTH - 2 * this.MARGIN);
    textLines.forEach((line: string) => {
      yPosition = this.checkPageBreak(doc, yPosition, 10);
      doc.text(line, this.MARGIN, yPosition);
      yPosition += this.LINE_HEIGHT;
    });
    yPosition += 5;
    return yPosition;
  }

  /**
   * Sezione Terapia
   */
  private addTherapySection(doc: jsPDF, report: Report, yPosition: number): number {
    yPosition = this.checkPageBreak(doc, yPosition, 40);
    // Titolo sezione
    doc.setFillColor(...this.PRIMARY_COLOR);
    doc.rect(this.MARGIN, yPosition - 4, this.PAGE_WIDTH - 2 * this.MARGIN, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('TERAPIA E RACCOMANDAZIONI', this.MARGIN + 2, yPosition + 1);
    yPosition += 10;
    // Contenuto
    doc.setTextColor(...this.TEXT_COLOR);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const textLines = doc.splitTextToSize(report.therapy!, this.PAGE_WIDTH - 2 * this.MARGIN);
    textLines.forEach((line: string) => {
      yPosition = this.checkPageBreak(doc, yPosition, 10);
      doc.text(line, this.MARGIN, yPosition);
      yPosition += this.LINE_HEIGHT;
    });
    yPosition += 5;
    return yPosition;
  }

  /**
   * Firma medico in basso a destra  con data a sinistra
   */
  private addSignature(doc: jsPDF, report: Report, yPosition: number, studio: Studio): number {
    if (yPosition > this.PAGE_HEIGHT - 60) {
      doc.addPage();
      yPosition = this.MARGIN;
    } else {
      yPosition = Math.max(yPosition + 20, this.PAGE_HEIGHT - 50);
    }

    const dateX = this.MARGIN;
    doc.setFontSize(10);
    doc.setTextColor(...this.TEXT_COLOR);
    doc.setFont('helvetica', 'normal');
    const city = studio.city || 'Suhareke';
    doc.text(`${city}, ${this.formatDate(report.reportDate)}`, dateX, yPosition);

    const signatureX = this.PAGE_WIDTH - this.MARGIN - 60;

    doc.setDrawColor(...this.GRAY_COLOR);
    doc.setLineWidth(0.3);
    doc.rect(signatureX, yPosition - 5, 60, 20);
    doc.setFontSize(8);
    doc.setTextColor(...this.GRAY_COLOR);
    doc.text('[Firma e Timbro]', signatureX + 30, yPosition + 5, { align: 'center' });

    yPosition += 20;

    doc.setFontSize(10);
    doc.setTextColor(...this.TEXT_COLOR);
    doc.setFont('helvetica', 'bold');
    const doctorName = `${studio.doctorName || 'Dr.'}`;
    doc.text(doctorName, signatureX + 30, yPosition, { align: 'center' });

    yPosition += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const doctorTitle = `${studio.doctorTitle || 'Specialista in Ginecologia e Ostetricia'}`;
    doc.text(doctorTitle, signatureX + 30, yPosition, { align: 'center' });

    return yPosition;
  }

  /**
   * Controlla se serve aggiungere una nuova pagina
   */
  private checkPageBreak(doc: jsPDF, yPosition: number, requiredSpace: number): number {
    if (yPosition + requiredSpace > this.PAGE_HEIGHT - this.MARGIN) {
      doc.addPage();
      return this.MARGIN;
    }
    return yPosition;
  }

  /**
   * Formatta data
   */
  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('it-IT');
  }

  /**
   * Calcola età
   */
  private calculateAge(birthDate: Date): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * Header fattura
   */
  private addInvoiceHeader(doc: jsPDF, yPosition: number): number {
    // Titolo
    doc.setFontSize(24);
    doc.setTextColor(...this.PRIMARY_COLOR);
    doc.setFont('helvetica', 'bold');
    doc.text('FATTURA', this.MARGIN, yPosition);

    yPosition += 12;

    // Linea separatrice
    doc.setDrawColor(...this.PRIMARY_COLOR);
    doc.setLineWidth(0.5);
    doc.line(this.MARGIN, yPosition, this.PAGE_WIDTH - this.MARGIN, yPosition);

    yPosition += 10;

    return yPosition;
  }

  /**
   * Info studio e cliente
   */
  private addInvoiceParties(doc: jsPDF, patient: Patient, yPosition: number, studio: Studio): number {
    const leftColumn = this.MARGIN;
    const rightColumn = this.PAGE_WIDTH / 2 + 10;

    doc.setFontSize(10);
    doc.setTextColor(...this.GRAY_COLOR);
    doc.setFont('helvetica', 'bold');
    doc.text('DA:', leftColumn, yPosition);

    yPosition += 6;
    doc.setFontSize(11);
    doc.setTextColor(...this.TEXT_COLOR);
    doc.text(studio.name, leftColumn, yPosition);

    yPosition += 5;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (studio.doctorName) {
      doc.text(studio.doctorName, leftColumn, yPosition);
      yPosition += 5;
    }

    doc.setFontSize(9);
    if (studio.address) {
      doc.text(studio.address, leftColumn, yPosition);
      yPosition += 4;
    }

    if (studio.city) {
      doc.text(`${studio.postalCode || ''} ${studio.city}`, leftColumn, yPosition);
      yPosition += 4;
    }

    if (studio.phone) {
      doc.text(`Tel: ${studio.phone}`, leftColumn, yPosition);
      yPosition += 4;
    }

    if (studio.vatNumber) {
      doc.text(`P.IVA: ${studio.vatNumber}`, leftColumn, yPosition);
    }

    yPosition = this.MARGIN + 18;

    // CLIENTE (destra)
    doc.setFontSize(10);
    doc.setTextColor(...this.GRAY_COLOR);
    doc.setFont('helvetica', 'bold');
    doc.text('A:', rightColumn, yPosition);

    yPosition += 6;
    doc.setFontSize(11);
    doc.setTextColor(...this.TEXT_COLOR);
    doc.text(`${patient.firstName} ${patient.lastName}`, rightColumn, yPosition);

    yPosition += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    if (patient.fiscalCode) {
      doc.text(`CF: ${patient.fiscalCode}`, rightColumn, yPosition);
      yPosition += 4;
    }

    if (patient.address) {
      doc.text(patient.address, rightColumn, yPosition);
      yPosition += 4;
    }

    if (patient.city) {
      doc.text(`${patient.postalCode || ''} ${patient.city}`, rightColumn, yPosition);
      yPosition += 4;
    }

    if (patient.mobile || patient.phone) {
      doc.text(`Tel: ${patient.mobile || patient.phone}`, rightColumn, yPosition);
    }

    yPosition = Math.max(yPosition, this.MARGIN + 50) + 10;

    return yPosition;
  }

  /**
   * Dettagli fattura
   */
  private addInvoiceDetails(doc: jsPDF, invoice: Invoice, yPosition: number): number {
    doc.setFillColor(245, 245, 245);
    doc.rect(this.MARGIN, yPosition - 4, this.PAGE_WIDTH - 2 * this.MARGIN, 20, 'F');

    doc.setFontSize(10);
    doc.setTextColor(...this.TEXT_COLOR);
    doc.setFont('helvetica', 'bold');

    const leftColumn = this.MARGIN + 5;
    const centerColumn = this.PAGE_WIDTH / 2 - 20;
    const rightColumn = this.PAGE_WIDTH - this.MARGIN - 60;

    // Numero fattura
    doc.text('Numero:', leftColumn, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.invoiceNumber, leftColumn, yPosition + 5);

    // Data emissione
    doc.setFont('helvetica', 'bold');
    doc.text('Data:', centerColumn, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(this.formatDate(invoice.invoiceDate), centerColumn, yPosition + 5);

    // Stato
    doc.setFont('helvetica', 'bold');
    doc.text('Stato:', rightColumn, yPosition);
    doc.setFont('helvetica', 'normal');
    const statusText = this.getInvoiceStatusLabel(invoice.paymentStatus);
    doc.text(statusText, rightColumn, yPosition + 5);

    yPosition += 25;

    return yPosition;
  }

  /**
   * Tabella voci fattura
   */
  private addInvoiceItemsTable(doc: jsPDF, invoice: Invoice, yPosition: number): number {
    yPosition = this.checkPageBreak(doc, yPosition, 40);

    // Header tabella
    doc.setFillColor(...this.PRIMARY_COLOR);
    doc.rect(this.MARGIN, yPosition, this.PAGE_WIDTH - 2 * this.MARGIN, 8, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);

    const col1 = this.MARGIN + 2;
    const col2 = this.PAGE_WIDTH - this.MARGIN - 70;
    const col3 = this.PAGE_WIDTH - this.MARGIN - 45;
    const col4 = this.PAGE_WIDTH - this.MARGIN - 20;

    doc.text('Descrizione', col1, yPosition + 5);
    doc.text('Qtà', col2, yPosition + 5);
    doc.text('Prezzo', col3, yPosition + 5);
    doc.text('Totale', col4, yPosition + 5, { align: 'right' });

    yPosition += 12;

    // Righe tabella
    doc.setTextColor(...this.TEXT_COLOR);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    if (invoice.items && Array.isArray(invoice.items)) {
      invoice.items.forEach((item: any) => {
        yPosition = this.checkPageBreak(doc, yPosition, 10);

        const descriptionLines = doc.splitTextToSize(item.description, col2 - col1 - 5);

        descriptionLines.forEach((line: string, index: number) => {
          doc.text(line, col1, yPosition);

          if (index === 0) {
            doc.text(item.quantity.toString(), col2, yPosition);
            doc.text(`€ ${item.unitPrice.toFixed(2)}`, col3, yPosition);
            doc.text(`€ ${item.total.toFixed(2)}`, col4, yPosition, { align: 'right' });
          }

          yPosition += 5;
        });

        yPosition += 2;
      });
    }

    yPosition += 5;

    return yPosition;
  }

  /**
   * Sezione totali
   */
  private addInvoiceTotals(doc: jsPDF, invoice: Invoice, yPosition: number): number {
    yPosition = this.checkPageBreak(doc, yPosition, 40);

    const labelX = this.PAGE_WIDTH - this.MARGIN - 70;
    const valueX = this.PAGE_WIDTH - this.MARGIN;

    doc.setFontSize(10);
    doc.setTextColor(...this.TEXT_COLOR);

    // Imponibile
    doc.setFont('helvetica', 'normal');
    doc.text('Imponibile:', labelX, yPosition);
    doc.text(`€ ${invoice.amount.toFixed(2)}`, valueX, yPosition, { align: 'right' });

    yPosition += 6;

    // IVA
    const vatRateText = invoice.vatRate ? `IVA ${invoice.vatRate}%:` : 'IVA:';
    doc.text(vatRateText, labelX, yPosition);
    doc.text(`€ ${(invoice.vatAmount || 0).toFixed(2)}`, valueX, yPosition, { align: 'right' });

    yPosition += 8;

    // Linea separatrice
    doc.setDrawColor(...this.PRIMARY_COLOR);
    doc.setLineWidth(0.3);
    doc.line(labelX, yPosition, valueX, yPosition);

    yPosition += 6;

    // TOTALE
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...this.PRIMARY_COLOR);
    doc.text('TOTALE:', labelX, yPosition);
    doc.text(`€ ${invoice.totalAmount.toFixed(2)}`, valueX, yPosition, { align: 'right' });

    yPosition += 10;

    return yPosition;
  }

  /**
   * Note fattura
   */
  private addInvoiceNotes(doc: jsPDF, invoice: Invoice, yPosition: number): number {
    yPosition = this.checkPageBreak(doc, yPosition, 30);

    doc.setFontSize(10);
    doc.setTextColor(...this.TEXT_COLOR);
    doc.setFont('helvetica', 'bold');
    doc.text('Note:', this.MARGIN, yPosition);

    yPosition += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    const notesLines = doc.splitTextToSize(invoice.notes!, this.PAGE_WIDTH - 2 * this.MARGIN);
    notesLines.forEach((line: string) => {
      yPosition = this.checkPageBreak(doc, yPosition, 10);
      doc.text(line, this.MARGIN, yPosition);
      yPosition += 5;
    });

    return yPosition;
  }

  /**
   * Helper per label stato fattura
   */
  private getInvoiceStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'paid': 'Pagata',
      'pending': 'Da Pagare',
      'cancelled': 'Annullata',
      'overdue': 'Scaduta'
    };
    return labels[status] || status;
  }
}
