// src/app/core/database/sqlite/sqlite-reports.service.ts
import { inject, Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { SqliteBaseService } from './sqlite-base.service';
import { CreateReportDto, Report, UpdateReportDto } from '../../../shared/models';

/**
 * Service SQLite specializzato per Referti
 */
@Injectable({
  providedIn: 'root'
})
export class SqliteReportsService {
  private base = inject(SqliteBaseService);

  /**
   * Ottiene tutti i referti di un paziente
   */
  getReportsByPatient(patientId: string): Observable<Report[]> {
    return from(
      this.base['ensureInitialized']().then(async (db) => {
        const result = await db.select<any[]>(
          'SELECT * FROM reports WHERE patient_id = ? ORDER BY report_date DESC',
          [patientId]
        );
        return result.map(this.mapReportFromDb);
      })
    );
  }

  /**
   * Ottiene referto per ID
   */
  getReportById(id: string): Observable<Report | null> {
    return from(
      this.base['ensureInitialized']().then(async (db) => {
        const result = await db.select<any[]>(
          'SELECT * FROM reports WHERE id = ?',
          [id]
        );
        return result.length > 0 ? this.mapReportFromDb(result[0]) : null;
      })
    );
  }

  /**
   * Crea nuovo referto
   */
  createReport(data: CreateReportDto): Observable<Report> {
    return from(
      this.base['ensureInitialized']().then(async (db) => {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        // Genera report number
        const reportNumber = await this.generateReportNumber(db);

        await db.execute(
          `INSERT INTO reports (
            id, patient_id, studio_id, report_date, visit_type,
            report_number, patient_snapshot, examination, ultrasound_result,
            therapy, attachments, internal_notes, doctor_name, doctor_title,
            signed, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            data.patientId,
            data.studioId,
            new Date(data.reportDate).toISOString(),
            data.visitType,
            reportNumber,
            JSON.stringify(data.patientSnapshot),
            data.examination,
            data.ultrasoundResult || null,
            data.therapy || null,
            data.attachments ? JSON.stringify(data.attachments) : null,
            data.internalNotes || null,
            data.doctorName || null,
            data.doctorTitle || null,
            0, // signed
            now,
            now
          ]
        );

        const result = await db.select<any[]>(
          'SELECT * FROM reports WHERE id = ?',
          [id]
        );

        return this.mapReportFromDb(result[0]);
      })
    );
  }

  /**
   * Aggiorna referto
   */
  updateReport(id: string, data: UpdateReportDto): Observable<Report> {
    return from(
      this.base['ensureInitialized']().then(async (db) => {
        const updates: string[] = [];
        const params: any[] = [];

        if (data.reportDate !== undefined) {
          updates.push('report_date = ?');
          params.push(new Date(data.reportDate).toISOString()); // FIX
        }
        if (data.visitType !== undefined) {
          updates.push('visit_type = ?');
          params.push(data.visitType);
        }
        if (data.patientSnapshot !== undefined) {
          updates.push('patient_snapshot = ?');
          params.push(JSON.stringify(data.patientSnapshot));
        }
        if (data.examination !== undefined) {
          updates.push('examination = ?');
          params.push(data.examination);
        }
        if (data.ultrasoundResult !== undefined) {
          updates.push('ultrasound_result = ?');
          params.push(data.ultrasoundResult);
        }
        if (data.therapy !== undefined) {
          updates.push('therapy = ?');
          params.push(data.therapy);
        }
        if (data.attachments !== undefined) {
          updates.push('attachments = ?');
          params.push(JSON.stringify(data.attachments));
        }
        if (data.internalNotes !== undefined) {
          updates.push('internal_notes = ?');
          params.push(data.internalNotes);
        }
        if (data.doctorName !== undefined) {
          updates.push('doctor_name = ?');
          params.push(data.doctorName);
        }
        if (data.doctorTitle !== undefined) {
          updates.push('doctor_title = ?');
          params.push(data.doctorTitle);
        }

        updates.push('updated_at = ?');
        params.push(new Date().toISOString());
        params.push(id);

        await db.execute(
          `UPDATE reports SET ${updates.join(', ')} WHERE id = ?`,
          params
        );

        const result = await db.select<any[]>(
          'SELECT * FROM reports WHERE id = ?',
          [id]
        );

        return this.mapReportFromDb(result[0]);
      })
    );
  }

  /**
   * Elimina referto
   */
  deleteReport(id: string): Observable<void> {
    return from(
      this.base['ensureInitialized']().then(async (db) => {
        await db.execute('DELETE FROM reports WHERE id = ?', [id]);
      })
    );
  }

  /**
   * Genera prossimo numero referto
   */
  getNextReportNumber(): Observable<string> {
    return from(
      this.base['ensureInitialized']().then(async (db) => {
        return this.generateReportNumber(db);
      })
    );
  }

  /**
   * Genera numero referto (helper privato)
   */
  private async generateReportNumber(db: any): Promise<string> {
    const year = new Date().getFullYear();
    const result: any = await db.select(
      `SELECT COUNT(*) as count FROM reports
       WHERE report_number LIKE ?`,
      [`REF-${year}-%`]
    );
    const count: number = result[0]?.count || 0;
    const number = String(count + 1).padStart(4, '0');
    return `REF-${year}-${number}`;
  }

  /**
   * Mapper: DB row -> Report model
   */
  private mapReportFromDb = (row: any): Report => {
    return {
      id: row.id,
      patientId: row.patient_id,
      studioId: row.studio_id,
      reportDate: new Date(row.report_date), // FIX
      visitType: row.visit_type,
      reportNumber: row.report_number,
      patientSnapshot: JSON.parse(row.patient_snapshot),
      examination: row.examination,
      ultrasoundResult: row.ultrasound_result,
      therapy: row.therapy,
      attachments: row.attachments ? JSON.parse(row.attachments) : undefined,
      internalNotes: row.internal_notes,
      doctorName: row.doctor_name,
      doctorTitle: row.doctor_title,
      signed: Boolean(row.signed), // FIX
      createdAt: new Date(row.created_at), // FIX
      updatedAt: new Date(row.updated_at) // FIX
    };
  };
}
