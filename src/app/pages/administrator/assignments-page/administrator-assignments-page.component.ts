import { Component, OnInit } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { ShellComponent } from '../../../shared/shell/shell.component';
import { AuthService } from '../../../services/auth.service';
import { UserApiService } from '../../../services/api/user-api.service';
import { ClassroomApiService } from '../../../services/api/classroom-api.service';
import { AdministratorApiService } from '../../../services/api/administrator-api.service';
import { SubjectService } from '../../../services/api/subject-api.service';
import { ContentApiService } from '../../../services/api/content-api.service';
import { ScheduleApiService } from '../../../services/api/schedule-api.service';
import { ADMINISTRATOR_NAV_ITEMS } from '../shared/administrator-nav';
import { escaparHtml } from '../../../shared/formato-chat';
import { BuscadorComponent, OpcionBuscador, normalizar } from '../../../shared/buscador/buscador.component';
import { ExploradorSalonesComponent } from '../../../shared/explorador-salones/explorador-salones.component';

@Component({
  selector: 'app-administrator-assignments-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ShellComponent, TitleCasePipe, BuscadorComponent, ExploradorSalonesComponent],
  templateUrl: './administrator-assignments-page.component.html',
  styleUrls: ['./administrator-assignments-page.component.scss']
})
export class AdministratorAssignmentsPageComponent implements OnInit {
  navItems = ADMINISTRATOR_NAV_ITEMS;
  userName = 'Coordinador';
  userAvatar = 'AD';
  toast = '';
  toastType = 'default';
  saving = false;

  classrooms: any[] = [];
  teachers:   any[] = [];
  students:   any[] = [];
  subjects:   any[] = [];   // catálogo global

  selectedClassroom:         any    = null;
  selectedClassroomStudents: any[]  = [];
  selectedClassroomSubjects: any[]  = [];

  // ── Contenido del salon ───────────────────────────────────────────────
  // El alumno ve el contenido por content_assignments, no por la materia
  // del salon: asignar la materia no le entrega ninguna pieza.
  contenidoDelSalon: any[] = [];
  cargandoContenido        = false;
  materiaAAsignar          = '';
  catalogo: any[]          = [];      // todo el contenido publicado
  piezasElegidas           = new Set<string>();
  piezaEnBaja: any         = null;

  teacherAssignment = { classroomId: '', teacherId: '' };
  studentAssignment = { classroomId: '', studentId: '' };
  subjectIdToAdd    = '';

  // Horario
  schedules: any[] = [];
  readonly DAYS = ['lunes','martes','miercoles','jueves','viernes','sabado'];
  // Alta: varios dias a la vez. Una clase de lunes/miercoles/viernes son tres
  // registros en class_schedules, y antes habia que capturarla tres veces.
  scheduleForm = { subjectId: '', teacherId: '', startTime: '08:00', endTime: '09:00', startDate: '', endDate: '' };
  diasSeleccionados: string[] = ['lunes'];

  toggleDia(dia: string) {
    this.diasSeleccionados = this.diasSeleccionados.includes(dia)
      ? this.diasSeleccionados.filter(d => d !== dia)
      : [...this.diasSeleccionados, dia];
  }

  esDiaActivo(dia: string): boolean { return this.diasSeleccionados.includes(dia); }

  /**
   * Hereda materia, maestro, horas y fechas del horario que ya tiene el salon.
   * Agregar un dia a un curso en marcha es lo mas comun —por ejemplo al volver
   * a poner uno que se borro— y antes obligaba a recapturarlo todo identico.
   * Solo llena lo que este vacio: nunca pisa algo que el usuario ya escribio.
   */
  private precargarDesdeHorarioExistente() {
    const f = this.scheduleForm;
    if (f.subjectId || f.teacherId || f.startDate || f.endDate) return;
    this.faltaHorario = false;

    const ref = this.schedules?.[0];
    if (!ref) {
      // Salon nuevo, sin horario: lo que el salon ya sabe. Su maestro
      // titular y, si solo tiene una materia, esa. Antes habia que
      // escogerlas a mano y, si no, el boton se quedaba mudo.
      f.teacherId = this.selectedClassroom?.teacherId ?? '';
      if (this.selectedClassroomSubjects?.length === 1) f.subjectId = this.selectedClassroomSubjects[0].id;
      return;
    }

    f.subjectId = ref.subjectId ?? '';
    f.teacherId = ref.teacherId ?? '';
    f.startTime = (ref.startTime ?? '08:00').substring(0, 5);
    f.endTime   = (ref.endTime   ?? '09:00').substring(0, 5);
    f.startDate = ref.startDate ?? '';
    f.endDate   = ref.endDate ?? '';

    // Deja marcados solo los dias que al salon le faltan.
    const yaCubiertos = new Set(this.schedules.map((s: any) => s.dayOfWeek));
    const faltantes = this.DAYS.filter(d => !yaCubiertos.has(d));
    if (faltantes.length) this.diasSeleccionados = [faltantes[0]];
  }

  /** Los ordena como la semana, no como el usuario les fue dando clic. */
  private get diasEnOrden(): string[] {
    return this.DAYS.filter(d => this.diasSeleccionados.includes(d));
  }
  today = new Date().toISOString().split('T')[0];

  // Edición de horario
  editingSchedule: any = null;
  editScheduleForm = { subjectId: '', teacherId: '', dayOfWeek: 'lunes', startTime: '08:00', endTime: '09:00', startDate: '', endDate: '' };

  constructor(
    private auth: AuthService,
    private userApi: UserApiService,
    private classroomApi: ClassroomApiService,
    private administratorApi: AdministratorApiService,
    private subjectApi: SubjectService,
    private scheduleApi: ScheduleApiService,
    private contentApi: ContentApiService
  ) {
    const u = this.auth.getUser();
    if (u) { this.userName = u.displayName; this.userAvatar = u.initials; }
  }

  ngOnInit() { this.load(); this.cargarCatalogo(); }

  /** Se eligio un salon desde el explorador (no la carga inicial). */
  private explorado = false;
  elegirDesdeExplorador(classroom: any) { this.explorado = true; this.selectClassroom(classroom); }

  load() {
    forkJoin({
      teachers:   this.userApi.getTeachers(),
      students:   this.userApi.getStudents(),
      classrooms: this.classroomApi.getAll(),
      subjects:   this.subjectApi.getAll(),
    }).subscribe({
      next: ({ teachers, students, classrooms, subjects }) => {
        this.teachers   = teachers;
        this.students   = students;
        this.classrooms = classrooms;
        this.subjects   = subjects;
        this.armarOpciones();
        // refresca salón seleccionado si ya había uno
        if (this.selectedClassroom) {
          const refreshed = classrooms.find((c: any) => c.id === this.selectedClassroom.id);
          if (refreshed) this.selectClassroom(refreshed);
        } else if (classrooms.length) {
          this.selectClassroom(classrooms[0]);
        }
      }
    });
  }

  // ── Opciones de los buscadores ──────────────────────────────────────────
  // Arreglos fijos, recalculados solo cuando cambian los datos: si fueran
  // getters, cada ciclo de deteccion entregaria uno nuevo y el buscador se
  // reordenaria a cada tecla.
  opProfesores:      OpcionBuscador[] = [];
  opAlumnos:         OpcionBuscador[] = [];
  opMateriasCatalogo: OpcionBuscador[] = [];
  opMateriasSalon:   OpcionBuscador[] = [];

  private armarOpciones() {
    const persona = (u: any): OpcionBuscador => ({ id: u.id, etiqueta: u.displayName || u.username, detalle: u.username });
    const materia = (m: any): OpcionBuscador => ({ id: m.id, etiqueta: m.name, icono: m.icon ?? '📚' });
    this.opProfesores = this.teachers.map(persona);
    this.opAlumnos = this.availableStudents.map(persona);
    this.opMateriasCatalogo = this.availableSubjects.map(materia);
    this.opMateriasSalon = (this.selectedClassroomSubjects ?? []).map(materia);
  }

  // ── Alumnos inscritos: en orden y con filtro ────────────────────────────
  filtroInscritos = '';
  get inscritos(): any[] {
    const t = normalizar(this.filtroInscritos);
    return [...this.selectedClassroomStudents]
      .filter(s => !t || normalizar(`${s.displayName} ${s.username}`).includes(t))
      .sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? '', 'es', { sensitivity: 'base' }));
  }

  selectClassroom(classroom: any) {
    const otro = this.selectedClassroom?.id !== classroom.id;
    this.selectedClassroom = classroom;
    if (otro) this.filtroInscritos = '';
    // En pantallas angostas el explorador queda arriba: al elegir, baja al detalle.
    if (otro && this.explorado && window.innerWidth < 1100) {
      setTimeout(() => document.getElementById('asg-detalle')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
    this.teacherAssignment.classroomId = classroom.id;
    this.studentAssignment.classroomId = classroom.id;
    this.subjectIdToAdd = '';
    this.materiaAAsignar = '';
    this.piezasElegidas.clear();
    // Sin esto, la materia elegida para el salon anterior sobrevive al
    // cambio y precargarDesdeHorarioExistente ni siquiera intenta llenar
    // el formulario, porque cree que el usuario ya escribio algo.
    this.scheduleForm = { subjectId: '', teacherId: '', startTime: '08:00',
                          endTime: '09:00', startDate: '', endDate: '' };
    this.diasSeleccionados = ['lunes'];
    this.cargarContenido(classroom.id);
    forkJoin({
      students:  this.classroomApi.getStudents(classroom.id),
      subjects:  this.classroomApi.getSubjects(classroom.id),
      schedules: this.scheduleApi.getByClassroom(classroom.id),
    }).subscribe({
      next: ({ students, subjects, schedules }) => {
        this.selectedClassroomStudents = students;
        this.selectedClassroomSubjects = subjects;
        this.armarOpciones();
        this.schedules = schedules;
        this.precargarDesdeHorarioExistente();
      }
    });
  }

  /**
   * Piezas de la materia elegida que el salon TODAVIA no recibe.
   * Para una clase muestra de una hora no quieres las 12: quieres las
   * dos primeras.
   */
  get piezasDisponibles(): any[] {
    if (!this.materiaAAsignar) return [];
    const yaAsignadas = new Set(this.contenidoDelSalon.map(c => c.id));
    return this.catalogo
      .filter(c => c.subjectId === this.materiaAAsignar && !yaAsignadas.has(c.id))
      .sort((a, b) => (a.orderIndex ?? 999) - (b.orderIndex ?? 999));
  }

  piezaElegida(id: string): boolean { return this.piezasElegidas.has(id); }

  alternarPieza(id: string) {
    this.piezasElegidas.has(id)
      ? this.piezasElegidas.delete(id)
      : this.piezasElegidas.add(id);
  }

  get totalElegidas(): number { return this.piezasElegidas.size; }

  /** Asigna solo lo palomeado, una llamada por pieza. */
  asignarPiezasElegidas() {
    const salon = this.selectedClassroom?.id;
    const ids = [...this.piezasElegidas];
    if (!salon || !ids.length || this.saving) return;
    this.saving = true;
    forkJoin(ids.map(id => this.contentApi.assign(id, { classroomId: salon })))
      .subscribe({
        next: () => {
          this.saving = false;
          this.piezasElegidas.clear();
          this.cargarContenido(salon);
          this.showToast(ids.length === 1
            ? 'Pieza asignada al salón'
            : `${ids.length} piezas asignadas al salón`);
        },
        error: (e: any) => {
          this.saving = false;
          this.cargarContenido(salon);
          this.showToast(e?.error?.message ?? 'No se pudieron asignar todas las piezas');
        },
      });
  }

  private cargarCatalogo() {
    this.contentApi.getAll().pipe(catchError(() => of([])))
      .subscribe(items => this.catalogo = items ?? []);
  }

  private cargarContenido(classroomId: string) {
    this.cargandoContenido = true;
    this.contentApi.byClassroom(classroomId)
      .pipe(catchError(() => of([])))
      .subscribe(items => {
        this.contenidoDelSalon = items ?? [];
        this.piezasElegidas.clear();
        this.cargandoContenido = false;
      });
  }

  /** Agrupa por materia: un salon puede recibir plan base de varias. */
  get contenidoPorMateria(): { materia: string; icono: string; piezas: any[] }[] {
    const mapa = new Map<string, { materia: string; icono: string; piezas: any[] }>();
    for (const c of this.contenidoDelSalon) {
      const materia = c.subjectName || 'Sin materia';
      if (!mapa.has(materia)) {
        mapa.set(materia, { materia, icono: c.subjectIcon || 'D', piezas: [] });
      }
      mapa.get(materia)!.piezas.push(c);
    }
    return [...mapa.values()].sort((a, b) => a.materia.localeCompare(b.materia));
  }

  /** Solo materias que ya estan en el salon: primero se asigna la materia. */
  get materiasAsignables(): any[] {
    return this.selectedClassroomSubjects ?? [];
  }

  asignarMateriaCompleta() {
    const salon = this.selectedClassroom?.id;
    if (!this.materiaAAsignar || !salon || this.saving) return;
    this.saving = true;
    this.contentApi.assignSubjectToClassroom(this.materiaAAsignar, salon).subscribe({
      next: (nuevas) => {
        this.saving = false;
        this.materiaAAsignar = '';
        this.cargarContenido(salon);
        this.showToast(nuevas
          ? `${nuevas} piezas asignadas al salon`
          : 'El salon ya tenia todo el plan base de esa materia');
      },
      error: (e: any) => {
        this.saving = false;
        this.showToast(e?.error?.message ?? 'No se pudo asignar la materia');
      },
    });
  }

  /** Reusa el modal de confirmacion que ya tiene la pantalla. */
  quitarPieza(c: any) {
    const salon = this.selectedClassroom?.id;
    if (!c || !salon) return;
    this.openConfirm(
      'Quitar del salón',
      `<strong>"${escaparHtml(c.title)}"</strong> dejará de aparecerles a los alumnos de este ` +
      `salón. La pieza no se borra y sigue en el plan base; las entregas que ya ` +
      `hicieron se conservan.`,
      () => this.contentApi.unassignFromClassroom(c.id, salon).subscribe({
        next: () => {
          this.cargarContenido(salon);
          this.showToast(`"${c.title}" se quitó del salón`);
        },
        error: (e: any) =>
          this.showToast(e?.error?.message ?? 'No se pudo quitar la pieza'),
      })
    );
  }

  assignTeacher() {
    if (!this.teacherAssignment.classroomId || !this.teacherAssignment.teacherId) return;
    this.run(
      this.administratorApi.assignTeacherToClassroom(
        this.teacherAssignment.classroomId, this.teacherAssignment.teacherId
      ), 'Profesor asignado al salón'
    );
  }

  removeTeacher() {
    if (!this.selectedClassroom?.id) return;
    this.run(
      this.administratorApi.unassignTeacherFromClassroom(this.selectedClassroom.id),
      'Profesor removido del salón'
    );
  }

  assignStudent() {
    if (!this.studentAssignment.classroomId || !this.studentAssignment.studentId) return;
    this.run(
      this.administratorApi.assignStudentToClassroom(
        this.studentAssignment.classroomId, this.studentAssignment.studentId
      ), 'Alumno inscrito al salón'
    );
  }

  removeStudent(studentId: string) {
    if (!this.selectedClassroom?.id) return;
    this.run(
      this.administratorApi.unassignStudentFromClassroom(this.selectedClassroom.id, studentId),
      'Alumno removido del salón'
    );
  }

  get availableStudents() {
    const enrolled = new Set(this.selectedClassroomStudents.map(s => s.id));
    return this.students.filter(s => !enrolled.has(s.id));
  }

  get availableSubjects() {
    const assigned = new Set(this.selectedClassroomSubjects.map(s => s.id));
    return this.subjects.filter(s => !assigned.has(s.id));
  }

  addSubject() {
    if (!this.subjectIdToAdd || !this.selectedClassroom?.id) return;
    this.run(
      this.administratorApi.addSubjectToClassroom(this.selectedClassroom.id, this.subjectIdToAdd),
      'Materia asignada al salón'
    );
  }

  /** Se intento agregar con campos vacios: se marcan en rojo. */
  faltaHorario = false;

  /** Lo que falta para poder agregar la clase, en palabras. */
  get faltanEnHorario(): string[] {
    const f = this.scheduleForm;
    const faltan: string[] = [];
    if (!f.subjectId) faltan.push('la materia');
    if (!f.teacherId) faltan.push('el maestro');
    if (!this.diasSeleccionados.length) faltan.push('al menos un día');
    if (!f.startTime || !f.endTime) faltan.push('las horas');
    if (!f.startDate) faltan.push('el primer día del curso');
    if (!f.endDate) faltan.push('el último día del curso');
    return faltan;
  }

  addSchedule() {
    const f = this.scheduleForm;
    const dias = this.diasEnOrden;
    // El boton ya no se deshabilita en silencio: dice que falta.
    const faltan = this.faltanEnHorario;
    if (faltan.length) {
      this.faltaHorario = true;
      const lista = faltan.length === 1 ? faltan[0]
        : faltan.slice(0, -1).join(', ') + ' y ' + faltan[faltan.length - 1];
      this.showToast(`Para agregar la clase falta escoger ${lista}.`);
      return;
    }
    if (f.endDate < f.startDate) {
      this.showToast('El último día del curso no puede ser antes del primero.');
      return;
    }
    this.faltaHorario = false;

    this.saving = true;
    // El backend rechaza si el maestro ya tiene clase ese dia y hora, y ese
    // mensaje es el que hay que enseñar: sin el, el usuario ve "no se pudo"
    // y concluye que el horario se fue al salon equivocado.
    const motivos: string[] = [];
    const peticiones = dias.map(dia => this.scheduleApi.create({
      classroomId: this.selectedClassroom.id,
      subjectId:   f.subjectId,
      teacherId:   f.teacherId,
      dayOfWeek:   dia,
      startTime:   f.startTime,
      endTime:     f.endTime,
      startDate:   f.startDate,
      endDate:     f.endDate,
    }).pipe(catchError((e: any) => {        // un dia que falle no tumba a los demas
      const motivo = e?.error?.message;
      if (motivo && !motivos.includes(motivo)) motivos.push(motivo);
      return of(null);
    })));

    forkJoin(peticiones).subscribe({
      next: (resultados: any[]) => {
        const creados = resultados.filter(Boolean);
        this.schedules = [...this.schedules, ...creados];
        this.saving = false;

        if (!creados.length) {
          this.showToast(motivos[0] ?? 'No se pudo guardar el horario');
          return;
        }
        this.scheduleForm = { subjectId: '', teacherId: '', startTime: '08:00', endTime: '09:00', startDate: '', endDate: '' };
        this.diasSeleccionados = ['lunes'];

        const fallidos = resultados.length - creados.length;
        this.showToast(fallidos
          ? `Se agregaron ${creados.length} de ${resultados.length} días. ${motivos[0] ?? ''}`.trim()
          : creados.length === 1
            ? 'Horario agregado'
            : `Se agregaron ${creados.length} clases`);
      },
      error: () => {
        this.saving = false;
        this.showToast('Error al guardar el horario');
      }
    });
  }

  openEditSchedule(s: any) {
    this.editingSchedule = s;
    this.editScheduleForm = {
      subjectId:  s.subjectId  ?? '',
      teacherId:  s.teacherId  ?? '',
      dayOfWeek:  s.dayOfWeek  ?? 'lunes',
      startTime:  s.startTime  ? String(s.startTime).substring(0,5) : '08:00',
      endTime:    s.endTime    ? String(s.endTime).substring(0,5)   : '09:00',
      startDate:  s.startDate  ? String(s.startDate).substring(0,10) : '',
      endDate:    s.endDate    ? String(s.endDate).substring(0,10)   : '',
    };
  }

  closeEditSchedule() { this.editingSchedule = null; }

  saveEditSchedule() {
    const f = this.editScheduleForm;
    if (!f.subjectId || !f.teacherId || !f.dayOfWeek || !f.startTime || !f.endTime || !f.startDate || !f.endDate) return;
    this.saving = true;
    this.scheduleApi.update(this.editingSchedule.id, {
      classroomId: this.selectedClassroom.id,
      subjectId:   f.subjectId,
      teacherId:   f.teacherId,
      dayOfWeek:   f.dayOfWeek,
      startTime:   f.startTime,
      endTime:     f.endTime,
      startDate:   f.startDate,
      endDate:     f.endDate,
    }).subscribe({
      next: updated => {
        this.schedules = this.schedules.map(s => s.id === updated.id ? updated : s);
        this.saving = false;
        this.closeEditSchedule();
        this.showToast('Horario actualizado');
      },
      error: (e: any) => {
        this.saving = false;
        this.showToast(e?.error?.message ?? 'Error al actualizar el horario');
      }
    });
  }

  removeSchedule(id: string) {
    this.saving = true;
    this.scheduleApi.remove(id).subscribe({
      next: () => {
        this.schedules = this.schedules.filter(s => s.id !== id);
        this.saving = false;
        this.showToast('Horario eliminado');
      },
      error: () => { this.saving = false; }
    });
  }

  schedulesByDay(day: string): any[] {
    return this.schedules
      .filter(s => s.dayOfWeek === day)
      .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
  }

  removeSubject(subjectId: string) {
    if (!this.selectedClassroom?.id) return;
    this.run(
      this.administratorApi.removeSubjectFromClassroom(this.selectedClassroom.id, subjectId),
      'Materia removida del salón'
    );
  }

  private run(obs: any, msg: string) {
    this.saving = true;
    obs.subscribe({
      next: () => { this.showToast(msg); this.saving = false; this.load(); },
      error: (e: any) => { this.saving = false; this.showToast(e?.error?.message ?? 'Error'); }
    });
  }

  // ── Modal de confirmación ──────────────────────────────────────────
  confirmModal: { open: boolean; title: string; body: string; onConfirm: () => void } = {
    open: false, title: '', body: '', onConfirm: () => {}
  };

  openConfirm(title: string, body: string, onConfirm: () => void) {
    this.confirmModal = { open: true, title, body, onConfirm };
  }

  closeConfirm() { this.confirmModal.open = false; }

  runConfirm() { this.confirmModal.onConfirm(); this.closeConfirm(); }

  deactivateClassroom(classroomId: string, name: string) {
    this.openConfirm(
      `Dar de baja salón`,
      `¿Estás seguro de dar de baja el salón <strong>"${escaparHtml(name)}"</strong>? Quedará inactivo y no aparecerá en las vistas activas.`,
      () => this.run(
        this.administratorApi.deactivateClassroom(classroomId),
        `Salón "${name}" dado de baja`
      )
    );
  }

  private showToast(msg: string) {
    this.toast = msg;
    this.toastType = resolveToastType(msg);
    setTimeout(() => this.toast = '', 3500);
  }
}

function resolveToastType(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('falta') || m.includes('no puede ser')) return 'warn';
  if (m.includes('actualiz') || m.includes('cambiad') || m.includes('guardad') || m.includes('editad')) return 'warn';
  if (m.includes('eliminad') || m.includes('removid') || m.includes('baja') || m.includes('quitad') || m.includes('desactivad') || m.includes('error')) return 'error';
  if (m.includes('cread') || m.includes('agregad') || m.includes('inscrit') || m.includes('asignad') || m.includes('alta')) return 'ok';
  return 'default';
}
