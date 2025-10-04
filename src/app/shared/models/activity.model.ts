/**
 * Modello Attività per timeline
 */
export interface Activity {
  id: string;
  patientId: string;
  activityType: string;
  activityDate: Date;
  description: string;
  referenceId?: string;
  referenceType?: string;
  createdBy?: string;
  createdAt: Date;
}

/**
 * DTO per creazione attività
 */
export interface CreateActivityDto {
  patientId: string;
  activityType: string;
  activityDate: Date;
  description: string;
  referenceId?: string;
  referenceType?: string;
  createdBy?: string;
}
