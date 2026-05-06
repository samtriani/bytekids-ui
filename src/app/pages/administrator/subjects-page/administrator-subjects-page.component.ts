import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShellComponent } from '../../../shared/shell/shell.component';
import { AuthService } from '../../../services/auth.service';
import { SubjectService } from '../../../services/api/subject-api.service';
import { AdministratorApiService } from '../../../services/api/administrator-api.service';
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
  createForm = { name: '', icon: '📘', color: '#06B6D4', description: '' };
  editForm = { id: '', name: '', icon: '', color: '#06B6D4', description: '' };

  constructor(
    private auth: AuthService,
    private subjectApi: SubjectService,
    private administratorApi: AdministratorApiService
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
