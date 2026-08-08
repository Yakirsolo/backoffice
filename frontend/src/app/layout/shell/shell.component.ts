import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;

  navItems: NavItem[] = [
    { label: 'דשבורד', path: '/dashboard', icon: '🏠' },
    { label: 'לקוחות', path: '/customers', icon: '👥' },
    { label: 'יומן', path: '/calendar', icon: '📅' },
    { label: 'תשלומים', path: '/payments', icon: '💳' },
    { label: 'משימות', path: '/todos', icon: '📝' },
    { label: 'אנליטיקה', path: '/analytics', icon: '📊' },
    { label: 'הגדרות', path: '/settings', icon: '⚙️' }
  ];

  logout() {
    this.authService.logout().subscribe(() => this.router.navigate(['/login']));
  }
}
