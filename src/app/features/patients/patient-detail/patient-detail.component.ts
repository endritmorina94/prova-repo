import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PatientsService } from '../patients.service';
import { CreateDeliveryDto, Delivery, Invoice, Patient, Report, UpdateDeliveryDto } from '../../../shared/models';
import { DeliveryDialogComponent } from '../delivery-dialog/delivery-dialog.component';
import { ReportsService } from '../../reports/reports.service';
import { InvoicesService } from '../../invoices/invoices.service';
import { PdfGeneratorService } from '../../../core/pdf/pdf-generator.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { TimelineEventDialogComponent } from '../../../shared/components/timeline-event-dialog/timeline-event-dialog.component';

export interface TimelineEvent {
  date: Date;
  type: 'delivery' | 'report' | 'invoice';
  icon: string;
  color: string;
  title: string;
  description: string;
  data?: any;
}

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule,
    TranslateModule,
    RouterLink
  ],
  templateUrl: './patient-detail.component.html',
  styleUrl: './patient-detail.component.css'
})
export class PatientDetailComponent implements OnInit {
  // Signals
  protected patient = signal<Patient | null>(null);
  protected deliveries = signal<Delivery[]>([]);
  protected loading = signal(false);
  protected patientId = signal<string>('');
  protected reports = signal<Report[]>([]);
  protected invoices = signal<Invoice[]>([]);
// Aggiungi signal
  protected timelineEvents = signal<TimelineEvent[]>([]);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private patientsService = inject(PatientsService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private translateService = inject(TranslateService);
  private reportsService = inject(ReportsService);
  private invoicesService = inject(InvoicesService);
  private pdfGenerator = inject(PdfGeneratorService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.patientId.set(id);
      this.loadPatientDetails(id);
    } else {
      this.router.navigate(['/patients']);
    }
  }

  /**
   * Apri dialog per aggiungere parto
   */
  protected addDelivery(): void {
    const dialogRef = this.dialog.open(DeliveryDialogComponent, {
      width: '600px',
      data: { patientId: this.patientId() }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.createDelivery(result);
      }
    });
  }

  /**
   * Apri dialog per modificare parto
   */
  protected editDelivery(delivery: Delivery): void {
    const dialogRef = this.dialog.open(DeliveryDialogComponent, {
      width: '600px',
      data: {
        delivery,
        patientId: this.patientId()
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateDelivery(result.id, result);
      }
    });
  }

  /**
   * Elimina parto
   */
  protected deleteDelivery(delivery: Delivery): void {
    const confirmMessage = this.translateService.instant('patient.deliveries.delete_confirm');
    if (confirm(confirmMessage)) {
      this.patientsService.deleteDelivery(delivery.id).subscribe({
        next: () => {
          const successMessage = this.translateService.instant('patient.messages.delivery_deleted');
          this.snackBar.open(successMessage, this.translateService.instant('common.close'), { duration: 3000 });
          this.loadDeliveries(this.patientId());
        },
        error: (error) => {
          console.error('Error deleting delivery:', error);
          const errorMessage = this.translateService.instant('patient.messages.error_delete');
          this.snackBar.open(errorMessage, this.translateService.instant('common.close'), { duration: 3000 });
        }
      });
    }
  }

  /**
   * Calcola l'età
   */
  protected calculateAge(birthDate: Date): number {
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
   * Formatta data
   */
  protected formatDate(date: Date | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('it-IT');
  }

  /**
   * Ottiene label tipo parto tradotta
   */
  protected getDeliveryTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'natural': 'Naturale',
      'cesarean': 'Cesareo',
      'assisted': 'Assistito'
    };
    return labels[type] || type;
  }

  /**
   * Ottiene label sesso bambino
   */
  protected getGenderLabel(gender: string | undefined): string {
    if (!gender) return '-';
    const labels: { [key: string]: string } = {
      'male': 'Maschio',
      'female': 'Femmina'
    };
    return labels[gender] || gender;
  }

  /**
   * Naviga a modifica paziente
   */
  protected editPatient(): void {
    this.router.navigate(['/patients', this.patientId(), 'edit']);
  }

  /**
   * Torna alla lista
   */
  protected goBack(): void {
    this.router.navigate(['/patients']);
  }

  /**
   * Ottiene label tipo visita tradotta
   */
  protected getVisitTypeLabel(type: string): string {
    return this.translateService.instant(`report.visit_types.${type}`);
  }

  /**
   * Ottiene label stato pagamento
   */
  protected getPaymentStatusLabel(status: string): string {
    return this.translateService.instant(`invoice.status.${status}`);
  }

  /**
   * Scarica PDF referto
   */
  protected downloadReportPDF(report: Report): void {
    this.pdfGenerator.downloadReportPDF(report, this.patient()!);
  }

  /**
   * Scarica PDF fattura
   */
  protected downloadInvoicePDF(invoice: Invoice): void {
    this.pdfGenerator.downloadInvoicePDF(invoice, this.patient()!);
  }

  /**
   * Elimina referto
   */
  protected deleteReport(report: Report): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Elimina Referto',
        message: `Sei sicuro di voler eliminare il referto ${report.reportNumber}? Questa azione non può essere annullata.`,
        confirmText: 'Elimina',
        cancelText: 'Annulla',
        confirmColor: 'warn'
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.reportsService.deleteReport(report.id).subscribe({
          next: () => {
            const successMessage = this.translateService.instant('report.messages.deleted');
            this.snackBar.open(successMessage, this.translateService.instant('common.close'), { duration: 3000 });
            this.loadReports(this.patientId());
          },
          error: (error) => {
            console.error('Error deleting report:', error);
            const errorMessage = this.translateService.instant('report.messages.error_delete');
            this.snackBar.open(errorMessage, this.translateService.instant('common.close'), { duration: 3000 });
          }
        });
      }
    });
  }

  /**
   * Elimina fattura
   */
  protected deleteInvoice(invoice: Invoice): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Elimina Fattura',
        message: `Sei sicuro di voler eliminare la fattura ${invoice.invoiceNumber}? Questa azione non può essere annullata.`,
        confirmText: 'Elimina',
        cancelText: 'Annulla',
        confirmColor: 'warn'
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.invoicesService.deleteInvoice(invoice.id).subscribe({
          next: () => {
            const successMessage = this.translateService.instant('invoice.messages.deleted');
            this.snackBar.open(successMessage, this.translateService.instant('common.close'), { duration: 3000 });
            this.loadInvoices(this.patientId());
          },
          error: (error) => {
            console.error('Error deleting invoice:', error);
            const errorMessage = this.translateService.instant('invoice.messages.error_delete');
            this.snackBar.open(errorMessage, this.translateService.instant('common.close'), { duration: 3000 });
          }
        });
      }
    });
  }

  /**
   * Gestisce click su evento timeline
   */
  protected onTimelineEventClick(event: TimelineEvent): void {
    switch (event.type) {
      case 'report':
        // Apri dialog con dettagli referto
        this.openReportDialog(event.data);
        break;
      case 'invoice':
        // Apri dialog con dettagli fattura
        this.openInvoiceDialog(event.data);
        break;
      case 'delivery':
        // Apri dialog con dettagli parto
        this.openDeliveryDialog(event.data);
        break;
    }
  }

  /**
   * Carica referti del paziente
   */
  private loadReports(patientId: string): void {
    this.reportsService.getReportsByPatient(patientId).subscribe({
      next: (reports) => {
        this.reports.set(reports);
      },
      error: (error) => {
        console.error('Error loading reports:', error);
      }
    });
  }

  /**
   * Carica fatture del paziente
   */
  private loadInvoices(patientId: string): void {
    this.invoicesService.getInvoicesByPatient(patientId).subscribe({
      next: (invoices) => {
        this.invoices.set(invoices);
      },
      error: (error) => {
        console.error('Error loading invoices:', error);
      }
    });
  }

  /**
   * Carica storico parti
   */
  private loadDeliveries(patientId: string): void {
    this.patientsService.getDeliveriesByPatient(patientId).subscribe({
      next: (deliveries) => {
        this.deliveries.set(deliveries);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading deliveries:', error);
        this.loading.set(false);
      }
    });
  }

  /**
   * Crea nuovo parto
   */
  private createDelivery(data: CreateDeliveryDto): void {
    this.patientsService.createDelivery(data).subscribe({
      next: () => {
        this.snackBar.open('Parto aggiunto con successo', 'Chiudi', { duration: 3000 });
        this.loadDeliveries(this.patientId());
      },
      error: (error) => {
        console.error('Error creating delivery:', error);
        this.snackBar.open('Errore durante il salvataggio', 'Chiudi', { duration: 3000 });
      }
    });
  }

  /**
   * Aggiorna parto esistente
   */
  private updateDelivery(id: string, data: UpdateDeliveryDto): void {
    this.patientsService.updateDelivery(id, data).subscribe({
      next: () => {
        this.snackBar.open('Parto aggiornato con successo', 'Chiudi', { duration: 3000 });
        this.loadDeliveries(this.patientId());
      },
      error: (error) => {
        console.error('Error updating delivery:', error);
        this.snackBar.open('Errore durante l\'aggiornamento', 'Chiudi', { duration: 3000 });
      }
    });
  }

  /**
   * Carica timeline eventi
   */
  private loadTimeline(): void {
    const patientId = this.patientId();
    const events: TimelineEvent[] = [];
// Eventi da deliveries
    this.deliveries().forEach(delivery => {
      events.push({
        date: delivery.deliveryDate,
        type: 'delivery',
        icon: 'child_care',
        color: '#e91e63',
        title: 'Parto Registrato',
        description: `${delivery.deliveryType === 'cesarean' ? 'Cesareo' : 'Naturale'}${delivery.complications ? ' - Complicazioni' : ''}`,
        data: delivery
      });
    });
// Eventi da reports
    this.reports().forEach(report => {
      events.push({
        date: report.reportDate,
        type: 'report',
        icon: 'description',
        color: '#1976d2',
        title: `Referto ${report.reportNumber}`,
        description: this.getVisitTypeLabel(report.visitType),
        data: report
      });
    });
// Eventi da invoices
    this.invoices().forEach(invoice => {
      events.push({
        date: invoice.invoiceDate,
        type: 'invoice',
        icon: 'receipt',
        color: '#f57c00',
        title: `Fattura ${invoice.invoiceNumber}`,
        description: `€ ${invoice.totalAmount.toFixed(2)} - ${this.getPaymentStatusLabel(invoice.paymentStatus)}`,
        data: invoice
      });
    });
// Ordina per data (più recenti prima)
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    this.timelineEvents.set(events);
  }

// Chiama loadTimeline nel loadPatientDetails dopo aver caricato tutto
  private loadPatientDetails(id: string): void {
    this.loading.set(true);
    this.patientsService.getPatientById(id).subscribe({
      next: (patient) => {
        if (patient) {
          this.patient.set(patient);
          this.loadDeliveries(id);
          this.loadReports(id);
          this.loadInvoices(id);
          // Aspetta che tutto sia caricato poi genera timeline
          setTimeout(() => {
            this.loadTimeline();
          }, 500);
        } else {
          this.router.navigate(['/patients']);
        }
      },
      error: (error) => {
        console.error('Error loading patient:', error);
        this.loading.set(false);
        this.router.navigate(['/patients']);
      }
    });
  }

  /**
   * Dialog dettagli referto
   */
  private openReportDialog(report: Report): void {
    const dialogRef = this.dialog.open(TimelineEventDialogComponent, {
      width: '600px',
      data: {
        type: 'report',
        title: `Referto ${report.reportNumber}`,
        icon: 'description',
        color: '#1976d2',
        date: report.reportDate,
        fields: [
          { label: 'Numero Referto', value: report.reportNumber },
          { label: 'Data', value: this.formatDate(report.reportDate) },
          { label: 'Tipo Visita', value: this.getVisitTypeLabel(report.visitType) },
          { label: 'Esame Obiettivo', value: report.examination, textarea: true },
          { label: 'Ecografia', value: report.ultrasoundResult || '-', textarea: true },
          { label: 'Terapia', value: report.therapy || '-', textarea: true }
        ],
        actions: [
          {
            label: 'Modifica',
            icon: 'edit',
            color: 'primary',
            action: () => {
              dialogRef.close();
              this.router.navigate(['/reports', report.id, 'edit']);
            }
          },
          {
            label: 'Scarica PDF',
            icon: 'download',
            color: 'accent',
            action: () => {
              this.downloadReportPDF(report);
            }
          }
        ]
      }
    });
  }

  /**
   * Dialog dettagli fattura
   */
  private openInvoiceDialog(invoice: Invoice): void {
    const dialogRef = this.dialog.open(TimelineEventDialogComponent, {
      width: '600px',
      data: {
        type: 'invoice',
        title: `Fattura ${invoice.invoiceNumber}`,
        icon: 'receipt',
        color: '#f57c00',
        date: invoice.invoiceDate,
        fields: [
          { label: 'Numero Fattura', value: invoice.invoiceNumber },
          { label: 'Data Emissione', value: this.formatDate(invoice.invoiceDate) },
          { label: 'Scadenza', value: invoice.dueDate ? this.formatDate(invoice.dueDate) : '-' },
          { label: 'Importo', value: `€ ${invoice.amount.toFixed(2)}` },
          { label: 'IVA', value: `€ ${invoice.vatAmount?.toFixed(2) || '0.00'} (${invoice.vatRate}%)` },
          { label: 'Totale', value: `€ ${invoice.totalAmount.toFixed(2)}`, highlight: true },
          { label: 'Metodo Pagamento', value: invoice.paymentMethod },
          { label: 'Stato', value: this.getPaymentStatusLabel(invoice.paymentStatus) },
          { label: 'Data Pagamento', value: invoice.paymentDate ? this.formatDate(invoice.paymentDate) : '-' },
          { label: 'Note', value: invoice.notes || '-', textarea: true }
        ],
        actions: [
          {
            label: 'Modifica',
            icon: 'edit',
            color: 'primary',
            action: () => {
              dialogRef.close();
              this.router.navigate(['/invoices', invoice.id, 'edit']);
            }
          },
          {
            label: 'Scarica PDF',
            icon: 'download',
            color: 'accent',
            action: () => {
              this.downloadInvoicePDF(invoice);
            }
          }
        ]
      }
    });
  }

  /**
   * Dialog dettagli parto
   */
  private openDeliveryDialog(delivery: Delivery): void {
    // Funzione helper per il genere
    const getGenderLabel = (gender?: string): string => {
      if (!gender) return '-';
      return gender === 'male' ? 'Maschio' : gender === 'female' ? 'Femmina' : 'Non specificato';
    };

    this.dialog.open(TimelineEventDialogComponent, {
      width: '600px',
      data: {
        type: 'delivery',
        title: 'Dettagli Parto',
        icon: 'child_care',
        color: '#e91e63',
        date: delivery.deliveryDate,
        fields: [
          { label: 'Data Parto', value: this.formatDate(delivery.deliveryDate) },
          { label: 'Tipo', value: delivery.deliveryType === 'cesarean' ? 'Cesareo' : 'Naturale' },
          { label: 'Settimane Gravidanza', value: delivery.pregnancyWeeks?.toString() || '-' },
          { label: 'Peso Neonato', value: delivery.babyWeight ? `${delivery.babyWeight} kg` : '-' },
          { label: 'Sesso Neonato', value: getGenderLabel(delivery.babyGender) },
          { label: 'Complicazioni', value: delivery.complications || 'Nessuna', textarea: true },
          { label: 'Note', value: delivery.notes || '-', textarea: true }
        ],
        actions: []
      }
    });
  }
}
