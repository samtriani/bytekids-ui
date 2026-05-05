import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { ClassroomApiService } from '../../../services/api/classroom-api.service';
import { ProgressApiService } from '../../../services/api/progress-api.service';
import { AuthService } from '../../../services/auth.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

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
  selector: 'app-teacher-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ShellComponent],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {
  @ViewChild('barC') barC!: ElementRef;
  @ViewChild('dntC') dntC!: ElementRef;
  navItems = NAV;

  teacher: any = null;
  private classrooms: any[] = [];
  loading = true;
  toast = '';

  period = '';
  periods: string[] = [];

  private students: any[] = [];
  private barChart: Chart | null = null;
  private dntChart: Chart | null = null;

  get teacherName(): string { return this.teacher?.displayName || 'Maestro'; }
  get teacherInitials(): string { return this.teacher?.initials || 'M'; }
  get classroomName(): string {
    if (this.classrooms.length === 1) return this.classrooms[0].name;
    if (this.classrooms.length > 1) return `${this.classrooms.length} salones`;
    return 'Mis Salones';
  }

  // --- computed for current period ---
  rows: any[] = [];
  alerts: any[] = [];
  kpis = { total: 0, avg: '0%', missions: 0, needSupport: 0 };

  constructor(
    private classroomApi: ClassroomApiService,
    private progressApi: ProgressApiService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.teacher = this.auth.getUser();
    this.buildPeriods();
    this.classroomApi.getMyClassrooms().subscribe({
      next: classrooms => {
        if (!classrooms.length) { this.loading = false; return; }
        this.classrooms = classrooms;

        forkJoin(classrooms.map(c =>
          this.classroomApi.getStudents(c._id || c.id).pipe(catchError(() => of([])))
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
                subjects: this.progressApi.getStudentSubjects(sid).pipe(catchError(() => of([]))),
                activity: this.progressApi.getStudentActivity(sid).pipe(catchError(() => of([]))),
              });
            })).subscribe({
              next: results => {
                this.students = results.map(r => this.buildStudent(r));
                this.refresh();
                this.loading = false;
                setTimeout(() => this.renderCharts(), 80);
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

  private buildPeriods(): void {
    const now = new Date();
    this.periods = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      this.periods.push(`${MONTHS[d.getMonth()]} ${d.getFullYear()}`);
    }
    this.period = this.periods[this.periods.length - 1];
  }

  private buildStudent(r: any): any {
    const s = r.student;
    const prog = this.calcProg(r.subjects);
    const subjects = r.subjects.map((sub: any) => ({
      name: sub.subjectName || sub.name || '',
      progress: this.subjectProg(sub),
    })).filter((s: any) => s.name);
    const av = s.initials || (s.displayName || '').split(' ').map((w: string) => w[0] || '').join('').slice(0, 2).toUpperCase();
    return {
      id: s._id || s.id,
      n: s.displayName || s.username,
      av,
      prog,
      xp: r.xp,
      subjects,
      activity: r.activity,
      status: prog >= 80 ? 'Excelente' : prog >= 50 ? 'Regular' : 'Necesita apoyo',
    };
  }

  private calcProg(subjects: any[]): number {
    if (!subjects.length) return 0;
    return Math.round(subjects.reduce((s: number, sub: any) => s + this.subjectProg(sub), 0) / subjects.length);
  }

  private subjectProg(sub: any): number {
    const p = typeof sub.progress === 'number' ? sub.progress
      : (sub.completedMissions != null && sub.totalMissions
        ? Math.round((sub.completedMissions / sub.totalMissions) * 100) : 0);
    return Math.min(100, Math.max(0, p));
  }

  private periodToMonthYear(period: string): { month: number; year: number } {
    const [m, y] = period.split(' ');
    return { month: MONTHS.indexOf(m), year: parseInt(y) };
  }

  private activitiesInPeriod(activity: any[], period: string): any[] {
    const { month, year } = this.periodToMonthYear(period);
    return activity.filter(a => {
      const d = new Date(a.createdAt);
      return d.getMonth() === month && d.getFullYear() === year;
    });
  }

  private prevPeriod(period: string): string {
    const { month, year } = this.periodToMonthYear(period);
    const d = new Date(year, month - 1, 1);
    return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  // Recalculate everything for the selected period
  refresh(): void {
    const prev = this.prevPeriod(this.period);

    this.rows = this.students.map(s => {
      const curActs = this.activitiesInPeriod(s.activity, this.period).length;
      const prevActs = this.activitiesInPeriod(s.activity, prev).length;
      const tr = curActs > prevActs ? '↑' : curActs < prevActs ? '↓' : '→';
      return { n: s.n, av: s.av, prog: s.prog, mis: curActs, xp: s.xp, tr, st: s.status };
    }).sort((a, b) => b.prog - a.prog);

    const totalMissions = this.rows.reduce((s, r) => s + r.mis, 0);
    const avg = this.students.length
      ? Math.round(this.students.reduce((s, r) => s + r.prog, 0) / this.students.length) : 0;

    this.kpis = {
      total: this.students.length,
      avg: `${avg}%`,
      missions: totalMissions,
      needSupport: this.students.filter(s => s.status === 'Necesita apoyo').length,
    };

    this.buildAlerts();
  }

  private buildAlerts(): void {
    this.alerts = [];
    const inactive = this.students.filter(s => this.activitiesInPeriod(s.activity, this.period).length === 0);
    inactive.slice(0, 2).forEach(s =>
      this.alerts.push({ ico: '⚠️', txt: `${s.n} sin actividad en ${this.period}`, tp: 'alert-warn' })
    );
    const top = [...this.students].sort((a, b) => b.prog - a.prog).find(s => s.prog >= 80);
    if (top) this.alerts.push({ ico: '✅', txt: `${top.n} tiene el mejor progreso (${top.prog}%)`, tp: 'alert-ok' });
    this.students.filter(s => s.status === 'Necesita apoyo').slice(0, 1).forEach(s =>
      this.alerts.push({ ico: 'ℹ️', txt: `${s.n} requiere atención (${s.prog}%)`, tp: 'alert-info' })
    );
    if (!this.alerts.length)
      this.alerts.push({ ico: 'ℹ️', txt: 'Sin alertas activas en este período', tp: 'alert-info' });
  }

  onPeriodChange(): void {
    this.refresh();
    if (this.barChart) {
      this.barChart.data.labels = this.rows.map(r => r.n.split(' ')[0]);
      (this.barChart.data.datasets[0] as any).data = this.rows.map(r => r.prog);
      (this.barChart.data.datasets[0] as any).backgroundColor = this.rows.map(r => this.pc(r.prog) + 'CC');
      (this.barChart.data.datasets[0] as any).borderColor = this.rows.map(r => this.pc(r.prog));
      this.barChart.update();
    }
  }

  private renderCharts(): void {
    if (!this.barC || !this.dntC) return;
    this.barChart?.destroy();
    this.dntChart?.destroy();

    // Bar: progress per student
    this.barChart = new Chart(this.barC.nativeElement, {
      type: 'bar',
      data: {
        labels: this.rows.map(r => r.n.split(' ')[0]),
        datasets: [{
          label: '%',
          data: this.rows.map(r => r.prog),
          backgroundColor: this.rows.map(r => this.pc(r.prog) + 'CC'),
          borderColor: this.rows.map(r => this.pc(r.prog)),
          borderWidth: 1.5, borderRadius: 5,
        }]
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

    // Doughnut: avg progress per subject across all students
    const subjectMap = new Map<string, number[]>();
    this.students.forEach(s => s.subjects.forEach((sub: any) => {
      if (!subjectMap.has(sub.name)) subjectMap.set(sub.name, []);
      subjectMap.get(sub.name)!.push(sub.progress);
    }));
    const subLabels = Array.from(subjectMap.keys()).slice(0, 6);
    const subData = subLabels.map(k => {
      const vals = subjectMap.get(k)!;
      return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    });
    const COLORS = ['#7A1535','#C4992A','#1A6B3C','#0A4D7A','#5C0F27','#3A7A1A'];

    this.dntChart = new Chart(this.dntC.nativeElement, {
      type: 'doughnut',
      data: {
        labels: subLabels.length ? subLabels : ['Sin materias'],
        datasets: [{
          data: subData.length ? subData : [100],
          backgroundColor: COLORS.slice(0, Math.max(subLabels.length, 1)),
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '62%',
        plugins: { legend: { position: 'bottom', labels: { color: '#3D2D3A', font: { family: 'Nunito', size: 11 }, padding: 8, boxWidth: 10 } } }
      }
    });
  }

  exportPDF(): void { this.showToast(`📄 Reporte exportado — ${this.classroomName} · ${this.period}`); }
  sendToDirector(): void { this.showToast(`📨 Reporte enviado al Director · ${this.period}`); }
  showToast(msg: string): void { this.toast = msg; setTimeout(() => this.toast = '', 3500); }

  pc(p: number): string { return p >= 80 ? '#1A6B3C' : p < 60 ? '#9B1414' : '#7A1535'; }
  sc(s: string): string { return s === 'Excelente' ? 'tag-oro' : s === 'Necesita apoyo' ? 'tag-red' : 'tag-guinda'; }
  tc(t: string): string { return t === '↑' ? 'var(--ok)' : t === '↓' ? 'var(--danger)' : 'var(--tx3)'; }
}
