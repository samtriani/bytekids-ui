import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { UserApiService } from '../../../services/api/user-api.service';
import { AchievementApiService } from '../../../services/api/achievement-api.service';
import { AuthService } from '../../../services/auth.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

const NAV: NavItem[] = [
  {label:'Mi Panel',      icon:'🏠', route:'/parent'},
  {label:'Mis Hijos',     icon:'👦', route:'/parent/children'},
  {label:'Progreso',      icon:'📈', route:'/parent/progress'},
  {label:'Logros',        icon:'🏆', route:'/parent/achievements'},
  {label:'Mensajes',      icon:'💬', route:'/parent/messages'},
  {label:'Calendario',    icon:'📅', route:'/parent/calendar'},
  {label:'Asistente IA',  icon:'🤖', route:'/parent/ai-assistant', badge:'IA'},
];

@Component({
  selector: 'app-parent-achievements',
  standalone: true,
  imports: [CommonModule, RouterLink, ShellComponent],
  templateUrl: './achievements.component.html',
  styleUrls: ['./achievements.component.scss']
})
export class AchievementsComponent implements OnInit {
  navItems = NAV;
  parentName = '';
  parentInitials = '';
  filt = 'Todos';
  children: any[] = [];
  allAchievements: any[] = [];
  loading = true;

  get filters(): string[] { return ['Todos', ...this.children.map(c => c.name.split(' ')[0])]; }

  get rows(): any[] {
    if (this.filt === 'Todos') return this.allAchievements;
    return this.allAchievements.filter(a => a.childName.startsWith(this.filt));
  }

  countByChild(childId: string): number {
    return this.allAchievements.filter(a => a.childId === childId).length;
  }

  xpByChild(childId: string): number {
    return this.allAchievements
      .filter(a => a.childId === childId)
      .reduce((acc, a) => acc + (a.xpReward ?? 0), 0);
  }

  constructor(
    private userApi: UserApiService,
    private achievementApi: AchievementApiService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.auth.getUser();
    this.parentName    = user?.displayName || 'Padre/Madre';
    this.parentInitials = user?.initials   || 'P';
    const parentId = user?.userId ?? '';
    if (!parentId) { this.loading = false; return; }

    this.userApi.getStudentsOfParent(parentId).pipe(catchError(() => of([]))).subscribe(students => {
      if (!students.length) { this.loading = false; return; }
      this.children = students;
      forkJoin(students.map((s: any) =>
        this.achievementApi.getStudentAchievements(s.id || s._id).pipe(catchError(() => of([])))
      )).subscribe({
        next: (results: any[][]) => {
          this.allAchievements = results.flatMap((achs, i) => {
            const s = students[i];
            return (achs as any[]).map((a: any) => ({
              childId:   s.id || s._id,
              childName: s.displayName || s.username,
              icon:      a.achievement?.icon    || a.icon    || '🏆',
              title:     a.achievement?.title   || a.title   || 'Logro',
              desc:      a.achievement?.description || a.description || '',
              xpReward:  a.achievement?.xpReward ?? a.xpReward ?? 0,
              date:      a.earnedAt
                ? new Date(a.earnedAt).toLocaleDateString('es-MX', {day:'numeric', month:'short'})
                : '—',
            }));
          });
          this.loading = false;
        },
        error: () => { this.loading = false; }
      });
    });
  }
}
