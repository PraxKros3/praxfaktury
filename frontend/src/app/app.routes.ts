import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () => import('./shared/components/layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'invoices',
        loadComponent: () => import('./features/invoices/invoices.component').then(m => m.InvoicesComponent),
      },
      {
        path: 'clients',
        loadComponent: () => import('./features/clients/clients.component').then(m => m.ClientsComponent),
      },
      {
        path: 'projects',
        loadComponent: () => import('./features/projects/projects.component').then(m => m.ProjectsComponent),
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent),
      },
      {
        path: 'manual-entries',
        loadComponent: () => import('./features/manual-entries/manual-entries.component').then(m => m.ManualEntriesComponent),
      },
    ],
  },
  {
    path: 'invoices/:id/print',
    loadComponent: () => import('./features/invoices/invoice-print/invoice-print.component').then(m => m.InvoicePrintComponent),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: 'dashboard' },
];
