import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DatabaseService } from '../../core/database/database.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslateModule
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
  protected loading = signal(false);
  protected saving = signal(false);
  protected settingsForm!: FormGroup;
  private fb = inject(FormBuilder);
  private db = inject(DatabaseService);
  private snackBar = inject(MatSnackBar);
  private translateService = inject(TranslateService);

  ngOnInit(): void {
    this.initForm();
    this.loadSettings();
  }

  protected onSubmit(): void {
    if (this.settingsForm.invalid) {
      this.settingsForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    console.log(this.settingsForm.value);
    this.db.updateStudioSettings(this.settingsForm.value).subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open('Impostazioni salvate con successo', 'Chiudi', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error saving settings:', error);
        this.saving.set(false);
        this.snackBar.open('Errore durante il salvataggio', 'Chiudi', { duration: 3000 });
      }
    });
  }

  private initForm(): void {
    this.settingsForm = this.fb.group({
      name: ['', Validators.required],
      vatNumber: [''],
      address: [''],
      city: ['Suhareke'],
      postalCode: [''],
      province: [''],
      phone: [''],
      email: ['', Validators.email],
      doctorName: [''],
      doctorTitle: ['']
    });
  }

  private loadSettings(): void {
    this.loading.set(true);
    this.db.getStudioSettings().subscribe({
      next: (studio) => {
        this.settingsForm.patchValue(studio);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading settings:', error);
        this.loading.set(false);
      }
    });
  }
}
