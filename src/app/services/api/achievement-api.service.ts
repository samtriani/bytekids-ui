import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/achievements`;

@Injectable({ providedIn: 'root' })
export class AchievementApiService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<any[]> {
    return this.http.get<any>(BASE).pipe(map(r => r.data ?? []));
  }

  getMyAchievements(): Observable<any[]> {
    return this.http.get<any>(`${BASE}/me`).pipe(map(r => r.data ?? []));
  }

  getStudentAchievements(studentId: string): Observable<any[]> {
    return this.http.get<any>(`${BASE}/students/${studentId}`).pipe(map(r => r.data ?? []));
  }
}
