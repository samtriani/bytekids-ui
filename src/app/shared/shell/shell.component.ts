import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

export interface NavItem {
  label: string;
  icon: string;
  route?: string;
  badge?: string | number;
}

export type Role = 'student' | 'teacher' | 'parent' | 'admin' | 'administrator';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
  <aside class="sidebar">
    <a routerLink="/portal" class="brand">
      <img src="assets/logo-bytekids.jpeg" class="brand-logo" alt="ByteKids">
      <div class="brand-text">
        <div class="brand-name">ByteKids Academy</div>
        <div class="brand-sub">Plataforma Educativa Digital</div>
      </div>
    </a>
    <div class="edomex-stripe">
      <div class="es-guinda"></div>
      <div class="es-oro"></div>
      <div class="es-white"></div>
    </div>
    <div class="role-tag">
      <div class="role-dot"></div>
      <span class="role-name">{{ roleLabel }}</span>
    </div>
    <nav class="nav scrollbar-thin">
      @for (item of navItems; track item.label) {
        <a
          class="nav-item"
          [routerLink]="item.route ?? null"
          [routerLinkActive]="item.route ? 'active' : ''"
          [routerLinkActiveOptions]="{ exact: (item.route ?? '').split('/').length <= 2 }">
          <span class="ni-icon">{{ item.icon }}</span>
          <span class="ni-label">{{ item.label }}</span>
          @if (item.badge) { <span class="ni-badge">{{ item.badge }}</span> }
        </a>
      }
    </nav>
    <div class="sidebar-foot">
      <div class="sf-av">{{ userAvatar }}</div>
      <div class="sf-info">
        <div class="sf-name">{{ userName }}</div>
        <div class="sf-role">{{ roleLabel }}</div>
      </div>
      <div class="sf-actions">
        <a routerLink="/portal" class="sf-btn" title="Cambiar panel">⊞</a>
        <button class="sf-btn" (click)="logout()" title="Cerrar sesion">⏏</button>
      </div>
    </div>
  </aside>

  <header class="topbar">
    <div class="topbar-stripe"></div>
    <span class="topbar-title">{{ pageTitle }}</span>
    <div class="topbar-right">
      <a routerLink="/portal" class="tb-portal-btn">⊞ Cambiar panel</a>
      <div class="tb-icon">🔔<span class="tb-badge"></span></div>
      <div class="tb-user">
        <div class="tb-av">{{ userAvatar }}</div>
        <span class="tb-username">{{ userName }}</span>
      </div>
      <button class="tb-logout" (click)="logout()" title="Cerrar sesion">
        Salir <span>→</span>
      </button>
    </div>
  </header>
  `
})
export class ShellComponent {
  @Input() role: Role = 'student';
  @Input() userName = 'Usuario';
  @Input() userAvatar = 'U';
  @Input() navItems: NavItem[] = [];
  @Input() pageTitle = 'ByteKids Academy';

  constructor(private auth: AuthService, private router: Router) {}

  get roleLabel() {
    return {
      student: 'Alumno',
      teacher: 'Maestro',
      parent: 'Padre de Familia',
      admin: 'Director',
      administrator: 'Administrador'
    }[this.role] ?? 'Usuario';
  }

  logout() {
    this.auth.logout();
  }
}
