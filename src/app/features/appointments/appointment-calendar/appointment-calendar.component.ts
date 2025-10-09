import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { TranslateModule } from '@ngx-translate/core';
import { AppointmentsService } from '../appointments.service';
import { Appointment, AppointmentStatus } from '../../../shared/models';
import { AppointmentDialogComponent } from '../appointment-dialog/appointment-dialog.component'; // ✅ AGGIUNTO
interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  appointments: Appointment[];
}

@Component({
  selector: 'app-appointment-calendar',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatBadgeModule,
    TranslateModule
  ],
  templateUrl: './appointment-calendar.component.html',
  styleUrl: './appointment-calendar.component.css'
})
export class AppointmentCalendarComponent implements OnInit {
  protected loading = signal(false);
  protected currentDate = signal(new Date());
  protected calendarDays = signal<CalendarDay[]>([]);
  protected monthAppointments = signal<Appointment[]>([]);
  // Nomi giorni settimana
  protected readonly weekDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  // Nomi mesi
  protected readonly monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];
  private appointmentsService = inject(AppointmentsService);
  private dialog = inject(MatDialog);

  /**
   * Ottiene il nome del mese corrente
   */
  protected get currentMonthName(): string {
    const date = this.currentDate();
    return `${this.monthNames[date.getMonth()]} ${date.getFullYear()}`;
  }

  ngOnInit(): void {
    this.loadMonth();
  }

  /**
   * Mese precedente
   */
  protected previousMonth(): void {
    const current = this.currentDate();
    this.currentDate.set(new Date(current.getFullYear(), current.getMonth() - 1, 1));
    this.loadMonth();
  }

  /**
   * Mese successivo
   */
  protected nextMonth(): void {
    const current = this.currentDate();
    this.currentDate.set(new Date(current.getFullYear(), current.getMonth() + 1, 1));
    this.loadMonth();
  }

  /**
   * Vai a oggi
   */
  protected goToToday(): void {
    this.currentDate.set(new Date());
    this.loadMonth();
  }

  /**
   * Click su giorno del calendario
   */
  protected onDayClick(day: CalendarDay): void {
    if (!day.isCurrentMonth) return;

    // Apri dialog per creare appuntamento con data pre-selezionata
    this.openAppointmentDialog(day.date);
  }

  /**
   * Click su appuntamento
   */
  protected onAppointmentClick(event: Event, appointment: Appointment): void {
    event.stopPropagation();
    // Apri dialog in modalità edit
    this.openAppointmentDialog(undefined, appointment);
  }

  /**
   * Nuovo appuntamento
   */
  protected createAppointment(): void {
    this.openAppointmentDialog();
  }

  /**
   * Ottiene colore per stato
   */
  protected getStatusColor(status: AppointmentStatus): string {
    return this.appointmentsService.getStatusColor(status);
  }

  /**
   * Formatta ora appuntamento
   */
  protected formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Apri dialog appuntamento
   */
  private openAppointmentDialog(selectedDate?: Date, appointment?: Appointment): void {
    const dialogRef = this.dialog.open(AppointmentDialogComponent, {
      width: '600px',
      data: {
        selectedDate,
        appointment
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Ricarica appuntamenti se salvato
        this.loadMonth();
      }
    });
  }

  /**
   * Carica appuntamenti del mese
   */
  private loadMonth(): void {
    this.loading.set(true);

    const current = this.currentDate();
    const startOfMonth = new Date(current.getFullYear(), current.getMonth(), 1);
    const endOfMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59);

    this.appointmentsService.getAppointments({
      startDate: startOfMonth,
      endDate: endOfMonth
    }).subscribe({
      next: (appointments) => {
        this.monthAppointments.set(appointments);
        this.generateCalendar();
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading appointments:', error);
        this.loading.set(false);
      }
    });
  }

  /**
   * Genera griglia calendario
   */
  private generateCalendar(): void {
    const current = this.currentDate();
    const year = current.getFullYear();
    const month = current.getMonth();

    // Primo giorno del mese
    const firstDay = new Date(year, month, 1);
    // Ultimo giorno del mese
    const lastDay = new Date(year, month + 1, 0);

    // Giorni settimana (0 = Domenica, 1 = Lunedì, etc.)
    // Aggiustiamo per iniziare da Lunedì
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Giorni del mese precedente
    const prevMonthLastDay = new Date(year, month, 0);
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay.getDate() - i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        appointments: this.getAppointmentsForDate(date)
      });
    }

    // Giorni del mese corrente
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);

      days.push({
        date,
        isCurrentMonth: true,
        isToday: dateOnly.getTime() === today.getTime(),
        appointments: this.getAppointmentsForDate(date)
      });
    }

    // Giorni del mese successivo per completare la griglia
    const remainingDays = 42 - days.length; // 6 righe x 7 giorni
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        appointments: this.getAppointmentsForDate(date)
      });
    }

    this.calendarDays.set(days);
  }

  /**
   * Ottiene appuntamenti per una data specifica
   */
  private getAppointmentsForDate(date: Date): Appointment[] {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    return this.monthAppointments().filter(app => {
      const appDate = new Date(app.appointmentDate);
      appDate.setHours(0, 0, 0, 0);
      return appDate.getTime() === targetDate.getTime();
    });
  }
}
