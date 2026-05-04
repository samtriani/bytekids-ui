import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ShellComponent } from '../../../shared/shell/shell.component';
import { AuthService } from '../../../services/auth.service';
import { UserApiService } from '../../../services/api/user-api.service';
import { ClassroomApiService } from '../../../services/api/classroom-api.service';
import { AdministratorApiService } from '../../../services/api/administrator-api.service';
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
  teachers: any[] = [];
  students: any[] = [];

  selectedClassroom: any = null;
  selectedClassroomStudents: any[] = [];

  teacherAssignment = { classroomId: '', teacherId: '' };
  studentAssignment = { classroomId: '', studentId: '' };
  classroomSearch = '';

  constructor(
    private auth: AuthService,
    private userApi: UserApiService,
    private classroomApi: ClassroomApiService,
    private administratorApi: AdministratorApiService
  ) {
    const u = this.auth.getUser();
    if (u) { this.userName = u.displayName; this.userAvatar = u.initials; }
  }

  ngOnInit() { this.load(); }

  load() {
    forkJoin({
      teachers:   this.userApi.getTeachers(),
      students:   this.userApi.getStudents(),
      classrooms: this.classroomApi.getAll()
    }).subscribe({
      next: ({ teachers, students, classrooms }) => {
        this.teachers   = teachers;
        this.students   = students;
        this.classrooms = classrooms;
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
    this.classroomApi.getStudents(classroom.id).subscribe({
      next: s => this.selectedClassroomStudents = s
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
