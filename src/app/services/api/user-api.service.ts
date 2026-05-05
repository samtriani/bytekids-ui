import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/users`;

export interface CreateUserPayload {
  username: string;
  password: string;
  displayName: string;
  role: 'student' | 'teacher' | 'parent' | 'admin' | 'director';
  initials?: string;
  age?: number | null;
  address?: string | null;
}

@Injectable({ providedIn: 'root' })
export class UserApiService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<any[]> {
    return this.http.get<any>(BASE).pipe(map((response) => response.data ?? []));
  }

  getMe(): Observable<any> {
    return this.http.get<any>(`${BASE}/me`).pipe(map((response) => response.data));
  }

  getById(id: string): Observable<any> {
    return this.http.get<any>(`${BASE}/${id}`).pipe(map((response) => response.data));
  }

  getByRole(role: string): Observable<any[]> {
    return this.http.get<any>(`${BASE}/role/${role}`).pipe(map((response) => response.data ?? []));
  }

  getTeachers(): Observable<any[]> {
    return this.getByRole('teacher');
  }

  getStudents(): Observable<any[]> {
    return this.getByRole('student');
  }

  getParents(): Observable<any[]> {
    return this.getByRole('parent');
  }

  create(payload: CreateUserPayload): Observable<any> {
    return this.http.post<any>(BASE, payload).pipe(map((response) => response.data));
  }

  update(id: string, payload: Partial<CreateUserPayload>): Observable<any> {
    return this.http.put<any>(`${BASE}/${id}`, payload).pipe(map((response) => response.data));
  }

  deactivate(id: string): Observable<void> {
    return this.http.delete<any>(`${BASE}/${id}`).pipe(map(() => void 0));
  }

  linkStudent(parentId: string, studentId: string, relationshipType = 'padre'): Observable<void> {
    return this.http.post<any>(
      `${BASE}/${parentId}/link-student/${studentId}?relationshipType=${relationshipType}`,
      {}
    ).pipe(map(() => void 0));
  }

  unlinkStudent(parentId: string, studentId: string): Observable<void> {
    return this.http.delete<any>(`${BASE}/${parentId}/link-student/${studentId}`).pipe(map(() => void 0));
  }

  getStudentsOfParent(parentId: string): Observable<any[]> {
    return this.http.get<any>(`${BASE}/${parentId}/students`).pipe(map((response) => response.data ?? []));
  }
}
