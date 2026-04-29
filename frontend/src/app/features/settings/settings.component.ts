import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { User } from '../../core/models';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  saving = signal(false);
  saved = signal(false);
  showKrosToken = signal(false);
  showTogglToken = signal(false);

  form: Partial<User> = {};

  constructor(public auth: AuthService, private api: ApiService) {}

  ngOnInit() {
    const u = this.auth.user();
    if (u) {
      this.form = {
        togglApiToken: u.togglApiToken || '',
        togglWorkspaceId: u.togglWorkspaceId || '',
        krosApiToken: u.krosApiToken || '',
        defaultHourlyRate: u.defaultHourlyRate,
        defaultVatRate: u.defaultVatRate,
        currency: u.currency || 'EUR',
        invoiceDueDays: u.invoiceDueDays || 14,
        supplierName: u.supplierName || '',
        supplierIco: u.supplierIco || '',
        supplierDic: u.supplierDic || '',
        supplierIcDph: u.supplierIcDph || '',
        supplierAddress: u.supplierAddress || '',
        supplierCity: u.supplierCity || '',
        supplierZip: u.supplierZip || '',
        supplierIban: u.supplierIban || '',
      };
    }
  }

  save() {
    this.saving.set(true);
    this.api.updateSettings(this.form).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.set(true);
        this.auth.loadUser();
        setTimeout(() => this.saved.set(false), 3000);
      },
      error: () => this.saving.set(false),
    });
  }
}
