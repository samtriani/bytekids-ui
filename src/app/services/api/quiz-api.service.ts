import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class QuizApiService {
  constructor(private http: HttpClient) {}

  getQuestions(contentId: string): Observable<any[]> {
    return this.http.get<any>(`${environment.apiUrl}/quiz/${contentId}/questions`)
      .pipe(map(r => r.data ?? []));
  }

  /** Mis intentos en este quiz, del mas reciente al mas viejo. */
  getMyAttempts(contentId: string): Observable<any[]> {
    return this.http.get<any>(`${environment.apiUrl}/quiz/${contentId}/attempts/me`)
      .pipe(map(r => r.data ?? []));
  }

  /** Que contesté en ese intento, para repasarlo. */
  getAnswers(attemptId: string): Observable<any[]> {
    return this.http.get<any>(`${environment.apiUrl}/quiz/attempts/${attemptId}/answers`)
      .pipe(map(r => r.data ?? []));
  }

  submitAttempt(contentId: string, answers: Record<string, string>): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/quiz/${contentId}/attempt`, { answers })
      .pipe(map(r => r.data));
  }
}
