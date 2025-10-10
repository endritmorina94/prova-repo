// src/app/core/database/sqlite/sqlite-patients.service.ts
import { inject, Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { SqliteBaseService } from './sqlite-base.service';
import { CreatePatientDto, Patient, UpdatePatientDto } from '../../../shared/models';

/**
 * Service SQLite specializzato per Pazienti
 */
@Injectable({
  providedIn: 'root'
})
export class SqlitePatientsService {
  private base = inject(SqliteBaseService);

  /**
   * Cerca pazienti
   */
  searchPatients(query: string): Observable<Patient[]> {
    return from(
      this.base['ensureInitialized']().then(async (db) => {
        const searchTerm = `%${query.toLowerCase()}%`;
        const result = await db.select<any[]>(
          `SELECT * FROM patients
           WHERE LOWER(first_name) LIKE ?
           OR LOWER(last_name) LIKE ?
           OR LOWER(fiscal_code) LIKE ?
           ORDER BY last_name, first_name`,
          [searchTerm, searchTerm, searchTerm]
        );
        return result.map(this.mapPatientFromDb);
      })
    );
  }

  /**
   * Ottiene tutti i pazienti
   */
  getPatients(): Observable<Patient[]> {
    return from(
      this.base['ensureInitialized']().then(async (db) => {
        const result = await db.select<any[]>(
          'SELECT * FROM patients ORDER BY last_name, first_name'
        );
        return result.map(this.mapPatientFromDb);
      })
    );
  }

  /**
   * Ottiene paziente per ID
   */
  getPatientById(id: string): Observable<Patient | null> {
    return from(
      this.base['ensureInitialized']().then(async (db) => {
        const result = await db.select<any[]>(
          'SELECT * FROM patients WHERE id = ?',
          [id]
        );
        return result.length > 0 ? this.mapPatientFromDb(result[0]) : null;
      })
    );
  }

  /**
   * Crea nuovo paziente
   */
  createPatient(data: CreatePatientDto): Observable<Patient> {
    return from(
      this.base['ensureInitialized']().then(async (db) => {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        await db.execute(
          `INSERT INTO patients (
            id, studio_id, first_name, last_name, birth_date, birth_place,
            fiscal_code, phone, mobile, email, address, city, postal_code,
            province, country, blood_type, allergies, current_medications,
            medical_notes, family_medical_history, first_menstruation_age,
            menstrual_cycle_days, last_menstruation_date, contraception_method,
            pap_test_last_date, mammography_last_date, privacy_consent,
            marketing_consent, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            this.base['DEFAULT_STUDIO_ID'],
            data.firstName,
            data.lastName,
            this.base['toSqliteDate'](data.birthDate),
            data.birthPlace || null,
            data.fiscalCode || null,
            data.phone || null,
            data.mobile || null,
            data.email || null,
            data.address || null,
            data.city || null,
            data.postalCode || null,
            data.province || null,
            data.country || 'Italia',
            data.bloodType || null,
            data.allergies || null,
            data.currentMedications || null,
            data.medicalNotes || null,
            data.familyMedicalHistory || null,
            data.firstMenstruationAge || null,
            data.menstrualCycleDays || null,
            data.lastMenstruationDate ? this.base['toSqliteDate'](data.lastMenstruationDate) : null,
            data.contraceptionMethod || null,
            data.papTestLastDate ? this.base['toSqliteDate'](data.papTestLastDate) : null,
            data.mammographyLastDate ? this.base['toSqliteDate'](data.mammographyLastDate) : null,
            this.base['toSqliteBoolean'](data.privacyConsent || false),
            this.base['toSqliteBoolean'](data.marketingConsent || false),
            now,
            now
          ]
        );

        const result = await db.select<any[]>(
          'SELECT * FROM patients WHERE id = ?',
          [id]
        );

        return this.mapPatientFromDb(result[0]);
      })
    );
  }

  /**
   * Aggiorna paziente
   */
  updatePatient(id: string, data: UpdatePatientDto): Observable<Patient> {
    return from(
      this.base['ensureInitialized']().then(async (db) => {
        const updates: string[] = [];
        const params: any[] = [];

        // Build dynamic update query
        if (data.firstName !== undefined) {
          updates.push('first_name = ?');
          params.push(data.firstName);
        }
        if (data.lastName !== undefined) {
          updates.push('last_name = ?');
          params.push(data.lastName);
        }
        if (data.birthDate !== undefined) {
          updates.push('birth_date = ?');
          params.push(this.base['toSqliteDate'](data.birthDate));
        }
        // ... aggiungi altri campi ...

        updates.push('updated_at = ?');
        params.push(new Date().toISOString());
        params.push(id);

        await db.execute(
          `UPDATE patients SET ${updates.join(', ')} WHERE id = ?`,
          params
        );

        const result = await db.select<any[]>(
          'SELECT * FROM patients WHERE id = ?',
          [id]
        );

        return this.mapPatientFromDb(result[0]);
      })
    );
  }

  /**
   * Elimina paziente
   */
  deletePatient(id: string): Observable<void> {
    return from(
      this.base['ensureInitialized']().then(async (db) => {
        await db.execute('DELETE FROM patients WHERE id = ?', [id]);
      })
    );
  }

  /**
   * Mapper: DB row -> Patient model
   */
  private mapPatientFromDb = (row: any): Patient => {
    return {
      id: row.id,
      studioId: row.studio_id,
      firstName: row.first_name,
      lastName: row.last_name,
      birthDate: this.base['fromSqliteDate'](row.birth_date),
      birthPlace: row.birth_place,
      fiscalCode: row.fiscal_code,
      phone: row.phone,
      mobile: row.mobile,
      email: row.email,
      address: row.address,
      city: row.city,
      postalCode: row.postal_code,
      province: row.province,
      country: row.country,
      bloodType: row.blood_type,
      allergies: row.allergies,
      currentMedications: row.current_medications,
      medicalNotes: row.medical_notes,
      familyMedicalHistory: row.family_medical_history,
      firstMenstruationAge: row.first_menstruation_age,
      menstrualCycleDays: row.menstrual_cycle_days,
      lastMenstruationDate: row.last_menstruation_date
        ? this.base['fromSqliteDate'](row.last_menstruation_date)
        : undefined,
      contraceptionMethod: row.contraception_method,
      papTestLastDate: row.pap_test_last_date
        ? this.base['fromSqliteDate'](row.pap_test_last_date)
        : undefined,
      mammographyLastDate: row.mammography_last_date
        ? this.base['fromSqliteDate'](row.mammography_last_date)
        : undefined,
      privacyConsent: this.base['fromSqliteBoolean'](row.privacy_consent),
      marketingConsent: this.base['fromSqliteBoolean'](row.marketing_consent),
      createdAt: this.base['fromSqliteDate'](row.created_at),
      updatedAt: this.base['fromSqliteDate'](row.updated_at)
    };
  };
}
