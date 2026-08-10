import { Component, Input, OnChanges, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CustomersService } from '../../../../core/services/customers.service';
import { ProgressMeasurement } from '../../../../core/models/customer.model';
import { formatDate, todayIso } from '../../../../shared/status-utils';
import { WeightChartComponent } from '../../../../shared/components/weight-chart/weight-chart.component';

@Component({
  selector: 'app-progress-tab',
  standalone: true,
  imports: [FormsModule, WeightChartComponent],
  template: `
    <div class="progress-layout">
      <section class="card chart-card">
        <h3 class="section-title">גרף משקל לאורך זמן</h3>
        <app-weight-chart [measurements]="measurements()" />
      </section>

      <section class="events">
        <div class="events-header">
          <h3 class="section-title">אירועי מדידה</h3>
          <button class="btn btn-secondary" (click)="showForm.set(!showForm())">
            {{ showForm() ? '✕ ביטול' : '➕ הוספת מדידה' }}
          </button>
        </div>

        @if (showForm()) {
          <div class="card new-measurement-card">
            <div class="field-group">
              <label class="field-label">תאריך</label>
              <input class="input-field" type="date" [(ngModel)]="newDate" />
            </div>
            <div class="four-col">
              <div class="field-group">
                <label class="field-label">משקל (ק"ג) *</label>
                <input class="input-field" type="number" step="0.1" [(ngModel)]="newWeight" />
              </div>
              <div class="field-group">
                <label class="field-label">היקף בטן (ס"מ)</label>
                <input class="input-field" type="number" step="0.1" [(ngModel)]="newWaist" />
              </div>
              <div class="field-group">
                <label class="field-label">היקף ירך (ס"מ)</label>
                <input class="input-field" type="number" step="0.1" [(ngModel)]="newThigh" />
              </div>
              <div class="field-group">
                <label class="field-label">היקף ישבן (ס"מ)</label>
                <input class="input-field" type="number" step="0.1" [(ngModel)]="newHip" />
              </div>
            </div>
            <button class="btn btn-primary" (click)="addMeasurement()" [disabled]="!newDate || !newWeight || saving()">
              {{ saving() ? 'שומרת...' : '✓ שמירת מדידה' }}
            </button>
          </div>
        }

        @if (measurements().length === 0) {
          <div class="card empty-state">עדיין לא נוספו מדידות</div>
        } @else {
          <div class="event-list">
            @for (m of reversedMeasurements(); track m.id) {
              @if (editingId() === m.id) {
                <div class="card new-measurement-card">
                  <div class="field-group">
                    <label class="field-label">תאריך</label>
                    <input class="input-field" type="date" [(ngModel)]="editDate" />
                  </div>
                  <div class="four-col">
                    <div class="field-group">
                      <label class="field-label">משקל (ק"ג) *</label>
                      <input class="input-field" type="number" step="0.1" [(ngModel)]="editWeight" />
                    </div>
                    <div class="field-group">
                      <label class="field-label">היקף בטן (ס"מ)</label>
                      <input class="input-field" type="number" step="0.1" [(ngModel)]="editWaist" />
                    </div>
                    <div class="field-group">
                      <label class="field-label">היקף ירך (ס"מ)</label>
                      <input class="input-field" type="number" step="0.1" [(ngModel)]="editThigh" />
                    </div>
                    <div class="field-group">
                      <label class="field-label">היקף ישבן (ס"מ)</label>
                      <input class="input-field" type="number" step="0.1" [(ngModel)]="editHip" />
                    </div>
                  </div>
                  <div class="edit-actions">
                    <button class="btn btn-primary" (click)="saveEdit(m.id)" [disabled]="!editDate || !editWeight || saving()">
                      {{ saving() ? 'שומרת...' : '✓ שמירה' }}
                    </button>
                    <button class="btn btn-secondary" (click)="cancelEdit()">ביטול</button>
                  </div>
                </div>
              } @else {
                <div class="card event-card">
                  <div class="event-date">{{ formatDate(m.date) }}</div>
                  <div class="event-metrics">
                    <div class="metric">
                      <div class="metric-label">משקל</div>
                      <div class="metric-value">{{ m.weight }} ק"ג</div>
                    </div>
                    @if (m.waist) {
                      <div class="metric">
                        <div class="metric-label">היקף בטן</div>
                        <div class="metric-value">{{ m.waist }} ס"מ</div>
                      </div>
                    }
                    @if (m.thigh) {
                      <div class="metric">
                        <div class="metric-label">היקף ירך</div>
                        <div class="metric-value">{{ m.thigh }} ס"מ</div>
                      </div>
                    }
                    @if (m.hip) {
                      <div class="metric">
                        <div class="metric-label">היקף ישבן</div>
                        <div class="metric-value">{{ m.hip }} ס"מ</div>
                      </div>
                    }
                  </div>
                  @if (m.hasPhotos) {
                    <div class="photos-note">📷 הועלו תמונות</div>
                  }
                  <div class="event-actions">
                    <button class="btn btn-secondary btn-small" (click)="startEdit(m)">✎ עריכה</button>
                    @if (measurements().length > 1) {
                      <button class="btn btn-secondary btn-small" (click)="deleteMeasurement(m)">🗑 מחיקה</button>
                    }
                  </div>
                </div>
              }
            }
          </div>
        }
      </section>

      <section class="card photos-section">
        <h3 class="section-title">תמונות לפני / אחרי</h3>
        <div class="photos-grid">
          <div class="photo-placeholder">
            <span>תמונה לפני</span>
          </div>
          <div class="photo-placeholder">
            <span>תמונה עדכנית</span>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .progress-layout {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .section-title {
      font-size: 14px;
    }
    .chart-card, .photos-section {
      padding: 20px;
    }
    .events-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    .new-measurement-card {
      padding: 18px;
      margin-bottom: 14px;
    }
    .four-col {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
    }
    .event-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .event-card {
      padding: 16px 18px;
      display: flex;
      align-items: center;
      gap: 24px;
      flex-wrap: wrap;
    }
    .event-date {
      font-weight: 700;
      width: 90px;
      flex-shrink: 0;
    }
    .event-metrics {
      display: flex;
      gap: 28px;
      flex: 1;
      flex-wrap: wrap;
    }
    .metric-label {
      font-size: 11px;
      color: var(--color-text-muted);
    }
    .metric-value {
      font-weight: 700;
      margin-top: 2px;
    }
    .photos-note {
      font-size: 12px;
      color: var(--color-text-muted);
    }
    .event-actions {
      display: flex;
      gap: 8px;
      margin-inline-start: auto;
    }
    .btn-small {
      padding: 5px 10px;
      font-size: 13px;
    }
    .edit-actions {
      display: flex;
      gap: 10px;
      margin-top: 14px;
    }
    .photos-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .photo-placeholder {
      aspect-ratio: 3 / 4;
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-text-faint);
      font-size: 13px;
    }
    @media (max-width: 720px) {
      .four-col {
        grid-template-columns: 1fr 1fr;
      }
    }
  `]
})
export class ProgressTabComponent implements OnChanges {
  @Input({ required: true }) customerId!: string;
  private customersService = inject(CustomersService);

  measurements = signal<ProgressMeasurement[]>([]);
  reversedMeasurements = computed(() => [...this.measurements()].reverse());

  formatDate = formatDate;

  showForm = signal(false);
  saving = signal(false);
  newDate = todayIso();
  newWeight: number | null = null;
  newWaist: number | null = null;
  newThigh: number | null = null;
  newHip: number | null = null;

  editingId = signal<string | null>(null);
  editDate = '';
  editWeight: number | null = null;
  editWaist: number | null = null;
  editThigh: number | null = null;
  editHip: number | null = null;

  ngOnChanges() {
    this.loadMeasurements();
  }

  addMeasurement() {
    if (!this.newDate || !this.newWeight) return;
    this.saving.set(true);
    this.customersService.addMeasurement(this.customerId, {
      date: this.newDate,
      weight: this.newWeight,
      waist: this.newWaist ?? undefined,
      thigh: this.newThigh ?? undefined,
      hip: this.newHip ?? undefined
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.newDate = todayIso();
        this.newWeight = null;
        this.newWaist = null;
        this.newThigh = null;
        this.newHip = null;
        this.loadMeasurements();
      },
      error: () => this.saving.set(false)
    });
  }

  startEdit(m: ProgressMeasurement) {
    this.editingId.set(m.id);
    this.editDate = m.date;
    this.editWeight = m.weight;
    this.editWaist = m.waist ?? null;
    this.editThigh = m.thigh ?? null;
    this.editHip = m.hip ?? null;
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  saveEdit(measurementId: string) {
    if (!this.editDate || !this.editWeight) return;
    this.saving.set(true);
    this.customersService.updateMeasurement(this.customerId, measurementId, {
      date: this.editDate,
      weight: this.editWeight,
      waist: this.editWaist ?? undefined,
      thigh: this.editThigh ?? undefined,
      hip: this.editHip ?? undefined
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.editingId.set(null);
        this.loadMeasurements();
      },
      error: () => this.saving.set(false)
    });
  }

  deleteMeasurement(m: ProgressMeasurement) {
    if (!confirm(`למחוק את המדידה מתאריך ${this.formatDate(m.date)}?`)) return;
    this.customersService.deleteMeasurement(this.customerId, m.id).subscribe({
      next: () => this.loadMeasurements(),
      error: () => alert('מחיקת המדידה נכשלה')
    });
  }

  private loadMeasurements() {
    this.customersService.measurementsFor$(this.customerId).subscribe(list => this.measurements.set(list));
  }
}
