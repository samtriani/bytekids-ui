import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShellComponent } from '../../../shared/shell/shell.component';
import { ADMINISTRATOR_NAV_ITEMS } from '../shared/administrator-nav';
import { UserApiService, CreateUserPayload } from '../../../services/api/user-api.service';
import { AuthService } from '../../../services/auth.service';
import { catchError, forkJoin, of } from 'rxjs';

type StaffRole = 'admin' | 'director';

const ROLE_LABEL: Record<StaffRole, string> = {
  admin:    'Coordinador',
  director: 'Director',
};

@Component({
  selector: 'app-administrator-staff-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ShellComponent],
  templateUrl: './administrator-staff-page.component.html',
  styleUrls: ['./administrator-staff-page.component.scss']
})
export class AdministratorStaffPageComponent implements OnInit {
  navItems   = ADMINISTRATOR_NAV_ITEMS;
  userName   = 'Coordinador';
  userAvatar = 'CO';

  readonly ROLE_LABEL = ROLE_LABEL;
  readonly roles: StaffRole[] = ['admin', 'director'];

  staff: any[] = [];
  loading = true;

  // Formulario de alta
  form: { displayName: string; username: string; password: string; role: StaffRole } = {
    displayName: '', username: '', password: '', role: 'admin',
  };
  saving = false;

  // Feedback
  okMsg    = '';
  errorMsg = '';

  // Confirmación de baja
  pendingRemoval: any = null;

  constructor(private userApi: UserApiService, private auth: AuthService) {
    const u = this.auth.getUser();
    if (u) { this.userName = u.displayName; this.userAvatar = u.initials; }
  }

  get currentUsername(): string { return this.auth.getUser()?.username ?? ''; }

  /** El backend devuelve el rol crudo ('admin'), aquí se traduce a la etiqueta. */
  roleLabel(role: string): string {
    return ROLE_LABEL[role as StaffRole] ?? role;
  }

  get canSubmit(): boolean {
    return !this.saving
      && this.form.displayName.trim().length > 1
      && this.form.username.trim().length >= 3
      && this.form.password.length >= 6;
  }

  ngOnInit() { this.load(); }

  private load() {
    this.loading = true;
    forkJoin({
      admins:    this.userApi.getByRole('admin').pipe(catchError(() => of([]))),
      directors: this.userApi.getByRole('director').pipe(catchError(() => of([]))),
    }).subscribe(({ admins, directors }) => {
      this.staff = [...admins, ...directors]
        .sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? ''));
      this.loading = false;
    });
  }

  /** Inicial(es) sugeridas a partir del nombre, como hace el resto de la app. */
  private initialsFor(name: string): string {
    return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  submit() {
    if (!this.canSubmit) return;
    this.saving   = true;
    this.okMsg    = '';
    this.errorMsg = '';

    const payload: CreateUserPayload = {
      username:    this.form.username.trim().toLowerCase(),
      password:    this.form.password,
      displayName: this.form.displayName.trim(),
      role:        this.form.role,
      initials:    this.initialsFor(this.form.displayName),
    };

    this.userApi.create(payload).subscribe({
      next: () => {
        this.okMsg = `${ROLE_LABEL[this.form.role]} "${payload.displayName}" dado de alta.`;
        this.form  = { displayName: '', username: '', password: '', role: 'admin' };
        this.saving = false;
        this.load();
      },
      error: (e) => {
        this.errorMsg = e?.error?.message ?? 'No se pudo dar de alta la cuenta.';
        this.saving   = false;
      },
    });
  }

  askRemove(person: any) {
    this.pendingRemoval = person;
  }

  cancelRemove() { this.pendingRemoval = null; }

  confirmRemove() {
    const person = this.pendingRemoval;
    if (!person) return;
    this.pendingRemoval = null;
    this.okMsg = '';
    this.errorMsg = '';

    this.userApi.deactivate(person.id).subscribe({
      next: () => {
        this.okMsg = `Se desactivó la cuenta de ${person.displayName}.`;
        this.load();
      },
      error: (e) => this.errorMsg = e?.error?.message ?? 'No se pudo desactivar la cuenta.',
    });
  }

  dismiss() { this.okMsg = ''; this.errorMsg = ''; }
}
