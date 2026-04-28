import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Invoice, InvoiceStatus } from '../../core/models';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './invoices.component.html',
  styleUrl: './invoices.component.scss',
})
export class InvoicesComponent implements OnInit {
  invoices = signal<Invoice[]>([]);
  total = signal(0);
  loading = signal(true);
  generating = signal(false);
  page = signal(1);

  genYear = new Date().getFullYear();
  genMonth = new Date().getMonth();

  readonly months = [
    'Január','Február','Marec','Apríl','Máj','Jún',
    'Júl','August','September','Október','November','December'
  ];

  constructor(private api: ApiService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.getInvoices(this.page()).subscribe({
      next: (res) => {
        this.invoices.set(res.data);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  generate() {
    this.generating.set(true);
    this.api.generateInvoices(this.genYear, this.genMonth).subscribe({
      next: (res) => {
        this.generating.set(false);
        alert(`Vygenerované: ${res.generated} faktúr`);
        this.load();
      },
      error: (e) => {
        this.generating.set(false);
        alert(e.error?.message || 'Chyba pri generovaní');
      },
    });
  }

  send(invoice: Invoice) {
    if (!confirm(`Odoslať faktúru ${invoice.documentNumber || invoice.id} do KROS?`)) return;
    this.api.sendInvoice(invoice.id).subscribe({
      next: () => this.load(),
      error: (e) => alert(e.error?.message || 'Chyba pri odosielaní'),
    });
  }

  markPaid(invoice: Invoice) {
    this.api.updateInvoiceStatus(invoice.id, 'PAID').subscribe({ next: () => this.load() });
  }

  delete(invoice: Invoice) {
    if (!confirm('Zmazať faktúru?')) return;
    this.api.deleteInvoice(invoice.id).subscribe({ next: () => this.load() });
  }

  formatEur(value: number | string): string {
    return new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(+value);
  }

  statusLabel(s: InvoiceStatus): string {
    const map: Record<InvoiceStatus, string> = {
      DRAFT: 'Koncept', PENDING: 'Čaká', PROCESSING: 'Spracováva sa',
      SENT: 'Odoslané', PAID: 'Zaplatené', ERROR: 'Chyba', CANCELLED: 'Zrušené',
    };
    return map[s] || s;
  }

  formatDate(d: string) {
    return new Date(d).toLocaleDateString('sk-SK');
  }
}
