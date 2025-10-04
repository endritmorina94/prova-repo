import { Injectable } from '@angular/core';
import { catchError, from, map, Observable, throwError } from 'rxjs';
import { PrismaClient } from '@prisma/client';
import { DatabaseService } from './database.service';
import { Activity, CreateActivityDto, CreateDeliveryDto, CreateInvoiceDto, CreatePatientDto, CreateReportDto, Delivery, Invoice, Patient, Report, Studio, UpdateDeliveryDto, UpdateInvoiceDto, UpdatePatientDto, UpdateReportDto, UpdateStudioDto } from '../../shared/models';

/**
 * Implementazione locale del database service con Prisma
 * Usa PostgreSQL locale per la Fase 1
 */
@Injectable({
  providedIn: 'root'
})
export class LocalDbService extends DatabaseService {
  private prisma: PrismaClient;
  private readonly DEFAULT_STUDIO_ID = 'default-studio-id';

  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.initializeDefaultStudio();
  }

  searchPatients(query: string): Observable<Patient[]> {
    const searchTerm = query.toLowerCase();

    return from(
      this.prisma.patient.findMany({
        where: {
          OR: [
            { firstName: { contains: searchTerm, mode: 'insensitive' } },
            { lastName: { contains: searchTerm, mode: 'insensitive' } },
            { fiscalCode: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' }
        ]
      })
    ).pipe(
      map(patients => patients.map(this.mapPrismaPatientToModel)),
      catchError(this.handleError)
    );
  }

  // ==================== PATIENTS ====================

  getPatients(): Observable<Patient[]> {
    return from(
      this.prisma.patient.findMany({
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' }
        ]
      })
    ).pipe(
      map(patients => patients.map(this.mapPrismaPatientToModel)),
      catchError(this.handleError)
    );
  }

  getPatientById(id: string): Observable<Patient | null> {
    return from(
      this.prisma.patient.findUnique({
        where: { id }
      })
    ).pipe(
      map(patient => patient ? this.mapPrismaPatientToModel(patient) : null),
      catchError(this.handleError)
    );
  }

  createPatient(data: CreatePatientDto): Observable<Patient> {
    return from(
      this.prisma.patient.create({
        data: {
          ...data,
          studioId: this.DEFAULT_STUDIO_ID
        }
      })
    ).pipe(
      map(this.mapPrismaPatientToModel),
      catchError(this.handleError)
    );
  }

  updatePatient(id: string, data: UpdatePatientDto): Observable<Patient> {
    return from(
      this.prisma.patient.update({
        where: { id },
        data
      })
    ).pipe(
      map(this.mapPrismaPatientToModel),
      catchError(this.handleError)
    );
  }

  deletePatient(id: string): Observable<void> {
    return from(
      this.prisma.patient.delete({
        where: { id }
      })
    ).pipe(
      map(() => undefined),
      catchError(this.handleError)
    );
  }

  getDeliveriesByPatient(patientId: string): Observable<Delivery[]> {
    return from(
      this.prisma.delivery.findMany({
        where: { patientId },
        orderBy: { deliveryDate: 'desc' }
      })
    ).pipe(
      map(deliveries => deliveries.map(this.mapPrismaDeliveryToModel)),
      catchError(this.handleError)
    );
  }

  // ==================== DELIVERIES ====================

  createDelivery(data: CreateDeliveryDto): Observable<Delivery> {
    return from(
      this.prisma.delivery.create({
        data: {
          ...data,
          studioId: this.DEFAULT_STUDIO_ID
        }
      })
    ).pipe(
      map(this.mapPrismaDeliveryToModel),
      catchError(this.handleError)
    );
  }

  updateDelivery(id: string, data: UpdateDeliveryDto): Observable<Delivery> {
    return from(
      this.prisma.delivery.update({
        where: { id },
        data
      })
    ).pipe(
      map(this.mapPrismaDeliveryToModel),
      catchError(this.handleError)
    );
  }

  deleteDelivery(id: string): Observable<void> {
    return from(
      this.prisma.delivery.delete({
        where: { id }
      })
    ).pipe(
      map(() => undefined),
      catchError(this.handleError)
    );
  }

  getReportsByPatient(patientId: string): Observable<Report[]> {
    return from(
      this.prisma.report.findMany({
        where: { patientId },
        orderBy: { reportDate: 'desc' }
      })
    ).pipe(
      map(reports => reports.map(this.mapPrismaReportToModel)),
      catchError(this.handleError)
    );
  }

  // ==================== REPORTS ====================

  getReportById(id: string): Observable<Report | null> {
    return from(
      this.prisma.report.findUnique({
        where: { id }
      })
    ).pipe(
      map(report => report ? this.mapPrismaReportToModel(report) : null),
      catchError(this.handleError)
    );
  }

  createReport(data: CreateReportDto): Observable<Report> {
    return from(
      this.getNextReportNumber().toPromise().then(reportNumber =>
        this.prisma.report.create({
          data: {
            ...data,
            studioId: this.DEFAULT_STUDIO_ID,
            reportNumber: reportNumber ?? '-1',
            patientSnapshot: data.patientSnapshot as any
          }
        })
      )
    ).pipe(
      map(this.mapPrismaReportToModel),
      catchError(this.handleError)
    );
  }

  updateReport(id: string, data: UpdateReportDto): Observable<Report> {
    return from(
      this.prisma.report.update({
        where: { id },
        data: {
          ...data,
          patientSnapshot: data.patientSnapshot as any
        }
      })
    ).pipe(
      map(this.mapPrismaReportToModel),
      catchError(this.handleError)
    );
  }

  deleteReport(id: string): Observable<void> {
    return from(
      this.prisma.report.delete({
        where: { id }
      })
    ).pipe(
      map(() => undefined),
      catchError(this.handleError)
    );
  }

  getNextReportNumber(): Observable<string> {
    return from(
      this.prisma.report.count().then(count => {
        const year = new Date().getFullYear();
        const number = (count + 1).toString().padStart(4, '0');
        return `REF-${year}-${number}`;
      })
    ).pipe(
      catchError(this.handleError)
    );
  }

  getInvoicesByPatient(patientId: string): Observable<Invoice[]> {
    return from(
      this.prisma.invoice.findMany({
        where: { patientId },
        orderBy: { invoiceDate: 'desc' }
      })
    ).pipe(
      map(invoices => invoices.map(this.mapPrismaInvoiceToModel)),
      catchError(this.handleError)
    );
  }

  // ==================== INVOICES ====================

  getInvoiceById(id: string): Observable<Invoice | null> {
    return from(
      this.prisma.invoice.findUnique({
        where: { id }
      })
    ).pipe(
      map(invoice => invoice ? this.mapPrismaInvoiceToModel(invoice) : null),
      catchError(this.handleError)
    );
  }

  createInvoice(data: CreateInvoiceDto): Observable<Invoice> {
    return from(
      this.getNextInvoiceNumber().toPromise().then(invoiceNumber =>
        this.prisma.invoice.create({
          data: {
            ...data,
            studioId: this.DEFAULT_STUDIO_ID,
            invoiceNumber: invoiceNumber ?? '-1',
            items: data.items as any
          }
        })
      )
    ).pipe(
      map(this.mapPrismaInvoiceToModel),
      catchError(this.handleError)
    );
  }

  updateInvoice(id: string, data: UpdateInvoiceDto): Observable<Invoice> {
    return from(
      this.prisma.invoice.update({
        where: { id },
        data: {
          ...data,
          items: data.items as any
        }
      })
    ).pipe(
      map(this.mapPrismaInvoiceToModel),
      catchError(this.handleError)
    );
  }

  deleteInvoice(id: string): Observable<void> {
    return from(
      this.prisma.invoice.delete({
        where: { id }
      })
    ).pipe(
      map(() => undefined),
      catchError(this.handleError)
    );
  }

  getNextInvoiceNumber(): Observable<string> {
    return from(
      this.prisma.invoice.count().then(count => {
        const year = new Date().getFullYear();
        const number = (count + 1).toString().padStart(4, '0');
        return `INV-${year}-${number}`;
      })
    ).pipe(
      catchError(this.handleError)
    );
  }

  getActivitiesByPatient(patientId: string): Observable<Activity[]> {
    return from(
      this.prisma.activity.findMany({
        where: { patientId },
        orderBy: { activityDate: 'desc' }
      })
    ).pipe(
      map(activities => activities.map(this.mapPrismaActivityToModel)),
      catchError(this.handleError)
    );
  }

  // ==================== ACTIVITIES ====================

  createActivity(data: CreateActivityDto): Observable<Activity> {
    return from(
      this.prisma.activity.create({
        data
      })
    ).pipe(
      map(this.mapPrismaActivityToModel),
      catchError(this.handleError)
    );
  }

  getStudioSettings(): Observable<Studio> {
    // TODO: Implementare con Prisma quando necessario
    return throwError(() => new Error('Studio settings not implemented in LocalDbService'));
  }

  // ==================== MAPPERS ====================

  updateStudioSettings(data: UpdateStudioDto): Observable<Studio> {
    // TODO: Implementare con Prisma quando necessario
    return throwError(() => new Error('Studio settings not implemented in LocalDbService'));
  }

  /**
   * Inizializza lo studio di default se non esiste
   */
  private async initializeDefaultStudio(): Promise<void> {
    try {
      const studio = await this.prisma.studio.findUnique({
        where: { id: this.DEFAULT_STUDIO_ID }
      });

      if (!studio) {
        await this.prisma.studio.create({
          data: {
            id: this.DEFAULT_STUDIO_ID,
            name: 'Studio Ginecologico',
            doctorName: 'Dr.ssa',
            doctorTitle: 'Specialista in Ginecologia e Ostetricia'
          }
        });
      }
    } catch (error) {
      console.error('Error initializing default studio:', error);
    }
  }

  private mapPrismaPatientToModel(prismaPatient: any): Patient {
    return {
      id: prismaPatient.id,
      studioId: prismaPatient.studioId,
      firstName: prismaPatient.firstName,
      lastName: prismaPatient.lastName,
      birthDate: new Date(prismaPatient.birthDate),
      birthPlace: prismaPatient.birthPlace,
      fiscalCode: prismaPatient.fiscalCode,
      phone: prismaPatient.phone,
      mobile: prismaPatient.mobile,
      email: prismaPatient.email,
      address: prismaPatient.address,
      city: prismaPatient.city,
      postalCode: prismaPatient.postalCode,
      province: prismaPatient.province,
      country: prismaPatient.country,
      bloodType: prismaPatient.bloodType,
      allergies: prismaPatient.allergies,
      currentMedications: prismaPatient.currentMedications,
      medicalNotes: prismaPatient.medicalNotes,
      familyMedicalHistory: prismaPatient.familyMedicalHistory,
      firstMenstruationAge: prismaPatient.firstMenstruationAge,
      menstrualCycleDays: prismaPatient.menstrualCycleDays,
      lastMenstruationDate: prismaPatient.lastMenstruationDate ? new Date(prismaPatient.lastMenstruationDate) : undefined,
      contraceptionMethod: prismaPatient.contraceptionMethod,
      papTestLastDate: prismaPatient.papTestLastDate ? new Date(prismaPatient.papTestLastDate) : undefined,
      mammographyLastDate: prismaPatient.mammographyLastDate ? new Date(prismaPatient.mammographyLastDate) : undefined,
      privacyConsent: prismaPatient.privacyConsent,
      marketingConsent: prismaPatient.marketingConsent,
      createdAt: new Date(prismaPatient.createdAt),
      updatedAt: new Date(prismaPatient.updatedAt)
    };
  }

  private mapPrismaDeliveryToModel(prismaDelivery: any): Delivery {
    return {
      id: prismaDelivery.id,
      patientId: prismaDelivery.patientId,
      studioId: prismaDelivery.studioId,
      deliveryDate: new Date(prismaDelivery.deliveryDate),
      deliveryType: prismaDelivery.deliveryType,
      pregnancyWeeks: prismaDelivery.pregnancyWeeks,
      babyWeight: prismaDelivery.babyWeight ? Number(prismaDelivery.babyWeight) : undefined,
      babyGender: prismaDelivery.babyGender,
      complications: prismaDelivery.complications,
      notes: prismaDelivery.notes,
      createdAt: new Date(prismaDelivery.createdAt),
      updatedAt: new Date(prismaDelivery.updatedAt)
    };
  }

  private mapPrismaReportToModel(prismaReport: any): Report {
    return {
      id: prismaReport.id,
      patientId: prismaReport.patientId,
      studioId: prismaReport.studioId,
      reportDate: new Date(prismaReport.reportDate),
      visitType: prismaReport.visitType,
      reportNumber: prismaReport.reportNumber,
      patientSnapshot: prismaReport.patientSnapshot,
      examination: prismaReport.examination,
      ultrasoundResult: prismaReport.ultrasoundResult,
      therapy: prismaReport.therapy,
      attachments: prismaReport.attachments,
      internalNotes: prismaReport.internalNotes,
      doctorName: prismaReport.doctorName,
      doctorTitle: prismaReport.doctorTitle,
      signed: prismaReport.signed,
      createdBy: prismaReport.createdBy,
      createdAt: new Date(prismaReport.createdAt),
      updatedAt: new Date(prismaReport.updatedAt)
    };
  }

  // ==================== ERROR HANDLING ====================

  private mapPrismaInvoiceToModel(prismaInvoice: any): Invoice {
    return {
      id: prismaInvoice.id,
      patientId: prismaInvoice.patientId,
      studioId: prismaInvoice.studioId,
      invoiceNumber: prismaInvoice.invoiceNumber,
      invoiceDate: new Date(prismaInvoice.invoiceDate),
      dueDate: prismaInvoice.dueDate ? new Date(prismaInvoice.dueDate) : undefined,
      amount: Number(prismaInvoice.amount),
      vatRate: prismaInvoice.vatRate ? Number(prismaInvoice.vatRate) : undefined,
      vatAmount: prismaInvoice.vatAmount ? Number(prismaInvoice.vatAmount) : undefined,
      totalAmount: Number(prismaInvoice.totalAmount),
      paymentMethod: prismaInvoice.paymentMethod,
      paymentStatus: prismaInvoice.paymentStatus,
      paymentDate: prismaInvoice.paymentDate ? new Date(prismaInvoice.paymentDate) : undefined,
      notes: prismaInvoice.notes,
      items: prismaInvoice.items,
      createdAt: new Date(prismaInvoice.createdAt),
      updatedAt: new Date(prismaInvoice.updatedAt)
    };
  }

  private mapPrismaActivityToModel(prismaActivity: any): Activity {
    return {
      id: prismaActivity.id,
      patientId: prismaActivity.patientId,
      activityType: prismaActivity.activityType,
      activityDate: new Date(prismaActivity.activityDate),
      description: prismaActivity.description,
      referenceId: prismaActivity.referenceId,
      referenceType: prismaActivity.referenceType,
      createdBy: prismaActivity.createdBy,
      createdAt: new Date(prismaActivity.createdAt)
    };
  }

  private handleError(error: any): Observable<never> {
    console.error('Database error:', error);
    return throwError(() => new Error('Database operation failed'));
  }
}
