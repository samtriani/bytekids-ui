import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/messages`;

@Injectable({ providedIn: 'root' })
export class MessageApiService {
  constructor(private http: HttpClient) {}

  getInbox(): Observable<any[]> {
    return this.http.get<any>(`${BASE}/inbox`).pipe(map(r => r.data ?? []));
  }

  getSent(): Observable<any[]> {
    return this.http.get<any>(`${BASE}/sent`).pipe(map(r => r.data ?? []));
  }

  getThread(parentId: string): Observable<any[]> {
    return this.http.get<any>(`${BASE}/thread/${parentId}`).pipe(map(r => r.data ?? []));
  }

  send(req: { recipientId: string; subject?: string; body: string; parentMessageId?: string }): Observable<any> {
    return this.http.post<any>(BASE, req).pipe(map(r => r.data));
  }

  markAsRead(id: string): Observable<void> {
    return this.http.put<any>(`${BASE}/${id}/read`, {}).pipe(map(() => void 0));
  }
}
