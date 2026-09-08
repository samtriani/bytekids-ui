import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { AchievementApiService } from '../../../services/api/achievement-api.service';
import { AuthService } from '../../../services/auth.service';
import { forkJoin } from 'rxjs';

@Component({ selector:'app-achievements', standalone:true, imports:[CommonModule, RouterLink, ShellComponent],
  templateUrl:'./achievements.component.html', styleUrls:['./achievements.component.scss']
})
export class AchievementsComponent implements OnInit {
  get studentName(): string     { return this.auth.getUser()?.displayName || 'Alumno'; }
  get studentInitials(): string { return this.auth.getUser()?.initials || 'A'; }
  constructor(private achievementApi: AchievementApiService, private auth: AuthService) {}

  navItems: NavItem[] = [
    { label:'Mi Dashboard',  icon:'🏠', route:'/student' },
    { label:'Mis Actividades',  icon:'🎯', route:'/student/missions' },
    { label:'Mi Progreso',   icon:'📈', route:'/student/progress' },
    { label:'Logros',        icon:'🏆', route:'/student/achievements' },
    { label:'Tutor IA',      icon:'🤖', route:'/student/ai-tutor', badge:'✨' },
    { label:'Proyectos',     icon:'💻', route:'/student/projects' },
    // { label:'Roblox Studio', icon:'🎮', route:'/student/roblox' },
    { label:'Calendario',    icon:'📅', route:'/student/calendar' },
    { label:'Comunidad',     icon:'👥', route:'/student/community' },
  ];

  categories: string[] = ['Todos'];
  activeCategory = 'Todos';
  achievements: any[] = [];

  /**
   * Un alumno puede llevar dos materias a la vez, y sus logros son
   * distintos. Sin este filtro ve una sola lista revuelta y no entiende
   * cuales le tocan por lo que esta cursando.
   */
  materias: string[] = [];
  materiaActiva = 'Todas';

  /** La materia de un logro vive en condition_value.subject. */
  private materiaDe(d: any): string {
    try {
      const cond = JSON.parse(d?.conditionValue ?? '{}');
      return cond?.subject || '';
    } catch { return ''; }
  }

  ngOnInit() {
    forkJoin({
      defs:   this.achievementApi.getAll(),
      earned: this.achievementApi.getMyAchievements(),
    }).subscribe({
      next: ({ defs, earned }) => {
        const earnedIds = new Set(earned.map((e: any) => e.achievement?.id ?? e.achievementId));

        this.achievements = defs.map((d: any) => ({
          title:    d.title,
          icon:     d.icon ?? '🏆',
          desc:     d.description,
          xp:       d.xpReward,
          earned:   earnedIds.has(d.id),
          category: d.category ?? 'General',
          date:     earned.find((e: any) => (e.achievement?.id ?? e.achievementId) === d.id)?.earnedAt?.substring(0,10) ?? null,
          rarity:   d.rarity === 'poco_comun' ? 'Poco común' : (d.rarity ? d.rarity.charAt(0).toUpperCase() + d.rarity.slice(1) : 'Común'),
          materia:  this.materiaDe(d),
        }));

        // Categorías derivadas de las definiciones reales
        const catSet = new Set(this.achievements.map(a => a.category).filter(Boolean));
        this.categories = ['Todos', ...Array.from(catSet)];

        // Las pestañas solo salen si de verdad hay mas de una materia.
        const matSet = new Set<string>(
          this.achievements.map(a => a.materia).filter(Boolean));
        this.materias = matSet.size > 1
          ? ['Todas', ...Array.from(matSet).sort(), 'Generales']
          : [];
      }
    });
  }

  rarityColor: Record<string,string> = { 'Común':'#6B7FBB', 'Poco común':'#10B981', 'Raro':'#2563EB', 'Épico':'#7C3AED', 'Legendario':'#F59E0B' };

  get filtered() {
    return this.achievements.filter(a =>
      (this.activeCategory === 'Todos' || a.category === this.activeCategory) &&
      // "Generales" son los que no dependen de ninguna materia: racha, XP.
      (this.materiaActiva === 'Todas'
        || (this.materiaActiva === 'Generales' ? !a.materia
                                               : a.materia === this.materiaActiva)));
  }

  /** Nombre corto para la pestaña: el prefijo se repite en todas. */
  etiquetaMateria(m: string): string {
    const nivel = m.match(/\(([^)]+)\)/);
    return nivel ? nivel[1] : m;
  }
  get earnedCount() { return this.achievements.filter(a => a.earned).length; }
  get totalXp() { return this.achievements.filter(a => a.earned).reduce((s,a) => s+a.xp, 0); }
}

