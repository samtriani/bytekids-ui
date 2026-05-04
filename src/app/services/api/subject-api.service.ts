import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/subjects`;

@Injectable({ providedIn: 'root' })
export class SubjectService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<any[]> {
    return this.http.get<any>(BASE).pipe(map(r => r.data ?? r ?? []));
  }

  getById(id: string): Observable<any> {
    return this.http.get<any>(`${BASE}/${id}`).pipe(map(r => r.data ?? r));
  }

  create(payload: { name: string; icon?: string; color?: string; description?: string }): Observable<any> {
    return this.http.post<any>(BASE, payload).pipe(map(r => r.data ?? r));
  }

  update(id: string, payload: any): Observable<any> {
    return this.http.put<any>(`${BASE}/${id}`, payload).pipe(map(r => r.data ?? r));
  }
}
