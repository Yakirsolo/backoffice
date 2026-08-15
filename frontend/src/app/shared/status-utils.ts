import { BillingIntervalUnit, CustomerStatus, PaymentStatus } from '../core/models/customer.model';

export function customerStatusBadgeClass(status: CustomerStatus): string {
  switch (status) {
    case 'active': return 'badge badge-success';
    case 'finished': return 'badge badge-neutral';
  }
}

export function paymentStatusBadgeClass(status: PaymentStatus): string {
  switch (status) {
    case 'paid': return 'badge badge-success';
    case 'pending': return 'badge badge-warning';
    case 'overdue': return 'badge badge-danger';
    case 'cancelled': return 'badge badge-neutral';
  }
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function formatDateShort(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

/** Adds days to an ISO date string using UTC-based math so local timezone never shifts the day. */
export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Backend LocalTime serializes with seconds ("10:00:00") - trim for display. */
export function formatTime(time: string): string {
  return time.slice(0, 5);
}

export function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * `loss` is (startWeight - currentWeight): positive means weight was lost, negative means gained.
 * Formats the sign itself rather than assuming loss is always positive.
 */
export function formatWeightChange(loss: number): string {
  if (loss === 0) return `0 ק"ג`;
  return loss > 0 ? `-${loss} ק"ג` : `+${Math.abs(loss)} ק"ג`;
}

const SINGULAR_UNIT_LABELS: Record<BillingIntervalUnit, string> = {
  day: 'יומי',
  week: 'שבועי',
  month: 'חודשי'
};

const PLURAL_UNIT_LABELS: Record<BillingIntervalUnit, string> = {
  day: 'ימים',
  week: 'שבועות',
  month: 'חודשים'
};

/** Derives the plan's display name from its billing cadence, so it never needs typing twice. */
export function defaultProgramName(value: number, unit: BillingIntervalUnit): string {
  if (!value || value <= 0) return '';
  return value === 1 ? `מסלול ${SINGULAR_UNIT_LABELS[unit]}` : `מסלול כל ${value} ${PLURAL_UNIT_LABELS[unit]}`;
}
