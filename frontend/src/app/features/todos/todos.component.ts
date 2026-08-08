import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TodosService } from '../../core/services/todos.service';

const ROTATIONS = [-3, 2, -2, 3, -1, 1];

@Component({
  selector: 'app-todos',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './todos.component.html',
  styleUrl: './todos.component.scss'
})
export class TodosComponent {
  private todosService = inject(TodosService);

  todos = this.todosService.todos;
  newText = '';
  saving = signal(false);
  showPopover = signal(false);

  rotation(index: number): number {
    return ROTATIONS[index % ROTATIONS.length];
  }

  togglePopover() {
    this.showPopover.update(v => !v);
  }

  closePopover() {
    this.showPopover.set(false);
    this.newText = '';
  }

  onEnter(event: Event) {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.shiftKey) return;
    event.preventDefault();
    this.add();
  }

  add() {
    const text = this.newText.trim();
    if (!text) return;
    this.saving.set(true);
    this.todosService.add(text).subscribe({
      next: () => {
        this.saving.set(false);
        this.newText = '';
        this.showPopover.set(false);
      },
      error: () => this.saving.set(false)
    });
  }

  complete(id: string) {
    this.todosService.complete(id).subscribe();
  }
}
