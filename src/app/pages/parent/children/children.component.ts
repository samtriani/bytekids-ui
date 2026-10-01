import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ShellComponent } from '../../../shared/shell/shell.component';
import { AvatarComponent } from '../../../shared/avatar/avatar.component';
import { CaminoComponent } from '../../../shared/camino/camino.component';
import { AuthService } from '../../../services/auth.service';
import { FamiliaApiService, Hijo, TrabajoHijo } from '../../../services/api/familia-api.service';
import { sobreDiez } from '../../../shared/calificacion';
import { PARENT_NAV } from '../shared/parent-nav';
import { consejo, constancia, nivel, primerNombre, XP_POR_NIVEL } from '../shared/familia';

/** Una barra de la grafica de XP por semana. */
interface BarraSemana { etiqueta: string; xp: number; alto: number; }

/**
 * Todo el avance de un hijo: su camino en cada materia, su XP por semana,
 * sus certificados, sus logros y sus clases.
 *
 * Absorbe la vieja pantalla de "Progreso", que repetia casi lo mismo con un
 * porcentaje inventado (XP entre 5).
 */
@Component({
  selector: 'app-parent-children',
  standalone: true,
  imports: [CommonModule, RouterLink, ShellComponent, AvatarComponent, CaminoComponent],
  templateUrl: './children.component.html',
  styleUrls: ['./children.component.scss'],
})
export class ChildrenComponent implements OnInit {
  navItems = PARENT_NAV;
  parentName = '';
  parentInitials = '';

  hijos: Hijo[] = [];
  sel: Hijo | null = null;
  semanas: BarraSemana[] = [];

  /** Lo que entrego el hijo elegido. Se pide al elegirlo, no con el panel. */
  trabajos: TrabajoHijo[] = [];
  cargandoTrabajos = false;
  get hayComentarios(): boolean { return this.trabajos.some(t => !!t.comentario); }
  readonly sobreDiez = sobreDiez;
  readonly ICONO: Record<string, string> = { mision: '🚀', tarea: '🔍', quiz: '❓', proyecto: '🏗️' };
  readonly ESTADO: Record<string, string> = { aprobada: 'Aprobado', revision: 'Esperando revisión', corregir: 'Su maestro le pidió ajustes' };
  cargando = true;
  error = false;

  readonly nivel = nivel;
  readonly constancia = constancia;
  readonly consejo = consejo;
  readonly primerNombre = primerNombre;
  readonly XP_POR_NIVEL = XP_POR_NIVEL;
  readonly DIAS: Record<string, string> = {
    lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', 'miércoles': 'Miércoles',
    jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', 'sábado': 'Sábado', domingo: 'Domingo',
    monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves',
    friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo',
  };

  constructor(private familia: FamiliaApiService, private auth: AuthService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    const user = this.auth.getUser();
    this.parentName = user?.displayName || 'Familia';
    this.parentInitials = user?.initials || 'F';

    this.familia.hijos().subscribe({
      next: hijos => {
        this.hijos = hijos;
        // Si viene del panel con ?hijo=, abre ese.
        const pedido = this.route.snapshot.queryParamMap.get('hijo');
        this.elegir(hijos.find(h => h.id === pedido) ?? hijos[0] ?? null);
        this.cargando = false;
      },
      error: () => { this.cargando = false; this.error = true; },
    });
  }

  elegir(h: Hijo | null): void {
    this.sel = h;
    this.semanas = this.porSemana(h?.xpReciente ?? []);
    this.trabajos = [];
    if (!h) return;
    this.cargandoTrabajos = true;
    const pedido = h.id;
    this.familia.trabajos(h.id).subscribe({
      next: t => { if (this.sel?.id === pedido) { this.trabajos = t; this.cargandoTrabajos = false; } },
      error: () => { this.cargandoTrabajos = false; },
    });
  }

  /** Color de la calificacion, de 0 a 100 como se guarda. */
  colorCal(score: number): string { return score >= 80 ? '#1A6B3C' : score >= 60 ? '#B45309' : '#9B1414'; }

  /**
   * XP ganado en cada semana (de lunes a domingo), desde la primera semana
   * con actividad y hasta 8 atras. Ganado y no acumulado: "cuanto estudio
   * cada semana" es lo que le dice algo a un papa.
   */
  private porSemana(dias: { fecha: string; xp: number }[]): BarraSemana[] {
    if (!dias.length) return [];
    const dia = (f: string) => new Date(f + 'T12:00:00');
    const lunesDe = (d: Date) => {
      const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
      return x;
    };
    const primera = lunesDe(new Date(Math.min(...dias.map(d => dia(d.fecha).getTime()))));
    const lunes: Date[] = [];
    for (let s = lunesDe(new Date()); s >= primera && lunes.length < 8; s.setDate(s.getDate() - 7)) {
      lunes.unshift(new Date(s));
    }
    const barras = lunes.map(l => {
      const ini = l.getTime(), fin = ini + 7 * 86400000;
      const xp = dias.filter(d => { const t = dia(d.fecha).getTime(); return t >= ini && t < fin; })
                     .reduce((s, d) => s + d.xp, 0);
      return { etiqueta: l.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', ''), xp, alto: 0 };
    });
    const max = Math.max(...barras.map(b => b.xp), 1);
    return barras.map(b => ({ ...b, alto: b.xp ? Math.max(8, Math.round(b.xp / max * 100)) : 4 }));
  }

  pct(a: number, t: number): number { return t ? Math.round(a / t * 100) : 0; }

  dia(d: string): string { return this.DIAS[(d || '').toLowerCase()] ?? d; }

  hora(t: string): string { return (t || '').slice(0, 5); }

  fecha(iso: string | null): string {
    return iso ? new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' }) : '';
  }
}
