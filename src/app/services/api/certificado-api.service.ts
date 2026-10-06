import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/certificados`;

/** en_curso | listo | solicitado | entregado */
export type EstadoCertificado = 'en_curso' | 'listo' | 'solicitado' | 'entregado';

export interface AvanceCertificado {
  subjectId: string; materia: string; color: string | null; icono: string | null;
  aprobadas: number; total: number; estado: EstadoCertificado;
  certificadoId: string | null; folio: string | null; entregadoEn: string | null;
}

export interface FilaCertificado {
  id: string; folio: string; alumnoId: string; alumno: string; avatarUrl: string | null;
  iniciales: string | null; materia: string; solicitadoEn: string; entregadoEn: string | null;
}

export interface DetalleCertificado {
  id: string; folio: string; alumno: string; avatarUrl: string | null; iniciales: string | null;
  materia: string; color: string | null; actividades: number; minutos: number; proyectos: number; logros: number;
  solicitadoEn: string; entregadoEn: string | null; entregadoPor: string | null; valido: boolean;
}

/** Lo que muestra el QR a cualquiera: nombre con inicial, curso y fecha. */
export interface VerificacionCertificado { folio: string; alumno: string; materia: string; entregadoEn: string; }

@Injectable({ providedIn: 'root' })
export class CertificadoApiService {
  constructor(private http: HttpClient) {}

  mios(): Observable<AvanceCertificado[]> {
    return this.http.get<any>(`${BASE}/mios`).pipe(map(r => r.data ?? []));
  }

  solicitar(materiaId: string): Observable<AvanceCertificado> {
    return this.http.post<any>(`${BASE}/solicitar/${materiaId}`, {}).pipe(map(r => r.data));
  }

  deMisAlumnos(): Observable<FilaCertificado[]> {
    return this.http.get<any>(`${BASE}/de-mis-alumnos`).pipe(map(r => r.data ?? []));
  }

  entregar(id: string): Observable<FilaCertificado> {
    return this.http.post<any>(`${BASE}/${id}/entregar`, {}).pipe(map(r => r.data));
  }

  /** Publico: no pide sesion. Es lo que abre el QR del certificado. */
  verificar(folio: string): Observable<VerificacionCertificado> {
    return this.http.get<any>(`${BASE}/verificar/${encodeURIComponent(folio)}`).pipe(map(r => r.data));
  }

  detalle(id: string): Observable<DetalleCertificado> {
    return this.http.get<any>(`${BASE}/${id}`).pipe(map(r => r.data));
  }
}
