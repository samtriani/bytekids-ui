import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { ScheduleApiService } from '../../../services/api/schedule-api.service';
import { AuthService } from '../../../services/auth.service';
import { catchError, of } from 'rxjs';

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

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                     'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// Spanish day names → JS getDay() value (0=Sun)
const DAY_JS: Record<string, number> = {
  domingo:0, lunes:1, martes:2, miercoles:3, miércoles:3,
  jueves:4, viernes:5, sabado:6, sábado:6,
};

interface MonthMeta { label: string; year: number; month: number; days: number; start: number; }

@Component({
  selector: 'app-teacher-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ShellComponent],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit {
  navItems  = NAV;
  days      = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  loading   = true;

  months: MonthMeta[] = [];
  monthIdx  = 0;
  weeks: (number|null)[][] = [];

  private _today     = new Date();
  todayDay           = this._today.getDate();
  todayMonthIdx      = 0;   // which monthIdx is "current"
  selectedDay        = this._today.getDate();

  // Schedule entries from backend
  schedules: any[] = [];

  // Local events added by the teacher (session only, not persisted yet)
  private localEvents: Record<number, any[]> = {};

  // Merged: schedule repeating + local
  private scheduleCache: Record<number, any[]> = {};

  showModal     = false;
  selectedEvent: any = null;
  newEvent      = { title:'', type:'class', time:'09:00' };
  typeColors    : Record<string,string> = {
    class:'#C9A84C', exam:'#7B1034', task:'#0A5C8B', meeting:'#B01A1A', event:'#1B7A3C'
  };
  types = ['class','exam','task','meeting','event'];

  get teacherName():     string { return this.auth.getUser()?.displayName || 'Maestro'; }
  get teacherInitials(): string { return this.auth.getUser()?.initials    || 'MA'; }
  get month(): MonthMeta        { return this.months[this.monthIdx]; }
  get monthName(): string       { return this.month?.label ?? ''; }
  get isToday(): boolean        { return this.monthIdx === this.todayMonthIdx; }

  get events(): Record<number, any[]> {
    const merged: Record<number, any[]> = { ...this.scheduleCache };
    Object.entries(this.localEvents).forEach(([d, evs]) => {
      const n = +d;
      merged[n] = [...(merged[n] ?? []), ...evs];
    });
    return merged;
  }
  get selectedEvents(): any[]  { return this.events[this.selectedDay] ?? []; }
  get upcoming(): any[] {
    return Object.entries(this.events)
      .filter(([d]) => +d > this.selectedDay)
      .sort(([a],[b]) => +a - +b)
      .slice(0, 4)
      .map(([d, evs]) => ({ day: +d, ev: (evs as any[])[0] }));
  }

  constructor(
    private scheduleApi: ScheduleApiService,
    private auth: AuthService,
    private router: Router,
  ) {}

  isScheduleActiveNow(s: any): boolean {
    if (!s?.dayOfWeek || !s?.startTime || !s?.endTime) return false;
    const now       = new Date();
    const todayName = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'][now.getDay()];
    if (s.dayOfWeek.toLowerCase() !== todayName) return false;
    const todayStr  = now.toISOString().split('T')[0];
    if (s.startDate && todayStr < s.startDate) return false;
    if (s.endDate   && todayStr > s.endDate)   return false;
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = s.startTime.substring(0,5).split(':').map(Number);
    const [eh, em] = s.endTime.substring(0,5).split(':').map(Number);
    return nowMin >= sh * 60 + sm && nowMin <= eh * 60 + em;
  }

  startClass(scheduleId: string) {
    this.router.navigate(['/teacher/classroom', scheduleId]);
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
      this.months.push({
        label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
        year: d.getFullYear(), month: d.getMonth(), days, start,
      });
    }
    this.monthIdx     = 0;
    this.todayMonthIdx = 0;
    this.selectedDay  = now.getDate();
    this.buildGrid();
  }

  private loadSchedules() {
    const user = this.auth.getUser();
    if (!user?.userId) { this.loading = false; return; }

    this.scheduleApi.getByTeacher(user.userId).pipe(catchError(() => of([]))).subscribe(data => {
      this.schedules = data;
      this.buildScheduleCache();
      this.loading = false;
    });
  }

  private buildScheduleCache() {
    const m = this.month;
    if (!m) return;
    this.scheduleCache = {};

    for (let day = 1; day <= m.days; day++) {
      const jsDay = new Date(m.year, m.month, day).getDay();
      const dateStr = `${m.year}-${String(m.month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const hits  = this.schedules.filter(s => {
        if (DAY_JS[s.dayOfWeek?.toLowerCase()] !== jsDay) return false;
        if (s.startDate && dateStr < s.startDate) return false;
        if (s.endDate   && dateStr > s.endDate)   return false;
        return true;
      });
      if (hits.length) {
        this.scheduleCache[day] = hits.map(s => ({
          title:      `${s.subjectIcon ?? '📚'} ${s.subjectName} — ${s.classroomName}`,
          time:       s.startTime?.substring(0, 5) ?? '—',
          endTime:    s.endTime?.substring(0, 5)   ?? '—',
          color:      '#7A1535',
          type:       'class',
          isSchedule: true,
          raw:        s,        // referencia completa para validar si está activa
        }));
      }
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
    if (this.monthIdx > 0) {
      this.monthIdx--;
      this.selectedDay = 1;
      this.buildGrid();
      this.buildScheduleCache();
    }
  }

  nextMonth() {
    if (this.monthIdx < this.months.length - 1) {
      this.monthIdx++;
      this.selectedDay = 1;
      this.buildGrid();
      this.buildScheduleCache();
    }
  }

  hasEvent(d: number | null): boolean {
    return !!d && !!(this.events[d]?.length);
  }

  hasSchedule(d: number | null): boolean {
    return !!d && !!(this.scheduleCache[d]?.length);
  }

  openNewEvent()  { this.newEvent = { title:'', type:'class', time:'09:00' }; this.showModal = true; }
  closeModal()    { this.showModal = false; this.selectedEvent = null; }
  openEvent(e: any) { this.selectedEvent = e; }

  saveEvent() {
    if (!this.newEvent.title.trim()) return;
    if (!this.localEvents[this.selectedDay]) this.localEvents[this.selectedDay] = [];
    this.localEvents[this.selectedDay].push({
      ...this.newEvent,
      color: this.typeColors[this.newEvent.type],
      isSchedule: false,
    });
    this.closeModal();
  }

  deleteEvent(e: any) {
    if (e.isSchedule) return; // no borrar clases del horario
    const list = this.localEvents[this.selectedDay];
    if (!list) return;
    const i = list.indexOf(e);
    if (i > -1) list.splice(i, 1);
    this.selectedEvent = null;
  }

  typeLabel(t: string): string {
    return ({ class:'Clase', exam:'Examen', task:'Tarea', meeting:'Reunión', event:'Evento' } as any)[t] || 'Otro';
  }
}
