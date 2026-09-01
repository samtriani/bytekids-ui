import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShellComponent } from '../../../shared/shell/shell.component';
import { AuthService } from '../../../services/auth.service';
import { SubjectService } from '../../../services/api/subject-api.service';
import { AdministratorApiService } from '../../../services/api/administrator-api.service';
import { ContentApiService } from '../../../services/api/content-api.service';
import { catchError, of } from 'rxjs';
import { ADMINISTRATOR_NAV_ITEMS } from '../shared/administrator-nav';

@Component({
  selector: 'app-administrator-subjects-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ShellComponent],
  templateUrl: './administrator-subjects-page.component.html',
  styleUrls: ['./administrator-subjects-page.component.scss']
})
export class AdministratorSubjectsPageComponent implements OnInit {
  navItems = ADMINISTRATOR_NAV_ITEMS;
  userName = 'Coordinador';
  userAvatar = 'AD';
  toast = '';
  toastType = 'default';
  saving = false;
  loading = true;
  search = '';

  subjects: any[] = [];
  selected: any = null;

  // Temario de la materia seleccionada. GET /content solo devuelve lo publicado,
  // asi que los borradores del maestro no aparecen aqui.
  contenido: any[] = [];
  cargandoTemario = false;

  readonly TIPO = {
    mision:   { label: 'Misión',   icon: '🚀' },
    tarea:    { label: 'Tarea',    icon: '📋' },
    quiz:     { label: 'Quiz',     icon: '❓' },
    proyecto: { label: 'Proyecto', icon: '🏗️' },
    material: { label: 'Material', icon: '📚' },
  } as Record<string, { label: string; icon: string }>;

  tipoLabel(t: string): string { return this.TIPO[t]?.label ?? t; }
  tipoIcon(t: string):  string { return this.TIPO[t]?.icon  ?? '📄'; }

  get xpTotal():  number { return this.contenido.reduce((a, c) => a + (c.xpReward ?? 0), 0); }
  get minTotal(): number { return this.contenido.reduce((a, c) => a + (c.estimatedMinutes ?? 0), 0); }

  get duracionTotal(): string {
    const m = this.minTotal;
    if (!m) return '—';
    return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60 ? (m % 60) + ' min' : ''}`.trim();
  }

  private cargarTemario(subjectId: string) {
    if (!subjectId) { this.contenido = []; return; }
    this.cargandoTemario = true;
    this.contentApi.getAll().pipe(catchError(() => of([]))).subscribe(items => {
      this.contenido = (items ?? [])
        .filter((c: any) => c.subjectId === subjectId)
        .sort((a: any, b: any) => (a.orderIndex ?? 999) - (b.orderIndex ?? 999));
      this.cargandoTemario = false;
    });
  }
  createForm = { name: '', icon: '📘', color: '#06B6D4', description: '' };
  editForm = { id: '', name: '', icon: '', color: '#06B6D4', description: '' };

  constructor(
    private auth: AuthService,
    private subjectApi: SubjectService,
    private administratorApi: AdministratorApiService,
    private contentApi: ContentApiService
  ) {
    const currentUser = this.auth.getUser();
    if (currentUser) {
      this.userName = currentUser.displayName;
      this.userAvatar = currentUser.initials;
    }
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.subjectApi.getAll().subscribe({
      next: (rows) => {
        this.subjects = rows;
        this.selected = this.subjects[0] ?? null;
        this.syncEditForm();
        this.cargarTemario(this.selected?.id);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.showToast('No se pudieron cargar las materias');
      }
    });
  }

  get filteredSubjects() {
    const term = this.search.trim().toLowerCase();
    if (!term) return this.subjects;
    return this.subjects.filter((row) =>
      `${row.name} ${row.description ?? ''}`.toLowerCase().includes(term)
    );
  }

  select(row: any) {
    this.selected = row;
    this.syncEditForm();
    this.cargarTemario(row?.id);
  }

  create() {
    if (!this.createForm.name) return;
    this.saving = true;
    this.administratorApi.createSubject(this.createForm).subscribe({
      next: () => {
        this.createForm = { name: '', icon: '📘', color: '#06B6D4', description: '' };
        this.showToast('Materia creada correctamente');
        this.saving = false;
        this.load();
      },
      error: (error: any) => {
        this.saving = false;
        this.showToast(error?.error?.message ?? 'No se pudo crear la materia');
      }
    });
  }

  update() {
    if (!this.selected?.id) return;
    this.saving = true;
    this.subjectApi.update(this.selected.id, this.editForm).subscribe({
      next: () => {
        this.showToast('Materia actualizada correctamente');
        this.saving = false;
        this.load();
      },
      error: (error: any) => {
        this.saving = false;
        this.showToast(error?.error?.message ?? 'No se pudo actualizar la materia');
      }
    });
  }

  deactivate(subject: any) {
    if (!confirm(`¿Dar de baja "${subject.name}"? Quedará inactiva y no aparecerá en listas.`)) return;
    this.saving = true;
    this.subjectApi.deactivate(subject.id).subscribe({
      next: () => {
        this.showToast(`Materia "${subject.name}" dada de baja`);
        this.saving = false;
        if (this.selected?.id === subject.id) this.selected = null;
        this.load();
      },
      error: (error: any) => {
        this.saving = false;
        this.showToast(error?.error?.message ?? 'No se pudo dar de baja la materia');
      }
    });
  }

  private syncEditForm() {
    if (!this.selected) return;
    this.editForm = {
      id: this.selected.id,
      name: this.selected.name ?? '',
      icon: this.selected.icon ?? '',
      color: this.selected.color ?? '#06B6D4',
      description: this.selected.description ?? ''
    };
  }

  private showToast(message: string) {
    this.toast = message;
    this.toastType = resolveToastType(message);
    setTimeout(() => this.toast = '', 3500);
  }
}

function resolveToastType(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('actualiz') || m.includes('cambiad') || m.includes('guardad') || m.includes('editad')) return 'warn';
  if (m.includes('eliminad') || m.includes('removid') || m.includes('baja') || m.includes('quitad') || m.includes('desactivad') || m.includes('error')) return 'error';
  if (m.includes('cread') || m.includes('agregad') || m.includes('inscrit') || m.includes('asignad') || m.includes('alta')) return 'ok';
  return 'default';
}
