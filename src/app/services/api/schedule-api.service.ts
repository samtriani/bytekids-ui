import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/schedules`;

@Injectable({ providedIn: 'root' })
export class ScheduleApiService {
  constructor(private http: HttpClient) {}

  getByClassroom(classroomId: string): Observable<any[]> {
    return this.http.get<any>(`${BASE}/classroom/${classroomId}`).pipe(map(r => r.data ?? []));
  }

  getByTeacher(teacherId: string): Observable<any[]> {
    return this.http.get<any>(`${BASE}/teacher/${teacherId}`).pipe(map(r => r.data ?? []));
  }

  create(req: {
    classroomId: string;
    subjectId: string;
    teacherId: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
  }): Observable<any> {
    return this.http.post<any>(BASE, req).pipe(map(r => r.data));
  }

  remove(id: string): Observable<void> {
    return this.http.delete<any>(`${BASE}/${id}`).pipe(map(() => void 0));
  }
}
