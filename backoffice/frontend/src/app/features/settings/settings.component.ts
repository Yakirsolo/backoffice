import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent {
  private authService = inject(AuthService);

  coachName = signal('');
  businessName = signal('');
  email = signal('');
  phone = signal('');
  notifyPaymentReminders = signal(true);
  notifyFollowUp = signal(true);

  saving = signal(false);
  saveMessage = signal('');

  constructor() {
    this.authService.getMySettings().subscribe(settings => {
      this.coachName.set(settings.name);
      this.businessName.set(settings.businessName ?? '');
      this.email.set(settings.email);
      this.phone.set(settings.phone ?? '');
      this.notifyPaymentReminders.set(settings.notifyPaymentReminders);
      this.notifyFollowUp.set(settings.notifyFollowUp);
    });
  }

  save() {
    this.saving.set(true);
    this.saveMessage.set('');
    this.authService.updateMySettings({
      name: this.coachName(),
      businessName: this.businessName(),
      phone: this.phone(),
      notifyPaymentReminders: this.notifyPaymentReminders(),
      notifyFollowUp: this.notifyFollowUp()
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.saveMessage.set('השינויים נשמרו בהצלחה');
      },
      error: () => {
        this.saving.set(false);
        this.saveMessage.set('שמירה נכשלה, נסי שוב');
      }
    });
  }
}
