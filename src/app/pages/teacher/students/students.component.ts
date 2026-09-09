import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { ShellComponent } from '../../../shared/shell/shell.component';
import { TEACHER_NAV } from '../shared/teacher-nav';
import { ClassroomApiService } from '../../../services/api/classroom-api.service';
import { SubmissionApiService } from '../../../services/api/submission-api.service';
import { ProgressApiService } from '../../../services/api/progress-api.service';
import { AuthService } from '../../../services/auth.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Component({
  selector: 'app-teacher-students',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ShellComponent],
  templateUrl: './students.component.html',
  styleUrls: ['./students.component.scss']
})
export class StudentsComponent implements OnInit {
  navItems = TEACHER_NAV;
  search = ''; filt = 'Todos'; view: 'table' | 'cards' = 'table';
  // Misma escala que el Panel y Reportes. Antes aqui era >=80 / >=50 y
  // alla >=80 / >=60 / >=40, asi que el mismo alumno salia "Regular" en
  // una pantalla y "Necesita apoyo" en otra.
  filters = ['Todos', 'Excelente', 'Bien', 'Regular', 'Apoyo', 'Sin empezar'];
  selected: any = null;
  toast = '';
  loading = true;
  all: any[] = [];

  teacher: any = null;
  private classrooms: any[] = [];

  /** Salones para filtrar, con el color de su materia como en el Panel. */
  salones: { id: string; nombre: string; color: string }[] = [];
  salonFiltro = '';

  /**
   * Avance real por alumno, sacado de la libreta de cada salon:
   * aprobadas + materiales leidos sobre las piezas asignadas.
   * Antes se estimaba con xpInSubject/5 --500 XP = 100%-- que es una
   * regla inventada: no mide cuanto del temario lleva, mide cuanto XP
   * junto, y un alumno puede juntar XP sin avanzar en su curso.
   */
  // Clave alumno|salon: un alumno en dos salones lleva avances distintos,
  // y al filtrar por uno hay que mostrar el de ESE salon, no la suma.
  private avance = new Map<string, { hechas: number; totales: number; siguiente: string }>();

  get teacherName(): string { return this.teacher?.displayName || 'Maestro'; }
  get teacherInitials(): string { return this.teacher?.initials || 'M'; }
  /** El titulo dice lo que se esta viendo, no lo que se tiene. */
  get classroomName(): string {
    if (this.salonActivo) return this.salonActivo.nombre;
    if (this.classrooms.length === 1) return this.classrooms[0].name;
    if (this.classrooms.length > 1) return `${this.classrooms.length} salones`;
    return 'Mis Salones';
  }

  get subtitulo(): string {
    const n = this.rows.length;
    const alumnos = `${n} ${n === 1 ? 'alumno' : 'alumnos'}`;
    if (this.salonActivo) return `${alumnos} en ${this.salonActivo.nombre}`;
    return `Seguimiento individual de ${alumnos}`;
  }

  /**
   * Los alumnos del salon elegido. Los KPI cuelgan de aqui y NO de rows,
   * porque rows tambien aplica el filtro de estado: si colgaran de ahi,
   * pulsar "Apoyo" pondria los otros tres contadores en cero.
   */
  get enSalon(): any[] {
    return this.salonFiltro
      ? this.all.filter(s => (s.classroomIds ?? []).includes(this.salonFiltro))
      : this.all;
  }

  get excelentes(): number { return this.enSalon.filter(s => s.status === 'Excelente').length; }
  get enProgreso(): number { return this.enSalon.filter(s => s.status === 'Bien' || s.status === 'Regular').length; }
  get needSupport(): number { return this.enSalon.filter(s => s.status === 'Apoyo').length; }
  get sinEmpezar(): number { return this.enSalon.filter(s => s.status === 'Sin empezar').length; }
  get maxStreak(): number { return this.enSalon.length ? Math.max(...this.enSalon.map(s => s.streak)) : 0; }

  /**
   * El color del estado vive aqui y no repartido en ternarios del template.
   * Estaban escritos ocho veces contra el texto 'Necesita apoyo': al cambiar
   * la escala habrian dejado de pintar sin que nada fallara.
   */
  enApoyo(status: string): boolean {
    return status === 'Apoyo' || status === 'Sin empezar';
  }

  bgEstado(status: string): string {
    if (status === 'Excelente') return 'var(--oro-lt)';
    return this.enApoyo(status) ? 'var(--danger-lt)' : 'var(--guinda-lt)';
  }

  fgEstado(status: string): string {
    if (status === 'Excelente') return '#7A4F00';
    return this.enApoyo(status) ? 'var(--danger)' : 'var(--guinda)';
  }

  contarEstado(f: string): number {
    return f === 'Todos' ? this.enSalon.length
                         : this.enSalon.filter(s => s.status === f).length;
  }

  get rows() {
    return this.enSalon.filter(s =>
      (this.filt === 'Todos' || s.status === this.filt) &&
      s.n.toLowerCase().includes(this.search.toLowerCase())
    );
  }

  get salonActivo() { return this.salones.find(s => s.id === this.salonFiltro) ?? null; }

  contarEnSalon(id: string): number {
    return id ? this.all.filter(s => (s.classroomIds ?? []).includes(id)).length
              : this.all.length;
  }

  filtrarPorSalon(id: string): void {
    this.salonFiltro = id;
    this.refrescarAvances();
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private classroomApi: ClassroomApiService,
    private submissionApi: SubmissionApiService,
    private progressApi: ProgressApiService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.teacher = this.auth.getUser();
    // Viene del Panel del Maestro al pulsar el contador de un salon.
    this.salonFiltro = this.route.snapshot.queryParamMap.get('salon') ?? '';

    this.classroomApi.getMyClassrooms().subscribe({
      next: classrooms => {
        if (!classrooms.length) { this.loading = false; return; }
        this.classrooms = classrooms;

        // El color sale de la materia del salon, igual que en el Panel.
        forkJoin(classrooms.map((c: any) =>
          this.classroomApi.getSubjects(c.id).pipe(catchError(() => of([])))
        )).subscribe(materias => {
          this.salones = classrooms.map((c: any, i: number) => ({
            id: c.id,
            nombre: c.name,
            color: (materias as any[])[i]?.[0]?.color || '#7C3AED',
          }));
        });

        // Una libreta por salon: trae piezas asignadas, calificaciones y
        // materiales leidos, que es lo unico con lo que se puede decir
        // cuanto del temario lleva un alumno.
        forkJoin(classrooms.map((c: any) =>
          this.submissionApi.getGradebook(c.id).pipe(catchError(() => of(null)))
        )).subscribe(libretas => {
          (libretas as any[]).forEach((l, i) =>
            this.acumularAvance(l, classrooms[i].id || classrooms[i]._id));
          if (this.all.length) this.all = this.all.map(a => this.conAvance(a));
        });

        // Cargar alumnos de TODOS los salones en paralelo
        forkJoin(classrooms.map(c =>
          this.classroomApi.getStudents(c._id || c.id).pipe(
            map(students => students.map((s: any) => ({
              ...s, _classroomName: c.name, _classroomId: c._id || c.id,
            }))),
            catchError(() => of([]))
          )
        )).subscribe({
          next: allArrays => {
            // Un alumno puede estar en varios salones. Antes se guardaba solo
            // el primero y los demas se perdian, asi que filtrar por salon
            // lo habria escondido de los otros a los que si pertenece.
            const porAlumno = new Map<string, any>();
            for (const s of (allArrays as any[][]).flat()) {
              const id = s._id || s.id;
              const previo = porAlumno.get(id);
              if (previo) {
                previo._classroomIds.push(s._classroomId);
                previo._classroomNames.push(s._classroomName);
              } else {
                porAlumno.set(id, {
                  ...s,
                  _classroomIds:   [s._classroomId],
                  _classroomNames: [s._classroomName],
                });
              }
            }
            const allStudents = [...porAlumno.values()];
            if (!allStudents.length) { this.loading = false; return; }

            forkJoin(allStudents.map(s => {
              const sid = s._id || s.id;
              return forkJoin({
                student: of(s),
                xp:       this.progressApi.getStudentXp(sid).pipe(catchError(() => of(0))),
                streak:   this.progressApi.getStudentStreak(sid).pipe(catchError(() => of(0))),
                subjects: this.progressApi.getStudentSubjects(sid).pipe(catchError(() => of([]))),
                activity: this.progressApi.getStudentActivity(sid).pipe(catchError(() => of([]))),
              });
            })).subscribe({
              next: results => {
                this.all = results.map(r => this.conAvance(this.buildStudent(r)));
                this.loading = false;
              },
              error: () => { this.loading = false; }
            });
          },
          error: () => { this.loading = false; }
        });
      },
      error: () => { this.loading = false; }
    });
  }

  /** Suma lo de esta libreta al avance de cada alumno que aparezca en ella. */
  private acumularAvance(libreta: any, salonId = ''): void {
    if (!libreta) return;
    const contenidos: any[] = libreta.content   ?? [];
    const materiales: any[] = libreta.materials ?? [];
    const grades = libreta.grades ?? {};
    const reads  = libreta.reads  ?? {};
    const piezas = contenidos.length + materiales.length;

    for (const alumno of (libreta.students ?? [])) {
      const suyas  = grades[alumno.id] ?? {};
      const leidos = reads[alumno.id]  ?? {};
      const aprobadas = contenidos.filter(c => suyas[c.id]?.status === 'aprobado').length;
      const vistos    = materiales.filter(m => leidos[m.id]).length;

      // La siguiente es la primera del temario que aun no aprueba. El
      // backend ya devuelve el contenido en orden de curriculo.
      const pendiente = contenidos.find(c => suyas[c.id]?.status !== 'aprobado');

      // Se guarda el total del alumno y ademas el de cada salon por
      // separado, para poder responder las dos preguntas: cuanto lleva en
      // total y cuanto lleva en el salon que el maestro esta mirando.
      const previo = this.avance.get(alumno.id) ?? { hechas: 0, totales: 0, siguiente: '' };
      this.avance.set(alumno.id, {
        hechas:  previo.hechas  + aprobadas + vistos,
        totales: previo.totales + piezas,
        siguiente: previo.siguiente || pendiente?.title || '',
      });
      this.avance.set(`${alumno.id}|${salonId}`, {
        hechas: aprobadas + vistos,
        totales: piezas,
        siguiente: pendiente?.title || '',
      });
    }
  }

  private conAvance(a: any): any {
    // Con un salon elegido se muestra su avance EN ESE salon; sin filtro,
    // el acumulado. Antes un alumno en dos salones veia siempre la suma,
    // aunque el maestro estuviera mirando solo uno.
    const v = (this.salonFiltro ? this.avance.get(`${a.id}|${this.salonFiltro}`) : null)
           ?? this.avance.get(a.id);
    if (!v || !v.totales) return a;
    const prog = Math.round((v.hechas / v.totales) * 100);
    return {
      ...a,
      prog,
      hechas: v.hechas,
      totales: v.totales,
      status: this.estadoDe(prog, v.hechas === 0),
      nextMission: v.siguiente || 'Terminó el temario',
    };
  }

  /** La misma escala que usa el Panel del Maestro. */
  private estadoDe(p: number, sinEmpezar: boolean): string {
    if (sinEmpezar) return 'Sin empezar';
    return p >= 80 ? 'Excelente' : p >= 60 ? 'Bien' : p >= 40 ? 'Regular' : 'Apoyo';
  }

  /** Al cambiar de salon hay que recalcular: el avance mostrado cambia. */
  private refrescarAvances(): void {
    this.all = this.all.map(a => this.conAvance(a));
  }

  private buildStudent(r: any): any {
    const s = r.student;
    const sid = s._id || s.id;
    const prog = this.calcProg(r.subjects);
    const status = this.estadoDe(prog, prog === 0);
    const subjects = r.subjects.map((sub: any) => sub.subjectName || sub.name).filter(Boolean).slice(0, 4);
    const last = this.lastAccess(r.activity);
    const missions = [...r.activity]
      .sort((a: any, b: any) => new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime())
      .slice(0, 5)
      .map((a: any) => a.contentTitle || a.missionTitle || a.description || `${a.missionsCompleted ?? 1} misión(es) el ${a.activityDate ?? ''}`);
    const av = s.initials || (s.displayName || '').split(' ').map((w: string) => w[0] || '').join('').slice(0, 2).toUpperCase();

    return {
      id: sid,
      n: s.displayName || s.username,
      av,
      cls: (s._classroomNames ?? [s._classroomName]).filter(Boolean).join(' · ') || '—',
      classroomIds: s._classroomIds ?? (s._classroomId ? [s._classroomId] : []),
      prog,
      xp: r.xp,
      streak: r.streak,
      status,
      last,
      subjects,
      nextMission: '—',
      note: '',
      missions,
    };
  }

  /**
   * Provisional, hasta que llega la libreta: XP por materia como proxy.
   * conAvance() lo reemplaza por el avance real en cuanto responde.
   */
  private calcProg(subjects: any[]): number {
    if (!subjects.length) return 0;
    const sum = subjects.reduce((acc: number, sub: any) => {
      const xp = sub.xpInSubject ?? sub.xp ?? 0;
      return acc + Math.min(100, Math.round(xp / 5));
    }, 0);
    return Math.round(sum / subjects.length);
  }

  private lastAccess(activity: any[]): string {
    if (!activity.length) return '—';
    // DailyActivity usa activityDate (LocalDate), no createdAt
    const latest = activity.reduce((a: any, b: any) =>
      new Date(a.activityDate) > new Date(b.activityDate) ? a : b);
    const days = Math.floor((Date.now() - new Date(latest.activityDate).getTime()) / 86400000);
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    return `Hace ${days} días`;
  }

  openStudent(s: any) { this.selected = s; }
  closeModal() { this.selected = null; }

  msgStudent(s: any) {
    this.closeModal();
    // El id identifica; el nombre no. Va tambien el nombre para poder
    // abrir una conversacion nueva con alguien a quien nunca se le ha
    // escrito, que es justo el caso mas comun desde aqui.
    this.router.navigate(['/teacher/messages'],
      { queryParams: { to: s.id, nombre: s.n } });
  }

  assignMission(s: any) {
    this.closeModal();
    this.router.navigate(['/teacher/create'], { queryParams: { for: s.n } });
  }

  sendAlert(s: any) {
    this.showToast(`⚠️ Alerta enviada a padres de ${s.n.split(' ')[0]}`);
  }

  showToast(msg: string) {
    this.toast = msg;
    setTimeout(() => this.toast = '', 3500);
  }

  pc(p: number): string { return p >= 80 ? 'var(--ok)' : p < 60 ? 'var(--danger)' : 'var(--guinda)'; }
  sc(s: string): string { return s === 'Excelente' ? 'tag-oro' : s === 'Necesita apoyo' ? 'tag-red' : 'tag-guinda'; }
}
