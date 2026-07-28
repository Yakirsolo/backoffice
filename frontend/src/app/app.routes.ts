import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell/shell.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { CustomersListComponent } from './features/customers/customers-list/customers-list.component';
import { CustomerProfileComponent } from './features/customers/customer-profile/customer-profile.component';
import { CustomerWizardComponent } from './features/customers/customer-wizard/customer-wizard.component';
import { AgreementGeneratorComponent } from './features/agreement/agreement-generator.component';
import { CalendarComponent } from './features/calendar/calendar.component';
import { PaymentsComponent } from './features/payments/payments.component';
import { AnalyticsComponent } from './features/analytics/analytics.component';
import { SettingsComponent } from './features/settings/settings.component';
import { LoginComponent } from './features/login/login.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'customers', component: CustomersListComponent },
      { path: 'customers/new', component: CustomerWizardComponent },
      { path: 'customers/:id', component: CustomerProfileComponent },
      { path: 'agreement', component: AgreementGeneratorComponent },
      { path: 'calendar', component: CalendarComponent },
      { path: 'payments', component: PaymentsComponent },
      { path: 'analytics', component: AnalyticsComponent },
      { path: 'settings', component: SettingsComponent },
      { path: '**', redirectTo: 'dashboard' }
    ]
  }
];
