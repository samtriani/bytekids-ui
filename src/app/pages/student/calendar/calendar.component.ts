import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { ClassroomApiService } from '../../../services/api/classroom-api.service';
import { ScheduleApiService } from '../../../services/api/schedule-api.service';
import { AuthService } from '../../../services/auth.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

const NAV: NavItem[] = [
  { label: 'Mi Dashboard',  icon: '🏠', route: '/student' },
  { label: 'Mis Misiones',  icon: '🎯', route: '/student/missions' },
  { label: 'Mi Progreso',   icon: '📈', route: '/student/progress' },
  { label: 'Logros',        icon: '🏆', route: '/student/achievements' },
  { label: 'Tutor IA',      icon: '🤖', route: '/student/ai-tutor', badge: '✨' },
  { label: 'Proyectos',     icon: '💻', route: '/student/projects' },
  { label: 'Horario',       icon: '📅', route: '/student/calendar' },
  { label: 'Comunidad',     icon: '👥', route: '/student/community' },
];

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                     'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const DAY_JS: Record<string, number> = {
  domingo:0, lunes:1, martes:2, miercoles:3, miércoles:3,
  jueves:4, viernes:5, sabado:6, sábado:6,
};

const SUBJECT_COLORS = [
  '#7A1535','#1a6b3c','#0a4d7a','#c4992a','#5c0f27','#2e6b8a','#7c3aed','#0891b2',
];

interface MonthMeta { label: string; year: number; month: number; days: number; start: number; }

@Component({
  selector: 'app-student-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ShellComponent],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
})
export class StudentCalendarComponent implements OnInit {
  navItems = NAV;
  days     = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  loading  = true;

  months: MonthMeta[] = [];
  monthIdx  = 0;
  weeks: (number|null)[][] = [];

  private _today       = new Date();
  todayDay             = this._today.getDate();
  todayMonthIdx        = 0;
  selectedDay          = this._today.getDate();

  classrooms: any[]  = [];
  allSchedules: any[] = [];            // todas las entradas del horario del alumno
  scheduleCache: Record<number, any[]> = {};  // día → entradas activas ese día
  classroomColorMap: Record<string, string> = {};

  get studentName():     string { return this.auth.getUser()?.displayName || 'Alumno'; }
  get studentInitials(): string { return this.auth.getUser()?.initials    || 'A'; }
  get month(): MonthMeta        { return this.months[this.monthIdx]; }
  get monthName(): string       { return this.month?.label ?? ''; }
  get isToday(): boolean        { return this.monthIdx === this.todayMonthIdx; }
  get selectedEvents(): any[]   { return this.scheduleCache[this.selectedDay] ?? []; }
  get upcoming(): any[] {
    return Object.entries(this.scheduleCache)
      .filter(([d]) => +d > this.selectedDay)
      .sort(([a],[b]) => +a - +b)
      .slice(0, 5)
      .map(([d, evs]) => ({ day: +d, ev: (evs as any[])[0] }));
  }

  // Resumen de clases únicas por materia
  get classSummary(): any[] {
    const seen = new Set<string>();
    const result: any[] = [];
    this.allSchedules.forEach(s => {
      const key = `${s.subjectName}-${s.classroomName}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(s);
      }
    });
    return result;
  }

  constructor(
    private classroomApi: ClassroomApiService,
    private scheduleApi:  ScheduleApiService,
    private auth:         AuthService,
    private router:       Router,
  ) {}

  isScheduleActiveNow(s: any): boolean {
    if (!s?.dayOfWeek || !s?.startTime || !s?.endTime) return false;
    const now       = new Date();
    const todayName = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'][now.getDay()];
    if (s.dayOfWeek.toLowerCase() !== todayName) return false;
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    if (s.startDate && todayStr < String(s.startDate).substring(0,10)) return false;
    if (s.endDate   && todayStr > String(s.endDate).substring(0,10))   return false;
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = String(s.startTime).substring(0,5).split(':').map(Number);
    const [eh, em] = String(s.endTime).substring(0,5).split(':').map(Number);
    // Permitir entrar 15 min antes y hasta el fin de la clase
    return nowMin >= (sh * 60 + sm - 15) && nowMin <= (eh * 60 + em);
  }

  scheduleStatus(s: any): 'active' | 'soon' | 'past' | 'future' {
    if (!s?.dayOfWeek || !s?.startTime || !s?.endTime) return 'future';
    const now       = new Date();
    const todayName = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'][now.getDay()];
    if (s.dayOfWeek.toLowerCase() !== todayName) return 'future';
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = String(s.startTime).substring(0,5).split(':').map(Number);
    const [eh, em] = String(s.endTime).substring(0,5).split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin   = eh * 60 + em;
    if (nowMin > endMin)          return 'past';
    if (nowMin >= startMin - 15)  return 'active';
    if (nowMin >= startMin - 60)  return 'soon';
    return 'future';
  }

  enterClass(scheduleId: string) {
    this.router.navigate(['/student/classroom', scheduleId]);
  }

  ngOnInit() {
    this.initMonths();
    this.loadSchedules();
  }

  private initMonths() {
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const days  = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const start = d.getDay();
      this.months.push({ label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`, year: d.getFullYear(), month: d.getMonth(), days, start });
    }
    this.monthIdx      = 0;
    this.todayMonthIdx = 0;
    this.selectedDay   = new Date().getDate();
    this.buildGrid();
  }

  private loadSchedules() {
    this.classroomApi.getMyClassrooms().pipe(catchError(() => of([]))).subscribe(classrooms => {
      this.classrooms = classrooms;

      // Asigna color por salón
      classrooms.forEach((c: any, i: number) => {
        this.classroomColorMap[c.id] = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
      });

      if (!classrooms.length) { this.loading = false; return; }

      forkJoin(
        classrooms.map((c: any) =>
          this.scheduleApi.getByClassroom(c.id).pipe(catchError(() => of([])))
        )
      ).subscribe((scheduleLists: any) => {
        this.allSchedules = (scheduleLists as any[][]).flatMap((list, i) =>
          list.map((s: any) => ({ ...s, classroomColor: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }))
        );
        this.buildScheduleCache();
        this.loading = false;
      });
    });
  }

  buildScheduleCache() {
    const m = this.month;
    if (!m) return;
    this.scheduleCache = {};

    for (let day = 1; day <= m.days; day++) {
      const jsDay   = new Date(m.year, m.month, day).getDay();
      const dateStr = `${m.year}-${String(m.month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

      const hits = this.allSchedules.filter(s => {
        if (DAY_JS[s.dayOfWeek?.toLowerCase()] !== jsDay) return false;
        if (s.startDate && dateStr < s.startDate) return false;
        if (s.endDate   && dateStr > s.endDate)   return false;
        return true;
      });

      if (hits.length) this.scheduleCache[day] = hits;
    }
  }

  buildGrid() {
    const { start, days } = this.month;
    let week: (number|null)[] = Array(start).fill(null);
    const grid: (number|null)[][] = [];
    for (let d = 1; d <= days; d++) {
      week.push(d);
      if (week.length === 7) { grid.push(week); week = []; }
    }
    if (week.length) { while (week.length < 7) week.push(null); grid.push(week); }
    this.weeks = grid;
  }

  prevMonth() {
    if (this.monthIdx > 0) { this.monthIdx--; this.selectedDay = 1; this.buildGrid(); this.buildScheduleCache(); }
  }
  nextMonth() {
    if (this.monthIdx < this.months.length - 1) { this.monthIdx++; this.selectedDay = 1; this.buildGrid(); this.buildScheduleCache(); }
  }

  hasClass(d: number | null): boolean { return !!d && !!(this.scheduleCache[d]?.length); }

  countClasses(d: number | null): number { return d ? (this.scheduleCache[d]?.length ?? 0) : 0; }

  dayColors(d: number | null): string[] {
    if (!d || !this.scheduleCache[d]) return [];
    return [...new Set(this.scheduleCache[d].map((e: any) => e.classroomColor))].slice(0, 3);
  }
}
