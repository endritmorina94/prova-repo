import { Injectable } from '@angular/core';
import { catchError, from, Observable, throwError } from 'rxjs';
import Database from '@tauri-apps/plugin-sql';
import { DatabaseService } from './database.service';
import { Activity, CreateActivityDto, CreateDeliveryDto, CreateInvoiceDto, CreatePatientDto, CreateReportDto, Delivery, Invoice, Patient, Report, Studio, UpdateDeliveryDto, UpdateInvoiceDto, UpdatePatientDto, UpdateReportDto, UpdateStudioDto } from '../../shared/models';

/**
 * SQLite Database Service per Tauri
 * Implementazione con Tauri SQL Plugin (no Prisma in frontend)
 */
@Injectable({
  providedIn: 'root'
})
export class SqliteDbService extends DatabaseService {
  private db: Database | null = null;
  private readonly DEFAULT_STUDIO_ID = 'default-studio-id';
  private initialized = false;

  constructor() {
    super();
    this.initializeDatabase();
  }

  searchPatients(query: string): Observable<Patient[]> {
    return from(
      this.ensureInitialized().then(async (db) => {
        const searchTerm = `%${query.toLowerCase()}%`;
        const results = await db.select<any[]>(
          `SELECT * FROM patients
           WHERE LOWER(first_name) LIKE $1
              OR LOWER(last_name) LIKE $1
              OR LOWER(fiscal_code) LIKE $1
           ORDER BY last_name, first_name`,
          [searchTerm]
        );
        return results.map(this.mapDbPatientToModel);
      })
    ).pipe(catchError(this.handleError));
  }

  getPatients(): Observable<Patient[]> {
    return from(
      this.ensureInitialized().then(async (db) => {
        const results = await db.select<any[]>(
          'SELECT * FROM patients ORDER BY last_name, first_name'
        );
        return results.map(this.mapDbPatientToModel);
      })
    ).pipe(catchError(this.handleError));
  }

  getPatientById(id: string): Observable<Patient | null> {
    return from(
      this.ensureInitialized().then(async (db) => {
        const results = await db.select<any[]>(
          'SELECT * FROM patients WHERE id = $1',
          [id]
        );
        return results.length > 0 ? this.mapDbPatientToModel(results[0]) : null;
      })
    ).pipe(catchError(this.handleError));
  }

  createPatient(data: CreatePatientDto): Observable<Patient> {
    return from(
      this.ensureInitialized().then(async (db) => {
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
          ) VALUES (
                     $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                     $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
                   )`,
          [
            id, this.DEFAULT_STUDIO_ID, data.firstName, data.lastName,
            data.birthDate.toISOString(), data.birthPlace, data.fiscalCode,
            data.phone, data.mobile, data.email, data.address, data.city,
            data.postalCode, data.province, data.country, data.bloodType,
            data.allergies, data.currentMedications, data.medicalNotes,
            data.familyMedicalHistory, data.firstMenstruationAge,
            data.menstrualCycleDays,
            data.lastMenstruationDate?.toISOString(),
            data.contraceptionMethod, data.papTestLastDate?.toISOString(),
            data.mammographyLastDate?.toISOString(),
            data.privacyConsent ? 1 : 0, data.marketingConsent ? 1 : 0,
            now, now
          ]
        );

        return this.getPatientById(id).toPromise() as Promise<Patient>;
      })
    ).pipe(catchError(this.handleError));
  }

  // ==================== PATIENTS ====================

  updatePatient(id: string, data: UpdatePatientDto): Observable<Patient> {
    return from(
      this.ensureInitialized().then(async (db) => {
        const now = new Date().toISOString();

        await db.execute(
          `UPDATE patients SET
                             first_name = $1, last_name = $2, birth_date = $3, birth_place = $4,
                             fiscal_code = $5, phone = $6, mobile = $7, email = $8, address = $9,
                             city = $10, postal_code = $11, province = $12, country = $13,
                             blood_type = $14, allergies = $15, current_medications = $16,
                             medical_notes = $17, family_medical_history = $18,
                             first_menstruation_age = $19, menstrual_cycle_days = $20,
                             last_menstruation_date = $21, contraception_method = $22,
                             pap_test_last_date = $23, mammography_last_date = $24,
                             privacy_consent = $25, marketing_consent = $26, updated_at = $27
           WHERE id = $28`,
          [
            data.firstName, data.lastName, data.birthDate?.toISOString(),
            data.birthPlace, data.fiscalCode, data.phone, data.mobile,
            data.email, data.address, data.city, data.postalCode,
            data.province, data.country, data.bloodType, data.allergies,
            data.currentMedications, data.medicalNotes, data.familyMedicalHistory,
            data.firstMenstruationAge, data.menstrualCycleDays,
            data.lastMenstruationDate?.toISOString(), data.contraceptionMethod,
            data.papTestLastDate?.toISOString(), data.mammographyLastDate?.toISOString(),
            data.privacyConsent ? 1 : 0, data.marketingConsent ? 1 : 0, now, id
          ]
        );

        return this.getPatientById(id).toPromise() as Promise<Patient>;
      })
    ).pipe(catchError(this.handleError));
  }

  deletePatient(id: string): Observable<void> {
    return from(
      this.ensureInitialized().then(async (db) => {
        await db.execute('DELETE FROM patients WHERE id = $1', [id]);
      })
    ).pipe(catchError(this.handleError));
  }

  getDeliveriesByPatient(patientId: string): Observable<Delivery[]> {
    return from(
      this.ensureInitialized().then(async (db) => {
        const results = await db.select<any[]>(
          'SELECT * FROM deliveries WHERE patient_id = $1 ORDER BY delivery_date DESC',
          [patientId]
        );
        return results.map(this.mapDbDeliveryToModel);
      })
    ).pipe(catchError(this.handleError));
  }

  createDelivery(data: CreateDeliveryDto): Observable<Delivery> {
    return from(
      this.ensureInitialized().then(async (db) => {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        await db.execute(
          `INSERT INTO deliveries (
            id, patient_id, studio_id, delivery_date, delivery_type,
            pregnancy_weeks, baby_weight, baby_gender, complications,
            notes, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            id, data.patientId, this.DEFAULT_STUDIO_ID,
            data.deliveryDate.toISOString(), data.deliveryType,
            data.pregnancyWeeks, data.babyWeight, data.babyGender,
            data.complications, data.notes, now, now
          ]
        );

        const results = await db.select<any[]>(
          'SELECT * FROM deliveries WHERE id = $1',
          [id]
        );
        return this.mapDbDeliveryToModel(results[0]);
      })
    ).pipe(catchError(this.handleError));
  }

  updateDelivery(id: string, data: UpdateDeliveryDto): Observable<Delivery> {
    return from(
      this.ensureInitialized().then(async (db) => {
        const now = new Date().toISOString();

        await db.execute(
          `UPDATE deliveries SET
            delivery_date = $1, delivery_type = $2, pregnancy_weeks = $3,
            baby_weight = $4, baby_gender = $5, complications = $6,
            notes = $7, updated_at = $8
           WHERE id = $9`,
          [
            data.deliveryDate?.toISOString(), data.deliveryType,
            data.pregnancyWeeks, data.babyWeight, data.babyGender,
            data.complications, data.notes, now, id
          ]
        );

        const results = await db.select<any[]>(
          'SELECT * FROM deliveries WHERE id = $1',
          [id]
        );
        return this.mapDbDeliveryToModel(results[0]);
      })
    ).pipe(catchError(this.handleError));
  }

  deleteDelivery(id: string): Observable<void> {
    return from(
      this.ensureInitialized().then(async (db) => {
        await db.execute('DELETE FROM deliveries WHERE id = $1', [id]);
      })
    ).pipe(catchError(this.handleError));
  }

  // ==================== DELIVERIES ====================
  // Implementa metodi simili per Deliveries, Reports, Invoices...
  // (Per brevità, mostro solo la struttura. Posso espandere se necessario)

  getReportsByPatient(patientId: string): Observable<Report[]> {
    return from(
      this.ensureInitialized().then(async (db) => {
        const results = await db.select<any[]>(
          'SELECT * FROM reports WHERE patient_id = $1 ORDER BY report_date DESC',
          [patientId]
        );
        return results.map(this.mapDbReportToModel);
      })
    ).pipe(catchError(this.handleError));
  }

  // ... Altri metodi CRUD per Deliveries, Reports, Invoices ...

  // ==================== MAPPING HELPERS ====================

  getReportById(id: string): Observable<Report | null> {
    return from(
      this.ensureInitialized().then(async (db) => {
        const results = await db.select<any[]>(
          'SELECT * FROM reports WHERE id = $1',
          [id]
        );
        return results.length > 0 ? this.mapDbReportToModel(results[0]) : null;
      })
    ).pipe(catchError(this.handleError));
  }

  createReport(data: CreateReportDto): Observable<Report> {
    return from(
      this.getNextReportNumber().toPromise().then(async (reportNumber) => {
        const db = await this.ensureInitialized();
        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        await db.execute(
          `INSERT INTO reports (
            id, patient_id, studio_id, report_date, visit_type, report_number,
            patient_snapshot, examination, ultrasound_result, therapy,
            attachments, internal_notes, doctor_name, doctor_title, signed,
            created_by, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
          [
            id, data.patientId, this.DEFAULT_STUDIO_ID,
            data.reportDate.toISOString(), data.visitType, reportNumber,
            JSON.stringify(data.patientSnapshot), data.examination,
            data.ultrasoundResult, data.therapy,
            data.attachments ? JSON.stringify(data.attachments) : null,
            data.internalNotes, data.doctorName, data.doctorTitle,
            0, // signed = false by default (campo non in CreateReportDto)
            null, // createdBy = null (campo non in CreateReportDto)
            now, now
          ]
        );

        const results = await db.select<any[]>(
          'SELECT * FROM reports WHERE id = $1',
          [id]
        );
        return this.mapDbReportToModel(results[0]);
      })
    ).pipe(catchError(this.handleError));
  }

  updateReport(id: string, data: UpdateReportDto): Observable<Report> {
    return from(
      this.ensureInitialized().then(async (db) => {
        const now = new Date().toISOString();

        await db.execute(
          `UPDATE reports SET
            report_date = $1, visit_type = $2, patient_snapshot = $3,
            examination = $4, ultrasound_result = $5, therapy = $6,
            attachments = $7, internal_notes = $8, doctor_name = $9,
            doctor_title = $10, updated_at = $11
           WHERE id = $12`,
          [
            data.reportDate?.toISOString(), data.visitType,
            data.patientSnapshot ? JSON.stringify(data.patientSnapshot) : null,
            data.examination, data.ultrasoundResult, data.therapy,
            data.attachments ? JSON.stringify(data.attachments) : null,
            data.internalNotes, data.doctorName, data.doctorTitle,
            now, id
          ]
        );

        const results = await db.select<any[]>(
          'SELECT * FROM reports WHERE id = $1',
          [id]
        );
        return this.mapDbReportToModel(results[0]);
      })
    ).pipe(catchError(this.handleError));
  }

  deleteReport(id: string): Observable<void> {
    return from(
      this.ensureInitialized().then(async (db) => {
        await db.execute('DELETE FROM reports WHERE id = $1', [id]);
      })
    ).pipe(catchError(this.handleError));
  }

  // ==================== DELIVERIES CRUD ====================

  getNextReportNumber(): Observable<string> {
    return from(
      this.ensureInitialized().then(async (db) => {
        const results = await db.select<any[]>('SELECT COUNT(*) as count FROM reports');
        const count = results[0].count;
        const year = new Date().getFullYear();
        const number = (count + 1).toString().padStart(4, '0');
        return `REF-${year}-${number}`;
      })
    ).pipe(catchError(this.handleError));
  }

  getInvoicesByPatient(patientId: string): Observable<Invoice[]> {
    return from(
      this.ensureInitialized().then(async (db) => {
        const results = await db.select<any[]>(
          'SELECT * FROM invoices WHERE patient_id = $1 ORDER BY invoice_date DESC',
          [patientId]
        );
        return results.map(this.mapDbInvoiceToModel);
      })
    ).pipe(catchError(this.handleError));
  }

  getInvoiceById(id: string): Observable<Invoice | null> {
    return from(
      this.ensureInitialized().then(async (db) => {
        const results = await db.select<any[]>(
          'SELECT * FROM invoices WHERE id = $1',
          [id]
        );
        return results.length > 0 ? this.mapDbInvoiceToModel(results[0]) : null;
      })
    ).pipe(catchError(this.handleError));
  }

  // ==================== REPORTS CRUD ====================

  createInvoice(data: CreateInvoiceDto): Observable<Invoice> {
    return from(
      this.getNextInvoiceNumber().toPromise().then(async (invoiceNumber) => {
        const db = await this.ensureInitialized();
        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        await db.execute(
          `INSERT INTO invoices (
            id, patient_id, studio_id, invoice_number, invoice_date, due_date,
            amount, vat_rate, vat_amount, total_amount, payment_method,
            payment_status, payment_date, notes, items, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
          [
            id, data.patientId, this.DEFAULT_STUDIO_ID, invoiceNumber,
            data.invoiceDate.toISOString(), data.dueDate?.toISOString(),
            data.amount, data.vatRate, data.vatAmount, data.totalAmount,
            data.paymentMethod, data.paymentStatus, data.paymentDate?.toISOString(),
            data.notes, data.items ? JSON.stringify(data.items) : null, now, now
          ]
        );

        const results = await db.select<any[]>(
          'SELECT * FROM invoices WHERE id = $1',
          [id]
        );
        return this.mapDbInvoiceToModel(results[0]);
      })
    ).pipe(catchError(this.handleError));
  }

  updateInvoice(id: string, data: UpdateInvoiceDto): Observable<Invoice> {
    return from(
      this.ensureInitialized().then(async (db) => {
        const now = new Date().toISOString();

        await db.execute(
          `UPDATE invoices SET
            invoice_date = $1, due_date = $2, amount = $3, vat_rate = $4,
            vat_amount = $5, total_amount = $6, payment_method = $7,
            payment_status = $8, payment_date = $9, notes = $10,
            items = $11, updated_at = $12
           WHERE id = $13`,
          [
            data.invoiceDate?.toISOString(), data.dueDate?.toISOString(),
            data.amount, data.vatRate, data.vatAmount, data.totalAmount,
            data.paymentMethod, data.paymentStatus, data.paymentDate?.toISOString(),
            data.notes, data.items ? JSON.stringify(data.items) : null, now, id
          ]
        );

        const results = await db.select<any[]>(
          'SELECT * FROM invoices WHERE id = $1',
          [id]
        );
        return this.mapDbInvoiceToModel(results[0]);
      })
    ).pipe(catchError(this.handleError));
  }

  deleteInvoice(id: string): Observable<void> {
    return from(
      this.ensureInitialized().then(async (db) => {
        await db.execute('DELETE FROM invoices WHERE id = $1', [id]);
      })
    ).pipe(catchError(this.handleError));
  }

  getNextInvoiceNumber(): Observable<string> {
    return from(
      this.ensureInitialized().then(async (db) => {
        const results = await db.select<any[]>('SELECT COUNT(*) as count FROM invoices');
        const count = results[0].count;
        const year = new Date().getFullYear();
        const number = (count + 1).toString().padStart(4, '0');
        return `INV-${year}-${number}`;
      })
    ).pipe(catchError(this.handleError));
  }

  getStudioSettings(): Observable<Studio> {
    return from(
      this.ensureInitialized().then(async (db) => {
        const results = await db.select<any[]>(
          'SELECT * FROM studios WHERE id = $1',
          [this.DEFAULT_STUDIO_ID]
        );

        if (results.length === 0) {
          // Se non esiste, crea uno studio di default
          const now = new Date().toISOString();
          await db.execute(
            `INSERT INTO studios (id, name, created_at, updated_at)
             VALUES ($1, $2, $3, $4)`,
            [this.DEFAULT_STUDIO_ID, 'Studio Medico', now, now]
          );

          // Rileggi il record appena creato
          const newResults = await db.select<any[]>(
            'SELECT * FROM studios WHERE id = $1',
            [this.DEFAULT_STUDIO_ID]
          );
          const row = newResults[0];

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
        }

        const row = results[0];
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
      })
    ).pipe(catchError(this.handleError));
  }

  updateStudioSettings(data: UpdateStudioDto): Observable<Studio> {
    return from(
      this.ensureInitialized().then(async (db) => {
        const now = new Date().toISOString();

        await db.execute(
          `UPDATE studios SET
            name = $1, vat_number = $2, address = $3, city = $4,
            postal_code = $5, province = $6, phone = $7, email = $8,
            logo_url = $9, doctor_name = $10, doctor_title = $11,
            doctor_signature_path = $12, updated_at = $13
           WHERE id = $14`,
          [
            data.name, data.vatNumber, data.address, data.city,
            data.postalCode, data.province, data.phone, data.email,
            data.logoUrl, data.doctorName, data.doctorTitle,
            data.doctorSignaturePath, now, this.DEFAULT_STUDIO_ID
          ]
        );

        return this.getStudioSettings().toPromise() as Promise<Studio>;
      })
    ).pipe(catchError(this.handleError));
  }

  // ==================== INVOICES CRUD ====================

  getActivitiesByPatient(patientId: string): Observable<Activity[]> {
    return from(Promise.resolve([]));
  }

  createActivity(data: CreateActivityDto): Observable<Activity> {
    throw new Error('Activities not implemented yet');
  }

  getAppointments(filters?: any): Observable<any[]> {
    return from(
      this.ensureInitialized().then(async (db) => {
        let query = 'SELECT * FROM appointments WHERE 1=1';
        const params: any[] = [];

        if (filters?.startDate) {
          params.push(filters.startDate.toISOString());
          query += ` AND appointment_date >= $${params.length}`;
        }

        if (filters?.endDate) {
          params.push(filters.endDate.toISOString());
          query += ` AND appointment_date <= $${params.length}`;
        }

        if (filters?.patientId) {
          params.push(filters.patientId);
          query += ` AND patient_id = $${params.length}`;
        }

        if (filters?.status) {
          params.push(filters.status);
          query += ` AND status = $${params.length}`;
        }

        query += ' ORDER BY appointment_date ASC';

        const results = await db.select<any[]>(query, params);

        const appointments = await Promise.all(
          results.map(async (row) => {
            const patientResults = await db.select<any[]>(
              'SELECT id, first_name, last_name, phone, mobile FROM patients WHERE id = $1',
              [row.patient_id]
            );

            return {
              id: row.id,
              patientId: row.patient_id,
              studioId: row.studio_id,
              appointmentDate: new Date(row.appointment_date),
              duration: row.duration,
              reason: row.reason,
              notes: row.notes,
              status: row.status,
              createdBy: row.created_by,
              createdAt: new Date(row.created_at),
              updatedAt: new Date(row.updated_at),
              patient: patientResults[0] ? {
                id: patientResults[0].id,
                firstName: patientResults[0].first_name,
                lastName: patientResults[0].last_name,
                phone: patientResults[0].phone,
                mobile: patientResults[0].mobile
              } : undefined
            };
          })
        );

        return appointments;
      })
    ).pipe(catchError(this.handleError));
  }

  getAppointmentsByPatient(patientId: string): Observable<any[]> {
    return this.getAppointments({ patientId });
  }

  getAppointmentsByDate(date: Date): Observable<any[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.getAppointments({
      startDate: startOfDay,
      endDate: endOfDay
    });
  }

  getAppointmentById(id: string): Observable<any | null> {
    return from(
      this.ensureInitialized().then(async (db) => {
        const results = await db.select<any[]>(
          'SELECT * FROM appointments WHERE id = $1',
          [id]
        );

        if (results.length === 0) return null;

        const row = results[0];

        const patientResults = await db.select<any[]>(
          'SELECT id, first_name, last_name, phone, mobile FROM patients WHERE id = $1',
          [row.patient_id]
        );

        return {
          id: row.id,
          patientId: row.patient_id,
          studioId: row.studio_id,
          appointmentDate: new Date(row.appointment_date),
          duration: row.duration,
          reason: row.reason,
          notes: row.notes,
          status: row.status,
          createdBy: row.created_by,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
          patient: patientResults[0] ? {
            id: patientResults[0].id,
            firstName: patientResults[0].first_name,
            lastName: patientResults[0].last_name,
            phone: patientResults[0].phone,
            mobile: patientResults[0].mobile
          } : undefined
        };
      })
    ).pipe(catchError(this.handleError));
  }

  // ==================== STUDIO ====================

  createAppointment(data: any): Observable<any> {
    return from(
      this.ensureInitialized().then(async (db) => {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        await db.execute(
          `INSERT INTO appointments (
          id, patient_id, studio_id, appointment_date, duration,
          reason, notes, status, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            id,
            data.patientId,
            data.studioId || this.DEFAULT_STUDIO_ID,
            data.appointmentDate.toISOString(),
            data.duration,
            data.reason,
            data.notes,
            data.status,
            data.createdBy,
            now,
            now
          ]
        );

        return this.getAppointmentById(id).toPromise();
      })
    ).pipe(catchError(this.handleError));
  }

  updateAppointment(id: string, data: any): Observable<any> {
    return from(
      this.ensureInitialized().then(async (db) => {
        const now = new Date().toISOString();

        await db.execute(
          `UPDATE appointments SET
          appointment_date = $1, duration = $2, reason = $3,
          notes = $4, status = $5, updated_at = $6
         WHERE id = $7`,
          [
            data.appointmentDate?.toISOString(),
            data.duration,
            data.reason,
            data.notes,
            data.status,
            now,
            id
          ]
        );

        return this.getAppointmentById(id).toPromise();
      })
    ).pipe(catchError(this.handleError));
  }

  // ==================== ACTIVITIES (not implemented yet) ====================

  deleteAppointment(id: string): Observable<void> {
    return from(
      this.ensureInitialized().then(async (db) => {
        await db.execute('DELETE FROM appointments WHERE id = $1', [id]);
      })
    ).pipe(catchError(this.handleError));
  }

  getTodayAppointments(): Observable<any[]> {
    return this.getAppointmentsByDate(new Date());
  }


  // ==================== APPOINTMENTS ====================

  countAppointmentsByStatus(status: string): Observable<number> {
    return from(
      this.ensureInitialized().then(async (db) => {
        const results = await db.select<any[]>(
          'SELECT COUNT(*) as count FROM appointments WHERE status = $1',
          [status]
        );
        return results[0].count;
      })
    ).pipe(catchError(this.handleError));
  }

  /**
   * Inizializza il database SQLite
   */
  private async initializeDatabase(): Promise<void> {
    try {
      // ✅ Path esplicito nella cartella del progetto per debug
      // In produzione userà AppData automaticamente
      const dbPath = 'sqlite:gynecology.db';

      console.log('🔵 Connecting to database:', dbPath);

      // Connetti al database SQLite
      this.db = await Database.load(dbPath);

      console.log('✅ Database connection established');

      // ✅ IMPORTANTE: Abilita foreign keys per SQLite
      await this.db.execute('PRAGMA foreign_keys = ON');

      console.log('✅ Foreign keys enabled');

      // Crea le tabelle se non esistono
      await this.createTables();

      console.log('✅ Tables created/verified');

      // Crea studio default se non esiste
      await this.ensureDefaultStudio();

      console.log('✅ Default studio ensured');

      this.initialized = true;
      console.log('✅ SQLite database initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing SQLite database:', error);
      throw error;
    }
  }

  /**
   * Assicura che il database sia inizializzato
   */
  private async ensureInitialized(): Promise<Database> {
    if (!this.db || !this.initialized) {
      await this.initializeDatabase();
    }
    return this.db!;
  }

  /**
   * Crea le tabelle del database
   */
  private async createTables(): Promise<void> {
    if (!this.db) return;

    // Tabella Studios
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS studios (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        vat_number TEXT,
        address TEXT,
        city TEXT,
        postal_code TEXT,
        province TEXT,
        phone TEXT,
        email TEXT,
        logo_url TEXT,
        doctor_name TEXT,
        doctor_title TEXT,
        doctor_signature_path TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Tabella Patients
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        studio_id TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        birth_date TEXT NOT NULL,
        birth_place TEXT,
        fiscal_code TEXT UNIQUE,
        phone TEXT,
        mobile TEXT,
        email TEXT,
        address TEXT,
        city TEXT,
        postal_code TEXT,
        province TEXT,
        country TEXT NOT NULL DEFAULT 'Italia',
        blood_type TEXT,
        allergies TEXT,
        current_medications TEXT,
        medical_notes TEXT,
        family_medical_history TEXT,
        first_menstruation_age INTEGER,
        menstrual_cycle_days INTEGER,
        last_menstruation_date TEXT,
        contraception_method TEXT,
        pap_test_last_date TEXT,
        mammography_last_date TEXT,
        privacy_consent INTEGER NOT NULL DEFAULT 0,
        marketing_consent INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE
      )
    `);

    // Tabella Deliveries
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS deliveries (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        studio_id TEXT NOT NULL,
        delivery_date TEXT NOT NULL,
        delivery_type TEXT NOT NULL,
        pregnancy_weeks INTEGER,
        baby_weight REAL,
        baby_gender TEXT,
        complications TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE
      )
    `);

    // Tabella Reports
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        studio_id TEXT NOT NULL,
        report_date TEXT NOT NULL,
        visit_type TEXT NOT NULL,
        report_number TEXT UNIQUE NOT NULL,
        patient_snapshot TEXT NOT NULL,
        examination TEXT NOT NULL,
        ultrasound_result TEXT,
        therapy TEXT,
        attachments TEXT,
        internal_notes TEXT,
        doctor_name TEXT,
        doctor_title TEXT,
        signed INTEGER NOT NULL DEFAULT 0,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE
      )
    `);

    // Tabella Invoices
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        studio_id TEXT NOT NULL,
        invoice_number TEXT UNIQUE NOT NULL,
        invoice_date TEXT NOT NULL,
        due_date TEXT,
        amount REAL NOT NULL,
        vat_rate REAL,
        vat_amount REAL,
        total_amount REAL NOT NULL,
        payment_method TEXT,
        payment_status TEXT NOT NULL,
        payment_date TEXT,
        notes TEXT,
        items TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE
      )
    `);

    // Tabella Appointments
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        studio_id TEXT NOT NULL,
        appointment_date TEXT NOT NULL,
        duration INTEGER NOT NULL,
        reason TEXT,
        notes TEXT,
        status TEXT NOT NULL,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE
      )
    `);

    // Crea indici per performance
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(last_name, first_name)');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_patients_fiscal ON patients(fiscal_code)');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_deliveries_patient ON deliveries(patient_id, delivery_date)');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_reports_patient ON reports(patient_id, report_date)');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id, invoice_date)');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date)');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id)');
  }

  /**
   * Crea studio default se non esiste
   */
  private async ensureDefaultStudio(): Promise<void> {
    if (!this.db) return;

    const result = await this.db.select<Studio[]>(
      'SELECT * FROM studios WHERE id = $1',
      [this.DEFAULT_STUDIO_ID]
    );

    if (result.length === 0) {
      const now = new Date().toISOString();
      await this.db.execute(
        'INSERT INTO studios (id, name, created_at, updated_at) VALUES ($1, $2, $3, $4)',
        [this.DEFAULT_STUDIO_ID, 'Studio Medico', now, now]
      );
    }
  }

  private mapDbPatientToModel(row: any): Patient {
    return {
      id: row.id,
      studioId: row.studio_id,
      firstName: row.first_name,
      lastName: row.last_name,
      birthDate: new Date(row.birth_date),
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
      lastMenstruationDate: row.last_menstruation_date ? new Date(row.last_menstruation_date) : undefined,
      contraceptionMethod: row.contraception_method,
      papTestLastDate: row.pap_test_last_date ? new Date(row.pap_test_last_date) : undefined,
      mammographyLastDate: row.mammography_last_date ? new Date(row.mammography_last_date) : undefined,
      privacyConsent: row.privacy_consent === 1,
      marketingConsent: row.marketing_consent === 1,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapDbDeliveryToModel(row: any): Delivery {
    return {
      id: row.id,
      patientId: row.patient_id,
      studioId: row.studio_id,
      deliveryDate: new Date(row.delivery_date),
      deliveryType: row.delivery_type,
      pregnancyWeeks: row.pregnancy_weeks,
      babyWeight: row.baby_weight,
      babyGender: row.baby_gender,
      complications: row.complications,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapDbReportToModel(row: any): Report {
    return {
      id: row.id,
      patientId: row.patient_id,
      studioId: row.studio_id,
      reportDate: new Date(row.report_date),
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
      signed: row.signed === 1,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapDbInvoiceToModel(row: any): Invoice {
    return {
      id: row.id,
      patientId: row.patient_id,
      studioId: row.studio_id,
      invoiceNumber: row.invoice_number,
      invoiceDate: new Date(row.invoice_date),
      dueDate: row.due_date ? new Date(row.due_date) : undefined,
      amount: row.amount,
      vatRate: row.vat_rate,
      vatAmount: row.vat_amount,
      totalAmount: row.total_amount,
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status,
      paymentDate: row.payment_date ? new Date(row.payment_date) : undefined,
      notes: row.notes,
      items: row.items ? JSON.parse(row.items) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  // ==================== ERROR HANDLING ====================

  private handleError(error: any): Observable<never> {
    console.error('Database error:', error);
    return throwError(() => new Error(error.message || 'Database operation failed'));
  }
}
