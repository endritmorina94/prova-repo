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
   * Carica dettagli paziente completi
   */
  private loadPatientDetails(id: string): void {
    this.loading.set(true);
    this.patientsService.getPatientById(id).subscribe({
      next: (patient) => {
        if (patient) {
          this.patient.set(patient);
          this.loadDeliveries(id);
          this.loadReports(id);
          this.loadInvoices(id);
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
}
