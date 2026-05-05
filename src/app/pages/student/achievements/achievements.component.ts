import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { AchievementApiService } from '../../../services/api/achievement-api.service';
import { AuthService } from '../../../services/auth.service';

@Component({ selector:'app-achievements', standalone:true, imports:[CommonModule, RouterLink, ShellComponent],
  templateUrl:'./achievements.component.html', styleUrls:['./achievements.component.scss']
})
export class AchievementsComponent implements OnInit {
  get studentName(): string     { return this.auth.getUser()?.displayName || 'Alumno'; }
  get studentInitials(): string { return this.auth.getUser()?.initials || 'A'; }
  constructor(private achievementApi: AchievementApiService, private auth: AuthService) {}

  ngOnInit() {
    // Catálogo completo
    this.achievementApi.getAll().subscribe({
      next: (defs) => {
        // Mapa id → definición para combinar con logros ganados
        const defMap: Record<string, any> = {};
        defs.forEach(d => defMap[d.id] = d);

        this.achievementApi.getMyAchievements().subscribe({
          next: (earned) => {
            const earnedIds = new Set(earned.map((e: any) => e.achievement?.id ?? e.achievementId));
            this.achievements = defs.map(d => ({
              title:    d.title,
              icon:     d.icon ?? '🏆',
              desc:     d.description,
              xp:       d.xpReward,
              earned:   earnedIds.has(d.id),
              category: d.category,
              date:     earned.find((e: any) => (e.achievement?.id ?? e.achievementId) === d.id)?.earnedAt?.substring(0,10) ?? null,
              rarity:   d.rarity === 'poco_comun' ? 'Poco común' : d.rarity.charAt(0).toUpperCase() + d.rarity.slice(1),
            }));
          }
        });
      }
    });
  }
  navItems: NavItem[] = [
    { label:'Mi Dashboard',  icon:'🏠', route:'/student' },
    { label:'Mis Misiones',  icon:'🎯', route:'/student/missions', badge:3 },
    { label:'Mi Progreso',   icon:'📈', route:'/student/progress' },
    { label:'Logros',        icon:'🏆', route:'/student/achievements' },
    { label:'Tutor IA',      icon:'🤖', route:'/student/ai-tutor', badge:'✨' },
    { label:'Proyectos',     icon:'💻', route:'/student/projects' },
    // { label:'Roblox Studio', icon:'🎮', route:'/student/roblox' },
    { label:'Comunidad',     icon:'👥', route:'/student/community' },
  ];

  categories = ['Todos','Programación','Racha','Proyectos','Social','Especial'];
  activeCategory = 'Todos';

  achievements: any[] = [];

  rarityColor: Record<string,string> = { 'Común':'#6B7FBB', 'Poco común':'#10B981', 'Raro':'#2563EB', 'Épico':'#7C3AED', 'Legendario':'#F59E0B' };

  get filtered() {
    if (this.activeCategory === 'Todos') return this.achievements;
    return this.achievements.filter(a => a.category === this.activeCategory);
  }
  get earnedCount() { return this.achievements.filter(a => a.earned).length; }
  get totalXp() { return this.achievements.filter(a => a.earned).reduce((s,a) => s+a.xp, 0); }
}
