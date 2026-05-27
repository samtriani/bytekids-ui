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
