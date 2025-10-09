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
import { TranslateModule } from '@ngx-translate/core';
import { BabyGender, Delivery, DeliveryType } from '../../../shared/models';

export interface DeliveryDialogData {
  delivery?: Delivery;
  patientId: string;
}

@Component({
  selector: 'app-delivery-dialog',
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
    TranslateModule
  ],
  templateUrl: './delivery-dialog.component.html',
  styleUrl: './delivery-dialog.component.css',
  providers: [provideNativeDateAdapter()],
})
export class DeliveryDialogComponent implements OnInit {
  protected data = inject<DeliveryDialogData>(MAT_DIALOG_DATA);
  protected deliveryForm!: FormGroup;
  protected isEditMode = signal(false);
  // Opzioni select
  protected deliveryTypes: { value: DeliveryType; labelKey: string }[] = [
    { value: 'natural', labelKey: 'patient.deliveries.types.natural' },
    { value: 'cesarean', labelKey: 'patient.deliveries.types.cesarean' },
    { value: 'assisted', labelKey: 'patient.deliveries.types.assisted' }
  ];
  protected genderOptions: { value: BabyGender; labelKey: string }[] = [
    { value: 'male', labelKey: 'patient.deliveries.gender.male' },
    { value: 'female', labelKey: 'patient.deliveries.gender.female' }
  ];
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<DeliveryDialogComponent>);

  ngOnInit(): void {
    this.isEditMode.set(!!this.data.delivery);
    this.initForm();
  }

  /**
   * Salva il parto
   */
  protected onSubmit(): void {
    if (this.deliveryForm.invalid) {
      this.deliveryForm.markAllAsTouched();
      return;
    }
    const formValue = this.deliveryForm.value;
    const deliveryData = {
      ...formValue,
      patientId: this.data.patientId,
      id: this.data.delivery?.id
    };
    this.dialogRef.close(deliveryData);
  }

  /**
   * Chiudi dialog
   */
  protected onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Helper per mostrare errori
   */
  protected getErrorMessage(fieldName: string): string {
    const field = this.deliveryForm.get(fieldName);
    if (field?.hasError('required')) {
      return 'Campo obbligatorio';
    }
    if (field?.hasError('min')) {
      return `Valore minimo: ${field.errors?.['min'].min}`;
    }
    if (field?.hasError('max')) {
      return `Valore massimo: ${field.errors?.['max'].max}`;
    }
    return '';
  }

  /**
   * Inizializza il form
   */
  private initForm(): void {
    this.deliveryForm = this.fb.group({
      deliveryDate: ['', Validators.required],
      deliveryType: ['', Validators.required],
      pregnancyWeeks: [null, [Validators.min(20), Validators.max(45)]],
      babyWeight: [null, [Validators.min(500), Validators.max(6000)]],
      babyGender: [''],
      complications: [''],
      notes: ['']
    });
    // Se in edit mode, popola il form
    if (this.data.delivery) {
      this.deliveryForm.patchValue({
        ...this.data.delivery,
        deliveryDate: new Date(this.data.delivery.deliveryDate)
      });
    }
  }
}
