import { inject, Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { SqliteBaseService } from './sqlite-base.service';
import { Activity, CreateActivityDto } from '../../../shared/models';

/**
 * Service SQLite specializzato per Activities (Timeline)
 */
@Injectable({
  providedIn: 'root'
})
export class SqliteActivitiesService {
  private base = inject(SqliteBaseService);

  /**
   * Ottiene tutte le attività di un paziente
   */
  getActivitiesByPatient(patientId: string): Observable<Activity[]> {
    return from(
      this.base['ensureInitialized']().then(async (db) => {
        const result = await db.select<any[]>(
          'SELECT * FROM activities WHERE patient_id = ? ORDER BY activity_date DESC',
          [patientId]
        );
        return result.map(this.mapActivityFromDb);
      })
    );
  }

  /**
   * Crea nuova attività
   */
  createActivity(data: CreateActivityDto): Observable<Activity> {
    return from(
      this.base['ensureInitialized']().then(async (db) => {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        await db.execute(
          `INSERT INTO activities (
            id, patient_id, activity_type, activity_date,
            description, reference_id, reference_type, created_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            data.patientId,
            data.activityType,
            new Date(data.activityDate).toISOString(),
            data.description,
            data.referenceId || null,
            data.referenceType || null,
            data.createdBy || null,
            now
          ]
        );

        const result = await db.select<any[]>(
          'SELECT * FROM activities WHERE id = ?',
          [id]
        );

        return this.mapActivityFromDb(result[0]);
      })
    );
  }

  /**
   * Mapper: DB row -> Activity model
   */
  private mapActivityFromDb = (row: any): Activity => {
    return {
      id: row.id,
      patientId: row.patient_id,
      activityType: row.activity_type,
      activityDate: new Date(row.activity_date),
      description: row.description,
      referenceId: row.reference_id,
      referenceType: row.reference_type,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at)
    };
  };
}
