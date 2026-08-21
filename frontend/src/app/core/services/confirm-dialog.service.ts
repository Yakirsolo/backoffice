import { Injectable, signal } from '@angular/core';

export interface DialogState {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string | null;
  danger: boolean;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly _state = signal<DialogState | null>(null);
  private resolver: ((result: boolean) => void) | null = null;

  readonly state = this._state.asReadonly();

  confirm(options: ConfirmOptions): Promise<boolean> {
    this._state.set({
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel ?? 'אישור',
      cancelLabel: options.cancelLabel ?? 'ביטול',
      danger: options.danger ?? false
    });
    return new Promise<boolean>(resolve => {
      this.resolver = resolve;
    });
  }

  alert(message: string, title = 'שגיאה'): Promise<void> {
    this._state.set({
      title,
      message,
      confirmLabel: 'הבנתי',
      cancelLabel: null,
      danger: false
    });
    return new Promise<void>(resolve => {
      this.resolver = () => resolve();
    });
  }

  respond(result: boolean) {
    this.resolver?.(result);
    this.resolver = null;
    this._state.set(null);
  }
}
