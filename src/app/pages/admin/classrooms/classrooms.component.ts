import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { ClassroomApiService } from '../../../services/api/classroom-api.service';
import { UserApiService } from '../../../services/api/user-api.service';
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
  selector: 'app-admin-classrooms',
  standalone: true,
  imports: [CommonModule, RouterLink, ShellComponent],
  templateUrl: './classrooms.component.html',
  styleUrls: ['./classrooms.component.scss']
})
export class ClassroomsComponent implements OnInit {
  navItems      = NAV;
  rooms:        any[] = [];
  totalStudents = 0;
  globalAvg     = 0;
  loading       = true;
  userName      = 'Director';
  userAvatar    = 'DR';

  constructor(
    private classroomApi: ClassroomApiService,
    private userApi:      UserApiService,
    private progressApi:  ProgressApiService,
    private auth:         AuthService
  ) {
    const u = this.auth.getUser();
    if (u) { this.userName = u.displayName; this.userAvatar = u.initials; }
  }

  ngOnInit() {
    forkJoin({
      classrooms:  this.classroomApi.getAll(),
      allStudents: this.userApi.getStudents(),
    }).subscribe({
      next: ({ classrooms, allStudents }) => {
        this.totalStudents = allStudents.length;
        if (!classrooms.length) { this.rooms = []; this.loading = false; return; }

        forkJoin({
          studentLists: forkJoin(classrooms.map((c: any) =>
            this.classroomApi.getStudents(c.id).pipe(catchError(() => of([])))
          )),
          subjectLists: forkJoin(classrooms.map((c: any) =>
            this.classroomApi.getSubjects(c.id).pipe(catchError(() => of([])))
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
            const allXp      = (xpLists as number[][]).flat();
            const schoolAvg  = avgArr(allXp.map(xpToPct));

            this.rooms = classrooms.map((c: any, i: number) => {
              const xps      = (xpLists as number[][])[i];
              const avg      = avgArr(xps.map(xpToPct));
              const diff     = Math.round(avg - schoolAvg);
              const status   = avg >= 75 ? 'excellent' : avg < 50 ? 'warn' : 'ok';
              const subjects = (subjectLists as any[][])[i].map((s: any) => `${s.icon ?? '📚'} ${s.name}`);

              return {
                ...c,
                teacher:  c.teacherName ?? 'Sin maestro asignado',
                students: (studentLists as any[][])[i].length,
                active:   xps.filter(x => x > 0).length,
                avg,
                trend:    diff >= 0 ? `+${diff}%` : `${diff}%`,
                up:       diff >= 0,
                status,
                missions: xps.filter(x => x > 0).length,
                subjects,
              };
            });

            this.globalAvg = avgArr(this.rooms.map(r => r.avg));
            this.loading   = false;
          });
        });
      },
      error: () => { this.loading = false; }
    });
  }

  get alertCount() { return this.rooms.filter(r => r.status === 'warn').length; }
  rc(a: number)   { return a >= 80 ? 'var(--ok)' : a < 65 ? 'var(--danger)' : 'var(--guinda)'; }
}

function xpToPct(xp: number): number { return Math.min(100, Math.round(xp / 15)); }
function avgArr(arr: number[]): number {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}
