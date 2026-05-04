import { Component, Input } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

export interface NavItem {
  label: string;
  icon: string;
  route?: string;
  action?: string;
  badge?: string | number;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  @Input() role: 'student' | 'teacher' | 'parent' | 'admin' | 'administrator' = 'student';
  @Input() userName = 'Usuario';
  @Input() userAvatar = 'U';
  @Input() navItems: NavItem[] = [];

  roleConfig: Record<string, { color: string; label: string; icon: string }> = {
    student: { color: '#00D4AA', label: 'Estudiante', icon: '🚀' },
    teacher: { color: '#9B59B6', label: 'Maestro', icon: '🎓' },
    parent: { color: '#FF6B2B', label: 'Padre / Madre', icon: '💙' },
    admin: { color: '#FFD93D', label: 'Director', icon: '🏫' },
    administrator: { color: '#7A1535', label: 'Administrador', icon: '🧩' }
  };

  get config() {
    return this.roleConfig[this.role];
  }

  constructor(private router: Router) {}

  goHome() {
    this.router.navigate(['/']);
  }
}
