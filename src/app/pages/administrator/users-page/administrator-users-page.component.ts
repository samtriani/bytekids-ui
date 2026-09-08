import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RolePipe } from '../../../shared/pipes/role.pipe';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ShellComponent } from '../../../shared/shell/shell.component';
import { AuthService } from '../../../services/auth.service';
import { UserApiService } from '../../../services/api/user-api.service';
import { AdministratorApiService } from '../../../services/api/administrator-api.service';
import { ContentApiService } from '../../../services/api/content-api.service';
import { SubjectService } from '../../../services/api/subject-api.service';
import { ClassroomApiService } from '../../../services/api/classroom-api.service';
import { ScheduleApiService } from '../../../services/api/schedule-api.service';
import { ADMINISTRATOR_NAV_ITEMS } from '../shared/administrator-nav';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-administrator-users-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ShellComponent, RolePipe],
  templateUrl: './administrator-users-page.component.html',
  styleUrls: ['./administrator-users-page.component.scss']
})
export class AdministratorUsersPageComponent implements OnInit {
  navItems = ADMINISTRATOR_NAV_ITEMS;
  userName = 'Coordinador';
  userAvatar = 'AD';
  toast = '';
  toastType = 'default';
  saving = false;

  /** El alta vive en un modal: es una accion ocasional y no merece columna fija. */
  mostrarAlta = false;
  abrirAlta()  { this.mostrarAlta = true; }
  cerrarAlta() { this.mostrarAlta = false; }
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
  selectedTeacherClassrooms: any[] = [];
  teacherSchedules: any[] = [];
  classroomStudents: Record<string, any[]> = {};

  createForm = { displayName: '', username: '', password: '', email: '', age: null as number | null, address: '' };
  editForm   = { id: '', username: '', displayName: '', initials: '', password: '', email: '', age: null as number | null, address: '' };

  constructor(
    private route: ActivatedRoute,
    private auth: AuthService,
    private userApi: UserApiService,
    private administratorApi: AdministratorApiService,
    private contentApi: ContentApiService,
    private subjectApi: SubjectService,
    private classroomApi: ClassroomApiService,
    private scheduleApi: ScheduleApiService
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
        this.loading = false;
        this.select(this.rows[0] ?? null);
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

  private readonly DAY_ORDER: Record<string, number> = {
    MONDAY:1, TUESDAY:2, WEDNESDAY:3, THURSDAY:4, FRIDAY:5, SATURDAY:6, SUNDAY:7,
    lunes:1,  martes:2,  miercoles:3, jueves:4,   viernes:5, sabado:6,   domingo:7,
  };

  schedulesForClassroom(classroomId: string): any[] {
    return this.teacherSchedules
      .filter(s => s.classroomId === classroomId)
      .sort((a, b) => (this.DAY_ORDER[a.dayOfWeek] ?? 9) - (this.DAY_ORDER[b.dayOfWeek] ?? 9));
  }

  readonly DAY_ABBR: Record<string, string> = {
    lunes:'Lun', martes:'Mar', miercoles:'Mié', jueves:'Jue', viernes:'Vie', sabado:'Sáb',
    MONDAY:'Lun', TUESDAY:'Mar', WEDNESDAY:'Mié', THURSDAY:'Jue', FRIDAY:'Vie', SATURDAY:'Sáb', SUNDAY:'Dom',
  };

  select(row: any) {
    this.selected = row;
    this.syncEditForm();
    this.selectedTeacherClassrooms = [];
    this.teacherSchedules = [];
    this.classroomStudents = {};
    this.membresia = [];
    this.materiaMembresia = '';
    if (this.mode === 'students' && row?.id) {
      this.cargarMaterias();
      this.cargarMembresia(row.id);
    }
    if (this.mode === 'teachers' && row?.id) {
      forkJoin({
        classrooms: this.classroomApi.getByTeacher(row.id).pipe(catchError(() => of([]))),
        schedules:  this.scheduleApi.getByTeacher(row.id).pipe(catchError(() => of([]))),
      }).subscribe(({ classrooms, schedules }) => {
        this.selectedTeacherClassrooms = classrooms;
        this.teacherSchedules = schedules;
        if (classrooms.length) {
          forkJoin(
            (classrooms as any[]).map((c: any) =>
              this.classroomApi.getStudents(c.id).pipe(catchError(() => of([])))
            )
          ).subscribe(studentLists => {
            const map: Record<string, any[]> = {};
            (classrooms as any[]).forEach((c: any, i: number) => {
              map[c.id] = (studentLists as any[][])[i];
            });
            this.classroomStudents = map;
          });
        }
      });
    }
  }

  studentsForClassroom(classroomId: string): any[] {
    return this.classroomStudents[classroomId] ?? [];
  }

  create() {
    if (!this.createForm.displayName || !this.createForm.username || !this.createForm.password) return;
    this.saving = true;
    this.administratorApi.createUser({
      displayName: this.createForm.displayName,
      username: this.createForm.username.trim().toLowerCase(),
      password: this.createForm.password,
      role: this.role,
      initials: this.buildInitials(this.createForm.displayName),
      age: this.createForm.age,
      email:   this.createForm.email?.trim() || null,
      address: this.createForm.address || null,
    }).subscribe({
      next: () => {
        this.createForm = { displayName: '', username: '', password: '', email: '', age: null, address: '' };
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
      initials: this.editForm.initials || this.buildInitials(this.editForm.displayName),
      age: this.editForm.age,
      email:   this.editForm.email?.trim() || null,
      address: this.editForm.address || null,
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
      id:          this.selected.id,
      username:    this.selected.username    ?? '',
      displayName: this.selected.displayName ?? '',
      initials:    this.selected.initials    ?? '',
      password:    '',
      email:       this.selected.email       ?? '',
      age:         this.selected.age         ?? null,
      address:     this.selected.address     ?? '',
    };
  }

  /** En un alumno el correo es del tutor: el niño no tiene, y es a quien
   *  hay que avisarle de pagos, recuperaciones y avisos. */
  get notaCorreo(): string {
    return this.mode === 'students'
      ? 'Del padre o tutor. Es a donde llegarán los avisos y la recuperación de contraseña.'
      : 'Para avisos y recuperación de contraseña.';
  }

  // ── Membresia de solo contenido ─────────────────────────────────────
  // Le da al alumno el temario y el tutor de IA sin meterlo a un salon.
  // Las clases en vivo no entran: cuelgan del horario de un salon.
  materias: any[]            = [];
  membresia: any[]           = [];
  cargandoMembresia          = false;
  materiaMembresia           = '';
  guardandoMembresia         = false;

  private cargarMaterias() {
    if (this.materias.length) return;
    this.subjectApi.getAll().pipe(catchError(() => of([])))
      .subscribe(m => this.materias = m ?? []);
  }

  private cargarMembresia(studentId: string) {
    this.cargandoMembresia = true;
    this.membresia = [];
    this.contentApi.assignedDirectlyTo(studentId)
      .pipe(catchError(() => of([])))
      .subscribe(items => {
        this.membresia = items ?? [];
        this.cargandoMembresia = false;
      });
  }

  /** Agrupada por materia: cada materia es una membresia que se da o se quita. */
  get membresiaPorMateria(): { id: string; nombre: string; icono: string; piezas: number }[] {
    const mapa = new Map<string, { id: string; nombre: string; icono: string; piezas: number }>();
    for (const c of this.membresia) {
      const id = c.subjectId ?? 'sin-materia';
      if (!mapa.has(id)) {
        mapa.set(id, { id, nombre: c.subjectName ?? 'Sin materia',
                       icono: c.subjectIcon ?? '📚', piezas: 0 });
      }
      mapa.get(id)!.piezas++;
    }
    return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  /** No ofrece materias que el alumno ya tiene a titulo personal. */
  get materiasDisponibles(): any[] {
    const yaTiene = new Set(this.membresiaPorMateria.map(m => m.id));
    return this.materias.filter(m => !yaTiene.has(m.id));
  }

  darMembresia() {
    const alumno = this.selected?.id;
    if (!this.materiaMembresia || !alumno || this.guardandoMembresia) return;
    this.guardandoMembresia = true;
    this.contentApi.assignSubjectToStudent(this.materiaMembresia, alumno).subscribe({
      next: (n) => {
        this.guardandoMembresia = false;
        this.materiaMembresia = '';
        this.cargarMembresia(alumno);
        this.showToast(n ? `${n} piezas asignadas` : 'El alumno ya tenía esa materia');
      },
      error: (e) => {
        this.guardandoMembresia = false;
        this.showToast(e?.error?.message ?? 'No se pudo dar la membresía');
      },
    });
  }

  quitarMembresia(m: { id: string; nombre: string }) {
    const alumno = this.selected?.id;
    if (!alumno) return;
    this.contentApi.unassignSubjectFromStudent(m.id, alumno).subscribe({
      next: () => {
        this.cargarMembresia(alumno);
        this.showToast(`Se dio de baja "${m.nombre}"`);
      },
      error: (e) => this.showToast(e?.error?.message ?? 'No se pudo dar de baja'),
    });
  }

  private buildInitials(name: string) {
    return name.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase();
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
