import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { ProgressApiService } from '../../../services/api/progress-api.service';
import { AuthService } from '../../../services/auth.service';

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

const COLORS = ['#7C3AED','#2563EB','#06B6D4','#10B981','#F59E0B','#EC4899','#EF4444','#8B5CF6'];

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ShellComponent],
  templateUrl: './community.component.html',
  styleUrls: ['./community.component.scss']
})
export class CommunityComponent implements OnInit {
  navItems = NAV;

  me: any = null;
  topStudents: any[] = [];
  toast = '';
  subjects = ['General', 'Python', 'HTML/CSS', 'Scratch', 'Robótica', 'Roblox'];

  // Posts no tienen backend aún — se mantiene vacío
  posts: any[] = [];
  showNewPost = false;
  newPostText = '';
  newPostSubject = 'General';

  constructor(
    private progressApi: ProgressApiService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.me = this.auth.getUser();
    this.progressApi.getLeaderboard(10).subscribe({
      next: entries => {
        this.topStudents = entries.map((e: any, i: number) => ({
          name:   e.displayName || 'Alumno',
          xp:     e.totalXp ?? 0,
          avatar: e.initials || (e.displayName || '?').split(' ').map((w: string) => w[0] || '').join('').slice(0, 2).toUpperCase(),
          color:  COLORS[i % COLORS.length],
          rank:   e.rank ?? i + 1,
        }));
      }
    });
  }

  publishPost(): void {
    if (!this.newPostText.trim() || !this.me) return;
    const initials = this.me.initials || (this.me.displayName || '?').split(' ').map((w: string) => w[0] || '').join('').slice(0, 2).toUpperCase();
    this.posts.unshift({
      author: this.me.displayName,
      avatar: initials,
      color: '#06B6D4',
      time: 'Ahora mismo',
      subject: this.newPostSubject,
      title: this.newPostText.split(' ').slice(0, 6).join(' ') + '...',
      body: this.newPostText,
      likes: 0, comments: [], showComments: false,
    });
    this.newPostText = '';
    this.showNewPost = false;
    this.showToast('¡Publicación compartida! 🎉');
  }

  liked: Set<number> = new Set();
  toggleLike(i: number): void { this.liked.has(i) ? this.liked.delete(i) : this.liked.add(i); }
  toggleComments(post: any): void { post.showComments = !post.showComments; }
  share(post: any): void { this.showToast(`¡Link de "${post.title}" copiado! 🔗`); }
  showToast(msg: string): void { this.toast = msg; setTimeout(() => this.toast = '', 3000); }
}

