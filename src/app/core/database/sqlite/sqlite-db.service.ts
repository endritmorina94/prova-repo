import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DatabaseService } from '../database.service';
import { SqlitePatientsService } from './sqlite-patients.service';
import { SqliteDeliveriesService } from './sqlite-deliveries.service';
import { SqliteReportsService } from './sqlite-reports.service';
import { SqliteInvoicesService } from './sqlite-invoices.service';
import { SqliteAppointmentsService } from './sqlite-appointments.service';
import { SqliteActivitiesService } from './sqlite-activities.service';
import { SqliteStudioService } from './sqlite-studio.service';
import { Activity, Appointment, CreateActivityDto, CreateAppointmentDto, CreateDeliveryDto, CreateInvoiceDto, CreatePatientDto, CreateReportDto, Delivery, Invoice, Patient, Report, Studio, UpdateAppointmentDto, UpdateDeliveryDto, UpdateInvoiceDto, UpdatePatientDto, UpdateReportDto, UpdateStudioDto } from '../../../shared/models';

/**
 * Main SQLite Database Service - Orchestratore
 * Delega tutte le operazioni ai services specializzati
 */
@Injectable({
  providedIn: 'root'
})
export class SqliteDbService extends DatabaseService {
  // Inject dei services specializzati
  private patients = inject(SqlitePatientsService);
  private deliveries = inject(SqliteDeliveriesService);
  private reports = inject(SqliteReportsService);
  private invoices = inject(SqliteInvoicesService);
  private appointments = inject(SqliteAppointmentsService);
  private activities = inject(SqliteActivitiesService);
  private studio = inject(SqliteStudioService);

  // ==================== PATIENTS ====================
  searchPatients(query: string): Observable<Patient[]> {
    return this.patients.searchPatients(query);
  }

  getPatients(): Observable<Patient[]> {
    return this.patients.getPatients();
  }

  getPatientById(id: string): Observable<Patient | null> {
    return this.patients.getPatientById(id);
  }

  createPatient(data: CreatePatientDto): Observable<Patient> {
    return this.patients.createPatient(data);
  }

  updatePatient(id: string, data: UpdatePatientDto): Observable<Patient> {
    return this.patients.updatePatient(id, data);
  }

  deletePatient(id: string): Observable<void> {
    return this.patients.deletePatient(id);
  }

  // ==================== DELIVERIES ====================
  getDeliveriesByPatient(patientId: string): Observable<Delivery[]> {
    return this.deliveries.getDeliveriesByPatient(patientId);
  }

  createDelivery(data: CreateDeliveryDto): Observable<Delivery> {
    return this.deliveries.createDelivery(data);
  }

  updateDelivery(id: string, data: UpdateDeliveryDto): Observable<Delivery> {
    return this.deliveries.updateDelivery(id, data);
  }

  deleteDelivery(id: string): Observable<void> {
    return this.deliveries.deleteDelivery(id);
  }

  // ==================== REPORTS ====================
  getReportsByPatient(patientId: string): Observable<Report[]> {
    return this.reports.getReportsByPatient(patientId);
  }

  getReportById(id: string): Observable<Report | null> {
    return this.reports.getReportById(id);
  }

  createReport(data: CreateReportDto): Observable<Report> {
    return this.reports.createReport(data);
  }

  updateReport(id: string, data: UpdateReportDto): Observable<Report> {
    return this.reports.updateReport(id, data);
  }

  deleteReport(id: string): Observable<void> {
    return this.reports.deleteReport(id);
  }

  getNextReportNumber(): Observable<string> {
    return this.reports.getNextReportNumber();
  }

  // ==================== INVOICES ====================
  getInvoicesByPatient(patientId: string): Observable<Invoice[]> {
    return this.invoices.getInvoicesByPatient(patientId);
  }

  getInvoiceById(id: string): Observable<Invoice | null> {
    return this.invoices.getInvoiceById(id);
  }

  createInvoice(data: CreateInvoiceDto): Observable<Invoice> {
    return this.invoices.createInvoice(data);
  }

  updateInvoice(id: string, data: UpdateInvoiceDto): Observable<Invoice> {
    return this.invoices.updateInvoice(id, data);
  }

  deleteInvoice(id: string): Observable<void> {
    return this.invoices.deleteInvoice(id);
  }

  getNextInvoiceNumber(): Observable<string> {
    return this.invoices.getNextInvoiceNumber();
  }

  // ==================== APPOINTMENTS ====================
  getAppointments(filters?: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
    patientId?: string
  }): Observable<Appointment[]> {
    return this.appointments.getAppointments(filters);
  }

  getAppointmentById(id: string): Observable<Appointment | null> {
    return this.appointments.getAppointmentById(id);
  }

  getAppointmentsByPatient(patientId: string): Observable<Appointment[]> {
    return this.appointments.getAppointmentsByPatient(patientId);
  }

  createAppointment(data: CreateAppointmentDto): Observable<Appointment> {
    return this.appointments.createAppointment(data);
  }

  updateAppointment(id: string, data: UpdateAppointmentDto): Observable<Appointment> {
    return this.appointments.updateAppointment(id, data);
  }

  deleteAppointment(id: string): Observable<void> {
    return this.appointments.deleteAppointment(id);
  }

  getTodayAppointmentsCount(): Observable<number> {
    return this.appointments.getTodayAppointmentsCount();
  }

  // ==================== ACTIVITIES ====================
  getActivitiesByPatient(patientId: string): Observable<Activity[]> {
    return this.activities.getActivitiesByPatient(patientId);
  }

  createActivity(data: CreateActivityDto): Observable<Activity> {
    return this.activities.createActivity(data);
  }

  // ==================== STUDIO ====================
  getStudioSettings(): Observable<Studio> {
    return this.studio.getStudioSettings();
  }

  updateStudioSettings(data: UpdateStudioDto): Observable<Studio> {
    return this.studio.updateStudioSettings(data);
  }
}
