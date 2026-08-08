import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { tap } from 'rxjs';
import { Todo } from '../models/customer.model';
import { API_BASE_URL } from '../config/api-config';

@Injectable({ providedIn: 'root' })
export class TodosService {
  private http = inject(HttpClient);

  readonly todos = signal<Todo[]>([]);

  constructor() {
    this.refresh();
  }

  private refresh() {
    this.http.get<Todo[]>(`${API_BASE_URL}/todos`).subscribe(list => this.todos.set(list));
  }

  add(text: string) {
    return this.http.post<Todo>(`${API_BASE_URL}/todos`, { text })
      .pipe(tap(() => this.refresh()));
  }

  complete(id: string) {
    return this.http.delete<void>(`${API_BASE_URL}/todos/${id}`)
      .pipe(tap(() => this.refresh()));
  }
}
