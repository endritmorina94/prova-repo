import { effect, Injectable, signal } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import { Activity, CreateActivityDto, CreateDeliveryDto, CreateInvoiceDto, CreatePatientDto, CreateReportDto, Delivery, Invoice, Patient, Report, Studio, UpdateDeliveryDto, UpdateInvoiceDto, UpdatePatientDto, UpdateReportDto, UpdateStudioDto } from '../../shared/models';
// Chiavi localStorage
const STORAGE_KEYS = {
  PATIENTS: 'gyneco_patients',
  DELIVERIES: 'gyneco_deliveries',
  REPORTS: 'gyneco_reports',
  INVOICES: 'gyneco_invoices',
  ACTIVITIES: 'gyneco_activities',
  REPORT_COUNTER: 'gyneco_report_counter',
  INVOICE_COUNTER: 'gyneco_invoice_counter',
  STUDIO: 'gyneco_studio'
};


/**
 * Mock Database Service per sviluppo UI
 * Usa dati in memoria - da sostituire con LocalDbService quando Tauri è pronto
 */
@Injectable({
  providedIn: 'root'
})
export class MockDbService
 // extends DatabaseService
{
  private patients = signal<Patient[]>([]);
  private deliveries = signal<Delivery[]>([]);
  private reports = signal<Report[]>([]);
  private invoices = signal<Invoice[]>([]);
  private activities = signal<Activity[]>([]);
  private studio = signal<Studio | null>(null);

  private reportCounter = 1;
  private invoiceCounter = 1;

  constructor() {
   // super();
    this.loadFromLocalStorage();
    this.setupAutoSave();
  }

  searchPatients(query: string): Observable<Patient[]> {
    const searchTerm = query.toLowerCase();
    const filtered = this.patients().filter(p =>
      p.firstName.toLowerCase().includes(searchTerm) ||
      p.lastName.toLowerCase().includes(searchTerm) ||
      (p.fiscalCode && p.fiscalCode.toLowerCase().includes(searchTerm))
    );
    return of(filtered).pipe(delay(300));
  }

  getPatients(): Observable<Patient[]> {
    return of([...this.patients()]).pipe(delay(300));
  }

  getPatientById(id: string): Observable<Patient | null> {
    const patient = this.patients().find(p => p.id === id) || null;
    return of(patient).pipe(delay(300));
  }

  createPatient(data: CreatePatientDto): Observable<Patient> {
    const newPatient: Patient = {
      id: Date.now().toString(),
      ...data,
      privacyConsent: data.privacyConsent || false,
      marketingConsent: data.marketingConsent || false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.patients.update(patients => [...patients, newPatient]);
    return of(newPatient).pipe(delay(300));
  }

  // ==================== PATIENTS ====================

  updatePatient(id: string, data: UpdatePatientDto): Observable<Patient> {
    const index = this.patients().findIndex(p => p.id === id);
    if (index === -1) {
      return throwError(() => new Error('Patient not found'));
    }

    const updatedPatient: Patient = {
      ...this.patients()[index],
      ...data,
      updatedAt: new Date()
    };

    this.patients.update(patients => {
      const newPatients = [...patients];
      newPatients[index] = updatedPatient;
      return newPatients;
    });

    return of(updatedPatient).pipe(delay(300));
  }

  deletePatient(id: string): Observable<void> {
    this.patients.update(patients => patients.filter(p => p.id !== id));
    return of(void 0).pipe(delay(300));
  }

  getDeliveriesByPatient(patientId: string): Observable<Delivery[]> {
    const filtered = this.deliveries().filter(d => d.patientId === patientId);
    return of(filtered).pipe(delay(300));
  }

  createDelivery(data: CreateDeliveryDto): Observable<Delivery> {
    const newDelivery: Delivery = {
      id: Date.now().toString(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.deliveries.update(deliveries => [...deliveries, newDelivery]);
    return of(newDelivery).pipe(delay(300));
  }

  updateDelivery(id: string, data: UpdateDeliveryDto): Observable<Delivery> {
    const index = this.deliveries().findIndex(d => d.id === id);
    if (index === -1) {
      return throwError(() => new Error('Delivery not found'));
    }

    const updatedDelivery: Delivery = {
      ...this.deliveries()[index],
      ...data,
      updatedAt: new Date()
    };

    this.deliveries.update(deliveries => {
      const newDeliveries = [...deliveries];
      newDeliveries[index] = updatedDelivery;
      return newDeliveries;
    });

    return of(updatedDelivery).pipe(delay(300));
  }

  deleteDelivery(id: string): Observable<void> {
    this.deliveries.update(deliveries => deliveries.filter(d => d.id !== id));
    return of(void 0).pipe(delay(300));
  }

  // ==================== DELIVERIES ====================

  getReportsByPatient(patientId: string): Observable<Report[]> {
    const filtered = this.reports().filter(r => r.patientId === patientId);
    return of(filtered).pipe(delay(300));
  }

  getReportById(id: string): Observable<Report | null> {
    const report = this.reports().find(r => r.id === id) || null;
    return of(report).pipe(delay(300));
  }

  createReport(data: CreateReportDto): Observable<Report> {
    const reportNumber = `REF-${new Date().getFullYear()}-${String(this.reportCounter++).padStart(4, '0')}`;

    const newReport: Report = {
      id: Date.now().toString(),
      ...data,
      reportNumber,
      signed: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.reports.update(reports => [...reports, newReport]);
    return of(newReport).pipe(delay(300));
  }

  updateReport(id: string, data: UpdateReportDto): Observable<Report> {
    const index = this.reports().findIndex(r => r.id === id);
    if (index === -1) {
      return throwError(() => new Error('Report not found'));
    }

    const updatedReport: Report = {
      ...this.reports()[index],
      ...data,
      updatedAt: new Date()
    };

    this.reports.update(reports => {
      const newReports = [...reports];
      newReports[index] = updatedReport;
      return newReports;
    });

    return of(updatedReport).pipe(delay(300));
  }

  // ==================== REPORTS ====================

  deleteReport(id: string): Observable<void> {
    this.reports.update(reports => reports.filter(r => r.id !== id));
    return of(void 0).pipe(delay(300));
  }

  getInvoicesByPatient(patientId: string): Observable<Invoice[]> {
    const filtered = this.invoices().filter(i => i.patientId === patientId);
    return of(filtered).pipe(delay(300));
  }

  getInvoiceById(id: string): Observable<Invoice | null> {
    const invoice = this.invoices().find(i => i.id === id) || null;
    return of(invoice).pipe(delay(300));
  }

  createInvoice(data: CreateInvoiceDto): Observable<Invoice> {
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(this.invoiceCounter++).padStart(4, '0')}`;

    const newInvoice: Invoice = {
      id: Date.now().toString(),
      ...data,
      invoiceNumber,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.invoices.update(invoices => [...invoices, newInvoice]);
    return of(newInvoice).pipe(delay(300));
  }

  updateInvoice(id: string, data: UpdateInvoiceDto): Observable<Invoice> {
    const index = this.invoices().findIndex(i => i.id === id);
    if (index === -1) {
      return throwError(() => new Error('Invoice not found'));
    }

    const updatedInvoice: Invoice = {
      ...this.invoices()[index],
      ...data,
      updatedAt: new Date()
    };

    this.invoices.update(invoices => {
      const newInvoices = [...invoices];
      newInvoices[index] = updatedInvoice;
      return newInvoices;
    });

    return of(updatedInvoice).pipe(delay(300));
  }

  // ==================== INVOICES ====================

  deleteInvoice(id: string): Observable<void> {
    this.invoices.update(invoices => invoices.filter(i => i.id !== id));
    return of(void 0).pipe(delay(300));
  }


  getActivitiesByPatient(patientId: string): Observable<Activity[]> {
    const filtered = this.activities().filter(a => a.patientId === patientId);
    return of(filtered).pipe(delay(300));
  }

  createActivity(data: CreateActivityDto): Observable<Activity> {
    const newActivity: Activity = {
      id: Date.now().toString(),
      ...data,
      createdAt: new Date()
    };

    this.activities.update(activities => [...activities, newActivity]);
    return of(newActivity).pipe(delay(300));
  }

  getNextReportNumber(): Observable<string> {
    const year = new Date().getFullYear();
    const number = String(this.reportCounter).padStart(4, '0');
    this.reportCounter++;
    this.saveCounters();
    return of(`REF-${year}-${number}`).pipe(delay(100));
  }

  getNextInvoiceNumber(): Observable<string> {
    const year = new Date().getFullYear();
    const number = String(this.invoiceCounter).padStart(4, '0');
    this.invoiceCounter++;
    this.saveCounters();
    return of(`INV-${year}-${number}`).pipe(delay(100));
  }

  // ==================== ACTIVITIES ====================

  getStudioSettings(): Observable<Studio> {
    const studio = this.studio();
    if (!studio) {
      this.initDefaultStudio();
    }
    return of(this.studio()!).pipe(delay(100));
  }

  updateStudioSettings(data: UpdateStudioDto): Observable<Studio> {
    const current = this.studio();
    if (!current) {
      this.initDefaultStudio();
    }

    const updated: Studio = {
      ...this.studio()!,
      ...data,
      updatedAt: new Date()
    };

    this.studio.set(updated);
    return of(updated).pipe(delay(300));
  }

  /**
   * Carica dati da localStorage
   */
  private loadFromLocalStorage(): void {
    try {
      // Carica pazienti
      const patientsData = localStorage.getItem(STORAGE_KEYS.PATIENTS);
      if (patientsData) {
        this.patients.set(JSON.parse(patientsData));
      } else {
        this.initMockData(); // Dati iniziali solo se localStorage vuoto
      }

      // Carica deliveries
      const deliveriesData = localStorage.getItem(STORAGE_KEYS.DELIVERIES);
      if (deliveriesData) {
        this.deliveries.set(JSON.parse(deliveriesData));
      }

      // Carica reports
      const reportsData = localStorage.getItem(STORAGE_KEYS.REPORTS);
      if (reportsData) {
        this.reports.set(JSON.parse(reportsData));
      }

      // Carica invoices
      const invoicesData = localStorage.getItem(STORAGE_KEYS.INVOICES);
      if (invoicesData) {
        this.invoices.set(JSON.parse(invoicesData));
      }

      // Carica activities
      const activitiesData = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
      if (activitiesData) {
        this.activities.set(JSON.parse(activitiesData));
      }

      // Carica contatori
      const reportCounter = localStorage.getItem(STORAGE_KEYS.REPORT_COUNTER);
      if (reportCounter) {
        this.reportCounter = parseInt(reportCounter, 10);
      }

      const invoiceCounter = localStorage.getItem(STORAGE_KEYS.INVOICE_COUNTER);
      if (invoiceCounter) {
        this.invoiceCounter = parseInt(invoiceCounter, 10);
      }

      // Carica studio
      const studioData = localStorage.getItem(STORAGE_KEYS.STUDIO);
      if (studioData) {
        this.studio.set(JSON.parse(studioData));
      } else {
        // Crea studio di default
        this.initDefaultStudio();
      }

    } catch (error) {
      console.error('Error loading from localStorage:', error);
      this.initMockData();
    }
  }

  /**
   * Inizializza studio di default
   */
  private initDefaultStudio(): void {
    const defaultStudio: Studio = {
      id: 'default-studio',
      name: 'Studio Ginecologico',
      vatNumber: '',
      address: 'Via della Salute, 45',
      city: 'Milano',
      postalCode: '20100',
      province: 'MI',
      phone: '+39 02 1234567',
      email: 'info@studio.it',
      logoUrl: '',
      doctorName: 'Dr.ssa',
      doctorTitle: 'Specialista in Ginecologia e Ostetricia',
      doctorSignaturePath: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.studio.set(defaultStudio);
  }

  /**
   * Setup auto-save su ogni cambiamento
   */
  private setupAutoSave(): void {
    // Salva automaticamente quando i signals cambiano
    effect(() => {
      localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(this.patients()));
    });

    effect(() => {
      localStorage.setItem(STORAGE_KEYS.DELIVERIES, JSON.stringify(this.deliveries()));
    });

    effect(() => {
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(this.reports()));
    });

    effect(() => {
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(this.invoices()));
    });

    effect(() => {
      localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(this.activities()));
    });

    effect(() => {
      if (this.studio()) {
        localStorage.setItem(STORAGE_KEYS.STUDIO, JSON.stringify(this.studio()));
      }
    });
  }

  /**
   * Salva contatori
   */
  private saveCounters(): void {
    localStorage.setItem(STORAGE_KEYS.REPORT_COUNTER, this.reportCounter.toString());
    localStorage.setItem(STORAGE_KEYS.INVOICE_COUNTER, this.invoiceCounter.toString());
  }

  /**
   * Inizializza dati di esempio
   */
  private initMockData(): void {
    // Paziente di esempio
    const mockPatient: Patient = {
      id: '1',
      studioId: 'default',
      firstName: 'Maria',
      lastName: 'Rossi',
      birthDate: new Date('1985-03-15'),
      birthPlace: 'Milano',
      fiscalCode: 'RSSMRA85C55F205X',
      phone: '02 1234567',
      mobile: '333 1234567',
      email: 'maria.rossi@example.com',
      address: 'Via Roma 123',
      city: 'Milano',
      postalCode: '20100',
      province: 'MI',
      country: 'Italia',
      bloodType: 'A+',
      allergies: 'Nessuna allergia nota',
      currentMedications: 'Integratore acido folico',
      medicalNotes: 'Paziente in buone condizioni generali',
      familyMedicalHistory: 'Nessuna patologia rilevante',
      firstMenstruationAge: 12,
      menstrualCycleDays: 28,
      lastMenstruationDate: new Date('2024-09-10'),
      contraceptionMethod: 'Pillola anticoncezionale',
      papTestLastDate: new Date('2024-01-15'),
      mammographyLastDate: new Date('2023-06-20'),
      privacyConsent: true,
      marketingConsent: false,
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-10')
    };

    this.patients.set([mockPatient]);
  }
}
