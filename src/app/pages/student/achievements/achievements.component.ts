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
    { label:'Mis Misiones',  icon:'🎯', route:'/student/missions' },
    { label:'Mi Progreso',   icon:'📈', route:'/student/progress' },
    { label:'Logros',        icon:'🏆', route:'/student/achievements' },
    { label:'Tutor IA',      icon:'🤖', route:'/student/ai-tutor', badge:'✨' },
    { label:'Proyectos',     icon:'💻', route:'/student/projects' },
    // { label:'Roblox Studio', icon:'🎮', route:'/student/roblox' },
    { label:'Horario',       icon:'📅', route:'/student/calendar' },
    { label:'Comunidad',     icon:'👥', route:'/student/community' },
  ];

  categories: string[] = ['Todos'];
  activeCategory = 'Todos';
  achievements: any[] = [];

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
        }));

        // Categorías derivadas de las definiciones reales
        const catSet = new Set(this.achievements.map(a => a.category).filter(Boolean));
        this.categories = ['Todos', ...Array.from(catSet)];
      }
    });
  }

  rarityColor: Record<string,string> = { 'Común':'#6B7FBB', 'Poco común':'#10B981', 'Raro':'#2563EB', 'Épico':'#7C3AED', 'Legendario':'#F59E0B' };

  get filtered() {
    if (this.activeCategory === 'Todos') return this.achievements;
    return this.achievements.filter(a => a.category === this.activeCategory);
  }
  get earnedCount() { return this.achievements.filter(a => a.earned).length; }
  get totalXp() { return this.achievements.filter(a => a.earned).reduce((s,a) => s+a.xp, 0); }
}

