import { Component, inject } from '@angular/core';
import { LucideCheck, LucideCircleAlert } from '@lucide/angular';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [LucideCheck, LucideCircleAlert],
  template: `
    <div class="toast-stack">
      @for (toast of toasts(); track toast.id) {
        <div class="toast" [class.toast-success]="toast.kind === 'success'" [class.toast-error]="toast.kind === 'error'">
          @if (toast.kind === 'success') {
            <svg lucideCheck class="icon"></svg>
          } @else {
            <svg lucideCircleAlert class="icon"></svg>
          }
          <span>{{ toast.message }}</span>
        </div>
      }
    </div>
  `
})
export class ToastComponent {
  private toastService = inject(ToastService);
  toasts = this.toastService.toasts;
}
