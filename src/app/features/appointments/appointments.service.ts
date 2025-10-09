import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { DatabaseService } from '../../core/database/database.service';
import { Appointment, AppointmentFilters, AppointmentStatus, CreateAppointmentDto, UpdateAppointmentDto } from '../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class AppointmentsService {
  currentAppointment = signal<Appointment | null>(null);
  private db = inject(DatabaseService);
  // Signals per cache
  private appointmentsCache = signal<Appointment[]>([]);

  /**
   * Ottiene appuntamenti con filtri
   */
  getAppointments(filters?: AppointmentFilters): Observable<Appointment[]> {
    return this.db.getAppointments(filters).pipe(
      tap(appointments => this.appointmentsCache.set(appointments))
    );
  }

  /**
   * Ottiene appuntamenti per paziente
   */
  getAppointmentsByPatient(patientId: string): Observable<Appointment[]> {
    return this.db.getAppointmentsByPatient(patientId);
  }

  /**
   * Ottiene appuntamenti per data
   */
  getAppointmentsByDate(date: Date): Observable<Appointment[]> {
    return this.db.getAppointmentsByDate(date);
  }

  /**
   * Ottiene appuntamento per ID
   */
  getAppointmentById(id: string): Observable<Appointment | null> {
    return this.db.getAppointmentById(id).pipe(
      tap(appointment => this.currentAppointment.set(appointment))
    );
  }

  /**
   * Crea nuovo appuntamento
   */
  createAppointment(data: CreateAppointmentDto): Observable<Appointment> {
    return this.db.createAppointment(data).pipe(
      tap(appointment => {
        this.appointmentsCache.update(apps => [...apps, appointment]);
      })
    );
  }

  /**
   * Aggiorna appuntamento
   */
  updateAppointment(id: string, data: UpdateAppointmentDto): Observable<Appointment> {
    return this.db.updateAppointment(id, data).pipe(
      tap(updatedAppointment => {
        this.appointmentsCache.update(apps =>
          apps.map(a => a.id === id ? updatedAppointment : a)
        );
        if (this.currentAppointment()?.id === id) {
          this.currentAppointment.set(updatedAppointment);
        }
      })
    );
  }

  /**
   * Elimina appuntamento
   */
  deleteAppointment(id: string): Observable<void> {
    return this.db.deleteAppointment(id).pipe(
      tap(() => {
        this.appointmentsCache.update(apps =>
          apps.filter(a => a.id !== id)
        );
        if (this.currentAppointment()?.id === id) {
          this.currentAppointment.set(null);
        }
      })
    );
  }

  /**
   * Ottiene appuntamenti di oggi
   */
  getTodayAppointments(): Observable<Appointment[]> {
    return this.db.getTodayAppointments();
  }

  /**
   * Conta appuntamenti per stato
   */
  countAppointmentsByStatus(status: AppointmentStatus): Observable<number> {
    return this.db.countAppointmentsByStatus(status);
  }

  /**
   * Helper: Ottiene range settimana corrente
   */
  getCurrentWeekRange(): { start: Date; end: Date } {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const start = new Date(now);
    start.setDate(now.getDate() - dayOfWeek);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  /**
   * Helper: Ottiene range mese corrente
   */
  getCurrentMonthRange(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    return { start, end };
  }

  /**
   * Helper: Colore per stato appuntamento
   */
  getStatusColor(status: AppointmentStatus): string {
    const colors = {
      scheduled: '#2196F3',   // Blue
      completed: '#4CAF50',   // Green
      cancelled: '#9E9E9E',   // Gray
      no_show: '#F44336'      // Red
    };
    return colors[status] || colors.scheduled;
  }

  /**
   * Helper: Label tradotta per stato
   */
  getStatusLabel(status: AppointmentStatus): string {
    const labels = {
      scheduled: 'Programmato',
      completed: 'Completato',
      cancelled: 'Cancellato',
      no_show: 'Non Presentato'
    };
    return labels[status] || status;
  }
}
