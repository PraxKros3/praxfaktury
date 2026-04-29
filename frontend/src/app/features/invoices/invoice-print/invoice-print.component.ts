import { Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { Invoice } from '../../../core/models';

@Component({
  selector: 'app-invoice-print',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './invoice-print.component.html',
  styleUrl: './invoice-print.component.scss',
})
export class InvoicePrintComponent implements OnInit {
  invoice: Invoice | null = null;
  loading = true;
  error = false;

  constructor(private route: ActivatedRoute, private api: ApiService, private ngZone: NgZone) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.getInvoice(id).subscribe({
      next: (inv) => {
        this.invoice = inv;
        this.loading = false;
        this.ngZone.runOutsideAngular(() => setTimeout(() => window.print(), 500));
      },
      error: () => {
        this.loading = false;
        this.error = true;
      },
    });
  }

  print() {
    this.ngZone.runOutsideAngular(() => window.print());
  }

  formatDate(d: string) {
    return new Date(d).toLocaleDateString('sk-SK');
  }

  formatEur(v: number | string) {
    return new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(+v);
  }
}
