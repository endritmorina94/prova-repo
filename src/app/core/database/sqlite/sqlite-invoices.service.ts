// src/app/core/database/sqlite/sqlite-invoices.service.ts
import { inject, Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { SqliteBaseService } from './sqlite-base.service';
import { CreateInvoiceDto, Invoice, UpdateInvoiceDto } from '../../../shared/models';

/**
 * Service SQLite specializzato per Fatture
 */
@Injectable({
  providedIn: 'root'
})
export class SqliteInvoicesService {
  private base = inject(SqliteBaseService);

  /**
   * Ottiene tutte le fatture di un paziente
   */
  getInvoicesByPatient(patientId: string): Observable<Invoice[]> {
    return from(
      this.base['ensureInitialized']().then(async (db) => {
        const result = await db.select<any[]>(
          'SELECT * FROM invoices WHERE patient_id = ? ORDER BY invoice_date DESC',
          [patientId]
        );
        return result.map(this.mapInvoiceFromDb);
      })
    );
  }

  /**
   * Ottiene fattura per ID
   */
  getInvoiceById(id: string): Observable<Invoice | null> {
    return from(
      this.base['ensureInitialized']().then(async (db) => {
        const result = await db.select<any[]>(
          'SELECT * FROM invoices WHERE id = ?',
          [id]
        );
        return result.length > 0 ? this.mapInvoiceFromDb(result[0]) : null;
      })
    );
  }

  /**
   * Crea nuova fattura
   */
  createInvoice(data: CreateInvoiceDto): Observable<Invoice> {
    return from(
      this.base['ensureInitialized']().then(async (db) => {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        // Genera invoice number
        const invoiceNumber = await this.generateInvoiceNumber(db);

        await db.execute(
          `INSERT INTO invoices (
            id, patient_id, studio_id, invoice_number, invoice_date,
            due_date, amount, vat_rate, vat_amount, total_amount,
            payment_method, payment_status, payment_date, notes,
            items, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            data.patientId,
            data.studioId,
            invoiceNumber,
            this.base['toSqliteDate'](data.invoiceDate),
            data.dueDate ? this.base['toSqliteDate'](data.dueDate) : null,
            data.amount,
            data.vatRate || null,
            data.vatAmount || null,
            data.totalAmount,
            data.paymentMethod || null,
            data.paymentStatus,
            data.paymentDate ? this.base['toSqliteDate'](data.paymentDate) : null,
            data.notes || null,
            data.items ? JSON.stringify(data.items) : null,
            now,
            now
          ]
        );

        const result = await db.select<any[]>(
          'SELECT * FROM invoices WHERE id = ?',
          [id]
        );

        return this.mapInvoiceFromDb(result[0]);
      })
    );
  }

  /**
   * Aggiorna fattura
   */
  updateInvoice(id: string, data: UpdateInvoiceDto): Observable<Invoice> {
    return from(
      this.base['ensureInitialized']().then(async (db) => {
        const updates: string[] = [];
        const params: any[] = [];

        if (data.invoiceDate !== undefined) {
          updates.push('invoice_date = ?');
          params.push(this.base['toSqliteDate'](data.invoiceDate));
        }
        if (data.dueDate !== undefined) {
          updates.push('due_date = ?');
          params.push(data.dueDate ? this.base['toSqliteDate'](data.dueDate) : null);
        }
        if (data.amount !== undefined) {
          updates.push('amount = ?');
          params.push(data.amount);
        }
        if (data.vatRate !== undefined) {
          updates.push('vat_rate = ?');
          params.push(data.vatRate);
        }
        if (data.vatAmount !== undefined) {
          updates.push('vat_amount = ?');
          params.push(data.vatAmount);
        }
        if (data.totalAmount !== undefined) {
          updates.push('total_amount = ?');
          params.push(data.totalAmount);
        }
        if (data.paymentMethod !== undefined) {
          updates.push('payment_method = ?');
          params.push(data.paymentMethod);
        }
        if (data.paymentStatus !== undefined) {
          updates.push('payment_status = ?');
          params.push(data.paymentStatus);
        }
        if (data.paymentDate !== undefined) {
          updates.push('payment_date = ?');
          params.push(data.paymentDate ? this.base['toSqliteDate'](data.paymentDate) : null);
        }
        if (data.notes !== undefined) {
          updates.push('notes = ?');
          params.push(data.notes);
        }
        if (data.items !== undefined) {
          updates.push('items = ?');
          params.push(JSON.stringify(data.items));
        }

        updates.push('updated_at = ?');
        params.push(new Date().toISOString());
        params.push(id);

        await db.execute(
          `UPDATE invoices SET ${updates.join(', ')} WHERE id = ?`,
          params
        );

        const result = await db.select<any[]>(
          'SELECT * FROM invoices WHERE id = ?',
          [id]
        );

        return this.mapInvoiceFromDb(result[0]);
      })
    );
  }

  /**
   * Elimina fattura
   */
  deleteInvoice(id: string): Observable<void> {
    return from(
      this.base['ensureInitialized']().then(async (db) => {
        await db.execute('DELETE FROM invoices WHERE id = ?', [id]);
      })
    );
  }

  /**
   * Genera prossimo numero fattura
   */
  getNextInvoiceNumber(): Observable<string> {
    return from(
      this.base['ensureInitialized']().then(async (db) => {
        return this.generateInvoiceNumber(db);
      })
    );
  }

  /**
   * Genera numero fattura (helper privato)
   */
  private async generateInvoiceNumber(db: any): Promise<string> {
    const year = new Date().getFullYear();
    const result = await db.select(
      `SELECT COUNT(*) as count FROM invoices
       WHERE invoice_number LIKE ?`,
      [`INV-${year}-%`]
    );
    const count: number = result[0]?.count || 0;
    const number = String(count + 1).padStart(4, '0');
    return `INV-${year}-${number}`;
  }

  /**
   * Mapper: DB row -> Invoice model
   */
  private mapInvoiceFromDb = (row: any): Invoice => {
    return {
      id: row.id,
      patientId: row.patient_id,
      studioId: row.studio_id,
      invoiceNumber: row.invoice_number,
      invoiceDate: this.base['fromSqliteDate'](row.invoice_date),
      dueDate: row.due_date ? this.base['fromSqliteDate'](row.due_date) : undefined,
      amount: row.amount,
      vatRate: row.vat_rate,
      vatAmount: row.vat_amount,
      totalAmount: row.total_amount,
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status,
      paymentDate: row.payment_date ? this.base['fromSqliteDate'](row.payment_date) : undefined,
      notes: row.notes,
      items: row.items ? JSON.parse(row.items) : undefined,
      createdAt: this.base['fromSqliteDate'](row.created_at),
      updatedAt: this.base['fromSqliteDate'](row.updated_at)
    };
  };
}
