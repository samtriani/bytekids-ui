import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ShellComponent } from '../../../shared/shell/shell.component';
import { AuthService } from '../../../services/auth.service';
import { UserApiService } from '../../../services/api/user-api.service';
import { ClassroomApiService } from '../../../services/api/classroom-api.service';
import { AdministratorApiService } from '../../../services/api/administrator-api.service';
import { SubjectService } from '../../../services/api/subject-api.service';
import { ADMINISTRATOR_NAV_ITEMS } from '../shared/administrator-nav';

@Component({
  selector: 'app-administrator-assignments-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ShellComponent],
  templateUrl: './administrator-assignments-page.component.html',
  styleUrls: ['./administrator-assignments-page.component.scss']
})
export class AdministratorAssignmentsPageComponent implements OnInit {
  navItems = ADMINISTRATOR_NAV_ITEMS;
  userName = 'Administrador';
  userAvatar = 'AD';
  toast = '';
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

  constructor(
    private auth: AuthService,
    private userApi: UserApiService,
    private classroomApi: ClassroomApiService,
    private administratorApi: AdministratorApiService,
    private subjectApi: SubjectService
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
      students: this.classroomApi.getStudents(classroom.id),
      subjects: this.classroomApi.getSubjects(classroom.id),
    }).subscribe({
      next: ({ students, subjects }) => {
        this.selectedClassroomStudents = students;
        this.selectedClassroomSubjects = subjects;
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

  deactivateClassroom(classroomId: string, name: string) {
    if (!confirm(`¿Dar de baja el salón "${name}"? Quedará inactivo.`)) return;
    this.run(
      this.administratorApi.deactivateClassroom(classroomId),
      `Salón "${name}" dado de baja`,
    );
  }

  private showToast(msg: string) {
    this.toast = msg;
    setTimeout(() => this.toast = '', 3500);
  }
}
