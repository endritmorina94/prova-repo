import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { DatabaseService } from '../../core/database/database.service';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    TranslateModule,
    MatButton,
    RouterLink,
    MatProgressSpinner
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  protected loading = signal(true);
  protected patientsCount = signal(0);
  protected reportsCount = signal(0);
  protected invoicesCount = signal(0);
  protected todayAppointmentsCount = signal(0);
  protected stats = computed(() => [
    {
      icon: 'people',
      labelKey: 'dashboard.stats.patients',
      value: this.patientsCount(),
      color: '#00897b'
    },
    {
      icon: 'description',
      labelKey: 'dashboard.stats.reports',
      value: this.reportsCount(),
      color: '#1976d2'
    },
    {
      icon: 'receipt',
      labelKey: 'dashboard.stats.invoices',
      value: this.invoicesCount(),
      color: '#f57c00'
    },
    {
      icon: 'event',
      labelKey: 'dashboard.stats.appointments_today',
      value: this.todayAppointmentsCount(),
      color: '#7b1fa2'
    }
  ]);
  private db = inject(DatabaseService);


  ngOnInit(): void {
    this.loadStats();
  }

  private loadStats(): void {
    this.loading.set(true);

    forkJoin({
      patients: this.db.getPatients(),
      todayAppointments: this.db.getTodayAppointmentsCount()
    }).subscribe({
      next: ({ patients, todayAppointments }) => {
        this.patientsCount.set(patients.length);
        this.todayAppointmentsCount.set(todayAppointments);

        // Carica referti e fatture per ogni paziente
        if (patients.length === 0) {
          this.loading.set(false);
          return;
        }

        const reportObservables = patients.map(p => this.db.getReportsByPatient(p.id));
        const invoiceObservables = patients.map(p => this.db.getInvoicesByPatient(p.id));

        forkJoin({
          reports: forkJoin(reportObservables),
          invoices: forkJoin(invoiceObservables)
        }).subscribe({
          next: ({ reports, invoices }) => {
            const totalReports = reports.reduce((sum, arr) => sum + arr.length, 0);
            const totalInvoices = invoices.reduce((sum, arr) => sum + arr.length, 0);

            this.reportsCount.set(totalReports);
            this.invoicesCount.set(totalInvoices);
            this.loading.set(false);
          },
          error: (error) => {
            console.error('Error loading stats:', error);
            this.loading.set(false);
          }
        });
      },
      error: (error) => {
        console.error('Error loading initial stats:', error);
        this.loading.set(false);
      }
    });
  }
}
