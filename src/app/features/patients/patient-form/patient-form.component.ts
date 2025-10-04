import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslateModule } from '@ngx-translate/core';
import { PatientsService } from '../patients.service';
import { CreatePatientDto, UpdatePatientDto } from '../../../shared/models';

@Component({
  selector: 'app-patient-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    TranslateModule
  ],
  templateUrl: './patient-form.component.html',
  styleUrl: './patient-form.component.css'
})
export class PatientFormComponent implements OnInit {
  // Signals
  protected loading = signal(false);
  protected saving = signal(false);
  protected isEditMode = signal(false);
  protected patientId = signal<string | null>(null);
  // Form
  protected patientForm!: FormGroup;
  // Opzioni select
  protected bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  protected contraceptionMethods = [
    'Nessuno',
    'Pillola anticoncezionale',
    'Spirale (IUD)',
    'Preservativo',
    'Metodo naturale',
    'Altro'
  ];
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private patientsService = inject(PatientsService);

  ngOnInit(): void {
    this.initForm();
    this.checkEditMode();
  }

  /**
   * Salva il paziente (create o update)
   */
  protected onSubmit(): void {
    if (this.patientForm.invalid) {
      this.patientForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const formValue = this.patientForm.value;
    if (this.isEditMode()) {
      this.updatePatient(formValue);
    } else {
      this.createPatient(formValue);
    }
  }

  /**
   * Annulla e torna indietro
   */
  protected onCancel(): void {
    if (this.isEditMode()) {
      this.router.navigate(['/patients', this.patientId()]);
    } else {
      this.router.navigate(['/patients']);
    }
  }

  /**
   * Helper per mostrare errori nei campi
   */
  protected getErrorMessage(fieldName: string): string {
    const field = this.patientForm.get(fieldName);
    if (field?.hasError('required')) {
      return 'Campo obbligatorio';
    }
    if (field?.hasError('email')) {
      return 'Email non valida';
    }
    return '';
  }

  /**
   * Inizializza il form
   */
  private initForm(): void {
    this.patientForm = this.fb.group({
      // Dati Anagrafici
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      birthDate: ['', Validators.required],
      birthPlace: [''],
      fiscalCode: [''],
      // Contatti
      phone: [''],
      mobile: [''],
      email: ['', Validators.email],
      address: [''],
      city: [''],
      postalCode: [''],
      province: [''],
      country: ['Italia'],
      // Dati Medici
      bloodType: [''],
      allergies: [''],
      currentMedications: [''],
      medicalNotes: [''],
      familyMedicalHistory: [''],
      // Dati Ginecologici
      firstMenstruationAge: [null],
      menstrualCycleDays: [null],
      lastMenstruationDate: [''],
      contraceptionMethod: [''],
      papTestLastDate: [''],
      mammographyLastDate: [''],
      // Consensi
      privacyConsent: [false, Validators.requiredTrue],
      marketingConsent: [false]
    });
  }

  /**
   * Verifica se siamo in modalità edit
   */
  private checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.patientId.set(id);
      this.loadPatient(id);
    }
  }

  /**
   * Carica i dati del paziente in edit mode
   */
  private loadPatient(id: string): void {
    this.loading.set(true);
    this.patientsService.getPatientById(id).subscribe({
      next: (patient) => {
        if (patient) {
          this.patientForm.patchValue({
            ...patient,
            birthDate: new Date(patient.birthDate),
            lastMenstruationDate: patient.lastMenstruationDate ? new Date(patient.lastMenstruationDate) : null,
            papTestLastDate: patient.papTestLastDate ? new Date(patient.papTestLastDate) : null,
            mammographyLastDate: patient.mammographyLastDate ? new Date(patient.mammographyLastDate) : null
          });
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading patient:', error);
        this.loading.set(false);
        this.router.navigate(['/patients']);
      }
    });
  }

  /**
   * Crea nuovo paziente
   */
  private createPatient(data: CreatePatientDto): void {
    this.patientsService.createPatient(data).subscribe({
      next: (patient) => {
        this.saving.set(false);
        this.router.navigate(['/patients', patient.id]);
      },
      error: (error) => {
        console.error('Error creating patient:', error);
        this.saving.set(false);
      }
    });
  }

  /**
   * Aggiorna paziente esistente
   */
  private updatePatient(data: UpdatePatientDto): void {
    const id = this.patientId();
    if (!id) return;
    this.patientsService.updatePatient(id, data).subscribe({
      next: (patient) => {
        this.saving.set(false);
        this.router.navigate(['/patients', patient.id]);
      },
      error: (error) => {
        console.error('Error updating patient:', error);
        this.saving.set(false);
      }
    });
  }
}
