import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/content`;

@Injectable({ providedIn: 'root' })
export class ContentApiService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<any[]> {
    return this.http.get<any>(BASE).pipe(map(r => r.data ?? []));
  }

  getByType(type: string): Observable<any[]> {
    return this.http.get<any>(`${BASE}/type/${type}`).pipe(map(r => r.data ?? []));
  }

  getMissions(): Observable<any[]>  { return this.getByType('mision'); }
  getProjects(): Observable<any[]>  { return this.getByType('proyecto'); }
  getMaterials(): Observable<any[]> { return this.getByType('material'); }

  getById(id: string): Observable<any> {
    return this.http.get<any>(`${BASE}/${id}`).pipe(map(r => r.data));
  }

  getMyContent(): Observable<any[]> {
    return this.http.get<any>(`${BASE}/my`).pipe(map(r => r.data ?? []));
  }

  getMyFeed(): Observable<any[]> {
    return this.http.get<any>(`${BASE}/feed`).pipe(map(r => r.data ?? []));
  }

  create(req: any): Observable<any> {
    return this.http.post<any>(BASE, req).pipe(map(r => r.data));
  }

  update(id: string, req: any): Observable<any> {
    return this.http.put<any>(`${BASE}/${id}`, req).pipe(map(r => r.data));
  }

  publish(id: string): Observable<any> {
    return this.http.post<any>(`${BASE}/${id}/publish`, {}).pipe(map(r => r.data));
  }

  assign(id: string, req: { classroomId?: string; studentId?: string; dueDate?: string }): Observable<void> {
    return this.http.post<any>(`${BASE}/${id}/assign`, req).pipe(map(() => void 0));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<any>(`${BASE}/${id}`).pipe(map(() => void 0));
  }
}
