// src/app/core/database/sqlite/sqlite-deliveries.service.ts
import { inject, Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { SqliteBaseService } from './sqlite-base.service';
import { CreateDeliveryDto, Delivery, UpdateDeliveryDto } from '../../../shared/models';

/**
 * Service SQLite specializzato per Storico Parti
 */
@Injectable({
  providedIn: 'root'
})
export class SqliteDeliveriesService {
  private base = inject(SqliteBaseService);

  /**
   * Ottiene tutti i parti di un paziente
   */
  getDeliveriesByPatient(patientId: string): Observable<Delivery[]> {
    return from(
      this.base['ensureInitialized']().then(async (db) => {
        const result = await db.select<any[]>(
          'SELECT * FROM deliveries WHERE patient_id = ? ORDER BY delivery_date DESC',
          [patientId]
        );
        return result.map(this.mapDeliveryFromDb);
      })
    );
  }

  /**
   * Crea nuovo parto
   */
  createDelivery(data: CreateDeliveryDto): Observable<Delivery> {
    return from(
      this.base['ensureInitialized']().then(async (db) => {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        await db.execute(
          `INSERT INTO deliveries (
            id, patient_id, studio_id, delivery_date, delivery_type,
            pregnancy_weeks, baby_weight, baby_gender, complications,
            notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            data.patientId,
            data.studioId,
            this.base['toSqliteDate'](data.deliveryDate),
            data.deliveryType,
            data.pregnancyWeeks || null,
            data.babyWeight || null,
            data.babyGender || null,
            data.complications || null,
            data.notes || null,
            now,
            now
          ]
        );

        const result = await db.select<any[]>(
          'SELECT * FROM deliveries WHERE id = ?',
          [id]
        );

        return this.mapDeliveryFromDb(result[0]);
      })
    );
  }

  /**
   * Aggiorna parto
   */
  updateDelivery(id: string, data: UpdateDeliveryDto): Observable<Delivery> {
    return from(
      this.base['ensureInitialized']().then(async (db) => {
        const updates: string[] = [];
        const params: any[] = [];

        if (data.deliveryDate !== undefined) {
          updates.push('delivery_date = ?');
          params.push(this.base['toSqliteDate'](data.deliveryDate));
        }
        if (data.deliveryType !== undefined) {
          updates.push('delivery_type = ?');
          params.push(data.deliveryType);
        }
        if (data.pregnancyWeeks !== undefined) {
          updates.push('pregnancy_weeks = ?');
          params.push(data.pregnancyWeeks);
        }
        if (data.babyWeight !== undefined) {
          updates.push('baby_weight = ?');
          params.push(data.babyWeight);
        }
        if (data.babyGender !== undefined) {
          updates.push('baby_gender = ?');
          params.push(data.babyGender);
        }
        if (data.complications !== undefined) {
          updates.push('complications = ?');
          params.push(data.complications);
        }
        if (data.notes !== undefined) {
          updates.push('notes = ?');
          params.push(data.notes);
        }

        updates.push('updated_at = ?');
        params.push(new Date().toISOString());
        params.push(id);

        await db.execute(
          `UPDATE deliveries SET ${updates.join(', ')} WHERE id = ?`,
          params
        );

        const result = await db.select<any[]>(
          'SELECT * FROM deliveries WHERE id = ?',
          [id]
        );

        return this.mapDeliveryFromDb(result[0]);
      })
    );
  }

  /**
   * Elimina parto
   */
  deleteDelivery(id: string): Observable<void> {
    return from(
      this.base['ensureInitialized']().then(async (db) => {
        await db.execute('DELETE FROM deliveries WHERE id = ?', [id]);
      })
    );
  }

  /**
   * Mapper: DB row -> Delivery model
   */
  private mapDeliveryFromDb = (row: any): Delivery => {
    return {
      id: row.id,
      patientId: row.patient_id,
      studioId: row.studio_id,
      deliveryDate: this.base['fromSqliteDate'](row.delivery_date),
      deliveryType: row.delivery_type,
      pregnancyWeeks: row.pregnancy_weeks,
      babyWeight: row.baby_weight,
      babyGender: row.baby_gender,
      complications: row.complications,
      notes: row.notes,
      createdAt: this.base['fromSqliteDate'](row.created_at),
      updatedAt: this.base['fromSqliteDate'](row.updated_at)
    };
  };
}
