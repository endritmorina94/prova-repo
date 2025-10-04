/**
 * Stato pagamento
 */
export type PaymentStatus = 'paid' | 'pending' | 'cancelled' | 'overdue';

/**
 * Voce fattura
 */
export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

/**
 * Modello Fattura
 */
export interface Invoice {
  id: string;
  patientId: string;
  studioId: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate?: Date;
  amount: number;
  vatRate?: number;
  vatAmount?: number;
  totalAmount: number;
  paymentMethod?: string;
  paymentStatus: PaymentStatus;
  paymentDate?: Date;
  notes?: string;
  items?: InvoiceItem[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO per creazione fattura
 */
export interface CreateInvoiceDto {
  patientId: string;
  studioId: string;
  invoiceDate: Date;
  dueDate?: Date;
  amount: number;
  vatRate?: number;
  vatAmount?: number;
  totalAmount: number;
  paymentMethod?: string;
  paymentStatus: PaymentStatus;
  paymentDate?: Date;
  notes?: string;
  items?: InvoiceItem[];
}

/**
 * DTO per aggiornamento fattura
 */
export interface UpdateInvoiceDto extends Partial<CreateInvoiceDto> {}
