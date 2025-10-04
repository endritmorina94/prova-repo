import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { DatabaseService } from '../../core/database/database.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    TranslateModule
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
  protected stats = [
    { icon: 'people', labelKey: 'dashboard.stats.patients', value: this.patientsCount, color: '#00897b' },
    { icon: 'description', labelKey: 'dashboard.stats.reports', value: this.reportsCount, color: '#1976d2' },
    { icon: 'receipt', labelKey: 'dashboard.stats.invoices', value: this.invoicesCount, color: '#f57c00' },
    { icon: 'event', labelKey: 'dashboard.stats.appointments_today', value: this.todayAppointmentsCount, color: '#7b1fa2' }
  ];
  private db = inject(DatabaseService);

  ngOnInit(): void {
    this.loadStats();
  }

  private loadStats(): void {
    this.loading.set(true);

    // Carica conteggi
    this.db.getPatients().subscribe({
      next: (patients) => {
        this.patientsCount.set(patients.length);
      }
    });

    // Per referti e fatture dobbiamo aggiungere metodi al DB
    // Per ora li lasciamo a 0, li implementiamo dopo

    this.loading.set(false);
  }
}
