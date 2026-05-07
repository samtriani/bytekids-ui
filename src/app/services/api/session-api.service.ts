import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/sessions`;

@Injectable({ providedIn: 'root' })
export class SessionApiService {
  constructor(private http: HttpClient) {}

  getStatus(scheduleId: string): Observable<any> {
    return this.http.get<any>(`${BASE}/schedule/${scheduleId}/status`).pipe(map(r => r.data));
  }

  join(scheduleId: string): Observable<void> {
    return this.http.post<any>(`${BASE}/schedule/${scheduleId}/join`, {}).pipe(map(() => void 0));
  }

  leave(scheduleId: string): Observable<void> {
    return this.http.post<any>(`${BASE}/schedule/${scheduleId}/leave`, {}).pipe(map(() => void 0));
  }

  getAttendance(scheduleId: string): Observable<any[]> {
    return this.http.get<any>(`${BASE}/schedule/${scheduleId}/attendance`).pipe(map(r => r.data ?? []));
  }
}
