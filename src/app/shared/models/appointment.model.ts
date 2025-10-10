/**
 * Stati appuntamento
 */
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

/**
 * Modello Appuntamento
 */
export interface Appointment {
  id: string;
  patientId: string;
  studioId: string;

  // Dati Appuntamento
  appointmentDate: Date;
  duration: number; // Minuti
  appointmentType?: string;
  status: AppointmentStatus;
  notes?: string;

  // Reminder
  reminderSent: boolean;

  // Dati paziente denormalizzati per performance
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    mobile?: string;
  };

  // Metadata
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO per creazione appuntamento
 */
export interface CreateAppointmentDto {
  patientId: string;
  studioId: string;
  appointmentDate: Date;
  duration?: number; // Default 30
  appointmentType?: string;
  status?: AppointmentStatus; // Default 'scheduled'
  notes?: string;
}

/**
 * DTO per aggiornamento appuntamento
 */
export interface UpdateAppointmentDto extends Partial<CreateAppointmentDto> {
  reminderSent?: boolean;
}
