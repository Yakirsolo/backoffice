import { Component, inject } from '@angular/core';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss'
})
export class ConfirmDialogComponent {
  private dialog = inject(ConfirmDialogService);
  state = this.dialog.state;

  confirm() {
    this.dialog.respond(true);
  }

  cancel() {
    this.dialog.respond(false);
  }
}
