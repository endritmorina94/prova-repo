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
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ReportsService } from '../reports.service';
import { PatientsService } from '../../patients/patients.service';
import { PdfGeneratorService } from '../../../core/pdf/pdf-generator.service';
import { CreateReportDto, Patient, PatientSnapshot, UpdateReportDto } from '../../../shared/models';

@Component({
  selector: 'app-report-form',
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
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatSnackBarModule,
    TranslateModule
  ],
  templateUrl: './report-form.component.html',
  styleUrl: './report-form.component.css'
})
export class ReportFormComponent implements OnInit {
  // Signals
  protected loading = signal(false);
  protected saving = signal(false);
  protected patient = signal<Patient | null>(null);
  protected reportNumber = signal<string>('');
  protected isEditMode = signal(false);
  protected reportId = signal<string | null>(null);
  // Form
  protected reportForm!: FormGroup;
  // Opzioni visit type
  protected visitTypes = [
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
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private reportsService = inject(ReportsService);
  private patientsService = inject(PatientsService);
  private pdfGenerator = inject(PdfGeneratorService);
  private snackBar = inject(MatSnackBar);
  private translateService = inject(TranslateService);

  ngOnInit(): void {
    this.initForm();
    this.checkEditMode();
  }

  protected onSubmit(): void {
    if (this.reportForm.invalid || !this.patient()) {
      this.reportForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);

    if (this.isEditMode()) {
      this.updateReport();
    } else {
      this.createReport();
    }
  }

  protected onCancel(): void {
    if (this.patient()) {
      this.router.navigate(['/patients', this.patient()!.id]);
    } else {
      this.router.navigate(['/patients']);
    }
  }

  protected async previewPDF(): Promise<void> {
    if (this.reportForm.invalid || !this.patient()) {
      this.reportForm.markAllAsTouched();
      this.snackBar.open('Compila tutti i campi obbligatori', 'Chiudi', { duration: 3000 });
      return;
    }

    const formValue = this.reportForm.value;
    const tempReport: any = {
      id: this.reportId() || 'temp',
      patientId: this.patient()!.id,
      studioId: 'default',
      reportNumber: this.reportNumber(),
      reportDate: formValue.reportDate,
      visitType: formValue.visitType,
      patientSnapshot: this.createPatientSnapshot(),
      examination: formValue.examination,
      ultrasoundResult: formValue.ultrasoundResult,
      therapy: formValue.therapy,
      internalNotes: formValue.internalNotes,
      doctorName: 'Dr.ssa',
      doctorTitle: 'Specialista in Ginecologia e Ostetricia',
      signed: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.pdfGenerator.previewReportPDF(tempReport, this.patient()!);
  }

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

  protected formatDate(date: Date | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('it-IT');
  }

  private initForm(): void {
    this.reportForm = this.fb.group({
      reportDate: [new Date(), Validators.required],
      visitType: ['', Validators.required],
      examination: ['', Validators.required],
      ultrasoundResult: [''],
      therapy: [''],
      internalNotes: ['']
    });
  }

  private checkEditMode(): void {
    const reportId = this.route.snapshot.paramMap.get('id');

    if (reportId) {
      // Modalità edit
      this.isEditMode.set(true);
      this.reportId.set(reportId);
      this.loadReport(reportId);
    } else {
      // Modalità creazione
      this.loadPatientFromRoute();
      this.generateReportNumber();
    }
  }

  private loadReport(id: string): void {
    this.loading.set(true);

    this.reportsService.getReportById(id).subscribe({
      next: (report) => {
        if (report) {
          this.reportNumber.set(report.reportNumber);

          // Carica il paziente
          this.patientsService.getPatientById(report.patientId).subscribe({
            next: (patient) => {
              this.patient.set(patient);

              // Popola il form
              this.reportForm.patchValue({
                reportDate: new Date(report.reportDate),
                visitType: report.visitType,
                examination: report.examination,
                ultrasoundResult: report.ultrasoundResult,
                therapy: report.therapy,
                internalNotes: report.internalNotes
              });

              this.loading.set(false);
            },
            error: (error) => {
              console.error('Error loading patient:', error);
              this.loading.set(false);
              this.router.navigate(['/reports']);
            }
          });
        } else {
          this.router.navigate(['/reports']);
        }
      },
      error: (error) => {
        console.error('Error loading report:', error);
        this.loading.set(false);
        this.router.navigate(['/reports']);
      }
    });
  }

  private loadPatientFromRoute(): void {
    const patientId = this.route.snapshot.queryParamMap.get('patientId');

    if (patientId) {
      this.loading.set(true);
      this.patientsService.getPatientById(patientId).subscribe({
        next: (patient) => {
          this.patient.set(patient);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading patient:', error);
          this.loading.set(false);
          const errorMessage = this.translateService.instant('report.messages.error_load');
          this.snackBar.open(errorMessage, this.translateService.instant('common.close'), { duration: 3000 });
          this.router.navigate(['/patients']);
        }
      });
    } else {
      this.router.navigate(['/patients']);
    }
  }

  private generateReportNumber(): void {
    this.reportsService.getNextReportNumber().subscribe({
      next: (number) => {
        this.reportNumber.set(number);
      }
    });
  }

  private createPatientSnapshot(): PatientSnapshot {
    const p = this.patient()!;

    return {
      firstName: p.firstName,
      lastName: p.lastName,
      birthDate: p.birthDate,
      fiscalCode: p.fiscalCode,
      address: p.address,
      phone: p.mobile || p.phone,
      bloodType: p.bloodType,
      allergies: p.allergies,
      currentMedications: p.currentMedications,
      lastMenstruationDate: p.lastMenstruationDate,
      deliveries: []
    };
  }

  private createReport(): void {
    const formValue = this.reportForm.value;
    const patient = this.patient()!;

    const reportData: CreateReportDto = {
      patientId: patient.id,
      studioId: 'default',
      reportDate: formValue.reportDate,
      visitType: formValue.visitType,
      patientSnapshot: this.createPatientSnapshot(),
      examination: formValue.examination,
      ultrasoundResult: formValue.ultrasoundResult,
      therapy: formValue.therapy,
      internalNotes: formValue.internalNotes,
      doctorName: 'Dr.ssa',
      doctorTitle: 'Specialista in Ginecologia e Ostetricia'
    };

    this.reportsService.createReport(reportData).subscribe({
      next: (report) => {
        this.saving.set(false);
        const successMessage = this.translateService.instant('report.messages.created');
        this.snackBar.open(successMessage, this.translateService.instant('common.close'), { duration: 3000 });
        this.router.navigate(['/patients', patient.id]);
      },
      error: (error) => {
        console.error('Error creating report:', error);
        this.saving.set(false);
        const errorMessage = this.translateService.instant('report.messages.error_save');
        this.snackBar.open(errorMessage, this.translateService.instant('common.close'), { duration: 3000 });
      }
    });
  }

  private updateReport(): void {
    const formValue = this.reportForm.value;
    const id = this.reportId()!;

    const updateData: UpdateReportDto = {
      reportDate: formValue.reportDate,
      visitType: formValue.visitType,
      patientSnapshot: this.createPatientSnapshot(),
      examination: formValue.examination,
      ultrasoundResult: formValue.ultrasoundResult,
      therapy: formValue.therapy,
      internalNotes: formValue.internalNotes
    };

    this.reportsService.updateReport(id, updateData).subscribe({
      next: () => {
        this.saving.set(false);
        const successMessage = this.translateService.instant('report.messages.updated');
        this.snackBar.open(successMessage, this.translateService.instant('common.close'), { duration: 3000 });
        this.router.navigate(['/patients', this.patient()!.id]);
      },
      error: (error) => {
        console.error('Error updating report:', error);
        this.saving.set(false);
        const errorMessage = this.translateService.instant('report.messages.error_save');
        this.snackBar.open(errorMessage, this.translateService.instant('common.close'), { duration: 3000 });
      }
    });
  }
}
