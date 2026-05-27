import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../shared/shell/shell.component';
import { UserApiService } from '../../services/api/user-api.service';
import { ProgressApiService } from '../../services/api/progress-api.service';
import { MessageApiService } from '../../services/api/message-api.service';
import { AuthService } from '../../services/auth.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const COLORS = ['#7B1034','#C9A84C','#7C3AED','#06B6D4','#10B981','#EC4899'];

@Component({
  selector: 'app-parent-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ShellComponent],
  templateUrl: './parent-dashboard.component.html',
  styleUrls: ['./parent-dashboard.component.scss']
})
export class ParentDashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('actChart') actChart!: ElementRef;

  navItems: NavItem[] = [
    { label:'Panel Principal', icon:'🏠', route:'/parent' },
    { label:'Mis Hijos',       icon:'👦', route:'/parent/children' },
    { label:'Progreso',        icon:'📈', route:'/parent/progress' },
    { label:'Logros',          icon:'🏆', route:'/parent/achievements' },
    { label:'Mensajes',        icon:'💬', route:'/parent/messages' },
    { label:'Calendario',      icon:'📅', route:'/parent/calendar' },
    { label:'Asistente IA',    icon:'🤖', route:'/parent/ai-assistant', badge:'✨' },
  ];

  parentName     = '';
  parentInitials = '';
  firstName      = '';
  loading        = true;

  children:       any[] = [];
  recentActivity: any[] = [];
  inboxMessages:  any[] = [];

  private chartData: { labels: string[]; datasets: any[] } | null = null;
  private viewReady  = false;
  private dataReady  = false;
  private chart: Chart | null = null;

  constructor(
    private userApi:     UserApiService,
    private progressApi: ProgressApiService,
    private messageApi:  MessageApiService,
    private auth:        AuthService
  ) {}

  ngOnInit(): void {
    const user = this.auth.getUser();
    this.parentName     = user?.displayName || 'Padre/Madre';
    this.parentInitials = user?.initials    || 'P';
    this.firstName      = this.parentName.split(' ')[0];
    const parentId      = user?.userId ?? '';
    if (!parentId) { this.loading = false; return; }

    forkJoin({
      children: this.userApi.getStudentsOfParent(parentId).pipe(catchError(() => of([]))),
      inbox:    this.messageApi.getInbox().pipe(catchError(() => of([]))),
    }).subscribe(({ children, inbox }) => {
      this.inboxMessages = (inbox as any[])
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3)
        .map((m: any) => ({
          from:   m.sender?.displayName || 'Maestro/a',
          text:   m.body?.slice(0, 80) || '',
          time:   this.timeAgo(m.createdAt),
          avatar: m.sender?.initials || (m.sender?.displayName || '?').split(' ').map((w: string) => w[0] || '').join('').slice(0, 2).toUpperCase(),
        }));

      if (!(children as any[]).length) { this.loading = false; return; }

      forkJoin((children as any[]).map((s: any) => forkJoin({
        student:  of(s),
        xp:       this.progressApi.getStudentXp(s.id).pipe(catchError(() => of(0))),
        streak:   this.progressApi.getStudentStreak(s.id).pipe(catchError(() => of(0))),
        subjects: this.progressApi.getStudentSubjects(s.id).pipe(catchError(() => of([]))),
        activity: this.progressApi.getStudentActivity(s.id).pipe(catchError(() => of([]))),
      }))).subscribe({
        next: (results: any[]) => {
          this.children = results.map((r, i) => {
            const s = r.student;
            const av = s.initials || (s.displayName || '').split(' ').map((w: string) => w[0] || '').join('').slice(0, 2).toUpperCase();
            const prog = this.calcProg(r.subjects);
            const topSubject = (r.subjects as any[]).sort((a: any, b: any) => (b.xpInSubject ?? 0) - (a.xpInSubject ?? 0))[0];
            return {
              id:       s.id,
              name:     s.displayName?.split(' ')[0] || s.username,
              fullName: s.displayName || s.username,
              grade:    s.grade || '',
              avatar:   av,
              color:    COLORS[i % COLORS.length],
              xp:       r.xp,
              streak:   r.streak,
              progress: prog,
              level:    Math.floor(r.xp / 200) + 1,
              subject:  topSubject?.subject?.name || topSubject?.subjectName || '—',
              activity: r.activity as any[],
            };
          });

          this.buildActivityFeed();
          this.buildChartData();
          this.loading   = false;
          this.dataReady = true;
          // Wait one tick for @if(children.length) to render the canvas in the DOM
          setTimeout(() => this.tryRenderChart(), 0);
        },
        error: () => { this.loading = false; }
      });
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    // tryRenderChart is called via setTimeout after data loads and DOM updates
  }

  private buildActivityFeed(): void {
    const entries: any[] = [];
    for (const c of this.children) {
      for (const a of (c.activity as any[])) {
        entries.push({ ...a, childName: c.name, childColor: c.color });
      }
    }
    this.recentActivity = entries
      .filter((a: any) => a.missionsCompleted > 0 || a.xpEarned > 0)
      .sort((a: any, b: any) => new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime())
      .slice(0, 5)
      .map((a: any) => ({
        child: a.childName,
        color: a.childColor,
        icon:  a.xpEarned >= 100 ? '🔥' : a.missionsCompleted > 1 ? '⚡' : '✅',
        text:  `Completó ${a.missionsCompleted} misión(es) — +${a.xpEarned} XP`,
        time:  this.dateLabel(a.activityDate),
      }));
  }

  private buildChartData(): void {
    const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    const now  = new Date();
    const labels = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (6 - i));
      return days[d.getDay()];
    });

    const datasets = this.children.map(c => {
      const data = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(now.getDate() - (6 - i));
        const key = d.toISOString().slice(0, 10);
        const act = (c.activity as any[]).find((a: any) => a.activityDate === key);
        return act?.xpEarned ?? 0;
      });
      return { label: c.name, data, borderColor: c.color, backgroundColor: c.color + '10', fill: true, tension: 0.4, borderWidth: 2 };
    });
    this.chartData = { labels, datasets };
  }

  private tryRenderChart(): void {
    if (!this.viewReady || !this.dataReady || !this.chartData || !this.children.length) return;
    if (this.chart) { this.chart.destroy(); this.chart = null; }
    this.chart = new Chart(this.actChart.nativeElement, {
      type: 'line',
      data: this.chartData,
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color:'#5C3A47', font:{ family:'Nunito', size:11 } } } },
        scales: {
          x: { grid:{ display:false }, ticks:{ color:'#8B6070', font:{ family:'Nunito', size:11 } } },
          y: { grid:{ color:'#F0E8EB' }, ticks:{ color:'#8B6070', font:{ family:'Nunito', size:11 } }, min:0 },
        },
      },
    });
  }

  get childrenNames(): string {
    if (!this.children.length) return '';
    if (this.children.length === 1) return this.children[0].name;
    return this.children.slice(0, -1).map((c: any) => c.name).join(', ') +
           ' y ' + this.children[this.children.length - 1].name;
  }

  private calcProg(subjects: any[]): number {
    if (!subjects.length) return 0;
    const sum = subjects.reduce((acc: number, sub: any) =>
      acc + Math.min(100, Math.round((sub.xpInSubject ?? 0) / 5)), 0);
    return Math.round(sum / subjects.length);
  }

  private timeAgo(iso: string): string {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60)  return `Hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `Hace ${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'Ayer';
    return `Hace ${days} días`;
  }

  private dateLabel(iso: string): string {
    if (!iso) return '';
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (iso === today)     return 'Hoy';
    if (iso === yesterday) return 'Ayer';
    return new Date(iso).toLocaleDateString('es-MX', { day:'numeric', month:'short' });
  }
}
