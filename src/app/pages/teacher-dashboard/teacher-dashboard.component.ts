import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../shared/shell/shell.component';
import { ClassroomApiService } from '../../services/api/classroom-api.service';
import { ProgressApiService } from '../../services/api/progress-api.service';
import { AuthService } from '../../services/auth.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ShellComponent],
  templateUrl: './teacher-dashboard.component.html',
  styleUrls: ['./teacher-dashboard.component.scss']
})
export class TeacherDashboardComponent implements OnInit {
  @ViewChild('barC') barC!: ElementRef;
  @ViewChild('pieC') pieC!: ElementRef;
  private barChart: Chart | null = null;
  private pieChart: Chart | null = null;

  navItems: NavItem[] = [
    {label:'Mi Panel',icon:'🏠',route:'/teacher'},
    {label:'Mis Salones',icon:'🏫',route:'/teacher/classrooms'},
    {label:'Alumnos',icon:'👨‍🎓',route:'/teacher/students'},
    {label:'Crear Contenido',icon:'📝',route:'/teacher/create'},
    {label:'Asistente IA',icon:'🤖',route:'/teacher/ai-assistant',badge:'IA'},
    {label:'Reportes',icon:'📊',route:'/teacher/reports'},
    {label:'Calendario',icon:'📅',route:'/teacher/calendar'},
    {label:'Mensajes',icon:'💬',route:'/teacher/messages'}
  ];

  teacher: any = null;
  private classrooms: any[] = [];
  students: any[] = [];
  alerts: any[] = [];
  totalStudents = 0;
  avgProgress = 0;
  totalMissions = 0;
  needSupport = 0;
  loading = true;

  get teacherName(): string { return this.teacher?.displayName || 'Maestro'; }
  get teacherInitials(): string { return this.teacher?.initials || 'M'; }
  get classroomTitle(): string {
    if (this.classrooms.length === 1) return this.classrooms[0].name;
    if (this.classrooms.length > 1) return `${this.classrooms.length} salones`;
    return 'Mis Salones';
  }
  get studentsLabel(): string {
    return this.classrooms.length === 1
      ? `Alumnos en ${this.classrooms[0].name}`
      : 'Total alumnos';
  }
  get studentsCardTitle(): string {
    return this.classrooms.length === 1
      ? `Alumnos — ${this.classrooms[0].name}`
      : 'Todos los alumnos';
  }

  constructor(
    private classroomApi: ClassroomApiService,
    private progressApi: ProgressApiService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.teacher = this.auth.getUser();
    this.loadDashboard();
  }

  private loadDashboard(): void {
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
            // Aplanar y deduplicar por ID (alumno puede estar en varios salones)
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
                subjects: this.progressApi.getStudentSubjects(sid).pipe(catchError(() => of([]))),
                activity: this.progressApi.getStudentActivity(sid).pipe(catchError(() => of([]))),
              });
            })).subscribe({
              next: results => { this.processStudents(results); this.loading = false; },
              error: () => { this.loading = false; }
            });
          },
          error: () => { this.loading = false; }
        });
      },
      error: () => { this.loading = false; }
    });
  }

  private processStudents(results: any[]): void {
    this.students = results.map(r => {
      const prog = this.calcProgress(r.subjects);
      const initials = r.student.initials ||
        (r.student.displayName || '').split(' ').map((w: string) => w[0] || '').join('').slice(0, 2).toUpperCase();
      return {
        _id: r.student._id || r.student.id,
        n: r.student.displayName || r.student.username,
        av: initials || '??',
        prog,
        xp: r.xp,
        status: this.getStatus(prog),
        daysSince: this.daysSince(r.activity),
        completedMissions: r.activity.length,
      };
    });

    this.totalStudents = this.students.length;
    this.avgProgress = this.students.length
      ? Math.round(this.students.reduce((s, r) => s + r.prog, 0) / this.students.length) : 0;
    this.needSupport = this.students.filter(s => s.prog < 50).length;
    this.totalMissions = this.students.reduce((s, r) => s + r.completedMissions, 0);

    this.buildAlerts();
    setTimeout(() => this.renderCharts(), 50);
  }

  private calcProgress(subjects: any[]): number {
    if (!subjects.length) return 0;
    const sum = subjects.reduce((s, sub) => {
      const p = typeof sub.progress === 'number' ? sub.progress
        : (sub.completedMissions != null && sub.totalMissions
          ? Math.round((sub.completedMissions / sub.totalMissions) * 100) : 0);
      return s + Math.min(100, Math.max(0, p));
    }, 0);
    return Math.round(sum / subjects.length);
  }

  private getStatus(p: number): string {
    return p >= 80 ? 'Excelente' : p >= 60 ? 'Bueno' : p >= 40 ? 'Regular' : 'Apoyo';
  }

  private daysSince(activity: any[]): number {
    if (!activity.length) return 999;
    const latest = activity.reduce((a: any, b: any) =>
      new Date(a.createdAt) > new Date(b.createdAt) ? a : b);
    return Math.floor((Date.now() - new Date(latest.createdAt).getTime()) / 86400000);
  }

  private buildAlerts(): void {
    this.alerts = [];
    this.students.filter(s => s.daysSince >= 5).slice(0, 2).forEach(s =>
      this.alerts.push({
        icon: '⚠️',
        text: `${s.n} lleva ${s.daysSince === 999 ? 'varios' : s.daysSince} días sin actividad`,
        type: 'alert-warn'
      })
    );
    const top = [...this.students].sort((a, b) => b.prog - a.prog).find(s => s.prog >= 80);
    if (top) this.alerts.push({ icon: '✅', text: `${top.n} tiene ${top.prog}% de progreso`, type: 'alert-ok' });
    this.students.filter(s => s.prog < 50 && s.prog > 0).slice(0, 1).forEach(s =>
      this.alerts.push({ icon: 'ℹ️', text: `${s.n} necesita apoyo (${s.prog}%)`, type: 'alert-info' })
    );
    if (!this.alerts.length)
      this.alerts.push({ icon: 'ℹ️', text: 'Sin alertas activas en este momento', type: 'alert-info' });
  }

  private renderCharts(): void {
    if (!this.barC || !this.pieC || !this.students.length) return;
    this.barChart?.destroy();
    this.pieChart?.destroy();

    const excellent = this.students.filter(s => s.prog >= 80).length;
    const medium = this.students.filter(s => s.prog >= 40 && s.prog < 80).length;
    const support = this.students.filter(s => s.prog < 40).length;

    this.barChart = new Chart(this.barC.nativeElement, {
      type: 'bar',
      data: {
        labels: this.students.map(s => s.n.split(' ')[0]),
        datasets: [{ label: 'Progreso %', data: this.students.map(s => s.prog),
          backgroundColor: this.students.map(s => this.pc(s.prog) + 'CC'),
          borderColor: this.students.map(s => this.pc(s.prog)),
          borderWidth: 1.5, borderRadius: 5 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#7A6878', font: { family: 'Nunito', size: 11 } } },
          y: { grid: { color: '#EDEEF1' }, ticks: { color: '#7A6878', font: { family: 'Nunito', size: 11 } }, max: 100 }
        }
      }
    });

    this.pieChart = new Chart(this.pieC.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Excelente', 'Bueno/Regular', 'Necesita apoyo'],
        datasets: [{ data: [excellent, medium, support],
          backgroundColor: ['#1A6B3C', '#7A1535', '#9B1414'], borderWidth: 0 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: { legend: { position: 'bottom', labels: { color: '#3D2D3A', font: { family: 'Nunito', size: 11 }, padding: 10, boxWidth: 10 } } }
      }
    });
  }

  pc(p: number): string { return p >= 80 ? '#1A6B3C' : p < 60 ? '#9B1414' : '#7A1535'; }
  sc(s: string): string { return s === 'Excelente' ? 'tag-oro' : s === 'Apoyo' ? 'tag-red' : 'tag-guinda'; }
}
