import { Component, Input, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationApiService } from '../../services/api/notification-api.service';

export interface NavItem {
  label: string;
  icon: string;
  route?: string;
  badge?: string | number;
}

export type Role = 'student' | 'teacher' | 'parent' | 'admin' | 'administrator';

const ROLE_CFG: Record<string, { label: string; emoji: string; color: string }> = {
  student:       { label: 'Alumno',           emoji: '🎓', color: '#7C3AED' },
  teacher:       { label: 'Maestro',          emoji: '📚', color: '#7A1535' },
  parent:        { label: 'Padre de Familia', emoji: '👨‍👩‍👧', color: '#0EA5E9' },
  admin:         { label: 'Director',         emoji: '🏛️',  color: '#D97706' },
  administrator: { label: 'Coordinador',      emoji: '⚙️',  color: '#059669' },
};

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss']
})
export class ShellComponent implements OnInit, OnDestroy {
  @Input() role: Role = 'student';
  @Input() userName = 'Usuario';
  @Input() userAvatar = 'U';
  @Input() navItems: NavItem[] = [];
  @Input() pageTitle = 'ByteKids Academy';

  unreadCount = 0;
  notifications: any[] = [];
  showNotif = false;

  readonly today = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

  private pollInterval: any;

  constructor(
    private auth: AuthService,
    private router: Router,
    private notifApi: NotificationApiService
  ) {}

  get cfg() {
    return ROLE_CFG[this.role] ?? ROLE_CFG['student'];
  }

  ngOnInit(): void {
    this.loadNotifications();
    this.pollInterval = setInterval(() => this.loadUnreadCount(), 30_000);
  }

  ngOnDestroy(): void {
    clearInterval(this.pollInterval);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showNotif = false;
  }

  goHome(): void {
    this.router.navigate(['/portal']);
  }

  toggleNotif(e: Event): void {
    e.stopPropagation();
    this.showNotif = !this.showNotif;
    if (this.showNotif) this.loadNotifications();
  }

  markAsRead(n: any): void {
    if (n.isRead) return;
    this.notifApi.markAsRead(n.id).subscribe(() => {
      n.isRead = true;
      this.unreadCount = Math.max(0, this.unreadCount - 1);
    });
  }

  markAllAsRead(): void {
    this.notifApi.markAllAsRead().subscribe(() => {
      this.notifications.forEach(n => n.isRead = true);
      this.unreadCount = 0;
    });
  }

  typeIcon(type: string): string {
    const icons: Record<string, string> = {
      mission_assigned:    '🎯',
      submission_reviewed: '✅',
      submission_rejected: '❌',
      class_starting:      '🔔',
      achievement_unlocked:'🏆',
      message:             '💬',
      system:              'ℹ️',
    };
    return icons[type] ?? '📩';
  }

  timeAgo(dateStr: string): string {
    const m = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (m < 1)  return 'Ahora';
    if (m < 60) return `Hace ${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `Hace ${h}h`;
    return `Hace ${Math.floor(h / 24)}d`;
  }

  private loadNotifications(): void {
    this.notifApi.getAll().subscribe(list => {
      this.notifications = list.slice(0, 15);
      this.unreadCount = list.filter((n: any) => !n.isRead).length;
    });
  }

  private loadUnreadCount(): void {
    this.notifApi.getUnreadCount().subscribe(c => this.unreadCount = c);
  }
}
