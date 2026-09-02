import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShellComponent } from '../../../shared/shell/shell.component';
import { TEACHER_NAV } from '../shared/teacher-nav';
import { ClassroomApiService } from '../../../services/api/classroom-api.service';
import { SubmissionApiService } from '../../../services/api/submission-api.service';
import { AuthService } from '../../../services/auth.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-teacher-gradebook',
  standalone: true,
  imports: [CommonModule, FormsModule, ShellComponent],
  templateUrl: './gradebook.component.html',
  styleUrls: ['./gradebook.component.scss'],
})
export class GradebookComponent implements OnInit {
  navItems = TEACHER_NAV;

  get teacherName():     string { return this.auth.getUser()?.displayName || 'Maestro'; }
  get teacherInitials(): string { return this.auth.getUser()?.initials    || 'M'; }

  classrooms:        any[] = [];
  selectedClassroom  = '';
  loading            = false;
  loadingClassrooms  = true;

  students:  any[] = [];   // [{id, name, initials}]
  content:   any[] = [];   // [{id, title, type, xpReward, dueDate}]
  grades:    Record<string, Record<string, any>> = {};  // studentId → contentId → {score,status,attempts,feedback}

  filterStatus = 'Todos';
  readonly statusFilters = ['Todos', 'Aprobado', 'Rechazado', 'Pendiente', 'Sin entregar'];

  get filteredStudents(): any[] {
    if (this.filterStatus === 'Todos') return this.students;
    return this.students.filter(s =>
      this.content.some(c => this.matchFilter(this.getGrade(s.id, c.id)))
    );
  }

  // ── Revision de una entrega ─────────────────────────────────────────────
  // Calificar solo se podia dentro del aula en vivo, o sea durante la clase.
  // Aqui el maestro abre cualquier celda y ve que entrego el alumno, con que
  // se le califico y que se le respondio, a cualquier hora.
  revisando: any = null;          // { alumno, pieza, entrega }
  cargandoEntrega = false;
  guardandoRevision = false;
  errorRevision = '';

  formRevision = { score: null as number | null, feedback: '' };

  private cacheEntregas: Record<string, any[]> = {};

  abrirCelda(alumno: any, pieza: any) {
    const nota = this.getGrade(alumno.id, pieza.id);
    if (!nota) return;                       // sin entrega no hay nada que ver

    this.revisando = { alumno, pieza, entrega: null };
    this.errorRevision = '';
    this.cargandoEntrega = true;

    const pintar = (entregas: any[]) => {
      const e = entregas
        .filter(x => x.contentId === pieza.id)
        .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))[0] ?? null;
      this.revisando = { alumno, pieza, entrega: e };
      this.formRevision = {
        score: e?.score != null ? e.score / 10 : null,
        feedback: e?.teacherFeedback ?? '',
      };
      this.cargandoEntrega = false;
    };

    const cacheado = this.cacheEntregas[alumno.id];
    if (cacheado) { pintar(cacheado); return; }

    this.submissionApi.getByStudent(alumno.id).pipe(catchError(() => of([]))).subscribe(list => {
      this.cacheEntregas[alumno.id] = list ?? [];
      pintar(list ?? []);
    });
  }

  cerrarRevision() { this.revisando = null; this.errorRevision = ''; }

  calificar(status: 'aprobado' | 'rechazado') {
    const e = this.revisando?.entrega;
    if (!e || this.guardandoRevision) return;
    this.guardandoRevision = true;
    this.errorRevision = '';

    this.submissionApi.review(e.id, {
      status,
      feedback: this.formRevision.feedback || undefined,
      score: this.formRevision.score != null ? Math.round(this.formRevision.score * 10) : undefined,
    }).subscribe({
      next: () => {
        this.guardandoRevision = false;
        delete this.cacheEntregas[this.revisando.alumno.id];   // quedó viejo
        this.cerrarRevision();
        this.loadGradebook();
      },
      error: (err: any) => {
        this.guardandoRevision = false;
        this.errorRevision = err?.error?.message ?? 'No se pudo guardar la calificación.';
      },
    });
  }

  estadoLabel(st: string): string {
    return ({ aprobado: 'Aprobada', rechazado: 'Necesita correcciones', enviado: 'Sin revisar' } as any)[st] ?? st;
  }

  constructor(
    private classroomApi: ClassroomApiService,
    private submissionApi: SubmissionApiService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.classroomApi.getMyClassrooms().pipe(catchError(() => of([]))).subscribe(cls => {
      this.classrooms      = cls;
      this.loadingClassrooms = false;
      if (cls.length) {
        this.selectedClassroom = cls[0].id || cls[0]._id;
        this.loadGradebook();
      }
    });
  }

  loadGradebook(): void {
    if (!this.selectedClassroom) return;
    this.loading  = true;
    this.students = [];
    this.content  = [];
    this.grades   = {};
    this.submissionApi.getGradebook(this.selectedClassroom).pipe(catchError(() => of(null))).subscribe(data => {
      if (data) {
        this.students = data.students ?? [];
        this.content  = data.content  ?? [];
        this.grades   = data.grades   ?? {};
      }
      this.loading = false;
    });
  }

  getGrade(studentId: string, contentId: string): any {
    return this.grades[studentId]?.[contentId] ?? null;
  }

  scoreLabel(grade: any): string {
    if (!grade) return '—';
    if (grade.score != null) return `${(grade.score / 10).toFixed(1)}`;
    return grade.status === 'aprobado' ? '✓' : grade.status === 'rechazado' ? '✗' : '⏳';
  }

  scoreColor(grade: any): string {
    if (!grade) return 'var(--tx3)';
    if (grade.status === 'aprobado')  return grade.score >= 80 ? '#059669' : grade.score >= 60 ? '#B45309' : '#DC2626';
    if (grade.status === 'rechazado') return '#DC2626';
    if (grade.status === 'enviado')   return '#2563EB';
    return 'var(--tx3)';
  }

  private matchFilter(grade: any): boolean {
    if (this.filterStatus === 'Aprobado')    return grade?.status === 'aprobado';
    if (this.filterStatus === 'Rechazado')   return grade?.status === 'rechazado';
    if (this.filterStatus === 'Pendiente')   return grade?.status === 'enviado';
    if (this.filterStatus === 'Sin entregar') return !grade;
    return true;
  }

  avgScore(contentId: string): string {
    const scores = this.students
      .map(s => this.getGrade(s.id, contentId))
      .filter(g => g?.score != null)
      .map(g => g.score as number);
    if (!scores.length) return '—';
    return (scores.reduce((a, b) => a + b, 0) / scores.length / 10).toFixed(1);
  }

  submittedCount(contentId: string): number {
    return this.students.filter(s => !!this.getGrade(s.id, contentId)).length;
  }

  typeIcon(type: string): string {
    const m: Record<string, string> = { mision:'🎯', tarea:'📝', quiz:'❓', proyecto:'📦' };
    return m[type] ?? '📄';
  }
}
