import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'patients',
    loadChildren: () =>
      import('./features/patients/patients.routes').then(m => m.PATIENTS_ROUTES)
  },
  {
    path: 'reports',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/reports/report-list/report-list.component').then(m => m.ReportListComponent)
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./features/reports/report-form/report-form.component').then(m => m.ReportFormComponent)
      },
      {
        path: ':id/edit',
        loadComponent: () =>
          import('./features/reports/report-form/report-form.component').then(m => m.ReportFormComponent)
      }
    ]
  },
  {
    path: 'invoices',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/invoices/invoice-list/invoice-list.component').then(m => m.InvoiceListComponent)
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./features/invoices/invoice-form/invoice-form.component').then(m => m.InvoiceFormComponent)
      },
      {
        path: ':id/edit',
        loadComponent: () =>
          import('./features/invoices/invoice-form/invoice-form.component').then(m => m.InvoiceFormComponent)
      },
    ]
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings.component').then(m => m.SettingsComponent)
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
