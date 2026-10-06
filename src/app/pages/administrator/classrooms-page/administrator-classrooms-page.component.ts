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
import { BuscadorComponent, OpcionBuscador } from '../../../shared/buscador/buscador.component';
import { ExploradorSalonesComponent } from '../../../shared/explorador-salones/explorador-salones.component';

@Component({
  selector: 'app-administrator-classrooms-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ShellComponent, BuscadorComponent, ExploradorSalonesComponent],
  templateUrl: './administrator-classrooms-page.component.html',
  styleUrls: ['./administrator-classrooms-page.component.scss']
})
export class AdministratorClassroomsPageComponent implements OnInit {
  navItems = ADMINISTRATOR_NAV_ITEMS;
  userName = 'Coordinador';
  userAvatar = 'AD';
  toast = '';
  toastType = 'default';
  saving = false;

  /** El alta vive en un modal: accion ocasional, no merece columna fija. */
  mostrarAlta = false;
  abrirAlta()  { this.mostrarAlta = true; }
  cerrarAlta() { this.mostrarAlta = false; }
  loading = true;

  classrooms: any[] = [];
  teachers: any[] = [];
  /** Para el buscador: fijo, se arma al cargar. */
  opProfesores: OpcionBuscador[] = [];
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
        this.opProfesores = teachers.map((t: any) => ({ id: t.id, etiqueta: t.displayName || t.username, detalle: t.username }));
        // Despues de guardar se queda en el mismo salon, no salta al primero.
        this.selected = this.classrooms.find((c: any) => c.id === this.selected?.id) ?? this.classrooms[0] ?? null;
        this.syncEditForm();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.showToast('No se pudo cargar la informacion');
      }
    });
  }

  select(row: any) {
    const otro = this.selected?.id !== row.id;
    this.selected = row;
    this.syncEditForm();
    // En pantallas angostas el explorador queda arriba: baja al detalle.
    if (otro && window.innerWidth < 1100) {
      setTimeout(() => document.getElementById('sl-detalle')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
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

  deactivate(classroom: any) {
    if (!confirm(`¿Dar de baja "${classroom.name}"? Quedará inactivo.`)) return;
    this.saving = true;
    this.administratorApi.deactivateClassroom(classroom.id).subscribe({
      next: () => {
        this.showToast(`Salón "${classroom.name}" dado de baja`);
        this.saving = false;
        if (this.selected?.id === classroom.id) this.selected = null;
        this.load();
      },
      error: (e: any) => {
        this.saving = false;
        this.showToast(e?.error?.message ?? 'No se pudo dar de baja el salón');
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
