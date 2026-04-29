import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ManualEntry, Client } from '../../core/models';

@Component({
  selector: 'app-manual-entries',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manual-entries.component.html',
  styleUrl: './manual-entries.component.scss',
})
export class ManualEntriesComponent implements OnInit {
  entries = signal<ManualEntry[]>([]);
  clients = signal<Client[]>([]);
  loading = signal(true);
  saving = signal(false);
  showForm = signal(false);
  editingId = signal<string | null>(null);

  form = this.emptyForm();

  filterMonth = new Date().getMonth() + 1;
  filterYear = new Date().getFullYear();

  readonly months = [
    'Január','Február','Marec','Apríl','Máj','Jún',
    'Júl','August','September','Október','November','December',
  ];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getClients().subscribe(c => this.clients.set(c));
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.getManualEntries(this.filterMonth, this.filterYear).subscribe({
      next: (data) => { this.entries.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openForm(entry?: ManualEntry) {
    if (entry) {
      this.editingId.set(entry.id);
      this.form = {
        serviceName: entry.serviceName,
        hourlyRate: entry.hourlyRate,
        performedAt: entry.performedAt.slice(0, 10),
        hours: entry.hours,
        notes: entry.notes || '',
        clientId: entry.clientId || '',
      };
    } else {
      this.editingId.set(null);
      this.form = this.emptyForm();
    }
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    this.editingId.set(null);
    this.form = this.emptyForm();
  }

  save() {
    this.saving.set(true);
    const data = {
      ...this.form,
      hourlyRate: +this.form.hourlyRate,
      hours: +this.form.hours,
      clientId: this.form.clientId || undefined,
    };
    const req = this.editingId()
      ? this.api.updateManualEntry(this.editingId()!, data)
      : this.api.createManualEntry(data);

    req.subscribe({
      next: () => { this.saving.set(false); this.closeForm(); this.load(); },
      error: (e) => { this.saving.set(false); alert(e.error?.message || 'Chyba'); },
    });
  }

  remove(entry: ManualEntry) {
    if (entry.invoiced) return alert('Zafakturovaný záznam nemožno zmazať.');
    if (!confirm(`Zmazať záznam "${entry.serviceName}"?`)) return;
    this.api.deleteManualEntry(entry.id).subscribe({ next: () => this.load() });
  }

  get totalHours() {
    return this.entries().reduce((s, e) => s + +e.hours, 0).toFixed(2);
  }

  get totalAmount() {
    return this.entries().reduce((s, e) => s + +e.hours * +e.hourlyRate, 0);
  }

  formatEur(v: number) {
    return new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(v);
  }

  formatDate(d: string) {
    return new Date(d).toLocaleDateString('sk-SK');
  }

  private emptyForm() {
    return {
      serviceName: '',
      hourlyRate: 50,
      performedAt: new Date().toISOString().slice(0, 10),
      hours: 1,
      notes: '',
      clientId: '',
    };
  }
}
