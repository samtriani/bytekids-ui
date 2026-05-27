import { Component, OnInit } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ShellComponent } from '../../../shared/shell/shell.component';
import { AuthService } from '../../../services/auth.service';
import { UserApiService } from '../../../services/api/user-api.service';
import { ClassroomApiService } from '../../../services/api/classroom-api.service';
import { AdministratorApiService } from '../../../services/api/administrator-api.service';
import { SubjectService } from '../../../services/api/subject-api.service';
import { ScheduleApiService } from '../../../services/api/schedule-api.service';
import { ADMINISTRATOR_NAV_ITEMS } from '../shared/administrator-nav';

@Component({
  selector: 'app-administrator-assignments-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ShellComponent, TitleCasePipe],
  templateUrl: './administrator-assignments-page.component.html',
  styleUrls: ['./administrator-assignments-page.component.scss']
})
export class AdministratorAssignmentsPageComponent implements OnInit {
  navItems = ADMINISTRATOR_NAV_ITEMS;
  userName = 'Coordinador';
  userAvatar = 'AD';
  toast = '';
  toastType = 'default';
  saving = false;

  classrooms: any[] = [];
  teachers:   any[] = [];
  students:   any[] = [];
  subjects:   any[] = [];   // catálogo global

  selectedClassroom:         any    = null;
  selectedClassroomStudents: any[]  = [];
  selectedClassroomSubjects: any[]  = [];

  teacherAssignment = { classroomId: '', teacherId: '' };
  studentAssignment = { classroomId: '', studentId: '' };
  subjectIdToAdd    = '';
  classroomSearch   = '';

  // Horario
  schedules: any[] = [];
  readonly DAYS = ['lunes','martes','miercoles','jueves','viernes','sabado'];
  scheduleForm = { subjectId: '', teacherId: '', dayOfWeek: 'lunes', startTime: '08:00', endTime: '09:00', startDate: '', endDate: '' };
  today = new Date().toISOString().split('T')[0];

  // Edición de horario
  editingSchedule: any = null;
  editScheduleForm = { subjectId: '', teacherId: '', dayOfWeek: 'lunes', startTime: '08:00', endTime: '09:00', startDate: '', endDate: '' };

  constructor(
    private auth: AuthService,
    private userApi: UserApiService,
    private classroomApi: ClassroomApiService,
    private administratorApi: AdministratorApiService,
    private subjectApi: SubjectService,
    private scheduleApi: ScheduleApiService
  ) {
    const u = this.auth.getUser();
    if (u) { this.userName = u.displayName; this.userAvatar = u.initials; }
  }

  ngOnInit() { this.load(); }

  load() {
    forkJoin({
      teachers:   this.userApi.getTeachers(),
      students:   this.userApi.getStudents(),
      classrooms: this.classroomApi.getAll(),
      subjects:   this.subjectApi.getAll(),
    }).subscribe({
      next: ({ teachers, students, classrooms, subjects }) => {
        this.teachers   = teachers;
        this.students   = students;
        this.classrooms = classrooms;
        this.subjects   = subjects;
        // refresca salón seleccionado si ya había uno
        if (this.selectedClassroom) {
          const refreshed = classrooms.find((c: any) => c.id === this.selectedClassroom.id);
          if (refreshed) this.selectClassroom(refreshed);
        } else if (classrooms.length) {
          this.selectClassroom(classrooms[0]);
        }
      }
    });
  }

  get filteredClassrooms() {
    const term = this.classroomSearch.trim().toLowerCase();
    return term ? this.classrooms.filter(c =>
      `${c.name} ${c.section} ${c.schoolYear}`.toLowerCase().includes(term)
    ) : this.classrooms;
  }

  selectClassroom(classroom: any) {
    this.selectedClassroom = classroom;
    this.teacherAssignment.classroomId = classroom.id;
    this.studentAssignment.classroomId = classroom.id;
    this.subjectIdToAdd = '';
    forkJoin({
      students:  this.classroomApi.getStudents(classroom.id),
      subjects:  this.classroomApi.getSubjects(classroom.id),
      schedules: this.scheduleApi.getByClassroom(classroom.id),
    }).subscribe({
      next: ({ students, subjects, schedules }) => {
        this.selectedClassroomStudents = students;
        this.selectedClassroomSubjects = subjects;
        this.schedules = schedules;
      }
    });
  }

  assignTeacher() {
    if (!this.teacherAssignment.classroomId || !this.teacherAssignment.teacherId) return;
    this.run(
      this.administratorApi.assignTeacherToClassroom(
        this.teacherAssignment.classroomId, this.teacherAssignment.teacherId
      ), 'Profesor asignado al salón'
    );
  }

  removeTeacher() {
    if (!this.selectedClassroom?.id) return;
    this.run(
      this.administratorApi.unassignTeacherFromClassroom(this.selectedClassroom.id),
      'Profesor removido del salón'
    );
  }

  assignStudent() {
    if (!this.studentAssignment.classroomId || !this.studentAssignment.studentId) return;
    this.run(
      this.administratorApi.assignStudentToClassroom(
        this.studentAssignment.classroomId, this.studentAssignment.studentId
      ), 'Alumno inscrito al salón'
    );
  }

  removeStudent(studentId: string) {
    if (!this.selectedClassroom?.id) return;
    this.run(
      this.administratorApi.unassignStudentFromClassroom(this.selectedClassroom.id, studentId),
      'Alumno removido del salón'
    );
  }

  get availableStudents() {
    const enrolled = new Set(this.selectedClassroomStudents.map(s => s.id));
    return this.students.filter(s => !enrolled.has(s.id));
  }

  get availableSubjects() {
    const assigned = new Set(this.selectedClassroomSubjects.map(s => s.id));
    return this.subjects.filter(s => !assigned.has(s.id));
  }

  addSubject() {
    if (!this.subjectIdToAdd || !this.selectedClassroom?.id) return;
    this.run(
      this.administratorApi.addSubjectToClassroom(this.selectedClassroom.id, this.subjectIdToAdd),
      'Materia asignada al salón'
    );
  }

  addSchedule() {
    const f = this.scheduleForm;
    if (!f.subjectId || !f.teacherId || !f.dayOfWeek || !f.startTime || !f.endTime || !f.startDate || !f.endDate) return;
    this.saving = true;
    this.scheduleApi.create({
      classroomId: this.selectedClassroom.id,
      subjectId:   f.subjectId,
      teacherId:   f.teacherId,
      dayOfWeek:   f.dayOfWeek,
      startTime:   f.startTime,
      endTime:     f.endTime,
      startDate:   f.startDate,
      endDate:     f.endDate,
    }).subscribe({
      next: entry => {
        this.schedules = [...this.schedules, entry];
        this.scheduleForm = { subjectId: '', teacherId: '', dayOfWeek: 'lunes', startTime: '08:00', endTime: '09:00', startDate: '', endDate: '' };
        this.saving = false;
        this.showToast('Horario agregado');
      },
      error: (e: any) => {
        this.saving = false;
        this.showToast(e?.error?.message ?? 'Error al guardar el horario');
      }
    });
  }

  openEditSchedule(s: any) {
    this.editingSchedule = s;
    this.editScheduleForm = {
      subjectId:  s.subjectId  ?? '',
      teacherId:  s.teacherId  ?? '',
      dayOfWeek:  s.dayOfWeek  ?? 'lunes',
      startTime:  s.startTime  ? String(s.startTime).substring(0,5) : '08:00',
      endTime:    s.endTime    ? String(s.endTime).substring(0,5)   : '09:00',
      startDate:  s.startDate  ? String(s.startDate).substring(0,10) : '',
      endDate:    s.endDate    ? String(s.endDate).substring(0,10)   : '',
    };
  }

  closeEditSchedule() { this.editingSchedule = null; }

  saveEditSchedule() {
    const f = this.editScheduleForm;
    if (!f.subjectId || !f.teacherId || !f.dayOfWeek || !f.startTime || !f.endTime || !f.startDate || !f.endDate) return;
    this.saving = true;
    this.scheduleApi.update(this.editingSchedule.id, {
      classroomId: this.selectedClassroom.id,
      subjectId:   f.subjectId,
      teacherId:   f.teacherId,
      dayOfWeek:   f.dayOfWeek,
      startTime:   f.startTime,
      endTime:     f.endTime,
      startDate:   f.startDate,
      endDate:     f.endDate,
    }).subscribe({
      next: updated => {
        this.schedules = this.schedules.map(s => s.id === updated.id ? updated : s);
        this.saving = false;
        this.closeEditSchedule();
        this.showToast('Horario actualizado');
      },
      error: (e: any) => {
        this.saving = false;
        this.showToast(e?.error?.message ?? 'Error al actualizar el horario');
      }
    });
  }

  removeSchedule(id: string) {
    this.saving = true;
    this.scheduleApi.remove(id).subscribe({
      next: () => {
        this.schedules = this.schedules.filter(s => s.id !== id);
        this.saving = false;
        this.showToast('Horario eliminado');
      },
      error: () => { this.saving = false; }
    });
  }

  schedulesByDay(day: string): any[] {
    return this.schedules
      .filter(s => s.dayOfWeek === day)
      .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
  }

  removeSubject(subjectId: string) {
    if (!this.selectedClassroom?.id) return;
    this.run(
      this.administratorApi.removeSubjectFromClassroom(this.selectedClassroom.id, subjectId),
      'Materia removida del salón'
    );
  }

  private run(obs: any, msg: string) {
    this.saving = true;
    obs.subscribe({
      next: () => { this.showToast(msg); this.saving = false; this.load(); },
      error: (e: any) => { this.saving = false; this.showToast(e?.error?.message ?? 'Error'); }
    });
  }

  // ── Modal de confirmación ──────────────────────────────────────────
  confirmModal: { open: boolean; title: string; body: string; onConfirm: () => void } = {
    open: false, title: '', body: '', onConfirm: () => {}
  };

  openConfirm(title: string, body: string, onConfirm: () => void) {
    this.confirmModal = { open: true, title, body, onConfirm };
  }

  closeConfirm() { this.confirmModal.open = false; }

  runConfirm() { this.confirmModal.onConfirm(); this.closeConfirm(); }

  deactivateClassroom(classroomId: string, name: string) {
    this.openConfirm(
      `Dar de baja salón`,
      `¿Estás seguro de dar de baja el salón <strong>"${name}"</strong>? Quedará inactivo y no aparecerá en las vistas activas.`,
      () => this.run(
        this.administratorApi.deactivateClassroom(classroomId),
        `Salón "${name}" dado de baja`
      )
    );
  }

  private showToast(msg: string) {
    this.toast = msg;
    this.toastType = resolveToastType(msg);
    setTimeout(() => this.toast = '', 3500);
  }
}

function resolveToastType(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('actualiz') || m.includes('cambiad') || m.includes('guardad') || m.includes('editad')) return 'warn';
  if (m.includes('eliminad') || m.includes('removid') || m.includes('baja') || m.includes('quitad') || m.includes('desactivad') || m.includes('error')) return 'error';
  if (m.includes('cread') || m.includes('agregad') || m.includes('inscrit') || m.includes('asignad') || m.includes('alta')) return 'ok';
  return 'default';
}
