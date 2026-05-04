import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/notifications`;

@Injectable({ providedIn: 'root' })
export class NotificationApiService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<any[]> {
    return this.http.get<any>(BASE).pipe(map(r => r.data ?? []));
  }

  getUnreadCount(): Observable<number> {
    return this.http.get<any>(`${BASE}/unread-count`).pipe(map(r => r.data?.unread ?? 0));
  }

  markAsRead(id: string): Observable<void> {
    return this.http.put<any>(`${BASE}/${id}/read`, {}).pipe(map(() => void 0));
  }

  markAllAsRead(): Observable<void> {
    return this.http.put<any>(`${BASE}/read-all`, {}).pipe(map(() => void 0));
  }

  send(req: { recipientId: string; type: string; title: string; body?: string }): Observable<any> {
    return this.http.post<any>(BASE, req).pipe(map(r => r.data));
  }
}
