import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShellComponent } from '../../../shared/shell/shell.component';
import { AuthService } from '../../../services/auth.service';
import { UserApiService } from '../../../services/api/user-api.service';
import { AdministratorApiService } from '../../../services/api/administrator-api.service';
import { ADMINISTRATOR_NAV_ITEMS } from '../shared/administrator-nav';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-administrator-parents-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ShellComponent],
  templateUrl: './administrator-parents-page.component.html',
  styleUrls: ['./administrator-parents-page.component.scss']
})
export class AdministratorParentsPageComponent implements OnInit {
  navItems = ADMINISTRATOR_NAV_ITEMS;
  userName  = 'Coordinador';
  userAvatar = 'AD';

  toast     = '';
  toastType = 'default';
  saving    = false;
  loading   = true;

  search       = '';
  searchChild  = '';
  parents:  any[] = [];
  allStudents: any[] = [];
  selected: any = null;
  linkedChildren: any[] = [];
  loadingChildren = false;
  linking   = false;
  confirmUnlinkId: string | null = null;

  createForm = { displayName:'', username:'', password:'', age: null as number|null, address:'' };
  editForm   = { id:'', username:'', displayName:'', initials:'', password:'', age: null as number|null, address:'' };

  constructor(
    private auth: AuthService,
    private userApi: UserApiService,
    private administratorApi: AdministratorApiService
  ) {
    const u = this.auth.getUser();
    if (u) { this.userName = u.displayName; this.userAvatar = u.initials; }
  }

  ngOnInit(): void {
    forkJoin({
      parents:  this.userApi.getParents().pipe(catchError(() => of([]))),
      students: this.userApi.getStudents().pipe(catchError(() => of([]))),
    }).subscribe(({ parents, students }) => {
      this.parents     = parents;
      this.allStudents = students;
      this.loading     = false;
      if (parents.length) this.select(parents[0]);
    });
  }

  get filteredParents(): any[] {
    const t = this.search.trim().toLowerCase();
    return t ? this.parents.filter(p =>
      `${p.displayName} ${p.username}`.toLowerCase().includes(t)) : this.parents;
  }

  get availableToLink(): any[] {
    const linkedIds = new Set(this.linkedChildren.map((c: any) => c.id));
    const t = this.searchChild.trim().toLowerCase();
    return this.allStudents
      .filter(s => !linkedIds.has(s.id))
      .filter(s => !t || `${s.displayName} ${s.username}`.toLowerCase().includes(t));
  }

  select(parent: any): void {
    this.selected       = parent;
    this.searchChild    = '';
    this.confirmUnlinkId = null;
    this.syncEditForm();
    this.loadChildren(parent.id);
  }

  private loadChildren(parentId: string): void {
    this.loadingChildren = true;
    this.linkedChildren  = [];
    this.userApi.getStudentsOfParent(parentId).pipe(catchError(() => of([]))).subscribe(kids => {
      this.linkedChildren  = kids;
      this.loadingChildren = false;
    });
  }

  linkStudent(student: any): void {
    if (!this.selected || this.linking) return;
    this.linking = true;
    this.userApi.linkStudent(this.selected.id, student.id).subscribe({
      next: () => {
        this.linkedChildren = [...this.linkedChildren, student];
        this.searchChild = '';
        this.linking = false;
        this.showToast(`${student.displayName} vinculado correctamente`);
      },
      error: (e: any) => {
        this.linking = false;
        this.showToast(e?.error?.message ?? 'No se pudo vincular al alumno');
      }
    });
  }

  unlinkStudent(child: any): void {
    if (!this.selected) return;
    this.userApi.unlinkStudent(this.selected.id, child.id).subscribe({
      next: () => {
        this.linkedChildren = this.linkedChildren.filter(c => c.id !== child.id);
        this.confirmUnlinkId = null;
        this.showToast(`${child.displayName} desvinculado`);
      },
      error: (e: any) => {
        this.confirmUnlinkId = null;
        this.showToast(e?.error?.message ?? 'No se pudo desvincular');
      }
    });
  }

  create(): void {
    if (!this.createForm.displayName || !this.createForm.username || !this.createForm.password) return;
    this.saving = true;
    this.administratorApi.createUser({
      displayName: this.createForm.displayName,
      username:    this.createForm.username.trim().toLowerCase(),
      password:    this.createForm.password,
      role:        'parent',
      initials:    this.buildInitials(this.createForm.displayName),
      age:         this.createForm.age,
      address:     this.createForm.address || null,
    }).subscribe({
      next: (newParent: any) => {
        this.createForm = { displayName:'', username:'', password:'', age:null, address:'' };
        this.saving = false;
        this.showToast('Padre/Madre creado correctamente');
        this.userApi.getParents().pipe(catchError(() => of([]))).subscribe(p => {
          this.parents = p;
          const created = p.find((x: any) => x.id === newParent?.id) ?? p[p.length - 1];
          if (created) this.select(created);
        });
      },
      error: (e: any) => {
        this.saving = false;
        this.showToast(e?.error?.message ?? 'No se pudo crear el registro');
      }
    });
  }

  update(): void {
    if (!this.selected?.id) return;
    this.saving = true;
    this.userApi.update(this.selected.id, {
      username:    this.editForm.username.trim().toLowerCase(),
      displayName: this.editForm.displayName,
      password:    this.editForm.password || undefined,
      role:        'parent',
      initials:    this.editForm.initials || this.buildInitials(this.editForm.displayName),
      age:         this.editForm.age,
      address:     this.editForm.address || null,
    }).subscribe({
      next: () => {
        this.saving = false;
        this.editForm.password = '';
        this.showToast('Datos actualizados correctamente');
        this.userApi.getParents().pipe(catchError(() => of([]))).subscribe(p => {
          this.parents  = p;
          this.selected = p.find((x: any) => x.id === this.selected.id) ?? this.selected;
          this.syncEditForm();
        });
      },
      error: (e: any) => {
        this.saving = false;
        this.showToast(e?.error?.message ?? 'No se pudo actualizar');
      }
    });
  }

  deactivate(): void {
    if (!this.selected?.id) return;
    this.saving = true;
    this.userApi.deactivate(this.selected.id).subscribe({
      next: () => {
        this.saving = false;
        this.showToast('Padre/Madre desactivado');
        this.userApi.getParents().pipe(catchError(() => of([]))).subscribe(p => {
          this.parents  = p;
          this.selected = p[0] ?? null;
          if (this.selected) this.select(this.selected);
        });
      },
      error: (e: any) => {
        this.saving = false;
        this.showToast(e?.error?.message ?? 'No se pudo desactivar');
      }
    });
  }

  private syncEditForm(): void {
    if (!this.selected) return;
    this.editForm = {
      id:          this.selected.id,
      username:    this.selected.username    ?? '',
      displayName: this.selected.displayName ?? '',
      initials:    this.selected.initials    ?? '',
      password:    '',
      age:         this.selected.age         ?? null,
      address:     this.selected.address     ?? '',
    };
  }

  private buildInitials(name: string): string {
    return name.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
  }

  private showToast(msg: string): void {
    this.toast     = msg;
    this.toastType = resolveType(msg);
    setTimeout(() => this.toast = '', 3500);
  }
}

function resolveType(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('actualiz') || m.includes('cambiad')) return 'warn';
  if (m.includes('desvinculad') || m.includes('desactivad') || m.includes('error') || m.includes('pudo')) return 'error';
  if (m.includes('cread') || m.includes('vinculad') || m.includes('correctamente')) return 'ok';
  return 'default';
}
