import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { DatabaseService } from '../../core/database/database.service';
import { Appointment, AppointmentStatus, CreateAppointmentDto, UpdateAppointmentDto } from '../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class AppointmentsService {
  private db = inject(DatabaseService);

  // Signal per cache locale (opzionale)
  private appointmentsCache = signal<Appointment[]>([]);

  /**
   * Cache signal (per componenti che vogliono usare signals)
   */
  get appointments() {
    return this.appointmentsCache.asReadonly();
  }

  /**
   * Ottiene tutti gli appuntamenti con filtri
   */
  getAppointments(filters?: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
    patientId?: string
  }): Observable<Appointment[]> {
    return this.db.getAppointments(filters).pipe(
      tap(appointments => {
        if (!filters) {
          this.appointmentsCache.set(appointments);
        }
      })
    );
  }

  /**
   * Ottiene appuntamento per ID
   */
  getAppointmentById(id: string): Observable<Appointment | null> {
    return this.db.getAppointmentById(id);
  }

  /**
   * Ottiene tutti gli appuntamenti di un paziente
   */
  getAppointmentsByPatient(patientId: string): Observable<Appointment[]> {
    return this.db.getAppointmentsByPatient(patientId);
  }

  /**
   * Ottiene appuntamenti di oggi
   */
  getTodayAppointments(): Observable<Appointment[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.getAppointments({
      startDate: today,
      endDate: tomorrow
    });
  }

  /**
   * Ottiene appuntamenti della settimana corrente
   */
  getThisWeekAppointments(): Observable<Appointment[]> {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Domenica
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    return this.getAppointments({
      startDate: startOfWeek,
      endDate: endOfWeek
    });
  }

  /**
   * Ottiene appuntamenti del mese corrente
   */
  getThisMonthAppointments(): Observable<Appointment[]> {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    return this.getAppointments({
      startDate: startOfMonth,
      endDate: endOfMonth
    });
  }

  /**
   * Crea nuovo appuntamento
   */
  createAppointment(data: CreateAppointmentDto): Observable<Appointment> {
    return this.db.createAppointment(data).pipe(
      tap(() => {
        // Invalida cache
        this.invalidateCache();
      })
    );
  }

  /**
   * Aggiorna appuntamento
   */
  updateAppointment(id: string, data: UpdateAppointmentDto): Observable<Appointment> {
    return this.db.updateAppointment(id, data).pipe(
      tap(() => {
        // Invalida cache
        this.invalidateCache();
      })
    );
  }

  /**
   * Elimina appuntamento
   */
  deleteAppointment(id: string): Observable<void> {
    return this.db.deleteAppointment(id).pipe(
      tap(() => {
        // Invalida cache
        this.invalidateCache();
      })
    );
  }

  /**
   * Conta appuntamenti di oggi
   */
  getTodayAppointmentsCount(): Observable<number> {
    return this.db.getTodayAppointmentsCount();
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
      confirmed: '#4CAF50',   // Green
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
      confirmed: 'Confermato',
      cancelled: 'Cancellato',
      no_show: 'Non Presentato'
    };
    return labels[status] || status;
  }

  /**
   * Invalida cache
   */
  private invalidateCache(): void {
    // Ricarica appointments se necessario
    this.getAppointments().subscribe();
  }
}
