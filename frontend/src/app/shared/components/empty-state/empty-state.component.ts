import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="empty-state">
      <ng-content select="[empty-icon]"></ng-content>
      <h4>{{ heading() }}</h4>
      @if (message()) {
        <p>{{ message() }}</p>
      }
      <ng-content select="[empty-action]"></ng-content>
    </div>
  `
})
export class EmptyStateComponent {
  heading = input.required<string>();
  message = input<string>('');
}
