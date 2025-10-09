/**
 * Stati appuntamento
 */
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

/**
 * Modello Appuntamento
 */
export interface Appointment {
  id: string;
  patientId: string;
  studioId: string;
  appointmentDate: Date;
  duration: number; // Minuti
  reason?: string;
  notes?: string;
  status: AppointmentStatus;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;

  // Dati paziente denormalizzati per performance
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    mobile?: string;
  };
}

/**
 * DTO per creazione appuntamento
 */
export interface CreateAppointmentDto {
  patientId: string;
  studioId: string;
  appointmentDate: Date;
  duration: number;
  reason?: string;
  notes?: string;
  status: AppointmentStatus;
  createdBy?: string;
}

/**
 * DTO per aggiornamento appuntamento
 */
export interface UpdateAppointmentDto extends Partial<CreateAppointmentDto> {}

/**
 * Filtri per ricerca appuntamenti
 */
export interface AppointmentFilters {
  startDate?: Date;
  endDate?: Date;
  patientId?: string;
  status?: AppointmentStatus;
}

/**
 * Evento calendario per UI
 */
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color: string;
  appointment: Appointment;
}
