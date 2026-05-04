import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RolePipe } from '../../../shared/pipes/role.pipe';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ShellComponent } from '../../../shared/shell/shell.component';
import { AuthService } from '../../../services/auth.service';
import { UserApiService } from '../../../services/api/user-api.service';
import { AdministratorApiService } from '../../../services/api/administrator-api.service';
import { ADMINISTRATOR_NAV_ITEMS } from '../shared/administrator-nav';

@Component({
  selector: 'app-administrator-users-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ShellComponent, RolePipe],
  templateUrl: './administrator-users-page.component.html',
  styleUrls: ['./administrator-users-page.component.scss']
})
export class AdministratorUsersPageComponent implements OnInit {
  navItems = ADMINISTRATOR_NAV_ITEMS;
  userName = 'Administrador';
  userAvatar = 'AD';
  toast = '';
  saving = false;
  loading = true;
  search = '';

  mode: 'teachers' | 'students' = 'teachers';
  role: 'teacher' | 'student' = 'teacher';
  title = 'Profesores';
  subtitle = 'Alta y edicion de profesores';
  emptyMessage = 'Aun no hay profesores registrados.';
  createLabel = 'Crear profesor';

  rows: any[] = [];
  selected: any = null;

  createForm = { displayName: '', username: '', password: '' };
  editForm = { id: '', username: '', displayName: '', initials: '', password: '' };

  constructor(
    private route: ActivatedRoute,
    private auth: AuthService,
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
    const routeMode = this.route.snapshot.data['mode'] as 'teachers' | 'students';
    this.mode = routeMode ?? 'teachers';
    this.role = this.mode === 'teachers' ? 'teacher' : 'student';
    this.title = this.mode === 'teachers' ? 'Profesores' : 'Alumnos';
    this.subtitle = this.mode === 'teachers'
      ? 'Da de alta profesores y actualiza sus datos principales.'
      : 'Da de alta alumnos y administra su informacion basica.';
    this.emptyMessage = this.mode === 'teachers'
      ? 'Aun no hay profesores registrados.'
      : 'Aun no hay alumnos registrados.';
    this.createLabel = this.mode === 'teachers' ? 'Crear profesor' : 'Crear alumno';
    this.load();
  }

  load() {
    this.loading = true;
    this.userApi.getByRole(this.role).subscribe({
      next: (rows) => {
        this.rows = rows;
        this.selected = this.rows[0] ?? null;
        this.syncEditForm();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.showToast('No se pudo cargar la informacion');
      }
    });
  }

  get filteredRows() {
    const term = this.search.trim().toLowerCase();
    if (!term) return this.rows;
    return this.rows.filter((row) =>
      `${row.displayName} ${row.username} ${row.initials ?? ''}`.toLowerCase().includes(term)
    );
  }

  select(row: any) {
    this.selected = row;
    this.syncEditForm();
  }

  create() {
    if (!this.createForm.displayName || !this.createForm.username || !this.createForm.password) return;
    this.saving = true;
    this.administratorApi.createUser({
      displayName: this.createForm.displayName,
      username: this.createForm.username.trim().toLowerCase(),
      password: this.createForm.password,
      role: this.role,
      initials: this.buildInitials(this.createForm.displayName)
    }).subscribe({
      next: () => {
        this.createForm = { displayName: '', username: '', password: '' };
        this.showToast(`${this.mode === 'teachers' ? 'Profesor' : 'Alumno'} creado correctamente`);
        this.saving = false;
        this.load();
      },
      error: (error: any) => {
        this.saving = false;
        this.showToast(error?.error?.message ?? 'No se pudo crear el registro');
      }
    });
  }

  update() {
    if (!this.selected?.id) return;
    this.saving = true;
    this.userApi.update(this.selected.id, {
      username: this.editForm.username.trim().toLowerCase(),
      displayName: this.editForm.displayName,
      password: this.editForm.password || undefined,
      role: this.role,
      initials: this.editForm.initials || this.buildInitials(this.editForm.displayName)
    }).subscribe({
      next: () => {
        this.showToast('Datos actualizados correctamente');
        this.editForm.password = '';
        this.saving = false;
        this.load();
      },
      error: (error: any) => {
        this.saving = false;
        this.showToast(error?.error?.message ?? 'No se pudo actualizar el registro');
      }
    });
  }

  deactivate() {
    if (!this.selected?.id) return;
    this.saving = true;
    this.userApi.deactivate(this.selected.id).subscribe({
      next: () => {
        this.showToast(`${this.mode === 'teachers' ? 'Profesor' : 'Alumno'} desactivado correctamente`);
        this.saving = false;
        this.load();
      },
      error: (error: any) => {
        this.saving = false;
        this.showToast(error?.error?.message ?? 'No se pudo desactivar el registro');
      }
    });
  }

  private syncEditForm() {
    if (!this.selected) return;
    this.editForm = {
      id: this.selected.id,
      username: this.selected.username ?? '',
      displayName: this.selected.displayName ?? '',
      initials: this.selected.initials ?? '',
      password: ''
    };
  }

  private buildInitials(name: string) {
    return name.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase();
  }

  private showToast(message: string) {
    this.toast = message;
    setTimeout(() => this.toast = '', 3500);
  }
}
