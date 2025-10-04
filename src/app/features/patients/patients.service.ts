import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { DatabaseService } from '../../core/database/database.service';
import {
  Patient,
  CreatePatientDto,
  UpdatePatientDto,
  Delivery,
  CreateDeliveryDto,
  UpdateDeliveryDto
} from '../../shared/models';

/**
 * Service per gestione pazienti
 */
@Injectable({
  providedIn: 'root'
})
export class PatientsService {
  private db = inject(DatabaseService);

  // Signal per lista pazienti (cache locale)
  private patientsCache = signal<Patient[]>([]);

  // Signal per paziente corrente
  currentPatient = signal<Patient | null>(null);

  /**
   * Cerca pazienti
   */
  searchPatients(query: string): Observable<Patient[]> {
    return this.db.searchPatients(query).pipe(
      tap(patients => this.patientsCache.set(patients))
    );
  }

  /**
   * Carica tutti i pazienti
   */
  loadPatients(): Observable<Patient[]> {
    return this.db.getPatients().pipe(
      tap(patients => this.patientsCache.set(patients))
    );
  }

  /**
   * Ottiene un paziente per ID
   */
  getPatientById(id: string): Observable<Patient | null> {
    return this.db.getPatientById(id).pipe(
      tap(patient => this.currentPatient.set(patient))
    );
  }

  /**
   * Crea un nuovo paziente
   */
  createPatient(data: CreatePatientDto): Observable<Patient> {
    return this.db.createPatient(data).pipe(
      tap(patient => {
        // Aggiungi alla cache
        this.patientsCache.update(patients => [...patients, patient]);
      })
    );
  }

  /**
   * Aggiorna un paziente
   */
  updatePatient(id: string, data: UpdatePatientDto): Observable<Patient> {
    return this.db.updatePatient(id, data).pipe(
      tap(updatedPatient => {
        // Aggiorna nella cache
        this.patientsCache.update(patients =>
          patients.map(p => p.id === id ? updatedPatient : p)
        );

        // Aggiorna paziente corrente se è lo stesso
        if (this.currentPatient()?.id === id) {
          this.currentPatient.set(updatedPatient);
        }
      })
    );
  }

  /**
   * Elimina un paziente
   */
  deletePatient(id: string): Observable<void> {
    return this.db.deletePatient(id).pipe(
      tap(() => {
        // Rimuovi dalla cache
        this.patientsCache.update(patients =>
          patients.filter(p => p.id !== id)
        );

        // Rimuovi paziente corrente se è lo stesso
        if (this.currentPatient()?.id === id) {
          this.currentPatient.set(null);
        }
      })
    );
  }

  /**
   * Ottiene i parti di un paziente
   */
  getDeliveriesByPatient(patientId: string): Observable<Delivery[]> {
    return this.db.getDeliveriesByPatient(patientId);
  }

  /**
   * Crea un nuovo parto
   */
  createDelivery(data: CreateDeliveryDto): Observable<Delivery> {
    return this.db.createDelivery(data);
  }

  /**
   * Aggiorna un parto
   */
  updateDelivery(id: string, data: UpdateDeliveryDto): Observable<Delivery> {
    return this.db.updateDelivery(id, data);
  }

  /**
   * Elimina un parto
   */
  deleteDelivery(id: string): Observable<void> {
    return this.db.deleteDelivery(id);
  }

  /**
   * Ottiene la cache dei pazienti
   */
  getPatientsCache(): Patient[] {
    return this.patientsCache();
  }
}
