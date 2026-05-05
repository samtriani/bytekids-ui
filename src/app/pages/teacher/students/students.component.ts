import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { ClassroomApiService } from '../../../services/api/classroom-api.service';
import { ProgressApiService } from '../../../services/api/progress-api.service';
import { AuthService } from '../../../services/auth.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

const NAV: NavItem[] = [
  {label:'Mi Panel',        icon:'🏠', route:'/teacher'},
  {label:'Mis Salones',     icon:'🏫', route:'/teacher/classrooms'},
  {label:'Alumnos',         icon:'👨‍🎓', route:'/teacher/students'},
  {label:'Crear Contenido', icon:'📝', route:'/teacher/create'},
  {label:'Asistente IA',    icon:'🤖', route:'/teacher/ai-assistant', badge:'IA'},
  {label:'Reportes',        icon:'📊', route:'/teacher/reports'},
  {label:'Calendario',      icon:'📅', route:'/teacher/calendar'},
  {label:'Mensajes',        icon:'💬', route:'/teacher/messages'},
];

@Component({
  selector: 'app-teacher-students',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ShellComponent],
  templateUrl: './students.component.html',
  styleUrls: ['./students.component.scss']
})
export class StudentsComponent implements OnInit {
  navItems = NAV;
  search = ''; filt = 'Todos'; view: 'table' | 'cards' = 'table';
  filters = ['Todos', 'Excelente', 'Regular', 'Necesita apoyo'];
  selected: any = null;
  toast = '';
  loading = true;
  all: any[] = [];

  teacher: any = null;
  private classrooms: any[] = [];

  get teacherName(): string { return this.teacher?.displayName || 'Maestro'; }
  get teacherInitials(): string { return this.teacher?.initials || 'M'; }
  get classroomName(): string {
    if (this.classrooms.length === 1) return this.classrooms[0].name;
    if (this.classrooms.length > 1) return `${this.classrooms.length} salones`;
    return 'Mis Salones';
  }

  get excelentes(): number { return this.all.filter(s => s.status === 'Excelente').length; }
  get enProgreso(): number { return this.all.filter(s => s.status === 'Regular').length; }
  get needSupport(): number { return this.all.filter(s => s.status === 'Necesita apoyo').length; }
  get maxStreak(): number { return this.all.length ? Math.max(...this.all.map(s => s.streak)) : 0; }

  get rows() {
    return this.all.filter(s =>
      (this.filt === 'Todos' || s.status === this.filt) &&
      s.n.toLowerCase().includes(this.search.toLowerCase())
    );
  }

  constructor(
    private router: Router,
    private classroomApi: ClassroomApiService,
    private progressApi: ProgressApiService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.teacher = this.auth.getUser();
    this.classroomApi.getMyClassrooms().subscribe({
      next: classrooms => {
        if (!classrooms.length) { this.loading = false; return; }
        this.classrooms = classrooms;

        // Cargar alumnos de TODOS los salones en paralelo
        forkJoin(classrooms.map(c =>
          this.classroomApi.getStudents(c._id || c.id).pipe(
            map(students => students.map((s: any) => ({ ...s, _classroomName: c.name }))),
            catchError(() => of([]))
          )
        )).subscribe({
          next: allArrays => {
            const seen = new Set<string>();
            const allStudents = (allArrays as any[][]).flat().filter(s => {
              const id = s._id || s.id;
              if (seen.has(id)) return false;
              seen.add(id); return true;
            });
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
    const missions = r.activity
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map((a: any) => a.contentTitle || a.missionTitle || a.description || 'Actividad completada');
    const av = s.initials || (s.displayName || '').split(' ').map((w: string) => w[0] || '').join('').slice(0, 2).toUpperCase();

    return {
      id: sid,
      n: s.displayName || s.username,
      av,
      cls: s._classroomName || '—',
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
    const sum = subjects.reduce((acc: number, sub: any) => {
      const p = typeof sub.progress === 'number' ? sub.progress
        : (sub.completedMissions != null && sub.totalMissions
          ? Math.round((sub.completedMissions / sub.totalMissions) * 100) : 0);
      return acc + Math.min(100, Math.max(0, p));
    }, 0);
    return Math.round(sum / subjects.length);
  }

  private lastAccess(activity: any[]): string {
    if (!activity.length) return '—';
    const latest = activity.reduce((a: any, b: any) =>
      new Date(a.createdAt) > new Date(b.createdAt) ? a : b);
    const days = Math.floor((Date.now() - new Date(latest.createdAt).getTime()) / 86400000);
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
