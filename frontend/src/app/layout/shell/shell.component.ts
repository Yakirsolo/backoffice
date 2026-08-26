import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideCalendar,
  LucideChartColumn,
  LucideCreditCard,
  LucideFileSignature,
  LucideHouse,
  LucideLogOut,
  LucidePlus,
  LucideScale,
  LucideSettings,
  LucideSquareCheck,
  LucideUsers
} from '@lucide/angular';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  label: string;
  path: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterLink, RouterLinkActive, RouterOutlet,
    LucideHouse, LucideUsers, LucideCalendar, LucideCreditCard,
    LucideSquareCheck, LucideChartColumn, LucideSettings,
    LucidePlus, LucideLogOut, LucideScale, LucideFileSignature
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;

  navItems: NavItem[] = [
    { label: 'דשבורד', path: '/dashboard' },
    { label: 'לקוחות', path: '/customers' },
    { label: 'הסכמים', path: '/agreement' },
    { label: 'יומן', path: '/calendar' },
    { label: 'תשלומים', path: '/payments' },
    { label: 'משימות', path: '/todos' },
    { label: 'אנליטיקה', path: '/analytics' },
    { label: 'הגדרות', path: '/settings' }
  ];

  logout() {
    this.authService.logout().subscribe(() => this.router.navigate(['/login']));
  }
}
