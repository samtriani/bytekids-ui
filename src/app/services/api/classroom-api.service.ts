import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/classrooms`;

@Injectable({ providedIn: 'root' })
export class ClassroomApiService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<any[]> {
    return this.http.get<any>(BASE).pipe(map(r => r.data ?? []));
  }

  getMyClassrooms(): Observable<any[]> {
    return this.http.get<any>(`${BASE}/my`).pipe(map(r => r.data ?? []));
  }

  getById(id: string): Observable<any> {
    return this.http.get<any>(`${BASE}/${id}`).pipe(map(r => r.data));
  }

  getStudents(classroomId: string): Observable<any[]> {
    return this.http.get<any>(`${BASE}/${classroomId}/students`).pipe(map(r => r.data ?? []));
  }

  create(req: any): Observable<any> {
    return this.http.post<any>(BASE, req).pipe(map(r => r.data));
  }

  update(id: string, req: any): Observable<any> {
    return this.http.put<any>(`${BASE}/${id}`, req).pipe(map(r => r.data));
  }

  enroll(classroomId: string, studentId: string): Observable<void> {
    return this.http.post<any>(`${BASE}/${classroomId}/enroll/${studentId}`, {}).pipe(map(() => void 0));
  }

  getClassroomsByStudent(studentId: string): Observable<any[]> {
    return this.http.get<any>(`${BASE}/student/${studentId}`).pipe(map(r => r.data ?? []));
  }

  getByTeacher(teacherId: string): Observable<any[]> {
    return this.http.get<any>(`${BASE}/teacher/${teacherId}`).pipe(map(r => r.data ?? []));
  }

  getSubjects(classroomId: string): Observable<any[]> {
    return this.http.get<any>(`${BASE}/${classroomId}/subjects`).pipe(map(r => r.data ?? []));
  }
}
