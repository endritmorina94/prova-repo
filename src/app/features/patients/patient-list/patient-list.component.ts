import { AfterViewInit, ChangeDetectorRef, Component, inject, OnInit, signal, viewChild, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { PatientsService } from '../patients.service';
import { Patient } from '../../../shared/models';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
  selector: 'app-patient-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatProgressSpinnerModule,
    TranslateModule,
    MatPaginator,
    MatTooltip
  ],
  templateUrl: './patient-list.component.html',
  styleUrl: './patient-list.component.css'
})
export class PatientListComponent implements OnInit, AfterViewInit {
  paginator = viewChild(MatPaginator);
  @ViewChild(MatSort) sort!: MatSort;
  // Signals
  protected patients = signal<Patient[]>([]);
  protected loading = signal(false);
  protected dataSource = new MatTableDataSource<Patient>([]);
  protected searchQuery = signal('');
  // Colonne tabella
  protected displayedColumns = ['name', 'birthDate', 'fiscalCode', 'phone', 'actions'];
  private patientsService = inject(PatientsService);
  private cdr = inject(ChangeDetectorRef);


  ngOnInit(): void {
    this.loadPatients();
  }

  ngAfterViewInit(): void {
    // Assicurati che il paginator sia collegato DOPO che la vista è inizializzata
    setTimeout(() => {
      this.dataSource.paginator = this.paginator();
      this.cdr.detectChanges();

    });
    console.log(this.paginator());
    console.log(this.dataSource);

    // Configura il filtro personalizzato
    this.dataSource.filterPredicate = (data: Patient, filter: string) => {
      const searchStr = filter.toLowerCase();
      return !!(
        data.firstName.toLowerCase().includes(searchStr) ||
        data.lastName.toLowerCase().includes(searchStr) ||
        (data.fiscalCode && data.fiscalCode.toLowerCase().includes(searchStr))
      );
    };
  }

  /**
   * Carica tutti i pazienti
   */
  protected loadPatients(): void {
    this.loading.set(true);
    this.patientsService.loadPatients().subscribe({
      next: (patients) => {
        this.dataSource.data = patients;
        // Assicurati che il paginator sia aggiornato
        if (this.paginator()) {
          this.paginator()!.length = patients.length;
        }
        this.loading.set(false);
        setTimeout(() => {
          if (this.paginator()) {
            this.dataSource.paginator = this.paginator();
          } else {
            console.error('Paginator ancora undefined!');
          }
        }, 0);
      },
      error: (error) => {
        console.error('Error loading patients:', error);
        this.loading.set(false);
      }
    });
  }

  /**
   * Cerca pazienti
   */
  protected onSearch(query: string): void {
    this.searchQuery.set(query);

    if (!query || query.trim().length < 2) {
      this.loadPatients();
      return;
    }

    this.loading.set(true);
    this.patientsService.searchPatients(query.trim()).subscribe({
      next: (patients) => {
        this.patients.set(patients);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error searching patients:', error);
        this.loading.set(false);
      }
    });
  }

  protected applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  /**
   * Calcola l'età del paziente
   */
  protected calculateAge(birthDate: Date): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Formatta data in formato locale
   */
  protected formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('it-IT');
  }
}
