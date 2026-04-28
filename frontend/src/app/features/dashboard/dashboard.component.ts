import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { Stats, MonthlyEarning } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  stats = signal<Stats | null>(null);
  earnings = signal<MonthlyEarning[]>([]);
  loading = signal(true);

  readonly currentYear = new Date().getFullYear();
  readonly months = ['Jan', 'Feb', 'Mar', 'Apr', 'Máj', 'Jún', 'Júl', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];

  constructor(private api: ApiService) {}

  ngOnInit() {
    Promise.all([
      this.api.getStats().toPromise(),
      this.api.getMonthlyEarnings(this.currentYear).toPromise(),
    ]).then(([stats, earnings]) => {
      this.stats.set(stats || null);
      this.earnings.set(earnings || []);
      this.loading.set(false);
    }).catch(() => this.loading.set(false));
  }

  get maxEarning(): number {
    return Math.max(...this.earnings().map(e => e.amount), 1);
  }

  barHeight(amount: number): number {
    return Math.round((amount / this.maxEarning) * 100);
  }

  formatEur(value: number): string {
    return new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(value);
  }
}
