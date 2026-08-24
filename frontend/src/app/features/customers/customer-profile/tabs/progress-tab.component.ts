import { Component, Input, OnChanges, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { LucideCamera, LucideCheck, LucidePencil, LucidePlus, LucideRuler, LucideTrash2, LucideUpload, LucideX } from '@lucide/angular';
import { CustomersService } from '../../../../core/services/customers.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Photo, ProgressMeasurement } from '../../../../core/models/customer.model';
import { formatDate, todayIso } from '../../../../shared/status-utils';
import { WeightChartComponent } from '../../../../shared/components/weight-chart/weight-chart.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-progress-tab',
  standalone: true,
  imports: [
    FormsModule, WeightChartComponent, EmptyStateComponent,
    LucidePlus, LucideX, LucideCheck, LucidePencil, LucideRuler, LucideTrash2, LucideCamera, LucideUpload
  ],
  template: `
    <div class="progress-layout">
      <section class="card panel">
        <h3 class="panel-title">גרף משקל לאורך זמן</h3>
        <app-weight-chart [measurements]="measurements()" />
      </section>

      <section>
        <div class="section-head">
          <h3 class="panel-title" style="margin-bottom: 0">אירועי מדידה</h3>
          <button class="btn btn-secondary" (click)="showForm.set(!showForm())">
            @if (showForm()) { <svg lucideX class="icon"></svg> ביטול } @else { <svg lucidePlus class="icon"></svg> הוספת מדידה }
          </button>
        </div>

        @if (showForm()) {
          <div class="card inline-form-card">
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
                <label class="field-label">היקף בטן (ס"מ) <span class="optional-hint">(אופציונלי)</span></label>
                <input class="input-field" type="number" step="0.1" [(ngModel)]="newWaist" />
              </div>
              <div class="field-group">
                <label class="field-label">היקף ירך (ס"מ) <span class="optional-hint">(אופציונלי)</span></label>
                <input class="input-field" type="number" step="0.1" [(ngModel)]="newThigh" />
              </div>
              <div class="field-group">
                <label class="field-label">היקף ישבן (ס"מ) <span class="optional-hint">(אופציונלי)</span></label>
                <input class="input-field" type="number" step="0.1" [(ngModel)]="newHip" />
              </div>
            </div>
            <button class="btn btn-primary" (click)="addMeasurement()" [disabled]="!newDate || !newWeight || saving()">
              <svg lucideCheck class="icon"></svg> {{ saving() ? 'שומרת...' : 'שמירת מדידה' }}
            </button>
          </div>
        }

        @if (measurements().length === 0) {
          <app-empty-state heading="עדיין לא נוספו מדידות">
            <svg lucideRuler class="icon" empty-icon></svg>
          </app-empty-state>
        } @else {
          <div class="event-list">
            @for (m of reversedMeasurements(); track m.id) {
              @if (editingId() === m.id) {
                <div class="card inline-form-card">
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
                  <div class="form-actions">
                    <button class="btn btn-primary" (click)="saveEdit(m.id)" [disabled]="!editDate || !editWeight || saving()">
                      <svg lucideCheck class="icon"></svg> {{ saving() ? 'שומרת...' : 'שמירה' }}
                    </button>
                    <button class="btn btn-secondary" (click)="cancelEdit()">ביטול</button>
                  </div>
                </div>
              } @else {
                <div class="card item-card event-card">
                  <div class="event-date tabular-nums">{{ formatDate(m.date) }}</div>
                  <div class="event-metrics">
                    <div class="metric">
                      <div class="metric-label">משקל</div>
                      <div class="metric-value tabular-nums">{{ m.weight }} ק"ג</div>
                    </div>
                    @if (m.waist) {
                      <div class="metric">
                        <div class="metric-label">היקף בטן</div>
                        <div class="metric-value tabular-nums">{{ m.waist }} ס"מ</div>
                      </div>
                    }
                    @if (m.thigh) {
                      <div class="metric">
                        <div class="metric-label">היקף ירך</div>
                        <div class="metric-value tabular-nums">{{ m.thigh }} ס"מ</div>
                      </div>
                    }
                    @if (m.hip) {
                      <div class="metric">
                        <div class="metric-label">היקף ישבן</div>
                        <div class="metric-value tabular-nums">{{ m.hip }} ס"מ</div>
                      </div>
                    }
                    @if (m.hasPhotos) {
                      <span class="badge badge-neutral"><svg lucideCamera class="icon" style="width: 12px; height: 12px"></svg> תמונות</span>
                    }
                  </div>
                  <div class="event-actions">
                    <button class="btn btn-secondary btn-sm" (click)="startEdit(m)"><svg lucidePencil class="icon"></svg> עריכה</button>
                    @if (measurements().length > 1) {
                      <button class="btn btn-secondary btn-sm" (click)="deleteMeasurement(m)"><svg lucideTrash2 class="icon"></svg> מחיקה</button>
                    }
                  </div>
                </div>
              }
            }
          </div>
        }
      </section>

      <section class="card panel photos-section">
        <div class="section-head">
          <h3 class="panel-title" style="margin-bottom: 0">תמונות</h3>
          <div class="add-wrapper">
            <button class="btn btn-secondary" (click)="showUploadPopover.set(!showUploadPopover())">
              <svg lucideCamera class="icon"></svg> העלאת תמונות
            </button>
            @if (showUploadPopover()) {
              <div class="upload-popover card">
                <div class="field-group">
                  <label class="field-label">תאריך</label>
                  <input class="input-field" type="date" [(ngModel)]="uploadDate" />
                </div>
                <input
                  #photoInput
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  (change)="onPhotosSelected($event)"
                />
                <button class="btn btn-primary" (click)="photoInput.click()" [disabled]="uploading()">
                  <svg lucideUpload class="icon"></svg> {{ uploading() ? 'מעלה...' : 'בחירת תמונות' }}
                </button>
              </div>
            }
          </div>
        </div>

        @if (photosAsc().length === 0) {
          <app-empty-state heading="עדיין לא הועלו תמונות">
            <svg lucideCamera class="icon" empty-icon></svg>
          </app-empty-state>
        } @else {
          <div class="carousel">
            @for (p of photosAsc(); track p.id; let i = $index) {
              @if (i === 0 || photosAsc()[i - 1].date !== p.date) {
                <div class="carousel-date-divider">{{ formatDate(p.date) }}</div>
              }
              <div class="carousel-photo-wrap">
                <a class="carousel-photo" [href]="p.viewUrl" target="_blank">
                  <img [src]="p.viewUrl" [alt]="formatDate(p.date)" />
                </a>
                <button class="photo-delete" title="מחיקה" (click)="deletePhoto(p)">
                  <svg lucideTrash2 style="width: 12px; height: 12px"></svg>
                </button>
              </div>
            }
          </div>
        }
      </section>
    </div>
  `,
  styles: [`
    .progress-layout {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
    }
    .inline-form-card {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      align-items: flex-start;
    }
    .event-list {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .event-card {
      align-items: center;
      flex-wrap: wrap;
      gap: var(--space-6);
    }
    .event-date {
      font-weight: 700;
      width: 90px;
      flex-shrink: 0;
    }
    .event-metrics {
      display: flex;
      align-items: center;
      gap: var(--space-6);
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
    .event-actions {
      display: flex;
      gap: var(--space-2);
    }
    .add-wrapper {
      position: relative;
      display: inline-block;
    }
    .upload-popover {
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      width: 240px;
      padding: var(--space-4);
      z-index: 10;
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      box-shadow: var(--shadow-md);
    }
    .carousel {
      direction: ltr;
      display: flex;
      align-items: stretch;
      gap: var(--space-3);
      overflow-x: auto;
      padding-bottom: 6px;
    }
    .carousel-date-divider {
      flex-shrink: 0;
      writing-mode: vertical-rl;
      font-size: 11px;
      color: var(--color-text-muted);
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      border-inline-start: 1px dashed var(--color-border);
    }
    .carousel-photo-wrap {
      position: relative;
      flex-shrink: 0;
    }
    .carousel-photo {
      width: 110px;
      aspect-ratio: 3 / 4;
      border-radius: var(--radius-sm);
      overflow: hidden;
      display: block;
    }
    .carousel-photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .photo-delete {
      position: absolute;
      top: 4px;
      left: 4px;
      width: 22px;
      height: 22px;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: rgba(36, 37, 34, 0.65);
      color: var(--color-on-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.15s;
    }
    .carousel-photo-wrap:hover .photo-delete {
      opacity: 1;
    }
  `]
})
export class ProgressTabComponent implements OnChanges {
  @Input({ required: true }) customerId!: string;
  private customersService = inject(CustomersService);
  private confirmDialog = inject(ConfirmDialogService);
  private toast = inject(ToastService);

  measurements = signal<ProgressMeasurement[]>([]);
  reversedMeasurements = computed(() => [...this.measurements()].reverse());

  photos = signal<Photo[]>([]);
  photosAsc = computed(() => [...this.photos()].reverse());

  showUploadPopover = signal(false);
  uploading = signal(false);
  uploadDate = todayIso();

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
    this.loadPhotos();
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
        this.toast.success('המדידה נשמרה בהצלחה');
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
        this.toast.success('המדידה עודכנה בהצלחה');
      },
      error: () => this.saving.set(false)
    });
  }

  async deleteMeasurement(m: ProgressMeasurement) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'מחיקת מדידה',
      message: `למחוק את המדידה מתאריך ${this.formatDate(m.date)}?`,
      confirmLabel: 'מחיקה',
      danger: true
    });
    if (!confirmed) return;
    this.customersService.deleteMeasurement(this.customerId, m.id).subscribe({
      next: () => this.loadMeasurements(),
      error: () => this.confirmDialog.alert('מחיקת המדידה נכשלה')
    });
  }

  private loadMeasurements() {
    this.customersService.measurementsFor$(this.customerId).subscribe(list => this.measurements.set(list));
  }

  private loadPhotos() {
    this.customersService.photosFor$(this.customerId).subscribe(list => this.photos.set(list));
  }

  onPhotosSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length === 0) return;

    this.uploading.set(true);
    const uploads = files.map(file => this.customersService.uploadPhoto(this.customerId, file, 'progress', this.uploadDate));
    forkJoin(uploads).subscribe({
      next: () => {
        this.uploading.set(false);
        this.showUploadPopover.set(false);
        this.loadPhotos();
        this.toast.success('התמונות הועלו בהצלחה');
      },
      error: () => {
        this.uploading.set(false);
        this.confirmDialog.alert('העלאת חלק מהתמונות נכשלה, נסי שוב');
        this.loadPhotos();
      }
    });
  }

  async deletePhoto(photo: Photo) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'מחיקת תמונה',
      message: 'למחוק את התמונה?',
      confirmLabel: 'מחיקה',
      danger: true
    });
    if (!confirmed) return;
    this.customersService.deletePhoto(this.customerId, photo.id).subscribe({
      next: () => this.loadPhotos(),
      error: () => this.confirmDialog.alert('מחיקת התמונה נכשלה')
    });
  }
}
