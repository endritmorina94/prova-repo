// src/app/core/database/sqlite/sqlite-base.service.ts
import { Injectable } from '@angular/core';
import Database from '@tauri-apps/plugin-sql';

/**
 * Base service con utilities comuni per tutti i service SQLite
 */
@Injectable({
  providedIn: 'root'
})
export class SqliteBaseService {
  protected db: Database | null = null;
  protected initPromise: Promise<Database> | null = null;
  protected readonly DEFAULT_STUDIO_ID = 'default-studio';

  /**
   * Assicura che il database sia inizializzato
   */
  protected async ensureInitialized(): Promise<Database> {
    if (this.db) {
      return this.db;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.initializeDatabase();
    this.db = await this.initPromise;
    return this.db;
  }

  /**
   * Utility: Formatta data per SQLite
   */
  protected toSqliteDate(date: Date | string): string {
    return new Date(date).toISOString();
  }

  /**
   * Utility: Parse data da SQLite
   */
  protected fromSqliteDate(dateString: string): Date {
    return new Date(dateString);
  }

  /**
   * Utility: Boolean to SQLite (0/1)
   */
  protected toSqliteBoolean(value: boolean): number {
    return value ? 1 : 0;
  }

  /**
   * Utility: SQLite to Boolean
   */
  protected fromSqliteBoolean(value: number): boolean {
    return value === 1;
  }

  /**
   * Inizializza il database SQLite
   */
  private async initializeDatabase(): Promise<Database> {
    try {
      console.log('🔄 Inizializzazione database SQLite...');
      const db = await Database.load('sqlite:gyneco.db');

      // Crea tutte le tabelle
      await this.createTables(db);

      console.log('✅ Database inizializzato con successo');
      return db;
    } catch (error) {
      console.error('❌ Errore inizializzazione database:', error);
      throw error;
    }
  }

  /**
   * Crea tutte le tabelle del database
   */
  private async createTables(db: Database): Promise<void> {
    // Studios
    await db.execute(`
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

    // Patients
    await db.execute(`
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
        country TEXT DEFAULT 'Italia',
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

    // Deliveries
    await db.execute(`
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

    // Reports
    await db.execute(`
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

    // Invoices
    await db.execute(`
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

    // Activities
    await db.execute(`
      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        activity_type TEXT NOT NULL,
        activity_date TEXT NOT NULL,
        description TEXT NOT NULL,
        reference_id TEXT,
        reference_type TEXT,
        created_by TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
      )
    `);

    // Appointments
    await db.execute(`
      CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        studio_id TEXT NOT NULL,
        appointment_date TEXT NOT NULL,
        duration INTEGER NOT NULL DEFAULT 30,
        appointment_type TEXT,
        status TEXT NOT NULL,
        notes TEXT,
        reminder_sent INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE
      )
    `);

    // Indici
    await this.createIndexes(db);

    // Studio di default
    await this.initializeDefaultStudio(db);

    console.log('✅ Tutte le tabelle create con successo');
  }

  /**
   * Crea indici per performance
   */
  private async createIndexes(db: Database): Promise<void> {
    await db.execute('CREATE INDEX IF NOT EXISTS idx_patients_names ON patients(last_name, first_name)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_patients_fiscal ON patients(fiscal_code)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_deliveries_patient ON deliveries(patient_id, delivery_date DESC)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_reports_patient ON reports(patient_id, report_date DESC)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id, invoice_date DESC)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_activities_patient ON activities(patient_id, activity_date DESC)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id, appointment_date DESC)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status)');
  }

  /**
   * Inizializza studio di default
   */
  private async initializeDefaultStudio(db: Database): Promise<void> {
    const result = await db.select<any[]>(
      'SELECT * FROM studios WHERE id = ?',
      [this.DEFAULT_STUDIO_ID]
    );

    if (result.length === 0) {
      const now = new Date().toISOString();
      await db.execute(
        `INSERT INTO studios (id, name, doctor_name, doctor_title, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          this.DEFAULT_STUDIO_ID,
          'Studio Ginecologico',
          'Dr.ssa',
          'Specialista in Ginecologia e Ostetricia',
          now,
          now
        ]
      );
      console.log('✅ Studio di default creato');
    }
  }
}
