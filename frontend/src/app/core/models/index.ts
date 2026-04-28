export interface User {
  id: string;
  email: string;
  togglApiToken?: string;
  togglWorkspaceId?: string;
  krosApiToken?: string;
  defaultHourlyRate?: number;
  defaultVatRate: number;
  currency: string;
  invoiceDueDays: number;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  ico?: string;
  dic?: string;
  icDph?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  country: string;
  hourlyRate?: number;
  active: boolean;
  notes?: string;
  togglId?: string;
  _count?: { invoices: number; projects: number };
}

export interface Project {
  id: string;
  name: string;
  color?: string;
  hourlyRate?: number;
  active: boolean;
  togglId?: string;
  client?: { id: string; name: string };
}

export interface TimeEntry {
  id: string;
  togglId: string;
  description?: string;
  startTime: string;
  endTime?: string;
  duration: number;
  billable: boolean;
  invoiced: boolean;
  project?: {
    id: string;
    name: string;
    color?: string;
    client?: { id: string; name: string };
  };
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  clientId: string;
  client?: Client;
  status: InvoiceStatus;
  periodFrom: string;
  periodTo: string;
  issueDate: string;
  dueDate: string;
  totalHours: number;
  hourlyRate: number;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  currency: string;
  documentNumber?: string;
  variableSymbol?: string;
  krosRequestId?: string;
  notes?: string;
  items?: InvoiceItem[];
  createdAt: string;
}

export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PROCESSING' | 'SENT' | 'PAID' | 'ERROR' | 'CANCELLED';

export interface Stats {
  total: { amount: number; count: number };
  year: { amount: number; count: number };
  month: { amount: number; count: number };
  byStatus: Record<InvoiceStatus, number>;
}

export interface MonthlyEarning {
  month: number;
  amount: number;
}

export interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
