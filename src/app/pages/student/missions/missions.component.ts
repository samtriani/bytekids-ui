import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { MissionStateService } from '../../../services/mission-state.service';
import { ContentApiService } from '../../../services/api/content-api.service';
import { SubmissionApiService } from '../../../services/api/submission-api.service';
import { AuthService } from '../../../services/auth.service';

const SUBJECT_META: Record<string, { icon: string; color: string }> = {
  'Python':        { icon: '🐍', color: '#06B6D4' },
  'HTML/CSS/JS':   { icon: '🌐', color: '#7C3AED' },
  'Scratch':       { icon: '🧩', color: '#2563EB' },
  'Robótica':      { icon: '🤖', color: '#F59E0B' },
  'Roblox Studio': { icon: '🎮', color: '#10B981' },
  'Matemáticas':   { icon: '📐', color: '#EC4899' },
};

@Component({ selector: 'app-missions', standalone: true, imports: [CommonModule, RouterLink, ShellComponent],
  templateUrl: './missions.component.html', styleUrls: ['./missions.component.scss'] })
export class MissionsComponent implements OnInit {
  get studentName(): string    { return this.auth.getUser()?.displayName || 'Alumno'; }
  get studentInitials(): string { return this.auth.getUser()?.initials || 'A'; }

  constructor(
    private router: Router,
    private missionState: MissionStateService,
    private contentApi: ContentApiService,
    private submissionApi: SubmissionApiService,
    private auth: AuthService
  ) {}

  navItems: NavItem[] = [
    { label:'Mi Dashboard', icon:'🏠', route:'/student' },
    { label:'Mis Misiones', icon:'🎯', route:'/student/missions', badge:3 },
    { label:'Mi Progreso',  icon:'📈', route:'/student/progress' },
    { label:'Logros',       icon:'🏆', route:'/student/achievements' },
    { label:'Tutor IA',     icon:'🤖', route:'/student/ai-tutor', badge:'✨' },
    { label:'Proyectos',    icon:'💻', route:'/student/projects' },
    { label:'Roblox Studio',icon:'🎮', route:'/student/roblox' },
    { label:'Comunidad',    icon:'👥', route:'/student/community' },
  ];

  activeFilter = 'Todas';
  filters = ['Todas', 'Python', 'HTML/CSS', 'Scratch', 'Robótica', 'Roblox'];
  loading = true;
  missions: any[] = [];

  get total(): number        { return this.missions.length; }
  get enProgreso(): number   { return this.missions.filter(m => m.status === 'En progreso').length; }
  get completadas(): number  { return this.missions.filter(m => m.status === 'Completado').length; }
  get disponibles(): number  { return this.missions.filter(m => m.status === 'Disponible').length; }
  // Mapa contentId → submission más reciente del alumno
  private submissionMap: Record<string, any> = {};

  ngOnInit() {
    // Carga misiones y entregas en paralelo
    this.submissionApi.getMySubmissions().subscribe({
      next: (subs) => {
        subs.forEach(s => { this.submissionMap[s.contentId] = s; });
      }
    });

    this.contentApi.getMissions().subscribe({
      next: (data) => {
        this.missions = data.map(c => this.mapContent(c));
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private mapContent(c: any): any {
    const meta = SUBJECT_META[c.subjectName] ?? { icon: '📚', color: '#6B7FBB' };
    const sub  = this.submissionMap[c.id];
    const status = sub
      ? (sub.status === 'aprobado' ? 'Completado' : 'En progreso')
      : 'Disponible';
    const progress = sub
      ? (sub.status === 'aprobado' ? 100 : 50)
      : 0;
    const saved = this.missionState.get(c.title);
    return {
      id:         c.id,
      title:      c.title,
      subject:    c.subjectName ?? '',
      xp:         c.xpReward ?? 50,
      progress:   saved?.progress ?? progress,
      status:     saved?.status ?? status,
      icon:       c.subjectIcon ?? meta.icon,
      color:      meta.color,
      difficulty: c.difficulty === 'facil' ? 'Fácil' : c.difficulty === 'dificil' ? 'Difícil' : 'Medio',
      time:       c.estimatedMinutes ? `${c.estimatedMinutes} min` : '—',
      locked:     false,
    };
  }

  get filtered() {
    if (this.activeFilter === 'Todas') return this.missions;
    return this.missions.filter(m => m.subject.includes(this.activeFilter));
  }

  setFilter(f: string) { this.activeFilter = f; }

  startMission(m: any) {
    if (m.locked || !m.id) return;
    this.router.navigate(['/student/missions', m.id]);
  }
}
