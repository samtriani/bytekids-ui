import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';

export type EstadoPaso = 'aprobada' | 'revision' | 'corregir' | 'siguiente' | 'abierta' | 'bloqueada';

export interface PasoHijo { id: string; orden: number; titulo: string; tipo: string; estado: EstadoPaso; }

export interface MateriaHijo {
  id: string; nombre: string; color: string | null; icono: string | null;
  aprobadas: number; total: number; siguiente: PasoHijo | null; camino: PasoHijo[];
}

export interface Hijo {
  id: string; nombre: string; iniciales: string | null; avatarUrl: string | null;
  xp: number; racha: number; ultimaActividad: string | null;
  materias: MateriaHijo[];
  logros: { titulo: string; icono: string | null; xp: number; cuando: string | null }[];
  certificados: { id: string | null; materia: string; estado: 'solicitado' | 'entregado'; folio: string | null }[];
  clases: { dia: string; inicio: string; fin: string; salon: string; materia: string | null }[];
  xpReciente: { fecha: string; xp: number }[];
}

/** Un trabajo entregado, con la calificacion y el comentario del maestro. */
export interface TrabajoHijo {
  actividadId: string; titulo: string; tipo: string; materia: string | null; color: string | null; orden: number;
  estado: 'aprobada' | 'revision' | 'corregir'; calificacion: number | null;
  texto: string | null; comentario: string | null; revisadoPor: string | null;
  entregadoEn: string | null; revisadoEn: string | null;
}

/**
 * Los hijos de quien pregunta, con todo su avance. Una sola llamada: la ruta
 * no recibe ids, asi que no hay forma de pedir los de otra familia.
 *
 * Se comparte entre pantallas durante 30 segundos: el papa brinca del panel
 * a Mis hijos y no tiene caso volver a pedir lo mismo.
 */
@Injectable({ providedIn: 'root' })
export class FamiliaApiService {
  private cache: { t: number; obs: Observable<Hijo[]> } | null = null;

  constructor(private http: HttpClient) {}

  /** Lo que entrego un hijo. La API revisa que sea hijo de quien pregunta. */
  trabajos(hijoId: string): Observable<TrabajoHijo[]> {
    return this.http.get<any>(`${environment.apiUrl}/familia/hijos/${hijoId}/trabajos`)
      .pipe(map(r => (r.data ?? []) as TrabajoHijo[]));
  }

  hijos(): Observable<Hijo[]> {
    if (this.cache && Date.now() - this.cache.t < 30_000) return this.cache.obs;
    const obs = this.http.get<any>(`${environment.apiUrl}/familia/hijos`)
      .pipe(map(r => (r.data ?? []) as Hijo[]), shareReplay(1));
    this.cache = { t: Date.now(), obs };
    return obs;
  }
}
