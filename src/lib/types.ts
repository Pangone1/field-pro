export type JobStatus = "pending" | "scheduled" | "en_route" | "in_progress" | "completed";

export interface ServiceRecord {
  date: string; // yyyy-mm-dd
  summary: string;
}

export interface Equipment {
  id: string;
  name: string;
  model: string;
  serial: string;
  installed: string;
  history: ServiceRecord[];
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  customerSince: string;
  notes: string;
  equipment: Equipment[];
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface JobPhoto {
  id: string;
  kind: "pre" | "post";
  url: string;
  takenAt: number;
}

export interface Job {
  id: string;
  customerId: string;
  title: string;
  serviceType: string;
  date: string; // yyyy-mm-dd
  startHour: number; // 24h, fractional allowed (8.5 = 8:30)
  durationHrs: number;
  status: JobStatus;
  address: string;
  priority: "normal" | "urgent";
  checklist: ChecklistItem[];
  notes: string;
  photos: JobPhoto[];
  signature: string | null;
  activity: { at: number; text: string }[];
  /** Where the job came from: created in the app, or auto-created from an SMS/email request. */
  source: "app" | "sms" | "email" | "webhook";
}

export interface LineItem {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
}

export type TierKey = "good" | "better" | "best";

export interface EstimateTier {
  name: string;
  summary: string;
  items: LineItem[];
}

export type EstimateStatus = "draft" | "sent" | "approved" | "converted";

export interface Estimate {
  id: string;
  number: string;
  customerId: string;
  jobId: string | null;
  title: string;
  status: EstimateStatus;
  tiers: Record<TierKey, EstimateTier>;
  selectedTier: TierKey;
  taxRate: number; // e.g. 0.0825
  createdAt: number;
  invoiceId: string | null;
}

export type PaymentMethod = "stripe" | "cash" | "check" | "nfc" | "card" | "ach";

export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  jobId: string | null;
  estimateId: string | null;
  title: string;
  items: LineItem[];
  taxRate: number;
  status: "unpaid" | "paid";
  createdAt: number;
  dueDate: string;
  paidAt: number | null;
  paidMethod: PaymentMethod | null;
  stripeSessionId: string | null;
}

export type OutboxKind =
  | "note"
  | "photo"
  | "status"
  | "checklist"
  | "signature"
  | "estimate"
  | "invoice"
  | "payment"
  | "expense"
  | "trip"
  | "timesheet"
  | "schedule"
  | "job"
  | "customer";

export interface OutboxItem {
  id: string;
  kind: OutboxKind;
  label: string;
  at: number;
}

export interface TimeEntry {
  id: string;
  clockIn: number;
  clockOut: number | null;
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  vendor: string;
  date: string;
  note: string;
  receiptUrl: string | null;
  createdAt: number;
}

export interface Trip {
  id: string;
  purpose: string;
  addressFrom: string;
  addressTo: string;
  startAt: number;
  startOdometer: number;
  endAt: number | null;
  endOdometer: number | null;
  elapsedSeconds: number | null;
}

export type BackupProvider = "gdrive" | "onedrive" | "dropbox";

export interface BackupState {
  status: "idle" | "running" | "done";
  progress: number;
  lastBackupAt: number | null;
}
