import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Client } from '../../core/models';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clients.component.html',
  styleUrl: './clients.component.scss',
})
export class ClientsComponent implements OnInit {
  clients = signal<Client[]>([]);
  loading = signal(true);
  showForm = signal(false);
  saving = signal(false);
  editId = signal<string | null>(null);

  form: Partial<Client> = this.emptyForm();

  constructor(private api: ApiService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.getClients().subscribe({
      next: (c) => { this.clients.set(c); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openNew() {
    this.form = this.emptyForm();
    this.editId.set(null);
    this.showForm.set(true);
  }

  openEdit(c: Client) {
    this.form = { ...c };
    this.editId.set(c.id);
    this.showForm.set(true);
  }

  save() {
    this.saving.set(true);
    const id = this.editId();
    const req = id
      ? this.api.updateClient(id, this.form)
      : this.api.createClient(this.form);

    req.subscribe({
      next: () => { this.saving.set(false); this.showForm.set(false); this.load(); },
      error: () => this.saving.set(false),
    });
  }

  delete(c: Client) {
    if (!confirm(`Zmazať klienta "${c.name}"?`)) return;
    this.api.deleteClient(c.id).subscribe({ next: () => this.load() });
  }

  private emptyForm(): Partial<Client> {
    return { name: '', email: '', ico: '', dic: '', icDph: '', address: '', city: '', zipCode: '', country: 'SK', hourlyRate: undefined, active: true };
  }
}
