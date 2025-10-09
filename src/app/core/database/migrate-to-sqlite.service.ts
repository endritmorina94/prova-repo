import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Delivery, Invoice, Patient, Report } from '../../shared/models';
import { SqliteDbService } from './sqlite-db.service';

/**
 * Servizio per migrare i dati da localStorage a SQLite
 * Esegui una sola volta al primo avvio con SQLite
 */
@Injectable({
  providedIn: 'root'
})
export class MigrationService {
  private readonly STORAGE_KEYS = {
    PATIENTS: 'gyneco_patients',
    DELIVERIES: 'gyneco_deliveries',
    REPORTS: 'gyneco_reports',
    INVOICES: 'gyneco_invoices',
    MIGRATION_DONE: 'gyneco_migration_done'
  };

  constructor(private sqliteDb: SqliteDbService) {}

  /**
   * Verifica se la migrazione è già stata eseguita
   */
  isMigrationDone(): boolean {
    return localStorage.getItem(this.STORAGE_KEYS.MIGRATION_DONE) === 'true';
  }

  /**
   * Esegue la migrazione completa da localStorage a SQLite
   */
  async migrate(): Promise<void> {
    if (this.isMigrationDone()) {
      console.log('Migration already completed, skipping...');
      return;
    }

    console.log('Starting migration from localStorage to SQLite...');

    try {
      // Migra pazienti
      await this.migratePatients();

      // Migra parti
      await this.migrateDeliveries();

      // Migra referti
      await this.migrateReports();

      // Migra fatture
      await this.migrateInvoices();

      // Marca la migrazione come completata
      localStorage.setItem(this.STORAGE_KEYS.MIGRATION_DONE, 'true');

      console.log('Migration completed successfully!');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Pulisce localStorage dopo migrazione (opzionale, usa con cautela)
   */
  async cleanupLocalStorage(): Promise<void> {
    const confirm = window.confirm(
      'Vuoi rimuovere i vecchi dati da localStorage? ' +
      'I dati sono ora nel database SQLite, ma questa azione è irreversibile.'
    );

    if (confirm) {
      localStorage.removeItem(this.STORAGE_KEYS.PATIENTS);
      localStorage.removeItem(this.STORAGE_KEYS.DELIVERIES);
      localStorage.removeItem(this.STORAGE_KEYS.REPORTS);
      localStorage.removeItem(this.STORAGE_KEYS.INVOICES);
      console.log('✅ localStorage cleaned up');
    }
  }

  /**
   * Migra i pazienti
   */
  private async migratePatients(): Promise<void> {
    const patientsJson = localStorage.getItem(this.STORAGE_KEYS.PATIENTS);
    if (!patientsJson) {
      console.log('No patients to migrate');
      return;
    }

    const patients: Patient[] = JSON.parse(patientsJson);
    console.log(`Migrating ${patients.length} patients...`);

    for (const patient of patients) {
      try {
        // Converti date strings in Date objects
        const patientData = {
          ...patient,
          studioId: 'default-studio-id', // Assicura studio_id corretto
          birthDate: new Date(patient.birthDate),
          lastMenstruationDate: patient.lastMenstruationDate
            ? new Date(patient.lastMenstruationDate)
            : undefined,
          papTestLastDate: patient.papTestLastDate
            ? new Date(patient.papTestLastDate)
            : undefined,
          mammographyLastDate: patient.mammographyLastDate
            ? new Date(patient.mammographyLastDate)
            : undefined,
        };

        await firstValueFrom(this.sqliteDb.createPatient(patientData));
      } catch (error) {
        console.error(`Error migrating patient ${patient.id}:`, error);
        // Continua con i prossimi pazienti
      }
    }

    console.log(`✅ Migrated ${patients.length} patients`);
  }

  /**
   * Migra i parti
   */
  private async migrateDeliveries(): Promise<void> {
    const deliveriesJson = localStorage.getItem(this.STORAGE_KEYS.DELIVERIES);
    if (!deliveriesJson) {
      console.log('No deliveries to migrate');
      return;
    }

    const deliveries: Delivery[] = JSON.parse(deliveriesJson);
    console.log(`Migrating ${deliveries.length} deliveries...`);

    for (const delivery of deliveries) {
      const deliveryData = {
        ...delivery,
        deliveryDate: new Date(delivery.deliveryDate),
      };

      await firstValueFrom(this.sqliteDb.createDelivery(deliveryData));
    }

    console.log(`✅ Migrated ${deliveries.length} deliveries`);
  }

  /**
   * Migra i referti
   */
  private async migrateReports(): Promise<void> {
    const reportsJson = localStorage.getItem(this.STORAGE_KEYS.REPORTS);
    if (!reportsJson) {
      console.log('No reports to migrate');
      return;
    }

    const reports: Report[] = JSON.parse(reportsJson);
    console.log(`Migrating ${reports.length} reports...`);

    for (const report of reports) {
      const reportData = {
        ...report,
        reportDate: new Date(report.reportDate),
      };

      await firstValueFrom(this.sqliteDb.createReport(reportData));
    }

    console.log(`✅ Migrated ${reports.length} reports`);
  }

  /**
   * Migra le fatture
   */
  private async migrateInvoices(): Promise<void> {
    const invoicesJson = localStorage.getItem(this.STORAGE_KEYS.INVOICES);
    if (!invoicesJson) {
      console.log('No invoices to migrate');
      return;
    }

    const invoices: Invoice[] = JSON.parse(invoicesJson);
    console.log(`Migrating ${invoices.length} invoices...`);

    for (const invoice of invoices) {
      const invoiceData = {
        ...invoice,
        invoiceDate: new Date(invoice.invoiceDate),
        dueDate: invoice.dueDate ? new Date(invoice.dueDate) : undefined,
        paymentDate: invoice.paymentDate ? new Date(invoice.paymentDate) : undefined,
      };

      await firstValueFrom(this.sqliteDb.createInvoice(invoiceData));
    }

    console.log(`✅ Migrated ${invoices.length} invoices`);
  }
}
