/**
 * Modello Paziente completo
 */
export interface Patient {
  id: string;
  studioId: string;

  // Dati Anagrafici
  firstName: string;
  lastName: string;
  birthDate: Date;
  birthPlace?: string;
  fiscalCode?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  province?: string;
  country?: string;

  // Dati Medici Base
  bloodType?: string;
  allergies?: string;
  currentMedications?: string;
  medicalNotes?: string;
  familyMedicalHistory?: string;

  // Dati Ginecologici
  firstMenstruationAge?: number;
  menstrualCycleDays?: number;
  lastMenstruationDate?: Date;
  contraceptionMethod?: string;
  papTestLastDate?: Date;
  mammographyLastDate?: Date;

  // Consensi
  privacyConsent: boolean;
  marketingConsent: boolean;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO per creazione paziente
 */
export interface CreatePatientDto {
  studioId: string;
  firstName: string;
  lastName: string;
  birthDate: Date;
  birthPlace?: string;
  fiscalCode?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  province?: string;
  country?: string;
  bloodType?: string;
  allergies?: string;
  currentMedications?: string;
  medicalNotes?: string;
  familyMedicalHistory?: string;
  firstMenstruationAge?: number;
  menstrualCycleDays?: number;
  lastMenstruationDate?: Date;
  contraceptionMethod?: string;
  papTestLastDate?: Date;
  mammographyLastDate?: Date;
  privacyConsent?: boolean;
  marketingConsent?: boolean;
}

/**
 * DTO per aggiornamento paziente
 */
export interface UpdatePatientDto extends Partial<CreatePatientDto> {}
