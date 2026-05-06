import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { UserApiService } from '../../../services/api/user-api.service';
import { ClassroomApiService } from '../../../services/api/classroom-api.service';
import { ProgressApiService } from '../../../services/api/progress-api.service';
import { AuthService } from '../../../services/auth.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

const NAV: NavItem[] = [
  {label:'Panel Ejecutivo', icon:'🏫', route:'/admin'},
  {label:'Salones',         icon:'🎓', route:'/admin/classrooms'},
  {label:'Maestros',        icon:'👩‍🏫', route:'/admin/teachers'},
  {label:'Estudiantes',     icon:'👨‍🎓', route:'/admin/students'},
  {label:'Horarios',        icon:'🕐', route:'/admin/schedule'},
  {label:'Reportes IA',     icon:'🤖', route:'/admin/ai-reports', badge:'IA'},
  {label:'Materias',        icon:'📚', route:'/admin/subjects'},
  {label:'Métricas',        icon:'📊', route:'/admin/metrics'},
];

@Component({
  selector: 'app-admin-teachers',
  standalone: true,
  imports: [CommonModule, RouterLink, ShellComponent],
  templateUrl: './teachers.component.html',
  styleUrls: ['./teachers.component.scss']
})
export class TeachersComponent implements OnInit {
  navItems   = NAV;
  teachers:  any[] = [];
  loading    = true;
  userName   = 'Director';
  userAvatar = 'DR';

  get withClassroom() { return this.teachers.filter(t => t.cls !== '—').length; }
  get globalAvg()     { return avgArr(this.teachers.filter(t => t.cls !== '—').map(t => t.avg)); }
  get needsSupport()  { return this.teachers.filter(t => t.status === 'Requiere apoyo').length; }

  constructor(
    private userApi:      UserApiService,
    private classroomApi: ClassroomApiService,
    private progressApi:  ProgressApiService,
    private auth:         AuthService
  ) {
    const u = this.auth.getUser();
    if (u) { this.userName = u.displayName; this.userAvatar = u.initials; }
  }

  ngOnInit() {
    forkJoin({
      teachers:   this.userApi.getTeachers(),
      classrooms: this.classroomApi.getAll(),
    }).subscribe({
      next: ({ teachers, classrooms }) => {
        if (!teachers.length) { this.loading = false; return; }

        const teacherClassrooms = teachers.map((t: any) =>
          classrooms.find((c: any) => c.teacherId === t.id) ?? null
        );

        forkJoin({
          studentLists: forkJoin(teacherClassrooms.map((c: any) =>
            c ? this.classroomApi.getStudents(c.id).pipe(catchError(() => of([]))) : of([])
          )),
          subjectLists: forkJoin(teacherClassrooms.map((c: any) =>
            c ? this.classroomApi.getSubjects(c.id).pipe(catchError(() => of([]))) : of([])
          )),
        }).subscribe(({ studentLists, subjectLists }) => {

          forkJoin(
            (studentLists as any[][]).map(students =>
              students.length
                ? forkJoin(students.map((s: any) =>
                    this.progressApi.getStudentXp(s.id || s._id).pipe(catchError(() => of(0)))
                  ))
                : of([] as number[])
            )
          ).subscribe(xpLists => {
            this.teachers = teachers.map((t: any, i: number) => {
              const salon    = teacherClassrooms[i];
              const xps      = (xpLists as number[][])[i];
              const avg      = avgArr(xps.map(xpToPct));
              const students = (studentLists as any[][])[i].length;
              const subjects = (subjectLists as any[][])[i].map((s: any) => `${s.icon ?? '📚'} ${s.name}`);
              const missions = xps.filter((x: number) => x > 0).length;
              const status   = avg >= 75 ? 'Excelente' : (avg < 50 && !!salon) ? 'Requiere apoyo' : 'Activo';

              return {
                ...t,
                name: t.displayName,
                av:   t.initials ?? t.displayName?.substring(0, 2).toUpperCase(),
                cls:  salon?.name ?? '—',
                students, avg, missions, subjects, status,
              };
            });
            this.loading = false;
          });
        });
      },
      error: () => { this.loading = false; }
    });
  }

  sc(s: string)  { return s === 'Excelente' ? 'tag-oro' : s === 'Requiere apoyo' ? 'tag-red' : 'tag-guinda'; }
  avgC(v: number){ return v >= 80 ? 'var(--ok)' : v < 50 ? 'var(--danger)' : 'var(--guinda)'; }
}

function xpToPct(xp: number): number { return Math.min(100, Math.round(xp / 15)); }
function avgArr(arr: number[]): number {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}
