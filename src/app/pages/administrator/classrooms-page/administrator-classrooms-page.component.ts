import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ShellComponent } from '../../../shared/shell/shell.component';
import { AuthService } from '../../../services/auth.service';
import { ClassroomApiService } from '../../../services/api/classroom-api.service';
import { UserApiService } from '../../../services/api/user-api.service';
import { AdministratorApiService } from '../../../services/api/administrator-api.service';
import { ADMINISTRATOR_NAV_ITEMS } from '../shared/administrator-nav';

@Component({
  selector: 'app-administrator-classrooms-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ShellComponent],
  templateUrl: './administrator-classrooms-page.component.html',
  styleUrls: ['./administrator-classrooms-page.component.scss']
})
export class AdministratorClassroomsPageComponent implements OnInit {
  navItems = ADMINISTRATOR_NAV_ITEMS;
  userName = 'Administrador';
  userAvatar = 'AD';
  toast = '';
  saving = false;
  loading = true;
  search = '';

  classrooms: any[] = [];
  teachers: any[] = [];
  selected: any = null;

  createForm = { name: '', gradeLevel: 1, section: 'A', description: '', teacherId: '', schoolYear: '2025-2026' };
  editForm = { id: '', name: '', gradeLevel: 1, section: '', description: '', teacherId: '', schoolYear: '' };

  constructor(
    private auth: AuthService,
    private classroomApi: ClassroomApiService,
    private userApi: UserApiService,
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
    forkJoin({
      classrooms: this.classroomApi.getAll(),
      teachers: this.userApi.getTeachers()
    }).subscribe({
      next: ({ classrooms, teachers }) => {
        this.classrooms = classrooms;
        this.teachers = teachers;
        this.selected = this.classrooms[0] ?? null;
        this.syncEditForm();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.showToast('No se pudo cargar la informacion');
      }
    });
  }

  get filteredClassrooms() {
    const term = this.search.trim().toLowerCase();
    if (!term) return this.classrooms;
    return this.classrooms.filter((row) =>
      `${row.name} ${row.section} ${row.schoolYear} ${row.teacherName ?? ''}`.toLowerCase().includes(term)
    );
  }

  select(row: any) {
    this.selected = row;
    this.syncEditForm();
  }

  create() {
    if (!this.createForm.name || !this.createForm.section) return;
    this.saving = true;
    this.administratorApi.createClassroom({
      ...this.createForm,
      teacherId: this.createForm.teacherId || null
    }).subscribe({
      next: () => {
        this.createForm = { name: '', gradeLevel: 1, section: 'A', description: '', teacherId: '', schoolYear: '2025-2026' };
        this.showToast('Salon creado correctamente');
        this.saving = false;
        this.load();
      },
      error: (error: any) => {
        this.saving = false;
        this.showToast(error?.error?.message ?? 'No se pudo crear el salon');
      }
    });
  }

  update() {
    if (!this.selected?.id) return;
    this.saving = true;
    this.classroomApi.update(this.selected.id, {
      ...this.editForm,
      teacherId: this.editForm.teacherId || null
    }).subscribe({
      next: () => {
        this.showToast('Salon actualizado correctamente');
        this.saving = false;
        this.load();
      },
      error: (error: any) => {
        this.saving = false;
        this.showToast(error?.error?.message ?? 'No se pudo actualizar el salon');
      }
    });
  }

  private syncEditForm() {
    if (!this.selected) return;
    this.editForm = {
      id: this.selected.id,
      name: this.selected.name ?? '',
      gradeLevel: this.selected.gradeLevel ?? 1,
      section: this.selected.section ?? '',
      description: this.selected.description ?? '',
      teacherId: this.selected.teacherId ?? '',
      schoolYear: this.selected.schoolYear ?? ''
    };
  }

  private showToast(message: string) {
    this.toast = message;
    setTimeout(() => this.toast = '', 3500);
  }
}
