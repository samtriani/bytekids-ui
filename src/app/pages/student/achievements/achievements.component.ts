import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { AchievementApiService } from '../../../services/api/achievement-api.service';
import { AuthService } from '../../../services/auth.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ContentApiService } from '../../../services/api/content-api.service';
import { STUDENT_NAV } from '../shared/student-nav';

@Component({ selector:'app-achievements', standalone:true, imports:[CommonModule, RouterLink, ShellComponent],
  templateUrl:'./achievements.component.html', styleUrls:['./achievements.component.scss']
})
export class AchievementsComponent implements OnInit {
  get studentName(): string     { return this.auth.getUser()?.displayName || 'Alumno'; }
  get studentInitials(): string { return this.auth.getUser()?.initials || 'A'; }
  constructor(private achievementApi: AchievementApiService,
              private contentApi: ContentApiService,
              private auth: AuthService) {}

  navItems: NavItem[] = STUDENT_NAV;

  achievements: any[] = [];

  /**
   * Un alumno puede llevar dos materias a la vez, y sus logros son
   * distintos. Sin este filtro ve una sola lista revuelta y no entiende
   * cuales le tocan por lo que esta cursando.
   */
  materias: string[] = [];
  materiaActiva = 'Todas';

  /** La materia de un logro vive en condition_value.subject. */
  private materiaDe(d: any): string { return this.condicion(d)?.subject || ''; }

  private condicion(d: any): any {
    try {
      return typeof d?.conditionValue === 'string' ? JSON.parse(d.conditionValue) : (d?.conditionValue ?? {});
    } catch { return {}; }
  }

  /**
   * Las claves de rareza se guardan sin acento (epico, comun). Antes se les
   * ponia mayuscula y ya: salia "Epico", el mapa de colores buscaba "Épico",
   * no lo encontraba y la etiqueta se quedaba gris.
   */
  private readonly RAREZA: Record<string, string> = {
    comun: 'Común', poco_comun: 'Poco común', raro: 'Raro', epico: 'Épico', legendario: 'Legendario',
  };

  /**
   * Cuando se gana un logro, en palabras del nino. Sin esto la medalla dice
   * que hizo --"Entrevistaste a una IA"-- pero no que tiene que hacer.
   */
  private comoSeGana(d: any, total: number): string {
    const c = this.condicion(d);
    switch (d?.conditionType) {
      case 'subject_content':  return `🎯 Al aprobar «${c.title}»`;
      case 'subject_missions':
        if (c.count === 1)      return '🎯 Con tu primera actividad';
        if (total && c.count >= total) return `🎯 Al terminar las ${c.count} actividades`;
        return `🎯 Al aprobar ${c.count} actividades`;
      case 'streak_days':      return `🔥 Entrando ${c.days} días seguidos`;
      case 'xp_total':         return `⭐ Al juntar ${c.amount} XP`;
      case 'project_count':    return `🏗️ Al aprobar ${c.count} proyecto${c.count === 1 ? '' : 's'}`;
      default:                 return '';
    }
  }

  ngOnInit() {
    forkJoin({
      defs:     this.achievementApi.getAll(),
      earned:   this.achievementApi.getMyAchievements(),
      // El color y las materias del alumno salen del feed, NO de /subjects:
      // ese endpoint es solo para personal, y un 403 aqui no lo salva el
      // catchError — el interceptor borra el token antes y saca al alumno.
      //
      // Devuelve null al fallar, no []: hay que poder distinguir "no tiene
      // materias" de "no supe cuales son". Con [] se filtraria contra un
      // conjunto vacio y el alumno se quedaria sin ningun logro por un error
      // de red.
      feed: this.contentApi.getMyFeed().pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ defs, earned, feed }) => {
        for (const c of feed ?? []) {
          if (c?.subjectName && c?.subjectColor) {
            this.coloresMateria[c.subjectName] = c.subjectColor;
          }
        }

        // Las materias que de verdad lleva. getAll() devuelve las definiciones
        // de TODA la plataforma, asi que sin esto un alumno de Principiante
        // veia tambien los siete logros de Intermedio: diez medallas que no
        // puede ganar, contra las que ademas se calculaba su porcentaje.
        const misMaterias = feed
          ? new Set<string>((feed as any[]).map(c => c?.subjectName).filter(Boolean))
          : null;
        const earnedIds = new Set(earned.map((e: any) => e.achievement?.id ?? e.achievementId));

        // Se queda con los suyos: los generales --racha, XP-- y los de las
        // materias que lleva. Si el feed fallo no se filtra nada: es mejor
        // mostrar de mas que dejarle la pantalla vacia.
        const mios = misMaterias
          ? defs.filter((d: any) => {
              const m = this.materiaDe(d);
              return !m || misMaterias.has(m);
            })
          : defs;

        // Para ordenar el camino: en que paso del temario cae cada pieza, y
        // cuantas piezas tiene cada materia.
        const pasoDe = new Map<string, number>();
        const piezasPorMateria = new Map<string, number>();
        for (const c of (feed ?? []) as any[]) {
          if (c?.title) pasoDe.set(`${c.subjectName}|${c.title}`, c.orderIndex ?? 0);
          if (c?.subjectName) piezasPorMateria.set(c.subjectName, (piezasPorMateria.get(c.subjectName) ?? 0) + 1);
        }

        this.achievements = mios.map((d: any) => ({
          title:    d.title,
          icon:     d.icon ?? '🏆',
          desc:     d.description,
          xp:       d.xpReward,
          earned:   earnedIds.has(d.id),
          category: d.category ?? 'General',
          date:     earned.find((e: any) => (e.achievement?.id ?? e.achievementId) === d.id)?.earnedAt?.substring(0,10) ?? null,
          rarity:   this.RAREZA[d.rarity] ?? 'Común',
          materia:  this.materiaDe(d),
          pista:    this.comoSeGana(d, piezasPorMateria.get(this.materiaDe(d)) ?? 0),
          orden:    this.posicion(d, pasoDe),
        }))
        // El orden del camino: primero los de sus materias, en el orden en
        // que se ganan; al final los generales. Antes salian en el orden del
        // servidor (categoria y rareza) y "¡Hola, IA!", el primero que se
        // gana, quedaba casi al ultimo.
        .sort((a: any, b: any) =>
          Number(!a.materia) - Number(!b.materia)
          || a.materia.localeCompare(b.materia)
          || a.orden - b.orden
          || a.xp - b.xp);

        // Las pestanas salen en cuanto hay mas de un grupo: una materia y los
        // generales ya son dos. Antes solo aparecian con dos materias, y el
        // alumno de un solo curso veia sus logros revueltos con los de racha.
        const matSet = new Set<string>(
          this.achievements.map(a => a.materia).filter(Boolean));
        const hayGenerales = this.achievements.some(a => !a.materia);
        const grupos = [...Array.from(matSet).sort(), ...(hayGenerales ? ['Generales'] : [])];
        this.materias = grupos.length > 1 ? ['Todas', ...grupos] : [];
      }
    });
  }

  rarityColor: Record<string,string> = { 'Común':'#6B7FBB', 'Poco común':'#10B981', 'Raro':'#2563EB', 'Épico':'#7C3AED', 'Legendario':'#F59E0B' };

  /**
   * Donde cae el logro en el camino de su materia. Una pieza concreta va en
   * su paso del temario; "la primera" va antes de todo y los conteos van por
   * numero, que para "todas" es el ultimo.
   */
  private posicion(d: any, pasoDe: Map<string, number>): number {
    const c = this.condicion(d);
    if (d?.conditionType === 'subject_content') return pasoDe.get(`${c.subject}|${c.title}`) ?? 50;
    if (d?.conditionType === 'subject_missions') return c.count === 1 ? 0 : (c.count ?? 50) + 0.5;
    return 100;
  }

  get filtered() {
    return this.achievements.filter(a =>
      // "Generales" son los que no dependen de ninguna materia: racha, XP.
      (this.materiaActiva === 'Todas'
        || (this.materiaActiva === 'Generales' ? !a.materia
                                               : a.materia === this.materiaActiva)));
  }

  /** El color de la materia sale del catalogo, igual que en Mis Actividades. */
  private coloresMateria: Record<string, string> = {};

  colorMateria(m: string): string {
    if (m === 'Todas' || m === 'Generales') return '#7C3AED';
    return this.coloresMateria[m] ?? '#7C3AED';
  }

  /** Los conteos son informacion real y ademas separan las dos filas. */
  contarMateria(m: string): number {
    if (m === 'Todas')     return this.achievements.length;
    if (m === 'Generales') return this.achievements.filter(a => !a.materia).length;
    return this.achievements.filter(a => a.materia === m).length;
  }

  get earnedCount() { return this.achievements.filter(a => a.earned).length; }
  get totalXp() { return this.achievements.filter(a => a.earned).reduce((s,a) => s+a.xp, 0); }
}

