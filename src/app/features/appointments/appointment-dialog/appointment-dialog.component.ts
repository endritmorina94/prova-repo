import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AppointmentsService } from '../appointments.service';
import { PatientsService } from '../../patients/patients.service';
import { Appointment, AppointmentStatus, Patient } from '../../../shared/models';
import { map, Observable, startWith } from 'rxjs';

export interface AppointmentDialogData {
  appointment?: Appointment;
  selectedDate?: Date;
}

@Component({
  selector: 'app-appointment-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatAutocompleteModule,
    TranslateModule
  ],
  templateUrl: './appointment-dialog.component.html',
  styleUrl: './appointment-dialog.component.css',
  providers: [provideNativeDateAdapter()],
})
export class AppointmentDialogComponent implements OnInit {
  protected appointmentForm!: FormGroup;
  protected saving = signal(false);
  protected isEditMode = signal(false);
  protected patients = signal<Patient[]>([]);
  protected filteredPatients!: Observable<Patient[]>;

  // Opzioni
  protected readonly durations = [15, 30, 45, 60, 90, 120];
  protected readonly statuses: AppointmentStatus[] = ['scheduled', 'completed', 'cancelled', 'no_show'];
  protected readonly visitTypes = [
    'checkup',
    'ultrasound',
    'pap_test',
    'mammography',
    'pregnancy',
    'postpartum',
    'consultation',
    'other'
  ];

  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<AppointmentDialogComponent>);
  private data = inject<AppointmentDialogData>(MAT_DIALOG_DATA);
  private appointmentsService = inject(AppointmentsService);
  private patientsService = inject(PatientsService);
  private snackBar = inject(MatSnackBar);
  private translateService = inject(TranslateService);

  ngOnInit(): void {
    this.initForm();
    this.loadPatients();

    if (this.data?.appointment) {
      this.isEditMode.set(true);
      this.loadAppointment(this.data.appointment);
    } else if (this.data?.selectedDate) {
      // Pre-imposta data se fornita
      this.appointmentForm.patchValue({
        appointmentDate: this.data.selectedDate
      });
    }
  }

  /**
   * Salva appuntamento
   */
  protected onSubmit(): void {
    if (this.appointmentForm.invalid) {
      this.appointmentForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const formValue = this.appointmentForm.value;

    // Combina data e ora
    const appointmentDate = this.combineDateTime(
      formValue.appointmentDate,
      formValue.appointmentTime
    );

    const appointmentData = {
      patientId: formValue.patientId,
      studioId: 'default-studio-id',
      appointmentDate,
      duration: formValue.duration,
      reason: formValue.reason,
      notes: formValue.notes,
      status: formValue.status
    };

    if (this.isEditMode()) {
      this.updateAppointment(appointmentData);
    } else {
      this.createAppointment(appointmentData);
    }
  }

  /**
   * Chiudi dialog
   */
  protected onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Display function per autocomplete paziente
   */
  protected displayPatient(patientId: string): string {
    const patient = this.patients().find(p => p.id === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : '';
  }

  /**
   * Ottiene label stato tradotta
   */
  protected getStatusLabel(status: AppointmentStatus): string {
    return this.translateService.instant(`appointment.statuses.${status}`);
  }

  /**
   * Ottiene label tipo visita tradotta
   */
  protected getVisitTypeLabel(type: string): string {
    return this.translateService.instant(`report.visit_types.${type}`);
  }

  /**
   * Inizializza form
   */
  private initForm(): void {
    const now = new Date();
    const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    this.appointmentForm = this.fb.group({
      patientId: ['', Validators.required],
      appointmentDate: [new Date(), Validators.required],
      appointmentTime: [defaultTime, Validators.required],
      duration: [30, Validators.required],
      reason: [''], // Tipo Visita
      notes: [''],
      status: ['scheduled' as AppointmentStatus, Validators.required]
    });

    // Setup autocomplete filtro
    this.filteredPatients = this.appointmentForm.get('patientId')!.valueChanges.pipe(
      startWith(''),
      map(value => this.filterPatients(value || ''))
    );
  }

  /**
   * Carica lista pazienti
   */
  private loadPatients(): void {
    this.patientsService.loadPatients().subscribe({
      next: (patients) => {
        this.patients.set(patients);
      },
      error: (error) => {
        console.error('Error loading patients:', error);
      }
    });
  }

  /**
   * Carica dati appuntamento in edit mode
   */
  private loadAppointment(appointment: Appointment): void {
    const date = new Date(appointment.appointmentDate);
    const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    this.appointmentForm.patchValue({
      patientId: appointment.patientId,
      appointmentDate: date,
      appointmentTime: time,
      duration: appointment.duration,
      reason: appointment.appointmentType,
      notes: appointment.notes,
      status: appointment.status
    });
  }

  /**
   * Filtra pazienti per autocomplete
   */
  private filterPatients(value: string): Patient[] {
    const filterValue = value.toLowerCase();
    return this.patients().filter(patient =>
      `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(filterValue)
    );
  }

  /**
   * Combina data e ora
   */
  private combineDateTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(hours, minutes, 0, 0);
    return combined;
  }

  /**
   * Crea nuovo appuntamento
   */
  private createAppointment(data: any): void {
    this.appointmentsService.createAppointment(data).subscribe({
      next: () => {
        this.saving.set(false);
        const message = this.translateService.instant('appointment.messages.created');
        this.snackBar.open(message, this.translateService.instant('common.close'), { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (error) => {
        console.error('Error creating appointment:', error);
        this.saving.set(false);
        const message = this.translateService.instant('appointment.messages.error_save');
        this.snackBar.open(message, this.translateService.instant('common.close'), { duration: 3000 });
      }
    });
  }

  /**
   * Aggiorna appuntamento esistente
   */
  private updateAppointment(data: any): void {
    const id = this.data.appointment!.id;
    this.appointmentsService.updateAppointment(id, data).subscribe({
      next: () => {
        this.saving.set(false);
        const message = this.translateService.instant('appointment.messages.updated');
        this.snackBar.open(message, this.translateService.instant('common.close'), { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (error) => {
        console.error('Error updating appointment:', error);
        this.saving.set(false);
        const message = this.translateService.instant('appointment.messages.error_save');
        this.snackBar.open(message, this.translateService.instant('common.close'), { duration: 3000 });
      }
    });
  }
}
