import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/progress`;

@Injectable({ providedIn: 'root' })
export class ProgressApiService {
  constructor(private http: HttpClient) {}

  getMyXp(): Observable<number> {
    return this.http.get<any>(`${BASE}/me/xp`).pipe(map(r => r.data?.totalXp ?? 0));
  }

  getMyStreak(): Observable<number> {
    return this.http.get<any>(`${BASE}/me/streak`).pipe(map(r => r.data?.streak ?? 0));
  }

  getMySubjects(): Observable<any[]> {
    return this.http.get<any>(`${BASE}/me/subjects`).pipe(map(r => r.data ?? []));
  }

  getMyActivity(): Observable<any[]> {
    return this.http.get<any>(`${BASE}/me/activity`).pipe(map(r => r.data ?? []));
  }

  getMyXpHistory(): Observable<any[]> {
    return this.http.get<any>(`${BASE}/me/xp-history`).pipe(map(r => r.data ?? []));
  }

  // Maestro / Padre / Admin
  getStudentXp(studentId: string): Observable<number> {
    return this.http.get<any>(`${BASE}/students/${studentId}/xp`).pipe(map(r => r.data?.totalXp ?? 0));
  }

  getStudentStreak(studentId: string): Observable<number> {
    return this.http.get<any>(`${BASE}/students/${studentId}/streak`).pipe(map(r => r.data?.streak ?? 0));
  }

  getStudentSubjects(studentId: string): Observable<any[]> {
    return this.http.get<any>(`${BASE}/students/${studentId}/subjects`).pipe(map(r => r.data ?? []));
  }

  getStudentActivity(studentId: string): Observable<any[]> {
    return this.http.get<any>(`${BASE}/students/${studentId}/activity`).pipe(map(r => r.data ?? []));
  }

  /**
   * El ranking DE SU SALON. Distinto de getLeaderboard, que es global:
   * ese le ensena a un nino nombres completos de menores de otros grupos.
   * El backend decide el alcance, aqui no se manda a quien incluir.
   */
  getLeaderboardDeMiSalon(limit = 5): Observable<any[]> {
    return this.http.get<any>(`${BASE}/leaderboard/mi-salon?limit=${limit}`)
      .pipe(map(r => r.data ?? []));
  }

  getLeaderboard(limit = 10): Observable<any[]> {
    return this.http.get<any>(`${BASE}/leaderboard?limit=${limit}`).pipe(map(r => r.data ?? []));
  }
}
