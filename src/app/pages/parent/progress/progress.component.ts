import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { UserApiService } from '../../../services/api/user-api.service';
import { ProgressApiService } from '../../../services/api/progress-api.service';
import { AuthService } from '../../../services/auth.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const NAV: NavItem[] = [
  {label:'Mi Panel',      icon:'🏠', route:'/parent'},
  {label:'Mis Hijos',     icon:'👦', route:'/parent/children'},
  {label:'Progreso',      icon:'📈', route:'/parent/progress'},
  {label:'Logros',        icon:'🏆', route:'/parent/achievements'},
  {label:'Mensajes',      icon:'💬', route:'/parent/messages'},
  {label:'Calendario',    icon:'📅', route:'/parent/calendar'},
  {label:'Asistente IA',  icon:'🤖', route:'/parent/ai-assistant', badge:'IA'},
];
const COLORS = ['#7A1535','#0A4D7A','#1A6B3C','#C4992A','#7C3AED','#EC4899'];
const SUBJECT_ICONS: Record<string, string> = {
  Python:'🐍', 'HTML/CSS':'🌐', HTML:'🌐', Scratch:'🧩', Robótica:'🤖',
  Roblox:'🎮', Matemáticas:'📐', Ciencias:'🔬', Arte:'🎨', Inglés:'🌍',
};

@Component({
  selector: 'app-parent-progress',
  standalone: true,
  imports: [CommonModule, RouterLink, ShellComponent],
  templateUrl: './progress.component.html',
  styleUrls: ['./progress.component.scss']
})
export class ProgressComponent implements OnInit, AfterViewInit {
  @ViewChild('trendC') trendC!: ElementRef;

  navItems = NAV;
  parentName = '';
  parentInitials = '';
  children: any[] = [];
  selIndex = 0;
  loading = true;
  private chart: Chart | null = null;
  private viewReady = false;
  private dataReady = false;

  get sel(): any { return this.children[this.selIndex] ?? null; }
  get subs(): any[] { return this.sel?.subjectsDetail ?? []; }

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
      forkJoin(students.map((s: any) => forkJoin({
        student:  of(s),
        subjects: this.progressApi.getStudentSubjects(s.id || s._id).pipe(catchError(() => of([]))),
        activity: this.progressApi.getStudentActivity(s.id || s._id).pipe(catchError(() => of([]))),
      }))).subscribe({
        next: (results: any[]) => {
          this.children = results.map((r, i) => ({
            id:    r.student.id || r.student._id,
            name:  r.student.displayName || r.student.username,
            av:    r.student.initials || (r.student.displayName || '').split(' ')
                     .map((w: string) => w[0] || '').join('').slice(0, 2).toUpperCase(),
            color: COLORS[i % COLORS.length],
            subjectsDetail: (r.subjects as any[]).map((sub: any) => ({
              name: sub.subject?.name || sub.subjectName || sub.name || 'Materia',
              icon: SUBJECT_ICONS[sub.subject?.name ?? ''] || sub.subject?.icon || '📚',
              pct:  Math.min(100, Math.round((sub.xpInSubject ?? 0) / 5)),
              c:    COLORS[i % COLORS.length],
            })),
            weeklyXp: this.buildWeeklyXp(r.activity),
          }));
          this.loading   = false;
          this.dataReady = true;
          setTimeout(() => this.tryRenderChart(), 0);
        },
        error: () => { this.loading = false; }
      });
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
  }

  selectChild(i: number): void {
    this.selIndex = i;
    this.tryRenderChart();
  }

  private tryRenderChart(): void {
    if (!this.viewReady || !this.dataReady || !this.children.length) return;
    if (this.chart) { this.chart.destroy(); this.chart = null; }
    const labels = ['Sem 1','Sem 2','Sem 3','Sem 4','Sem 5','Sem 6'];
    const datasets = this.children.map(c => ({
      label: c.name.split(' ')[0],
      data: c.weeklyXp,
      borderColor: c.color,
      backgroundColor: c.color + '12',
      fill: true, tension: 0.4, borderWidth: 2,
    }));
    this.chart = new Chart(this.trendC.nativeElement, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color:'#3D2D3A', font:{family:'Nunito',size:11}, padding:12, boxWidth:10 } } },
        scales: {
          x: { grid:{display:false}, ticks:{color:'#7A6878', font:{family:'Nunito',size:11}} },
          y: { grid:{color:'#EDEEF1'}, ticks:{color:'#7A6878', font:{family:'Nunito',size:11}}, min:0 },
        },
      },
    });
  }

  private buildWeeklyXp(activity: any[]): number[] {
    const weeks = new Array(6).fill(0);
    const now = new Date();
    for (const a of activity) {
      const daysAgo = Math.floor((now.getTime() - new Date(a.activityDate).getTime()) / 86400000);
      const wi = Math.floor(daysAgo / 7);
      if (wi >= 0 && wi < 6) weeks[5 - wi] += (a.xpEarned ?? 0);
    }
    return weeks;
  }
}
