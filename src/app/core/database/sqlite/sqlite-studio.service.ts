import { inject, Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { SqliteBaseService } from './sqlite-base.service';
import { Studio, UpdateStudioDto } from '../../../shared/models';

/**
 * Service SQLite specializzato per Studio Settings
 */
@Injectable({
  providedIn: 'root'
})
export class SqliteStudioService {
  private base = inject(SqliteBaseService);

  /**
   * Ottiene impostazioni studio
   */
  getStudioSettings(): Observable<Studio> {
    return from(
      this.base['ensureInitialized']().then(async (db) => {
        const result = await db.select<any[]>(
          'SELECT * FROM studios WHERE id = ?',
          [this.base['DEFAULT_STUDIO_ID']]
        );

        if (result.length === 0) {
          throw new Error('Studio settings not found');
        }

        return this.mapStudioFromDb(result[0]);
      })
    );
  }

  /**
   * Aggiorna impostazioni studio
   */
  updateStudioSettings(data: UpdateStudioDto): Observable<Studio> {
    return from(
      this.base['ensureInitialized']().then(async (db) => {
        const updates: string[] = [];
        const params: any[] = [];

        if (data.name !== undefined) {
          updates.push('name = ?');
          params.push(data.name);
        }
        if (data.vatNumber !== undefined) {
          updates.push('vat_number = ?');
          params.push(data.vatNumber);
        }
        if (data.address !== undefined) {
          updates.push('address = ?');
          params.push(data.address);
        }
        if (data.city !== undefined) {
          updates.push('city = ?');
          params.push(data.city);
        }
        if (data.postalCode !== undefined) {
          updates.push('postal_code = ?');
          params.push(data.postalCode);
        }
        if (data.province !== undefined) {
          updates.push('province = ?');
          params.push(data.province);
        }
        if (data.phone !== undefined) {
          updates.push('phone = ?');
          params.push(data.phone);
        }
        if (data.email !== undefined) {
          updates.push('email = ?');
          params.push(data.email);
        }
        if (data.logoUrl !== undefined) {
          updates.push('logo_url = ?');
          params.push(data.logoUrl);
        }
        if (data.doctorName !== undefined) {
          updates.push('doctor_name = ?');
          params.push(data.doctorName);
        }
        if (data.doctorTitle !== undefined) {
          updates.push('doctor_title = ?');
          params.push(data.doctorTitle);
        }
        if (data.doctorSignaturePath !== undefined) {
          updates.push('doctor_signature_path = ?');
          params.push(data.doctorSignaturePath);
        }

        updates.push('updated_at = ?');
        params.push(new Date().toISOString());
        params.push(this.base['DEFAULT_STUDIO_ID']);

        await db.execute(
          `UPDATE studios SET ${updates.join(', ')} WHERE id = ?`,
          params
        );

        const result = await db.select<any[]>(
          'SELECT * FROM studios WHERE id = ?',
          [this.base['DEFAULT_STUDIO_ID']]
        );

        return this.mapStudioFromDb(result[0]);
      })
    );
  }

  /**
   * Mapper: DB row -> Studio model
   */
  private mapStudioFromDb = (row: any): Studio => {
    return {
      id: row.id,
      name: row.name,
      vatNumber: row.vat_number,
      address: row.address,
      city: row.city,
      postalCode: row.postal_code,
      province: row.province,
      phone: row.phone,
      email: row.email,
      logoUrl: row.logo_url,
      doctorName: row.doctor_name,
      doctorTitle: row.doctor_title,
      doctorSignaturePath: row.doctor_signature_path,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  };
}
