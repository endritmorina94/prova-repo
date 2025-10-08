import { AfterViewInit, ChangeDetectorRef, Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DatabaseService } from '../../../core/database/database.service';
import { PdfGeneratorService } from '../../../core/pdf/pdf-generator.service';
import { Report } from '../../../shared/models';
import { forkJoin } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ReportsService } from '../reports.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PdfPreviewService } from '../../../core/services/pdf-preview.service';

interface ReportWithPatient extends Report {
  patientName: string;
}

@Component({
  selector: 'app-report-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule,
    TranslateModule,
    RouterLink
  ],
  templateUrl: './report-list.component.html',
  styleUrl: './report-list.component.css'
})
export class ReportListComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator, { static: false }) paginator!: MatPaginator;
  protected loading = false;
  protected dataSource = new MatTableDataSource<ReportWithPatient>([]);
  protected displayedColumns = ['reportNumber', 'patient', 'reportDate', 'visitType', 'actions'];
  private db = inject(DatabaseService);
  private pdfGenerator = inject(PdfGeneratorService);
  private translateService = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private reportsService = inject(ReportsService);
  private readonly pdfPreview = inject(PdfPreviewService);

  ngOnInit(): void {
    this.loadReports();
  }

  ngAfterViewInit(): void {
    this.dataSource.filterPredicate = (data: ReportWithPatient, filter: string) => {
      const searchStr = filter.toLowerCase();
      return (
        data.reportNumber.toLowerCase().includes(searchStr) ||
        data.patientName.toLowerCase().includes(searchStr) ||
        data.visitType.toLowerCase().includes(searchStr)
      );
    };
  }

  protected loadReports(): void {
    this.loading = true;

    // Prima carica tutti i pazienti
    this.db.getPatients().subscribe({
      next: (patients) => {
        // Poi carica i referti per ogni paziente
        const reportsObservables = patients.map(patient =>
          this.db.getReportsByPatient(patient.id)
        );

        if (reportsObservables.length === 0) {
          this.dataSource.data = [];
          this.loading = false;
          this.cdr.detectChanges();
          setTimeout(() => {
            if (this.paginator) {
              this.dataSource.paginator = this.paginator;
            }
          }, 0);
          return;
        }

        forkJoin(reportsObservables).subscribe({
          next: (reportsArrays) => {
            // Appiattisci gli array e aggiungi il nome paziente
            const allReports: ReportWithPatient[] = [];

            reportsArrays.forEach((reports, index) => {
              const patient = patients[index];
              reports.forEach(report => {
                allReports.push({
                  ...report,
                  patientName: `${patient.lastName} ${patient.firstName}`
                });
              });
            });

            // Ordina per data (più recenti prima)
            allReports.sort((a, b) =>
              new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()
            );

            this.dataSource.data = allReports;
            this.loading = false;
            this.cdr.detectChanges();

            setTimeout(() => {
              if (this.paginator) {
                this.dataSource.paginator = this.paginator;
              }
            }, 0);
          },
          error: (error) => {
            console.error('Error loading reports:', error);
            this.loading = false;
          }
        });
      },
      error: (error) => {
        console.error('Error loading patients:', error);
        this.loading = false;
      }
    });
  }

  protected applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  protected formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('it-IT');
  }

  protected getVisitTypeLabel(type: string): string {
    return this.translateService.instant(`report.visit_types.${type}`);
  }

  protected async downloadPDF(report: ReportWithPatient): Promise<void> {
    // Carica il paziente completo per generare il PDF
    this.db.getPatientById(report.patientId).subscribe({
      next: (patient) => {
        if (patient) {
          this.pdfGenerator.downloadReportPDF(report, patient);
        }
      }
    });
  }

  protected deleteReport(report: ReportWithPatient): void {
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
            this.snackBar.open('Referto eliminato con successo', 'Chiudi', { duration: 3000 });
            this.loadReports();
          },
          error: (error) => {
            console.error('Error deleting report:', error);
            this.snackBar.open('Errore durante l\'eliminazione', 'Chiudi', { duration: 3000 });
          }
        });
      }
    });
  }

  /**
   * Apre l'anteprima del PDF del referto
   */
  protected async previewPDF(report: ReportWithPatient): Promise<void> {
    this.db.getPatientById(report.patientId).subscribe({
      next: async (patient) => {
        if (patient) {
          try {
            // Genera il PDF come Uint8Array
            const doc = await this.pdfGenerator.generateReportPDF(report, patient);
            const filename = `Referto_${report.reportNumber}_${patient.lastName}_${patient.firstName}.pdf`;

            // Ottieni il PDF come Uint8Array
            const pdfData = doc.output('arraybuffer');
            const uint8Array = new Uint8Array(pdfData);

            // Apri l'anteprima
            this.pdfPreview.openPreview(uint8Array, filename);
          } catch (error) {
            console.error('Error generating PDF preview:', error);
            this.snackBar.open('Errore durante la generazione dell\'anteprima', 'Chiudi', {
              duration: 3000
            });
          }
        }
      },
      error: (error) => {
        console.error('Error loading patient:', error);
        this.snackBar.open('Errore durante il caricamento dei dati', 'Chiudi', {
          duration: 3000
        });
      }
    });
  }


}
