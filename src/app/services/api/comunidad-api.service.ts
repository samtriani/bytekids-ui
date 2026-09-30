import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/comunidad`;

export interface SalonComunidad { id: string; nombre: string; alumnos: number; }

export interface AlumnoMuro {
  id: string; nombre: string; iniciales: string | null; avatarUrl: string | null;
  xp: number; puesto: number;
}

export interface LogroMuro {
  id: string; alumnoId: string; nombre: string; iniciales: string | null; avatarUrl: string | null;
  titulo: string; icono: string | null; xp: number; cuando: string | null; felicitado: boolean;
}

export interface MuroSalon {
  salonId: string; salon: string; totalAlumnos: number;
  ranking: AlumnoMuro[]; sinActividad: AlumnoMuro[]; logros: LogroMuro[];
}

/**
 * La Comunidad del maestro. Cada ruta la acota el backend a los salones de
 * los que es titular: pedir el id de un salon ajeno devuelve 403.
 */
@Injectable({ providedIn: 'root' })
export class ComunidadApiService {
  constructor(private http: HttpClient) {}

  salones(): Observable<SalonComunidad[]> {
    return this.http.get<any>(`${BASE}/salones`).pipe(map(r => r.data ?? []));
  }

  muro(salonId: string): Observable<MuroSalon> {
    return this.http.get<any>(`${BASE}/salones/${salonId}`).pipe(map(r => r.data));
  }

  /** true si se mando; false si ya lo habia felicitado. */
  felicitar(logroId: string): Observable<boolean> {
    return this.http.post<any>(`${BASE}/felicitar/${logroId}`, {}).pipe(map(r => !!r.data));
  }
}
