import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

export interface DialogField {
  label: string;
  value: string;
  textarea?: boolean;
  highlight?: boolean;
}

export interface DialogAction {
  label: string;
  icon: string;
  color: 'primary' | 'accent' | 'warn';
  action: () => void;
}

export interface TimelineEventDialogData {
  type: string;
  title: string;
  icon: string;
  color: string;
  date: Date;
  fields: DialogField[];
  actions: DialogAction[];
}

@Component({
  selector: 'app-timeline-event-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule
  ],
  templateUrl: './timeline-event-dialog.component.html',
  styleUrl: './timeline-event-dialog.component.css'
})
export class TimelineEventDialogComponent {
  protected data = inject<TimelineEventDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<TimelineEventDialogComponent>);

  protected onActionClick(action: DialogAction): void {
    action.action();
  }

  protected onClose(): void {
    this.dialogRef.close();
  }
}
