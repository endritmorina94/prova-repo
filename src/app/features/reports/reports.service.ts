import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { DatabaseService } from '../../core/database/database.service';
import { CreateReportDto, Report, UpdateReportDto } from '../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  // Signal per referto corrente
  currentReport = signal<Report | null>(null);
  private db = inject(DatabaseService);
  // Signal per cache referti
  private reportsCache = signal<Report[]>([]);

  /**
   * Carica tutti i referti
   */
  loadReports(): Observable<Report[]> {
    // Per ora restituisce array vuoto, implementeremo dopo
    return new Observable(observer => {
      observer.next([]);
      observer.complete();
    });
  }

  /**
   * Carica referti per paziente
   */
  getReportsByPatient(patientId: string): Observable<Report[]> {
    return this.db.getReportsByPatient(patientId);
  }

  /**
   * Ottiene un referto per ID
   */
  getReportById(id: string): Observable<Report | null> {
    return this.db.getReportById(id).pipe(
      tap(report => this.currentReport.set(report))
    );
  }

  /**
   * Crea un nuovo referto
   */
  createReport(data: CreateReportDto): Observable<Report> {
    return this.db.createReport(data).pipe(
      tap(report => {
        this.reportsCache.update(reports => [...reports, report]);
      })
    );
  }

  /**
   * Aggiorna un referto
   */
  updateReport(id: string, data: UpdateReportDto): Observable<Report> {
    return this.db.updateReport(id, data).pipe(
      tap(updatedReport => {
        this.reportsCache.update(reports =>
          reports.map(r => r.id === id ? updatedReport : r)
        );
        if (this.currentReport()?.id === id) {
          this.currentReport.set(updatedReport);
        }
      })
    );
  }

  /**
   * Elimina un referto
   */
  deleteReport(id: string): Observable<void> {
    return this.db.deleteReport(id).pipe(
      tap(() => {
        this.reportsCache.update(reports =>
          reports.filter(r => r.id !== id)
        );
        if (this.currentReport()?.id === id) {
          this.currentReport.set(null);
        }
      })
    );
  }

  /**
   * Genera il prossimo numero referto
   */
  getNextReportNumber(): Observable<string> {
    return this.db.getNextReportNumber();
  }
}
