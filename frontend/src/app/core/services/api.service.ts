import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Client, Project, Invoice, Stats, MonthlyEarning,
  TimeEntry, User, PagedResult
} from '../models';

const API = 'http://localhost:3000/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  // Users
  updateSettings(data: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${API}/users/settings`, data);
  }

  // Clients
  getClients(): Observable<Client[]> {
    return this.http.get<Client[]>(`${API}/clients`);
  }
  getClient(id: string): Observable<Client> {
    return this.http.get<Client>(`${API}/clients/${id}`);
  }
  createClient(data: Partial<Client>): Observable<Client> {
    return this.http.post<Client>(`${API}/clients`, data);
  }
  updateClient(id: string, data: Partial<Client>): Observable<Client> {
    return this.http.patch<Client>(`${API}/clients/${id}`, data);
  }
  deleteClient(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/clients/${id}`);
  }

  // Projects
  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${API}/projects`);
  }
  updateProject(id: string, data: Partial<Project>): Observable<Project> {
    return this.http.patch<Project>(`${API}/projects/${id}`, data);
  }

  // Time Entries
  getTimeEntries(month?: number, year?: number): Observable<TimeEntry[]> {
    let params = new HttpParams();
    if (month) params = params.set('month', month);
    if (year) params = params.set('year', year);
    return this.http.get<TimeEntry[]>(`${API}/time-entries`, { params });
  }
  getTimeEntrySummary(month: number, year: number): Observable<any[]> {
    return this.http.get<any[]>(`${API}/time-entries/summary`, {
      params: { month, year },
    });
  }

  // Invoices
  getInvoices(page = 1, limit = 20): Observable<PagedResult<Invoice>> {
    return this.http.get<PagedResult<Invoice>>(`${API}/invoices`, {
      params: { page, limit },
    });
  }
  getInvoice(id: string): Observable<Invoice> {
    return this.http.get<Invoice>(`${API}/invoices/${id}`);
  }
  getStats(): Observable<Stats> {
    return this.http.get<Stats>(`${API}/invoices/stats`);
  }
  getMonthlyEarnings(year?: number): Observable<MonthlyEarning[]> {
    let params = new HttpParams();
    if (year) params = params.set('year', year);
    return this.http.get<MonthlyEarning[]>(`${API}/invoices/monthly-earnings`, { params });
  }
  generateInvoices(year?: number, month?: number): Observable<any> {
    return this.http.post(`${API}/invoices/generate`, { year, month });
  }
  sendInvoice(id: string): Observable<any> {
    return this.http.post(`${API}/invoices/${id}/send`, {});
  }
  updateInvoiceStatus(id: string, status: string): Observable<Invoice> {
    return this.http.patch<Invoice>(`${API}/invoices/${id}/status`, { status });
  }
  deleteInvoice(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/invoices/${id}`);
  }

  // Toggl
  syncToggl(): Observable<any> {
    return this.http.post(`${API}/toggl/sync`, {});
  }
}
