export type CustomerStatus = 'active' | 'finished';

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  active: 'פעיל',
  finished: 'הסתיים'
};

export type LeadSource = 'instagram' | 'facebook' | 'referral' | 'website' | 'other';

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  referral: 'המלצה',
  website: 'אתר',
  other: 'אחר'
};

export type BillingIntervalUnit = 'day' | 'week' | 'month';

export const BILLING_INTERVAL_UNIT_LABELS: Record<BillingIntervalUnit, string> = {
  day: 'ימים',
  week: 'שבועות',
  month: 'חודשים'
};

export interface Customer {
  id: string;
  name: string;
  age: number;
  description: string;
  phone: string;
  instagram?: string;
  facebook?: string;
  source: LeadSource;
  status: CustomerStatus;
  program: string;
  startDate: string;
  startWeight: number;
  targetWeight: number;
  currentWeight: number;
  photoUrl?: string;
  needsFollowUp: boolean;
  billingIntervalValue: number;
  billingIntervalUnit: BillingIntervalUnit;
  nextPaymentDate: string;
}

export interface ProgressMeasurement {
  id: string;
  customerId: string;
  date: string;
  weight: number;
  waist?: number;
  thigh?: number;
  hip?: number;
  hasPhotos: boolean;
}

export type PhotoType = 'before' | 'progress';

export interface Photo {
  id: string;
  customerId: string;
  measurementId?: string;
  type: PhotoType;
  date: string;
  viewUrl: string;
}

export type DocumentType = 'agreement' | 'menu' | 'other';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  agreement: 'הסכם',
  menu: 'תפריט',
  other: 'קובץ נוסף'
};

export interface CustomerDocument {
  id: string;
  customerId: string;
  type: DocumentType;
  name: string;
  date: string;
  contentType?: string;
  sizeBytes?: number;
  downloadUrl: string;
}

export type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'cancelled';

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: 'שולם',
  pending: 'ממתין',
  overdue: 'באיחור',
  cancelled: 'בוטל'
};

export interface Payment {
  id: string;
  customerId: string;
  amount: number;
  date: string;
  status: PaymentStatus;
}

export interface Todo {
  id: string;
  text: string;
  createdAt: string;
}

export interface Meeting {
  id: string;
  customerId: string;
  date: string;
  time: string;
  type: string;
  durationMinutes?: number;
  notes?: string;
  zoomLink?: string;
  completed: boolean;
}

export type TimelineEventType =
  | 'customer_created'
  | 'agreement_signed'
  | 'weight_update'
  | 'measurement_update'
  | 'measurement_deleted'
  | 'photo_upload'
  | 'photo_deleted'
  | 'menu_uploaded'
  | 'document_uploaded'
  | 'document_deleted'
  | 'meeting_completed'
  | 'payment_received'
  | 'customer_finished'
  | 'customer_reactivated';

export const TIMELINE_EVENT_LABELS: Record<TimelineEventType, string> = {
  customer_created: 'לקוחה נוצרה',
  agreement_signed: 'הסכם נחתם',
  weight_update: 'משקל עודכן',
  measurement_update: 'מדידות עודכנו',
  measurement_deleted: 'מדידה נמחקה',
  photo_upload: 'תמונות הועלו',
  photo_deleted: 'תמונה נמחקה',
  menu_uploaded: 'תפריט חדש הועלה',
  document_uploaded: 'מסמך הועלה',
  document_deleted: 'מסמך נמחק',
  meeting_completed: 'שיחה התקיימה',
  payment_received: 'תשלום התקבל',
  customer_finished: 'התהליך הסתיים',
  customer_reactivated: 'התהליך הופעל מחדש'
};

export interface TimelineEvent {
  id: string;
  customerId: string;
  type: TimelineEventType;
  date: string;
  description?: string;
}

export interface DashboardData {
  todaysMeetings: {
    id: string; customerId: string; customerName: string;
    time: string; type: string; zoomLink?: string;
  }[];
  upcomingPayments: {
    id: string; customerId: string; customerName: string;
    amount: number; date: string; status: PaymentStatus;
  }[];
  followUpCustomers: Customer[];
  newCustomersThisMonth: number;
}
