import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { InvoicesService } from '../invoices.service';
import { PatientsService } from '../../patients/patients.service';
import { CreateInvoiceDto, Invoice, InvoiceItem, Patient } from '../../../shared/models';
import { PdfGeneratorService } from '../../../core/pdf/pdf-generator.service';

@Component({
  selector: 'app-invoice-form',
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
  templateUrl: './invoice-form.component.html',
  styleUrl: './invoice-form.component.css'
})
export class InvoiceFormComponent implements OnInit {
  // Signals
  protected loading = signal(false);
  protected saving = signal(false);
  protected patient = signal<Patient | null>(null);
  protected invoiceNumber = signal<string>('');
  protected calculatedVatAmount = signal<number>(0);
  protected calculatedTotal = signal<number>(0);
  // Form
  protected invoiceForm!: FormGroup;
  // Opzioni
  protected paymentMethods = ['cash', 'card', 'bank_transfer', 'check'];
  protected paymentStatuses = ['pending', 'paid', 'cancelled'];
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private invoicesService = inject(InvoicesService);
  private patientsService = inject(PatientsService);
  private snackBar = inject(MatSnackBar);
  private translateService = inject(TranslateService);
  private pdfGenerator = inject(PdfGeneratorService);

  /**
   * Ottiene il FormArray degli items
   */
  protected get items(): FormArray {
    return this.invoiceForm.get('items') as FormArray;
  }

  ngOnInit(): void {
    this.initForm();
    this.loadPatientFromRoute();
    this.generateInvoiceNumber();
    this.setupCalculations();
  }

  /**
   * Anteprima PDF fattura
   */
  protected previewPDF(): void {
    if (this.invoiceForm.invalid || !this.patient()) {
      this.invoiceForm.markAllAsTouched();
      this.snackBar.open('Compila tutti i campi obbligatori', 'Chiudi', { duration: 3000 });
      return;
    }

    // Crea fattura temporanea per anteprima
    const formValue = this.invoiceForm.value;

    const invoiceItems: InvoiceItem[] = this.items.controls.map((item) => {
      const quantity = item.get('quantity')?.value;
      const unitPrice = item.get('unitPrice')?.value;
      return {
        description: item.get('description')?.value,
        quantity,
        unitPrice,
        total: quantity * unitPrice
      };
    });

    const tempInvoice: Invoice = {
      id: 'temp',
      patientId: this.patient()!.id,
      studioId: 'default',
      invoiceNumber: this.invoiceNumber(),
      invoiceDate: formValue.invoiceDate,
      dueDate: formValue.dueDate,
      amount: formValue.amount,
      vatRate: formValue.vatRate,
      vatAmount: this.calculatedVatAmount(),
      totalAmount: this.calculatedTotal(),
      paymentMethod: formValue.paymentMethod,
      paymentStatus: formValue.paymentStatus,
      paymentDate: formValue.paymentDate,
      notes: formValue.notes,
      items: invoiceItems,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.pdfGenerator.previewInvoicePDF(tempInvoice, this.patient()!);
  }

  /**
   * Aggiungi voce fattura
   */
  protected addItem(): void {
    this.items.push(this.createItemFormGroup());
  }

  /**
   * Rimuovi voce fattura
   */
  protected removeItem(index: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(index);
      this.recalculateAmount();
    }
  }

  /**
   * Calcola totale item
   */
  protected getItemTotal(index: number): number {
    const item = this.items.at(index);
    const quantity = item.get('quantity')?.value || 0;
    const unitPrice = item.get('unitPrice')?.value || 0;
    return quantity * unitPrice;
  }

  /**
   * Ricalcola importo totale dalle voci
   */
  protected recalculateAmount(): void {
    let total = 0;
    this.items.controls.forEach((_, index) => {
      total += this.getItemTotal(index);
    });
    this.invoiceForm.patchValue({ amount: total }, { emitEvent: true });
  }

  /**
   * Salva la fattura
   */
  protected onSubmit(): void {
    if (this.invoiceForm.invalid || !this.patient()) {
      this.invoiceForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const formValue = this.invoiceForm.value;
    const patient = this.patient()!;

    // Converti items in array di InvoiceItem
    const invoiceItems: InvoiceItem[] = this.items.controls.map((item) => {
      const quantity = item.get('quantity')?.value;
      const unitPrice = item.get('unitPrice')?.value;
      return {
        description: item.get('description')?.value,
        quantity,
        unitPrice,
        total: quantity * unitPrice
      };
    });

    const invoiceData: CreateInvoiceDto = {
      patientId: patient.id,
      studioId: 'default',
      invoiceDate: formValue.invoiceDate,
      dueDate: formValue.dueDate,
      amount: formValue.amount,
      vatRate: formValue.vatRate,
      vatAmount: this.calculatedVatAmount(),
      totalAmount: this.calculatedTotal(),
      paymentMethod: formValue.paymentMethod,
      paymentStatus: formValue.paymentStatus,
      paymentDate: formValue.paymentDate,
      notes: formValue.notes,
      items: invoiceItems
    };

    this.invoicesService.createInvoice(invoiceData).subscribe({
      next: (invoice) => {
        this.saving.set(false);
        const successMessage = this.translateService.instant('invoice.messages.created');
        this.snackBar.open(successMessage, this.translateService.instant('common.close'), { duration: 3000 });
        this.router.navigate(['/patients', patient.id]);
      },
      error: (error) => {
        console.error('Error creating invoice:', error);
        this.saving.set(false);
        const errorMessage = this.translateService.instant('invoice.messages.error_save');
        this.snackBar.open(errorMessage, this.translateService.instant('common.close'), { duration: 3000 });
      }
    });
  }

  /**
   * Annulla
   */
  protected onCancel(): void {
    if (this.patient()) {
      this.router.navigate(['/patients', this.patient()!.id]);
    } else {
      this.router.navigate(['/patients']);
    }
  }

  /**
   * Inizializza il form
   */
  private initForm(): void {
    this.invoiceForm = this.fb.group({
      invoiceDate: [new Date(), Validators.required],
      dueDate: [''],
      amount: [0, [Validators.required, Validators.min(0)]],
      vatRate: [22, [Validators.required, Validators.min(0), Validators.max(100)]],
      paymentMethod: [''],
      paymentStatus: ['pending', Validators.required],
      paymentDate: [''],
      notes: [''],
      items: this.fb.array([])
    });

    // Aggiungi una voce di default
    this.addItem();
  }

  /**
   * Crea un nuovo item form group
   */
  private createItemFormGroup(): FormGroup {
    return this.fb.group({
      description: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]]
    });
  }

  /**
   * Setup calcoli automatici
   */
  private setupCalculations(): void {
    // Osserva cambiamenti in amount e vatRate
    this.invoiceForm.get('amount')?.valueChanges.subscribe(() => this.updateCalculations());
    this.invoiceForm.get('vatRate')?.valueChanges.subscribe(() => this.updateCalculations());
  }

  /**
   * Aggiorna calcoli IVA e totale
   */
  private updateCalculations(): void {
    const amount = this.invoiceForm.get('amount')?.value || 0;
    const vatRate = this.invoiceForm.get('vatRate')?.value || 0;

    const result = this.invoicesService.calculateTotal(amount, vatRate);
    this.calculatedVatAmount.set(result.vatAmount);
    this.calculatedTotal.set(result.total);
  }

  /**
   * Carica paziente dall'URL
   */
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
          const errorMessage = this.translateService.instant('invoice.messages.error_load');
          this.snackBar.open(errorMessage, this.translateService.instant('common.close'), { duration: 3000 });
          this.router.navigate(['/patients']);
        }
      });
    } else {
      this.router.navigate(['/patients']);
    }
  }

  /**
   * Genera numero fattura
   */
  private generateInvoiceNumber(): void {
    this.invoicesService.getNextInvoiceNumber().subscribe({
      next: (number) => {
        this.invoiceNumber.set(number);
      }
    });
  }
}
