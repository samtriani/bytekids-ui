import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShellComponent } from '../../../shared/shell/shell.component';
import { STUDENT_NAV } from '../shared/student-nav';
import { ProgressApiService } from '../../../services/api/progress-api.service';
import { AchievementApiService } from '../../../services/api/achievement-api.service';
import { AuthService } from '../../../services/auth.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface EnElRanking {
  id: string;
  nombre: string;
  iniciales: string;
  xp: number;
  puesto: number;
  esMio: boolean;
}

interface LogroDelSalon {
  nombre: string;
  iniciales: string;
  esMio: boolean;
  titulo: string;
  icono: string;
  xp: number;
  cuando: string;
}

/**
 * Comunidad: un muro de RECONOCIMIENTO, no un muro de publicaciones.
 *
 * Antes esta pantalla tenía un formulario para publicar, "me gusta",
 * comentarios y un botón de compartir. Nada de eso existía: los posts se
 * guardaban en memoria y desaparecían al recargar, el combo ofrecía materias
 * que la plataforma no imparte, y "compartir" mostraba "link copiado" sin
 * copiar nada.
 *
 * No se completó, se quitó. Un muro donde menores publican texto que otros
 * menores leen es la superficie más delicada de toda la plataforma y pide
 * moderación permanente. Ya se había decidido lo mismo al cerrar los mensajes
 * entre alumnos (ver MessageService.contactosPermitidos en el backend): un
 * muro público es esa misma superficie con más audiencia.
 *
 * Lo que queda es lo que de verdad mueve a un niño y además es cierto: cómo
 * va su salón, y lo que sus compañeros acaban de lograr.
 */
@Component({
  selector: 'app-community',
  standalone: true,
  imports: [CommonModule, RouterLink, ShellComponent],
  templateUrl: './community.component.html',
  styleUrls: ['./community.component.scss'],
})
export class CommunityComponent implements OnInit {
  navItems = STUDENT_NAV;

  yo: any = null;
  ranking: EnElRanking[] = [];
  logros: LogroDelSalon[] = [];
  cargando = true;

  get miNombre():   string { return this.yo?.displayName || 'Alumno'; }
  get misIniciales(): string { return this.yo?.initials  || 'A'; }

  /** Mi lugar, para poder señalarlo aunque no esté entre los primeros. */
  get miPuesto(): EnElRanking | null {
    return this.ranking.find(r => r.esMio) ?? null;
  }

  get salonVacio(): boolean {
    return !this.cargando && !this.ranking.length && !this.logros.length;
  }

  constructor(
    private progressApi: ProgressApiService,
    private achievementApi: AchievementApiService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.yo = this.auth.getUser();
    const miId = this.yo?.userId;

    forkJoin({
      ranking: this.progressApi.getLeaderboardDeMiSalon(6).pipe(catchError(() => of([]))),
      logros:  this.achievementApi.getLogrosDeMiSalon(8).pipe(catchError(() => of([]))),
    }).subscribe(({ ranking, logros }) => {
      this.ranking = (ranking as any[]).map((e, i) => ({
        id:        e.studentId,
        nombre:    e.displayName || 'Compañero',
        iniciales: this.aIniciales(e.displayName, e.initials),
        xp:        e.totalXp ?? 0,
        puesto:    e.rank ?? i + 1,
        esMio:     e.studentId === miId,
      }));

      this.logros = (logros as any[]).map(l => ({
        nombre:    l.displayName || 'Compañero',
        iniciales: this.aIniciales(l.displayName, l.initials),
        esMio:     !!l.esMio,
        titulo:    l.title,
        icono:     l.icon || '🏆',
        xp:        l.xpReward ?? 0,
        cuando:    this.cuando(l.earnedAt),
      }));

      this.cargando = false;
    });
  }

  /** La medalla del podio. Del cuarto en adelante va el número. */
  medalla(puesto: number): string {
    return ({ 1: '🥇', 2: '🥈', 3: '🥉' } as any)[puesto] ?? '';
  }

  private aIniciales(nombre?: string, dadas?: string): string {
    if (dadas) return dadas.toUpperCase();
    return (nombre || '?').split(' ').filter(Boolean)
      .map(p => p[0]).join('').slice(0, 2).toUpperCase();
  }

  private cuando(iso?: string): string {
    if (!iso) return '';
    const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (dias <= 0) return 'hoy';
    if (dias === 1) return 'ayer';
    if (dias < 7)  return `hace ${dias} días`;
    return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  }
}
