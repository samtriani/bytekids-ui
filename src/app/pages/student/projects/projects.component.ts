import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { ContentApiService } from '../../../services/api/content-api.service';
import { SubmissionApiService } from '../../../services/api/submission-api.service';
import { AuthService } from '../../../services/auth.service';
import { forkJoin } from 'rxjs';

const SUBJECT_META: Record<string, { icon: string; color: string }> = {
  'Python':        { icon: '🐍', color: '#06B6D4' },
  'HTML/CSS/JS':   { icon: '🌐', color: '#7C3AED' },
  'Scratch':       { icon: '🧩', color: '#2563EB' },
  'Robótica':      { icon: '🤖', color: '#F59E0B' },
  'Roblox Studio': { icon: '🎮', color: '#10B981' },
  'Matemáticas':   { icon: '📐', color: '#EC4899' },
};

const NAV: NavItem[] = [
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

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, RouterLink, ShellComponent],
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss']
})
export class ProjectsComponent implements OnInit {
  navItems = NAV;
  selectedProject: any = null;
  loading = true;
  myProjects: any[] = [];
  ideaProjects: any[] = [];

  get studentName(): string     { return this.auth.getUser()?.displayName || 'Alumno'; }
  get studentInitials(): string { return this.auth.getUser()?.initials || 'A'; }

  constructor(
    private router: Router,
    private contentApi: ContentApiService,
    private submissionApi: SubmissionApiService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    forkJoin({
      projects: this.contentApi.getMyFeed(),
      subs: this.submissionApi.getMySubmissions(),
    }).subscribe({
      next: ({ projects, subs }) => {
        const subMap = new Map(subs.map((s: any) => [s.contentId || s.content?.id, s]));

        this.myProjects = projects
          .filter((p: any) => subMap.has(p.id || p._id) && p.type === 'proyecto')
          .map((p: any) => this.mapProject(p, subMap.get(p.id || p._id)));

        this.ideaProjects = projects
          .filter((p: any) => !subMap.has(p.id || p._id) && p.type === 'proyecto')
          .slice(0, 6)
          .map((p: any) => this.mapIdea(p));

        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private mapProject(p: any, sub: any): any {
    const meta = SUBJECT_META[p.subjectName] ?? { icon: '💻', color: '#6B7FBB' };
    const status = sub?.status === 'aprobado' ? 'Completado' : 'En progreso';
    return {
      id: p.id || p._id,
      title: p.title,
      subject: p.subjectName ?? '',
      icon: meta.icon,
      color: meta.color,
      status,
      desc: p.description ?? '',
      xp: p.xpReward ?? 0,
      date: status === 'Completado'
        ? new Date(sub?.reviewedAt || sub?.submittedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
        : 'En curso',
      details: [],
    };
  }

  private mapIdea(p: any): any {
    const meta = SUBJECT_META[p.subjectName] ?? { icon: '💻', color: '#6B7FBB' };
    return {
      id: p.id || p._id,
      title: p.title,
      subject: p.subjectName ?? '',
      icon: meta.icon,
      color: meta.color,
      desc: p.description ?? '',
      xp: p.xpReward ?? 0,
      difficulty: p.difficulty === 'facil' ? 'Fácil' : p.difficulty === 'dificil' ? 'Difícil' : 'Medio',
    };
  }

  openProject(p: any): void { this.selectedProject = p; }
  closeModal(): void { this.selectedProject = null; }

  continueProject(p: any): void {
    if (p.id) this.router.navigate(['/student/missions', p.id]);
  }

  startIdea(p: any): void {
    if (p.id) this.router.navigate(['/student/missions', p.id]);
  }

  newProject(): void {
    this.router.navigate(['/student/ai-tutor'], {
      queryParams: { q: 'Quiero crear un nuevo proyecto de programación. ¿Qué me recomiendas según mi nivel?' }
    });
  }
}

