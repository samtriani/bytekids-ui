import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { ContentApiService } from '../../../services/api/content-api.service';
import { SubmissionApiService } from '../../../services/api/submission-api.service';
import { AuthService } from '../../../services/auth.service';
import { forkJoin } from 'rxjs';

const NAV: NavItem[] = [
  { label:'Mi Dashboard',  icon:'🏠', route:'/student' },
  { label:'Mis Misiones',  icon:'🎯', route:'/student/missions' },
  { label:'Mi Progreso',   icon:'📈', route:'/student/progress' },
  { label:'Logros',        icon:'🏆', route:'/student/achievements' },
  { label:'Tutor IA',      icon:'🤖', route:'/student/ai-tutor', badge:'✨' },
  { label:'Proyectos',     icon:'💻', route:'/student/projects' },
  // { label:'Roblox Studio', icon:'🎮', route:'/student/roblox' },
  { label:'Comunidad',     icon:'👥', route:'/student/community' },
];

@Component({
  selector: 'app-roblox',
  standalone: true,
  imports: [CommonModule, RouterLink, ShellComponent],
  templateUrl: './roblox.component.html',
  styleUrls: ['./roblox.component.scss']
})
export class RobloxComponent implements OnInit {
  navItems = NAV;
  toast = '';
  loading = true;
  modules: any[] = [];

  luaSnippets = [
    { title:'Mover jugador', code:'local speed = 50\ngame.Players.LocalPlayer\n  .Character.Humanoid\n  .WalkSpeed = speed' },
    { title:'Crear objeto',  code:'local parte = Instance.new("Part")\nparte.Size = Vector3.new(4,1,4)\nparte.Parent = workspace' },
    { title:'Imprimir texto',code:'print("¡Hola Roblox!")\n-- Aparece en la consola' },
  ];

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
      all:  this.contentApi.getMyFeed(),
      subs: this.submissionApi.getMySubmissions(),
    }).subscribe({
      next: ({ all, subs }) => {
        const subMap = new Map(subs.map((s: any) => [s.contentId || s.content?.id, s]));
        this.modules = all
          .filter((c: any) => (c.subjectName ?? '').toLowerCase().includes('roblox'))
          .map((c: any) => {
            const sub = subMap.get(c.id || c._id);
            const status = sub
              ? (sub.status === 'aprobado' ? 'Completado' : 'En progreso')
              : 'Disponible';
            return {
              id: c.id || c._id,
              title: c.title,
              icon: '🎮',
              color: '#10B981',
              status,
              xp: c.xpReward ?? 0,
              desc: c.description ?? '',
            };
          });
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  openModule(m: any): void {
    if (m.id) this.router.navigate(['/student/missions', m.id]);
  }

  copySnippet(snippet: any): void {
    this.toast = `"${snippet.title}" copiado al portapapeles 📋`;
    setTimeout(() => this.toast = '', 3000);
  }
}
