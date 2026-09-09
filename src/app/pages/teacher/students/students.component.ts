import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { ShellComponent } from '../../../shared/shell/shell.component';
import { TEACHER_NAV } from '../shared/teacher-nav';
import { ClassroomApiService } from '../../../services/api/classroom-api.service';
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
  filters = ['Todos', 'Excelente', 'Regular', 'Necesita apoyo'];
  selected: any = null;
  toast = '';
  loading = true;
  all: any[] = [];

  teacher: any = null;
  private classrooms: any[] = [];

  /** Salones para filtrar, con el color de su materia como en el Panel. */
  salones: { id: string; nombre: string; color: string }[] = [];
  salonFiltro = '';

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

  get excelentes(): number { return this.all.filter(s => s.status === 'Excelente').length; }
  get enProgreso(): number { return this.all.filter(s => s.status === 'Regular').length; }
  get needSupport(): number { return this.all.filter(s => s.status === 'Necesita apoyo').length; }
  get maxStreak(): number { return this.all.length ? Math.max(...this.all.map(s => s.streak)) : 0; }

  get rows() {
    return this.all.filter(s =>
      (this.filt === 'Todos' || s.status === this.filt) &&
      // Un alumno puede estar en varios salones: se queda si esta en el
      // elegido, no solo si es el primero que le tocó al deduplicar.
      (!this.salonFiltro || (s.classroomIds ?? []).includes(this.salonFiltro)) &&
      s.n.toLowerCase().includes(this.search.toLowerCase())
    );
  }

  get salonActivo() { return this.salones.find(s => s.id === this.salonFiltro) ?? null; }

  contarEnSalon(id: string): number {
    return id ? this.all.filter(s => (s.classroomIds ?? []).includes(id)).length
              : this.all.length;
  }

  filtrarPorSalon(id: string): void { this.salonFiltro = id; }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private classroomApi: ClassroomApiService,
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
                this.all = results.map(r => this.buildStudent(r));
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

  private buildStudent(r: any): any {
    const s = r.student;
    const sid = s._id || s.id;
    const prog = this.calcProg(r.subjects);
    const status = prog >= 80 ? 'Excelente' : prog >= 50 ? 'Regular' : 'Necesita apoyo';
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

  private calcProg(subjects: any[]): number {
    if (!subjects.length) return 0;
    // xpInSubject de la API: 500 XP = 100% por materia
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
    this.router.navigate(['/teacher/messages'], { queryParams: { to: s.n } });
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
