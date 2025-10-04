/**
 * Tipo di parto
 */
export type DeliveryType = 'natural' | 'cesarean' | 'assisted';

/**
 * Sesso bambino
 */
export type BabyGender = 'male' | 'female';

/**
 * Modello Parto
 */
export interface Delivery {
  id: string;
  patientId: string;
  studioId: string;
  deliveryDate: Date;
  deliveryType: DeliveryType;
  pregnancyWeeks?: number;
  babyWeight?: number;
  babyGender?: BabyGender;
  complications?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO per creazione parto
 */
export interface CreateDeliveryDto {
  patientId: string;
  studioId: string;
  deliveryDate: Date;
  deliveryType: DeliveryType;
  pregnancyWeeks?: number;
  babyWeight?: number;
  babyGender?: BabyGender;
  complications?: string;
  notes?: string;
}

/**
 * DTO per aggiornamento parto
 */
export interface UpdateDeliveryDto extends Partial<CreateDeliveryDto> {}
