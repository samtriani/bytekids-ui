import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { ClassroomApiService } from '../../../services/api/classroom-api.service';
import { ProgressApiService } from '../../../services/api/progress-api.service';
import { AuthService } from '../../../services/auth.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

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
  selector: 'app-teacher-classrooms',
  standalone: true,
  imports: [CommonModule, RouterLink, ShellComponent],
  templateUrl: './classrooms.component.html',
  styleUrls: ['./classrooms.component.scss']
})
export class ClassroomsComponent implements OnInit {
  @ViewChild('radC') radC!: ElementRef;
  navItems = NAV;

  teacher: any = null;
  rooms: any[] = [];
  sel: any = null;
  loading = true;
  private chart: Chart | null = null;

  get teacherName(): string { return this.teacher?.displayName || 'Maestro'; }
  get teacherInitials(): string { return this.teacher?.initials || 'M'; }
  get totalStudents(): number { return this.rooms.reduce((s, r) => s + r.students, 0); }
  get globalAvg(): number {
    if (!this.rooms.length) return 0;
    return Math.round(this.rooms.reduce((s, r) => s + r.avg, 0) / this.rooms.length);
  }

  constructor(
    private classroomApi: ClassroomApiService,
    private progressApi: ProgressApiService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.teacher = this.auth.getUser();
    this.loadClassrooms();
  }

  private loadClassrooms(): void {
    this.classroomApi.getMyClassrooms().pipe(
      switchMap(classrooms => {
        if (!classrooms.length) return of([]);
        return forkJoin(classrooms.map(c => {
          const cid = c._id || c.id;
          return this.classroomApi.getStudents(cid).pipe(
            switchMap(students => {
              if (!students.length) return of({ classroom: c, enriched: [] });
              return forkJoin(students.map(s => {
                const sid = s._id || s.id;
                return forkJoin({
                  student: of(s),
                  subjects: this.progressApi.getStudentSubjects(sid).pipe(catchError(() => of([]))),
                  activity: this.progressApi.getStudentActivity(sid).pipe(catchError(() => of([]))),
                });
              })).pipe(map(enriched => ({ classroom: c, enriched })));
            }),
            catchError(() => of({ classroom: c, enriched: [] }))
          );
        }));
      }),
      catchError(() => of([]))
    ).subscribe(results => {
      this.rooms = (results as any[]).map(r => this.buildRoom(r));
      this.sel = this.rooms[0] || null;
      this.loading = false;
      setTimeout(() => this.renderChart(), 80);
    });
  }

  private buildRoom(data: { classroom: any; enriched: any[] }): any {
    const { classroom, enriched } = data;
    const now = Date.now();

    const studentProgs = enriched.map(e => this.calcStudentProg(e.subjects));
    const avg = studentProgs.length
      ? Math.round(studentProgs.reduce((s, p) => s + p, 0) / studentProgs.length) : 0;

    const active = enriched.filter(e =>
      e.activity.some((a: any) => now - new Date(a.createdAt).getTime() < 48 * 3600000)
    ).length;

    const missions = enriched.reduce((s, e) => s + e.activity.length, 0);

    // Aggregate subjects with avg progress
    const subjectMap = new Map<string, number[]>();
    enriched.forEach(e => e.subjects.forEach((sub: any) => {
      const name = sub.subjectName || sub.name || 'Sin nombre';
      const p = this.subjectProgress(sub);
      if (!subjectMap.has(name)) subjectMap.set(name, []);
      subjectMap.get(name)!.push(p);
    }));
    const subjects = Array.from(subjectMap.keys()).slice(0, 5);
    const subjectAvgs = subjects.map(s => {
      const vals = subjectMap.get(s)!;
      return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    });

    // Top student
    const topIdx = studentProgs.length ? studentProgs.indexOf(Math.max(...studentProgs)) : -1;
    const topStudent = topIdx >= 0 ? (enriched[topIdx]?.student?.displayName || '—') : '—';

    // Weekly activity (last 7 days), scaled 0-100
    const weekly = Array(7).fill(0);
    enriched.forEach(e => e.activity.forEach((a: any) => {
      const d = Math.floor((now - new Date(a.createdAt).getTime()) / 86400000);
      if (d >= 0 && d < 7) weekly[6 - d]++;
    }));
    const maxW = Math.max(...weekly, 1);
    const weeklyScaled = weekly.map(v => Math.round((v / maxW) * 100));

    const status = avg >= 80 ? 'excellent' : avg < 65 ? 'warn' : 'ok';
    const desc = status === 'excellent'
      ? `Grupo de alto rendimiento. Promedio del ${avg}%.`
      : status === 'warn'
      ? `Requiere atención. Promedio del ${avg}%, por debajo de la meta.`
      : `Grupo en progreso. Promedio del ${avg}%.`;

    return {
      _id: classroom._id || classroom.id,
      name: classroom.name,
      students: enriched.length,
      avg, active, missions, subjects, subjectAvgs,
      status, weekly: weeklyScaled, topStudent, desc,
      up: avg >= 65,
    };
  }

  private calcStudentProg(subjects: any[]): number {
    if (!subjects.length) return 0;
    const sum = subjects.reduce((s, sub) => s + this.subjectProgress(sub), 0);
    return Math.round(sum / subjects.length);
  }

  private subjectProgress(sub: any): number {
    const p = typeof sub.progress === 'number' ? sub.progress
      : (sub.completedMissions != null && sub.totalMissions
        ? Math.round((sub.completedMissions / sub.totalMissions) * 100) : 0);
    return Math.min(100, Math.max(0, p));
  }

  select(r: any): void {
    this.sel = r;
    setTimeout(() => this.renderChart(), 50);
  }

  renderChart(): void {
    if (!this.radC || !this.sel) return;
    this.chart?.destroy();
    this.chart = new Chart(this.radC.nativeElement, {
      type: 'radar',
      data: {
        labels: this.sel.subjects.length ? this.sel.subjects : ['Sin materias'],
        datasets: [{
          data: this.sel.subjectAvgs.length ? this.sel.subjectAvgs : [0],
          backgroundColor: 'rgba(122,21,53,.12)',
          borderColor: '#7A1535',
          pointBackgroundColor: '#7A1535',
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: { r: { grid: {color:'#EDEEF1'}, pointLabels: {color:'#3D2D3A', font:{family:'Nunito',size:11,weight:'bold'}},
          ticks: {display:false}, suggestedMin: 0, suggestedMax: 100 }},
        plugins: { legend: { display: false } }
      }
    });
  }

  rc(avg: number): string { return avg >= 80 ? 'var(--ok)' : avg < 65 ? 'var(--danger)' : 'var(--guinda)'; }
}
