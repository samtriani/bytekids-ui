import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { UserApiService } from '../../../services/api/user-api.service';
import { ClassroomApiService } from '../../../services/api/classroom-api.service';
import { ScheduleApiService } from '../../../services/api/schedule-api.service';
import { ProgressApiService } from '../../../services/api/progress-api.service';
import { AuthService } from '../../../services/auth.service';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap, map } from 'rxjs/operators';

const NAV: NavItem[] = [
  {label:'Mi Panel',      icon:'🏠', route:'/parent'},
  {label:'Mis Hijos',     icon:'👦', route:'/parent/children'},
  {label:'Progreso',      icon:'📈', route:'/parent/progress'},
  {label:'Logros',        icon:'🏆', route:'/parent/achievements'},
  {label:'Mensajes',      icon:'💬', route:'/parent/messages'},
  {label:'Calendario',    icon:'📅', route:'/parent/calendar'},
  {label:'Asistente IA',  icon:'🤖', route:'/parent/ai-assistant', badge:'IA'},
];
const DAY_MAP: Record<string, number> = {
  SUNDAY:0, MONDAY:1, TUESDAY:2, WEDNESDAY:3, THURSDAY:4, FRIDAY:5, SATURDAY:6,
};
const COLORS = ['#7C3AED','#2563EB','#06B6D4','#10B981','#F59E0B','#EC4899'];

@Component({
  selector: 'app-parent-calendar',
  standalone: true,
  imports: [CommonModule, RouterLink, ShellComponent],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit {
  navItems = NAV;
  parentName = '';
  parentInitials = '';
  loading = true;

  days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  weeks: (number | null)[][] = [];
  currentYear  = new Date().getFullYear();
  currentMonth = new Date().getMonth();
  today        = new Date().getDate();
  selectedDay  = new Date().getDate();
  events: Record<number, any[]> = {};
  private cachedSchedules: any[] = [];
  private cachedActivityResults: any[] = [];
  activityByDay: Record<number, { name: string; color: string; xp: number }[]> = {};

  get monthName(): string {
    const s = new Date(this.currentYear, this.currentMonth, 1)
      .toLocaleDateString('es-MX', { month:'long', year:'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  get selEvts(): any[] { return this.events[this.selectedDay] ?? []; }
  get upcomingEvents(): any[] {
    const ref = (this.currentYear === new Date().getFullYear() &&
                 this.currentMonth === new Date().getMonth()) ? this.today : 1;
    return Object.entries(this.events)
      .filter(([d]) => +d >= ref)
      .sort(([a],[b]) => +a - +b)
      .slice(0, 6)
      .flatMap(([d, evts]) => evts.map(e => ({ ...e, day: +d })));
  }
  hasEvent(d: number | null): boolean { return !!(d && this.events[d]?.length); }
  isToday(d: number | null): boolean {
    const n = new Date();
    return !!d && d === n.getDate() && this.currentMonth === n.getMonth() && this.currentYear === n.getFullYear();
  }

  constructor(
    private userApi:      UserApiService,
    private classroomApi: ClassroomApiService,
    private scheduleApi:  ScheduleApiService,
    private progressApi:  ProgressApiService,
    private auth:         AuthService
  ) {}

  ngOnInit(): void {
    const user = this.auth.getUser();
    this.parentName    = user?.displayName || 'Padre/Madre';
    this.parentInitials = user?.initials   || 'P';
    this.buildGrid();
    const parentId = user?.userId ?? '';
    if (!parentId) { this.loading = false; return; }

    this.userApi.getStudentsOfParent(parentId).pipe(catchError(() => of([]))).subscribe(students => {
      if (!students.length) { this.loading = false; return; }
      forkJoin(students.map((s: any, i: number) => forkJoin({
        schedules: this.classroomApi.getClassroomsByStudent(s.id || s._id).pipe(
          catchError(() => of([])),
          switchMap((classrooms: any[]) => {
            if (!classrooms.length) return of([]);
            return forkJoin(classrooms.map((c: any) =>
              this.scheduleApi.getByClassroom(c.id || c._id).pipe(catchError(() => of([])))
            )).pipe(map((arrays: any[][]) => arrays.flat().map(sch => ({
              ...sch, studentName: s.displayName || s.username, studentColor: COLORS[i % COLORS.length],
            }))));
          })
        ),
        activity: this.progressApi.getStudentActivity(s.id || s._id).pipe(catchError(() => of([]))),
        meta: of({ name: s.displayName || s.username, color: COLORS[i % COLORS.length] }),
      }))).subscribe({
        next: (results: any[]) => {
          this.cachedSchedules        = results.flatMap(r => r.schedules);
          this.cachedActivityResults  = results;
          this.buildActivityByDay(results);
          this.buildEvents();
          this.loading = false;
        },
        error: () => { this.loading = false; }
      });
    });
  }

  prevMonth(): void {
    if (this.currentMonth === 0) { this.currentMonth = 11; this.currentYear--; }
    else this.currentMonth--;
    this.selectedDay = 1;
    this.buildGrid();
    this.buildEvents();
    this.buildActivityByDay(this.cachedActivityResults);
  }

  nextMonth(): void {
    if (this.currentMonth === 11) { this.currentMonth = 0; this.currentYear++; }
    else this.currentMonth++;
    this.selectedDay = 1;
    this.buildGrid();
    this.buildEvents();
    this.buildActivityByDay(this.cachedActivityResults);
  }

  get selActivity(): { name: string; color: string; xp: number }[] {
    return this.activityOn(this.selectedDay);
  }

  activityOn(d: number | null): { name: string; color: string; xp: number }[] {
    return d ? (this.activityByDay[d] ?? []) : [];
  }

  private buildActivityByDay(results: any[]): void {
    const map: Record<number, { name: string; color: string; xp: number }[]> = {};
    for (const r of results) {
      for (const a of (r.activity as any[])) {
        if (!a.activityDate || (!a.missionsCompleted && !a.xpEarned)) continue;
        const d = new Date(a.activityDate);
        if (d.getFullYear() !== this.currentYear || d.getMonth() !== this.currentMonth) continue;
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push({ name: r.meta.name, color: r.meta.color, xp: a.xpEarned ?? 0 });
      }
    }
    this.activityByDay = map;
  }

  private buildGrid(): void {
    const firstDay    = new Date(this.currentYear, this.currentMonth, 1).getDay();
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    let week: (number | null)[] = Array(firstDay).fill(null);
    const grid: (number | null)[][] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      week.push(d);
      if (week.length === 7) { grid.push(week); week = []; }
    }
    if (week.length) { while (week.length < 7) week.push(null); grid.push(week); }
    this.weeks = grid;
  }

  private buildEvents(): void {
    const evts: Record<number, any[]> = {};
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dow = new Date(this.currentYear, this.currentMonth, day).getDay();
      const matches = this.cachedSchedules.filter(sch => DAY_MAP[sch.dayOfWeek ?? ''] === dow);
      if (matches.length) {
        evts[day] = matches.map(sch => ({
          title: `${sch.subjectName || 'Clase'} — ${sch.studentName}`,
          time:  sch.startTime ?? '—',
          color: sch.studentColor,
          who:   sch.studentName,
        }));
      }
    }
    this.events = evts;
  }
}
