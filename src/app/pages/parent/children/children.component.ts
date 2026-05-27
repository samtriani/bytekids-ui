import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { UserApiService } from '../../../services/api/user-api.service';
import { ProgressApiService } from '../../../services/api/progress-api.service';
import { AuthService } from '../../../services/auth.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

const NAV: NavItem[] = [
  {label:'Mi Panel',      icon:'🏠', route:'/parent'},
  {label:'Mis Hijos',     icon:'👦', route:'/parent/children'},
  {label:'Progreso',      icon:'📈', route:'/parent/progress'},
  {label:'Logros',        icon:'🏆', route:'/parent/achievements'},
  {label:'Mensajes',      icon:'💬', route:'/parent/messages'},
  {label:'Calendario',    icon:'📅', route:'/parent/calendar'},
  {label:'Asistente IA',  icon:'🤖', route:'/parent/ai-assistant', badge:'IA'},
];
const COLORS = ['#7C3AED','#2563EB','#06B6D4','#10B981','#F59E0B','#EC4899'];

@Component({
  selector: 'app-parent-children',
  standalone: true,
  imports: [CommonModule, RouterLink, ShellComponent],
  templateUrl: './children.component.html',
  styleUrls: ['./children.component.scss']
})
export class ChildrenComponent implements OnInit {
  navItems = NAV;
  parentName = '';
  parentInitials = '';
  children: any[] = [];
  sel: any = null;
  loading = true;

  constructor(
    private userApi: UserApiService,
    private progressApi: ProgressApiService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.auth.getUser();
    this.parentName    = user?.displayName || 'Padre/Madre';
    this.parentInitials = user?.initials   || 'P';
    const parentId = user?.userId ?? '';
    if (!parentId) { this.loading = false; return; }

    this.userApi.getStudentsOfParent(parentId).pipe(catchError(() => of([]))).subscribe(students => {
      if (!students.length) { this.loading = false; return; }
      forkJoin(students.map((s: any) => {
        const sid = s.id || s._id;
        return forkJoin({
          student:  of(s),
          xp:       this.progressApi.getStudentXp(sid).pipe(catchError(() => of(0))),
          streak:   this.progressApi.getStudentStreak(sid).pipe(catchError(() => of(0))),
          subjects: this.progressApi.getStudentSubjects(sid).pipe(catchError(() => of([]))),
          activity: this.progressApi.getStudentActivity(sid).pipe(catchError(() => of([]))),
        });
      })).subscribe({
        next: (results: any[]) => {
          this.children = results.map((r, i) => this.buildChild(r, i));
          this.sel = this.children[0] ?? null;
          this.loading = false;
        },
        error: () => { this.loading = false; }
      });
    });
  }

  private buildChild(r: any, i: number): any {
    const s = r.student;
    const av = s.initials || (s.displayName || '').split(' ')
      .map((w: string) => w[0] || '').join('').slice(0, 2).toUpperCase();
    const subjectNames = (r.subjects as any[])
      .map((sub: any) => sub.subject?.name || sub.subjectName || sub.name)
      .filter(Boolean);
    const prog = this.calcProg(r.subjects);
    const missions = (r.subjects as any[]).reduce((acc: number, sub: any) => acc + (sub.missionsCompleted ?? 0), 0);
    const recent = [...(r.activity as any[])]
      .sort((a: any, b: any) => new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime())
      .slice(0, 3)
      .map((a: any) => `${a.missionsCompleted ?? 0} misión(es) el ${a.activityDate} — +${a.xpEarned ?? 0} XP ⭐`);

    return {
      id:       s.id || s._id,
      name:     s.displayName || s.username,
      av,
      color:    COLORS[i % COLORS.length],
      xp:       r.xp,
      streak:   r.streak,
      prog,
      level:    Math.floor(r.xp / 200) + 1,
      missions,
      subjects: subjectNames,
      recent:   recent.length ? recent : ['Sin actividad registrada aún 📚'],
    };
  }

  private calcProg(subjects: any[]): number {
    if (!subjects.length) return 0;
    const sum = subjects.reduce((acc: number, sub: any) =>
      acc + Math.min(100, Math.round((sub.xpInSubject ?? 0) / 5)), 0);
    return Math.round(sum / subjects.length);
  }

  pc(p: number): string { return p >= 80 ? 'var(--ok)' : p < 60 ? 'var(--danger)' : 'var(--guinda)'; }
}
