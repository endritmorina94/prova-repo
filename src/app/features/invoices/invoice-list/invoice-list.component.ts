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
import { Invoice } from '../../../shared/models';
import { forkJoin } from 'rxjs';

interface InvoiceWithPatient extends Invoice {
  patientName: string;
}

@Component({
  selector: 'app-invoice-list',
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
    TranslateModule
  ],
  templateUrl: './invoice-list.component.html',
  styleUrl: './invoice-list.component.css'
})
export class InvoiceListComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator, { static: false }) paginator!: MatPaginator;
  protected loading = false;
  protected dataSource = new MatTableDataSource<InvoiceWithPatient>([]);
  protected displayedColumns = ['invoiceNumber', 'patient', 'invoiceDate', 'totalAmount', 'paymentStatus', 'actions'];
  private db = inject(DatabaseService);
  private pdfGenerator = inject(PdfGeneratorService);
  private translateService = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.loadInvoices();
  }

  ngAfterViewInit(): void {
    this.dataSource.filterPredicate = (data: InvoiceWithPatient, filter: string) => {
      const searchStr = filter.toLowerCase();
      return (
        data.invoiceNumber.toLowerCase().includes(searchStr) ||
        data.patientName.toLowerCase().includes(searchStr) ||
        data.paymentStatus.toLowerCase().includes(searchStr)
      );
    };
  }

  protected loadInvoices(): void {
    this.loading = true;

    this.db.getPatients().subscribe({
      next: (patients) => {
        const invoicesObservables = patients.map(patient =>
          this.db.getInvoicesByPatient(patient.id)
        );

        if (invoicesObservables.length === 0) {
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

        forkJoin(invoicesObservables).subscribe({
          next: (invoicesArrays) => {
            const allInvoices: InvoiceWithPatient[] = [];

            invoicesArrays.forEach((invoices, index) => {
              const patient = patients[index];
              invoices.forEach(invoice => {
                allInvoices.push({
                  ...invoice,
                  patientName: `${patient.lastName} ${patient.firstName}`
                });
              });
            });

            // Ordina per data (più recenti prima)
            allInvoices.sort((a, b) =>
              new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()
            );

            this.dataSource.data = allInvoices;
            this.loading = false;
            this.cdr.detectChanges();

            setTimeout(() => {
              if (this.paginator) {
                this.dataSource.paginator = this.paginator;
              }
            }, 0);
          },
          error: (error) => {
            console.error('Error loading invoices:', error);
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

  protected getPaymentStatusLabel(status: string): string {
    return this.translateService.instant(`invoice.status.${status}`);
  }

  protected getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'paid': '#4caf50',
      'pending': '#ff9800',
      'cancelled': '#9e9e9e',
      'overdue': '#f44336'
    };
    return colors[status] || '#9e9e9e';
  }

  protected async downloadPDF(invoice: InvoiceWithPatient): Promise<void> {
    this.db.getPatientById(invoice.patientId).subscribe({
      next: (patient) => {
        if (patient) {
          this.pdfGenerator.downloadInvoicePDF(invoice, patient);
        }
      }
    });
  }
}
