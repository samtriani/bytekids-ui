import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { ClassroomApiService } from '../../../services/api/classroom-api.service';
import { ScheduleApiService } from '../../../services/api/schedule-api.service';
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

const DAYS = ['lunes','martes','miercoles','jueves','viernes','sabado'];
const DAY_LABEL: Record<string,string> = {
  lunes:'Lunes', martes:'Martes', miercoles:'Miércoles',
  jueves:'Jueves', viernes:'Viernes', sabado:'Sábado'
};

@Component({
  selector: 'app-admin-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ShellComponent],
  templateUrl: './schedule.component.html',
  styleUrls: ['./schedule.component.scss']
})
export class AdminScheduleComponent implements OnInit {
  navItems   = NAV;
  loading    = true;
  userName   = 'Director';
  userAvatar = 'DR';

  // Data
  classrooms:    any[] = [];
  allSchedules:  any[] = [];   // todos los horarios de todos los salones
  classroomStudents: Record<string, any[]> = {};

  // Filtros
  filterClassroom = '';
  filterTeacher   = '';
  filterDay       = '';
  readonly DAYS       = DAYS;
  readonly DAY_LABEL  = DAY_LABEL;

  // Vista activa
  view: 'grid' | 'list' = 'grid';

  get teachers(): string[] {
    return [...new Set(this.allSchedules.map(s => s.teacherName).filter(Boolean))];
  }

  get totalClasses()   { return this.allSchedules.length; }
  get classroomsWithSchedule() { return new Set(this.allSchedules.map(s => s.classroomId)).size; }
  get activeDays()     { return new Set(this.allSchedules.map(s => s.dayOfWeek)).size; }

  get filtered(): any[] {
    return this.allSchedules.filter(s =>
      (!this.filterClassroom || s.classroomId === this.filterClassroom) &&
      (!this.filterTeacher   || s.teacherName === this.filterTeacher) &&
      (!this.filterDay       || s.dayOfWeek   === this.filterDay)
    );
  }

  schedulesByDay(day: string): any[] {
    return this.filtered.filter(s => s.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  studentsForClassroom(classroomId: string): any[] {
    return this.classroomStudents[classroomId] ?? [];
  }

  constructor(
    private classroomApi: ClassroomApiService,
    private scheduleApi:  ScheduleApiService,
    private auth:         AuthService
  ) {
    const u = this.auth.getUser();
    if (u) { this.userName = u.displayName; this.userAvatar = u.initials; }
  }

  ngOnInit() {
    this.classroomApi.getAll().subscribe({
      next: classrooms => {
        this.classrooms = classrooms;
        if (!classrooms.length) { this.loading = false; return; }

        // Cargar horarios y alumnos de todos los salones en paralelo
        forkJoin({
          schedules: forkJoin(classrooms.map(c =>
            this.scheduleApi.getByClassroom(c.id).pipe(catchError(() => of([])))
          )),
          students: forkJoin(classrooms.map(c =>
            this.classroomApi.getStudents(c.id).pipe(catchError(() => of([])))
          )),
        }).subscribe(({ schedules, students }) => {
          // Mapa classroomId → students
          classrooms.forEach((c, i) => {
            this.classroomStudents[c.id] = (students as any[][])[i];
          });

          // Aplanar todos los horarios con el nombre del salón
          this.allSchedules = (schedules as any[][]).flatMap((slotList, i) =>
            slotList.map(s => ({ ...s, classroomName: classrooms[i].name }))
          );

          this.loading = false;
        });
      },
      error: () => { this.loading = false; }
    });
  }

  filteredByClassroom(classroomId: string): any[] {
    return this.filtered.filter(s => s.classroomId === classroomId)
      .sort((a, b) => {
        const di = DAYS.indexOf(a.dayOfWeek) - DAYS.indexOf(b.dayOfWeek);
        return di !== 0 ? di : a.startTime.localeCompare(b.startTime);
      });
  }

  dayLabel(d: string): string { return DAY_LABEL[d] || d; }
  clearFilters() { this.filterClassroom = ''; this.filterTeacher = ''; this.filterDay = ''; }
}
