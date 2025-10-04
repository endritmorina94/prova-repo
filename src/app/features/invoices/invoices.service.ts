import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { DatabaseService } from '../../core/database/database.service';
import { CreateInvoiceDto, Invoice, UpdateInvoiceDto } from '../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class InvoicesService {
  // Signal per fattura corrente
  currentInvoice = signal<Invoice | null>(null);
  /**
   * Genera il prossimo numero fattura
   */
  private db = inject(DatabaseService);
  // Signal per cache fatture
  private invoicesCache = signal<Invoice[]>([]);

  /**
   * Carica fatture per paziente
   */
  getInvoicesByPatient(patientId: string): Observable<Invoice[]> {
    return this.db.getInvoicesByPatient(patientId);
  }

  /**
   * Ottiene una fattura per ID
   */
  getInvoiceById(id: string): Observable<Invoice | null> {
    return this.db.getInvoiceById(id).pipe(
      tap(invoice => this.currentInvoice.set(invoice))
    );
  }

  /**
   * Crea una nuova fattura
   */
  createInvoice(data: CreateInvoiceDto): Observable<Invoice> {
    return this.db.createInvoice(data).pipe(
      tap(invoice => {
        this.invoicesCache.update(invoices => [...invoices, invoice]);
      })
    );
  }

  /**
   * Aggiorna una fattura
   */
  updateInvoice(id: string, data: UpdateInvoiceDto): Observable<Invoice> {
    return this.db.updateInvoice(id, data).pipe(
      tap(updatedInvoice => {
        this.invoicesCache.update(invoices =>
          invoices.map(i => i.id === id ? updatedInvoice : i)
        );

        if (this.currentInvoice()?.id === id) {
          this.currentInvoice.set(updatedInvoice);
        }
      })
    );
  }

  /**
   * Elimina una fattura
   */
  deleteInvoice(id: string): Observable<void> {
    return this.db.deleteInvoice(id).pipe(
      tap(() => {
        this.invoicesCache.update(invoices =>
          invoices.filter(i => i.id !== id)
        );

        if (this.currentInvoice()?.id === id) {
          this.currentInvoice.set(null);
        }
      })
    );
  }

  getNextInvoiceNumber(): Observable<string> {
    return this.db.getNextInvoiceNumber();
  }

  /**
   * Calcola totale fattura
   */
  calculateTotal(amount: number, vatRate: number): { vatAmount: number; total: number } {
    const vatAmount = (amount * vatRate) / 100;
    const total = amount + vatAmount;
    return { vatAmount, total };
  }
}
