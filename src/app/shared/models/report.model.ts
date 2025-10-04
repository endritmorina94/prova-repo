/**
 * Snapshot dati paziente per referto
 */
export interface PatientSnapshot {
  firstName: string;
  lastName: string;
  birthDate: Date;
  fiscalCode?: string;
  address?: string;
  phone?: string;
  bloodType?: string;
  allergies?: string;
  currentMedications?: string;
  lastMenstruationDate?: Date;
  deliveries?: {
    date: Date;
    type: string;
    weeks?: number;
    weight?: number;
  }[];
}

/**
 * Modello Referto
 */
export interface Report {
  id: string;
  patientId: string;
  studioId: string;
  reportDate: Date;
  visitType: string;
  reportNumber: string;
  patientSnapshot: PatientSnapshot;
  examination: string;
  ultrasoundResult?: string;
  therapy?: string;
  attachments?: string[];
  internalNotes?: string;
  doctorName?: string;
  doctorTitle?: string;
  signed: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO per creazione referto
 */
export interface CreateReportDto {
  patientId: string;
  studioId: string;
  reportDate: Date;
  visitType: string;
  patientSnapshot: PatientSnapshot;
  examination: string;
  ultrasoundResult?: string;
  therapy?: string;
  attachments?: string[];
  internalNotes?: string;
  doctorName?: string;
  doctorTitle?: string;
}

/**
 * DTO per aggiornamento referto
 */
export interface UpdateReportDto extends Partial<CreateReportDto> {}
