import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ShellComponent, NavItem } from '../../shared/shell/shell.component';
import { RolePipe } from '../../shared/pipes/role.pipe';
import { AuthService } from '../../services/auth.service';
import { UserApiService } from '../../services/api/user-api.service';
import { ClassroomApiService } from '../../services/api/classroom-api.service';
import { SubjectService } from '../../services/api/subject-api.service';
import { AdministratorApiService } from '../../services/api/administrator-api.service';
import { ADMINISTRATOR_NAV_ITEMS } from '../administrator/shared/administrator-nav';

type DetailSection = 'teachers' | 'students' | 'classrooms' | 'subjects';

@Component({
  selector: 'app-administrator-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ShellComponent, RolePipe],
  templateUrl: './administrator-dashboard.component.html',
  styleUrls: ['./administrator-dashboard.component.scss']
})
export class AdministratorDashboardComponent implements OnInit {
  navItems: NavItem[] = ADMINISTRATOR_NAV_ITEMS;
  userName = 'Administrador';
  userAvatar = 'AD';
  loading = true;
  saving = false;
  toast = '';

  activeDetail: DetailSection = 'teachers';

  teachers:  any[] = [];
  students:  any[] = [];
  classrooms: any[] = [];
  subjects:  any[] = [];
  selectedClassroomStudents: any[] = [];
  selectedStudentClassrooms: any[] = [];

  selectedTeacher:  any = null;
  selectedStudent:  any = null;
  selectedClassroom: any = null;
  selectedSubject:  any = null;

  teacherEditForm  = { username: '', displayName: '', initials: '', password: '' };
  studentEditForm  = { username: '', displayName: '', initials: '', password: '' };
  classroomEditForm = { name: '', gradeLevel: 1, section: '', description: '', teacherId: '', schoolYear: '' };
  subjectEditForm  = { name: '', icon: '📘', color: '#06B6D4', description: '' };

  teacherAssignment = { classroomId: '', teacherId: '' };
  studentAssignment = { classroomId: '', studentId: '' };

  constructor(
    private auth: AuthService,
    private userApi: UserApiService,
    private classroomApi: ClassroomApiService,
    private subjectApi: SubjectService,
    private administratorApi: AdministratorApiService
  ) {
    const u = this.auth.getUser();
    if (u) { this.userName = u.displayName; this.userAvatar = u.initials; }
  }

  ngOnInit() { this.loadData(); }

  loadData() {
    this.loading = true;
    forkJoin({
      teachers:   this.userApi.getTeachers(),
      students:   this.userApi.getStudents(),
      classrooms: this.classroomApi.getAll(),
      subjects:   this.subjectApi.getAll()
    }).subscribe({
      next: ({ teachers, students, classrooms, subjects }) => {
        this.teachers   = teachers;
        this.students   = students;
        this.classrooms = classrooms;
        this.subjects   = subjects;
        this.selectedTeacher   = teachers[0]   ?? null;
        this.selectedStudent   = students[0]   ?? null;
        this.selectedClassroom = classrooms[0] ?? null;
        this.selectedSubject   = subjects[0]   ?? null;
        this.syncEditForms();
        this.loading = false;
        if (this.selectedClassroom) this.loadClassroomStudents(this.selectedClassroom.id);
        if (this.selectedStudent) {
          this.classroomApi.getClassroomsByStudent(this.selectedStudent.id).subscribe({
            next: cls => this.selectedStudentClassrooms = cls,
            error: () => {}
          });
        }
      },
      error: () => { this.loading = false; this.showToast('Error al cargar datos'); }
    });
  }

  // ── Selección ───────────────────────────────────────────────

  setActiveDetail(s: DetailSection) {
    this.activeDetail = s;
    if (s === 'classrooms' && this.selectedClassroom) this.selectClassroom(this.selectedClassroom);
  }

  selectTeacher(t: any)   { this.selectedTeacher   = t; this.syncEditForms(); this.activeDetail = 'teachers'; }
  selectStudent(s: any) {
    this.selectedStudent = s;
    this.syncEditForms();
    this.activeDetail = 'students';
    this.selectedStudentClassrooms = [];
    if (s?.id) {
      this.classroomApi.getClassroomsByStudent(s.id).subscribe({
        next: cls => this.selectedStudentClassrooms = cls,
        error: () => this.selectedStudentClassrooms = []
      });
    }
  }
  selectSubject(s: any)   { this.selectedSubject   = s; this.syncEditForms(); this.activeDetail = 'subjects'; }

  selectClassroom(c: any) {
    this.selectedClassroom = c;
    this.syncEditForms();
    this.activeDetail = 'classrooms';
    this.loadClassroomStudents(c.id);
  }

  private loadClassroomStudents(id: string) {
    this.classroomApi.getStudents(id).subscribe({
      next: rows => this.selectedClassroomStudents = rows,
      error: () => this.selectedClassroomStudents = []
    });
  }

  // ── Asignaciones ────────────────────────────────────────────

  assignTeacher() {
    if (!this.teacherAssignment.classroomId || !this.teacherAssignment.teacherId) return;
    this.run(
      this.administratorApi.assignTeacherToClassroom(
        this.teacherAssignment.classroomId, this.teacherAssignment.teacherId
      ),
      'Profesor asignado al salón',
      () => { this.teacherAssignment = { classroomId: '', teacherId: '' }; this.activeDetail = 'classrooms'; }
    );
  }

  assignStudent() {
    if (!this.studentAssignment.classroomId || !this.studentAssignment.studentId) return;
    this.run(
      this.administratorApi.assignStudentToClassroom(
        this.studentAssignment.classroomId, this.studentAssignment.studentId
      ),
      'Alumno inscrito al salón',
      () => { this.studentAssignment = { classroomId: '', studentId: '' }; this.activeDetail = 'classrooms'; }
    );
  }

  removeTeacherFromClassroom(classroomId: string) {
    this.run(
      this.administratorApi.unassignTeacherFromClassroom(classroomId),
      'Profesor quitado del salón',
      () => {}
    );
  }

  deactivateClassroom(classroomId: string, name: string) {
    if (!confirm(`¿Dar de baja el salón "${name}"?\nQuedará inactivo y no aparecerá en ninguna lista.`)) return;
    this.run(
      this.administratorApi.deactivateClassroom(classroomId),
      `Salón "${name}" dado de baja`,
      () => { if (this.selectedClassroom?.id === classroomId) this.selectedClassroom = null; }
    );
  }

  removeStudentFromClassroom(classroomId: string) {
    if (!this.selectedStudent?.id) return;
    this.run(
      this.administratorApi.unassignStudentFromClassroom(classroomId, this.selectedStudent.id),
      'Alumno quitado del salón',
      () => {
        this.selectedStudentClassrooms = this.selectedStudentClassrooms.filter(c => c.id !== classroomId);
      }
    );
  }

  // ── Getters de vista ────────────────────────────────────────

  get classroomTeacherName() {
    if (!this.selectedClassroom?.teacherId) return 'Sin profesor';
    return this.selectedClassroom.teacherName || 'Profesor asignado';
  }

  get selectedTeacherClassrooms() {
    if (!this.selectedTeacher) return [];
    return this.classrooms.filter(c => c.teacherId === this.selectedTeacher.id);
  }

  get selectedStudentInCurrentClassroom() {
    if (!this.selectedStudent) return false;
    return this.selectedClassroomStudents.some(s => s.id === this.selectedStudent.id);
  }

  // ── Actualizar entidades ─────────────────────────────────────

  updateTeacher() {
    if (!this.selectedTeacher?.id) return;
    this.saving = true;
    this.userApi.update(this.selectedTeacher.id, {
      username:    this.teacherEditForm.username.trim().toLowerCase(),
      displayName: this.teacherEditForm.displayName,
      password:    this.teacherEditForm.password || undefined,
      role:        'teacher',
      initials:    this.teacherEditForm.initials || this.initials(this.teacherEditForm.displayName)
    }).subscribe({
      next: () => { this.teacherEditForm.password = ''; this.showToast('Profesor actualizado'); this.saving = false; this.loadData(); },
      error: (e: any) => { this.saving = false; this.showToast(e?.error?.message ?? 'Error'); }
    });
  }

  updateStudent() {
    if (!this.selectedStudent?.id) return;
    this.saving = true;
    this.userApi.update(this.selectedStudent.id, {
      username:    this.studentEditForm.username.trim().toLowerCase(),
      displayName: this.studentEditForm.displayName,
      password:    this.studentEditForm.password || undefined,
      role:        'student',
      initials:    this.studentEditForm.initials || this.initials(this.studentEditForm.displayName)
    }).subscribe({
      next: () => { this.studentEditForm.password = ''; this.showToast('Alumno actualizado'); this.saving = false; this.loadData(); },
      error: (e: any) => { this.saving = false; this.showToast(e?.error?.message ?? 'Error'); }
    });
  }

  updateClassroom() {
    if (!this.selectedClassroom?.id) return;
    this.saving = true;
    this.classroomApi.update(this.selectedClassroom.id, {
      ...this.classroomEditForm, teacherId: this.classroomEditForm.teacherId || null
    }).subscribe({
      next: () => { this.showToast('Salón actualizado'); this.saving = false; this.loadData(); },
      error: (e: any) => { this.saving = false; this.showToast(e?.error?.message ?? 'Error'); }
    });
  }

  updateSubject() {
    if (!this.selectedSubject?.id) return;
    this.saving = true;
    this.subjectApi.update(this.selectedSubject.id, this.subjectEditForm).subscribe({
      next: () => { this.showToast('Materia actualizada'); this.saving = false; this.loadData(); },
      error: (e: any) => { this.saving = false; this.showToast(e?.error?.message ?? 'Error'); }
    });
  }

  // ── Helpers ─────────────────────────────────────────────────

  private run(obs: any, msg: string, onSuccess: () => void) {
    this.saving = true;
    obs.subscribe({
      next: () => { onSuccess(); this.showToast(msg); this.saving = false; this.loadData(); },
      error: (e: any) => { this.saving = false; this.showToast(e?.error?.message ?? 'Error'); }
    });
  }

  private initials(name: string) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  private syncEditForms() {
    if (this.selectedTeacher)
      this.teacherEditForm = { username: this.selectedTeacher.username ?? '', displayName: this.selectedTeacher.displayName ?? '', initials: this.selectedTeacher.initials ?? '', password: '' };
    if (this.selectedStudent)
      this.studentEditForm = { username: this.selectedStudent.username ?? '', displayName: this.selectedStudent.displayName ?? '', initials: this.selectedStudent.initials ?? '', password: '' };
    if (this.selectedClassroom)
      this.classroomEditForm = { name: this.selectedClassroom.name ?? '', gradeLevel: this.selectedClassroom.gradeLevel ?? 1, section: this.selectedClassroom.section ?? '', description: this.selectedClassroom.description ?? '', teacherId: this.selectedClassroom.teacherId ?? '', schoolYear: this.selectedClassroom.schoolYear ?? '' };
    if (this.selectedSubject)
      this.subjectEditForm = { name: this.selectedSubject.name ?? '', icon: this.selectedSubject.icon ?? '📘', color: this.selectedSubject.color ?? '#06B6D4', description: this.selectedSubject.description ?? '' };
  }

  private showToast(msg: string) { this.toast = msg; setTimeout(() => this.toast = '', 3500); }
}
