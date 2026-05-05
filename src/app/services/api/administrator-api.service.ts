import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/administrator`;

export interface AdministratorUserPayload {
  username: string;
  password: string;
  displayName: string;
  role: 'teacher' | 'student' | 'parent' | 'director' | 'admin';
  initials?: string;
  avatarUrl?: string;
}

export interface AdministratorClassroomPayload {
  name: string;
  gradeLevel: number;
  section: string;
  description?: string;
  teacherId?: string | null;
  schoolYear?: string;
}

export interface AdministratorSubjectPayload {
  name: string;
  icon?: string;
  color?: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class AdministratorApiService {
  constructor(private http: HttpClient) {}

  createUser(payload: AdministratorUserPayload): Observable<any> {
    return this.http.post<any>(`${BASE}/users`, payload).pipe(map((r) => r.data));
  }

  createClassroom(payload: AdministratorClassroomPayload): Observable<any> {
    return this.http.post<any>(`${BASE}/classrooms`, payload).pipe(map((r) => r.data));
  }

  createSubject(payload: AdministratorSubjectPayload): Observable<any> {
    return this.http.post<any>(`${BASE}/subjects`, payload).pipe(map((r) => r.data));
  }

  assignTeacherToClassroom(classroomId: string, teacherId: string): Observable<any> {
    return this.http.put<any>(`${BASE}/classrooms/teacher`, { classroomId, teacherId })
      .pipe(map((r) => r.data));
  }

  unassignTeacherFromClassroom(classroomId: string): Observable<any> {
    return this.http.delete<any>(`${BASE}/classrooms/${classroomId}/teacher`)
      .pipe(map((r) => r.data));
  }

  assignStudentToClassroom(classroomId: string, studentId: string): Observable<void> {
    return this.http.post<any>(`${BASE}/classrooms/student`, { classroomId, studentId })
      .pipe(map(() => void 0));
  }

  unassignStudentFromClassroom(classroomId: string, studentId: string): Observable<void> {
    return this.http.delete<any>(`${BASE}/classrooms/${classroomId}/students/${studentId}`)
      .pipe(map(() => void 0));
  }

  deactivateClassroom(classroomId: string): Observable<void> {
    return this.http.delete<any>(`${BASE}/classrooms/${classroomId}`)
      .pipe(map(() => void 0));
  }

  addSubjectToClassroom(classroomId: string, subjectId: string): Observable<void> {
    return this.http.post<any>(`${BASE}/classrooms/${classroomId}/subjects/${subjectId}`, {})
      .pipe(map(() => void 0));
  }

  removeSubjectFromClassroom(classroomId: string, subjectId: string): Observable<void> {
    return this.http.delete<any>(`${BASE}/classrooms/${classroomId}/subjects/${subjectId}`)
      .pipe(map(() => void 0));
  }
}
