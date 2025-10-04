import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Activity, CreateActivityDto, CreateDeliveryDto, CreateInvoiceDto, CreatePatientDto, CreateReportDto, Delivery, Invoice, Patient, Report, Studio, UpdateDeliveryDto, UpdateInvoiceDto, UpdatePatientDto, UpdateReportDto, UpdateStudioDto } from '../../shared/models';

/**
 * Abstraction layer per database operations
 * Questa interfaccia permette di switchare tra local/cloud senza modificare i componenti
 */
@Injectable({
  providedIn: 'root'
})
export abstract class DatabaseService {

  // ==================== PATIENTS ====================

  /**
   * Cerca pazienti per nome, cognome o codice fiscale
   */
  abstract searchPatients(query: string): Observable<Patient[]>;

  /**
   * Ottiene tutti i pazienti
   */
  abstract getPatients(): Observable<Patient[]>;

  /**
   * Ottiene un paziente per ID
   */
  abstract getPatientById(id: string): Observable<Patient | null>;

  /**
   * Crea un nuovo paziente
   */
  abstract createPatient(data: CreatePatientDto): Observable<Patient>;

  /**
   * Aggiorna un paziente esistente
   */
  abstract updatePatient(id: string, data: UpdatePatientDto): Observable<Patient>;

  /**
   * Elimina un paziente
   */
  abstract deletePatient(id: string): Observable<void>;

  // ==================== DELIVERIES ====================

  /**
   * Ottiene tutti i parti di un paziente
   */
  abstract getDeliveriesByPatient(patientId: string): Observable<Delivery[]>;

  /**
   * Crea un nuovo parto
   */
  abstract createDelivery(data: CreateDeliveryDto): Observable<Delivery>;

  /**
   * Aggiorna un parto esistente
   */
  abstract updateDelivery(id: string, data: UpdateDeliveryDto): Observable<Delivery>;

  /**
   * Elimina un parto
   */
  abstract deleteDelivery(id: string): Observable<void>;

  // ==================== REPORTS ====================

  /**
   * Ottiene tutti i referti di un paziente
   */
  abstract getReportsByPatient(patientId: string): Observable<Report[]>;

  /**
   * Ottiene un referto per ID
   */
  abstract getReportById(id: string): Observable<Report | null>;

  /**
   * Crea un nuovo referto
   */
  abstract createReport(data: CreateReportDto): Observable<Report>;

  /**
   * Aggiorna un referto esistente
   */
  abstract updateReport(id: string, data: UpdateReportDto): Observable<Report>;

  /**
   * Elimina un referto
   */
  abstract deleteReport(id: string): Observable<void>;

  /**
   * Genera il prossimo numero referto
   */
  abstract getNextReportNumber(): Observable<string>;

  // ==================== INVOICES ====================

  /**
   * Ottiene tutte le fatture di un paziente
   */
  abstract getInvoicesByPatient(patientId: string): Observable<Invoice[]>;

  /**
   * Ottiene una fattura per ID
   */
  abstract getInvoiceById(id: string): Observable<Invoice | null>;

  /**
   * Crea una nuova fattura
   */
  abstract createInvoice(data: CreateInvoiceDto): Observable<Invoice>;

  /**
   * Aggiorna una fattura esistente
   */
  abstract updateInvoice(id: string, data: UpdateInvoiceDto): Observable<Invoice>;

  /**
   * Elimina una fattura
   */
  abstract deleteInvoice(id: string): Observable<void>;

  /**
   * Genera il prossimo numero fattura
   */
  abstract getNextInvoiceNumber(): Observable<string>;


  /**
   * Ottiene impostazioni studio
   */
  abstract getStudioSettings(): Observable<Studio>;

  /**
   * Aggiorna impostazioni studio
   */
  abstract updateStudioSettings(data: UpdateStudioDto): Observable<Studio>;

  // ==================== ACTIVITIES ====================

  /**
   * Ottiene tutte le attività di un paziente
   */
  abstract getActivitiesByPatient(patientId: string): Observable<Activity[]>;

  /**
   * Crea una nuova attività
   */
  abstract createActivity(data: CreateActivityDto): Observable<Activity>;
}
