import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/submissions`;

@Injectable({ providedIn: 'root' })
export class SubmissionApiService {
  constructor(private http: HttpClient) {}

  submit(req: { contentId: string; assignmentId?: string; codeSubmitted?: string }): Observable<any> {
    return this.http.post<any>(BASE, req).pipe(map(r => r.data));
  }

  getMySubmissions(): Observable<any[]> {
    return this.http.get<any>(`${BASE}/me`).pipe(map(r => r.data ?? []));
  }

  getByStudent(studentId: string): Observable<any[]> {
    return this.http.get<any>(`${BASE}/student/${studentId}`).pipe(map(r => r.data ?? []));
  }

  getByContent(contentId: string): Observable<any[]> {
    return this.http.get<any>(`${BASE}/content/${contentId}`).pipe(map(r => r.data ?? []));
  }

  getPending(): Observable<any[]> {
    return this.http.get<any>(`${BASE}/pending`).pipe(map(r => r.data ?? []));
  }

  review(id: string, req: { status: string; score?: number; feedback?: string }): Observable<any> {
    return this.http.put<any>(`${BASE}/${id}/review`, req).pipe(map(r => r.data));
  }
}
