import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Project } from '../../core/models';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss',
})
export class ProjectsComponent implements OnInit {
  projects = signal<Project[]>([]);
  loading = signal(true);
  editingId = signal<string | null>(null);
  editRate = signal<number | null>(null);

  constructor(private api: ApiService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.getProjects().subscribe({
      next: (p) => { this.projects.set(p); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  startEdit(p: Project) {
    this.editingId.set(p.id);
    this.editRate.set(p.hourlyRate ?? null);
  }

  saveRate(p: Project) {
    this.api.updateProject(p.id, { hourlyRate: this.editRate() ?? undefined }).subscribe({
      next: () => { this.editingId.set(null); this.load(); },
    });
  }
}
