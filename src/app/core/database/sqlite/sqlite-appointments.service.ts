import { inject, Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { SqliteBaseService } from './sqlite-base.service';
import { Appointment, AppointmentStatus, CreateAppointmentDto, UpdateAppointmentDto } from '../../../shared/models';

/**
 * Service SQLite specializzato per Appuntamenti
 */
@Injectable({
  providedIn: 'root'
})
export class SqliteAppointmentsService {
  private base = inject(SqliteBaseService);

  /**
   * Ottiene appuntamenti con filtri
   */
  getAppointments(filters?: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
    patientId?: string
  }): Observable<Appointment[]> {
    return from(
      this.base['ensureInitialized']().then(async (db) => {
        let query = 'SELECT * FROM appointments WHERE 1=1';
        const params: any[] = [];

        if (filters?.startDate) {
          query += ' AND appointment_date >= ?';
          params.push(filters.startDate.toISOString());
        }

        if (filters?.endDate) {
          query += ' AND appointment_date <= ?';
          params.push(filters.endDate.toISOString());
        }

        if (filters?.status) {
          query += ' AND status = ?';
          params.push(filters.status);
        }

        if (filters?.patientId) {
          query += ' AND patient_id = ?';
          params.push(filters.patientId);
        }

        query += ' ORDER BY appointment_date ASC';

        const result = await db.select<any[]>(query, params);
        return result.map(this.mapAppointmentFromDb);
      })
    );
  }

  /**
   * Ottiene appuntamento per ID
   */
  getAppointmentById(id: string): Observable<Appointment | null> {
    return from(
      this.base['ensureInitialized']().then(async (db) => {
        const result = await db.select<any[]>(
          'SELECT * FROM appointments WHERE id = ?',
          [id]
        );
        return result.length > 0 ? this.mapAppointmentFromDb(result[0]) : null;
      })
    );
  }

  /**
   * Ottiene appuntamenti di un paziente
   */
  getAppointmentsByPatient(patientId: string): Observable<Appointment[]> {
    return from(
      this.base['ensureInitialized']().then(async (db) => {
        const result = await db.select<any[]>(
          'SELECT * FROM appointments WHERE patient_id = ? ORDER BY appointment_date DESC',
          [patientId]
        );
        return result.map(this.mapAppointmentFromDb);
      })
    );
  }

  /**
   * Crea nuovo appuntamento
   */
  createAppointment(data: CreateAppointmentDto): Observable<Appointment> {
    return from(
      this.base['ensureInitialized']().then(async (db) => {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        await db.execute(
          `INSERT INTO appointments (
            id, patient_id, studio_id, appointment_date,
            duration, appointment_type, status, notes,
            reminder_sent, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            data.patientId,
            data.studioId,
            new Date(data.appointmentDate).toISOString(),
            data.duration || 30,
            data.appointmentType || null,
            data.status || 'scheduled',
            data.notes || null,
            0, // reminder_sent
            now,
            now
          ]
        );

        // Crea attività nella timeline
        await db.execute(
          `INSERT INTO activities (
            id, patient_id, activity_type, activity_date,
            description, reference_id, reference_type, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            crypto.randomUUID(),
            data.patientId,
            'appointment_created',
            new Date(data.appointmentDate).toISOString(),
            `Appuntamento programmato${data.appointmentType ? ': ' + data.appointmentType : ''}`,
            id,
            'appointment',
            now
          ]
        );

        const result = await db.select<any[]>(
          'SELECT * FROM appointments WHERE id = ?',
          [id]
        );

        return this.mapAppointmentFromDb(result[0]);
      })
    );
  }

  /**
   * Aggiorna appuntamento
   */
  updateAppointment(id: string, data: UpdateAppointmentDto): Observable<Appointment> {
    return from(
      this.base['ensureInitialized']().then(async (db) => {
        const updates: string[] = [];
        const params: any[] = [];

        if (data.appointmentDate !== undefined) {
          updates.push('appointment_date = ?');
          params.push(new Date(data.appointmentDate).toISOString());
        }

        if (data.duration !== undefined) {
          updates.push('duration = ?');
          params.push(data.duration);
        }

        if (data.appointmentType !== undefined) {
          updates.push('appointment_type = ?');
          params.push(data.appointmentType);
        }

        if (data.status !== undefined) {
          updates.push('status = ?');
          params.push(data.status);
        }

        if (data.notes !== undefined) {
          updates.push('notes = ?');
          params.push(data.notes);
        }

        if (data.reminderSent !== undefined) {
          updates.push('reminder_sent = ?');
          params.push(data.reminderSent ? 1 : 0);
        }

        updates.push('updated_at = ?');
        params.push(new Date().toISOString());
        params.push(id);

        await db.execute(
          `UPDATE appointments SET ${updates.join(', ')} WHERE id = ?`,
          params
        );

        const result = await db.select<any[]>(
          'SELECT * FROM appointments WHERE id = ?',
          [id]
        );

        return this.mapAppointmentFromDb(result[0]);
      })
    );
  }

  /**
   * Elimina appuntamento
   */
  deleteAppointment(id: string): Observable<void> {
    return from(
      this.base['ensureInitialized']().then(async (db) => {
        await db.execute('DELETE FROM appointments WHERE id = ?', [id]);
      })
    );
  }

  /**
   * Conta appuntamenti di oggi
   */
  getTodayAppointmentsCount(): Observable<number> {
    return from(
      this.base['ensureInitialized']().then(async (db) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const result = await db.select<any[]>(
          `SELECT COUNT(*) as count FROM appointments
           WHERE appointment_date >= ?
           AND appointment_date < ?
           AND status IN ('scheduled', 'confirmed')`,
          [today.toISOString(), tomorrow.toISOString()]
        );

        return result[0]?.count || 0;
      })
    );
  }

  /**
   * Mapper: DB row -> Appointment model
   */
  private mapAppointmentFromDb = (row: any): Appointment => {
    return {
      id: row.id,
      patientId: row.patient_id,
      studioId: row.studio_id,
      appointmentDate: new Date(row.appointment_date),
      duration: row.duration,
      appointmentType: row.appointment_type,
      status: row.status as AppointmentStatus,
      notes: row.notes,
      reminderSent: Boolean(row.reminder_sent),
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  };
}
