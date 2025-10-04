/**
 * Modello Studio
 */
export interface Studio {
  id: string;
  name: string;
  vatNumber?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  province?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  doctorName?: string;
  doctorTitle?: string;
  doctorSignaturePath?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO per aggiornamento studio
 */
export interface UpdateStudioDto {
  name?: string;
  vatNumber?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  province?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  doctorName?: string;
  doctorTitle?: string;
  doctorSignaturePath?: string;
}
