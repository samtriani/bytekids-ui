import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Role, ShellComponent } from '../../../shared/shell/shell.component';
import { ADMIN_NAV } from '../shared/admin-nav';
import { ADMINISTRATOR_NAV_ITEMS } from '../../administrator/shared/administrator-nav';
import { SessionApiService } from '../../../services/api/session-api.service';
import { AuthService } from '../../../services/auth.service';
import { catchError, of } from 'rxjs';

const REFRESH_MS = 15000;

@Component({
  selector: 'app-admin-live',
  standalone: true,
  imports: [CommonModule, ShellComponent],
  templateUrl: './live.component.html',
  styleUrls: ['./live.component.scss']
})
export class AdminLiveComponent implements OnInit, OnDestroy {
  /** La pantalla vive en dos modulos: Panel Ejecutivo y Coordinador. */
  private readonly base: string;
  readonly navItems:  typeof ADMIN_NAV;
  readonly shellRole: Role;

  loading    = true;
  userName   = 'Director';
  userAvatar = 'DR';

  sessions: any[] = [];
  lastUpdate: Date | null = null;

  private refreshRef: any;

  constructor(
    private sessionApi: SessionApiService,
    private auth:       AuthService,
    private router:     Router,
  ) {
    const isCoordinator = this.router.url.startsWith('/administrator');
    this.base      = isCoordinator ? '/administrator' : '/admin';
    this.navItems  = isCoordinator ? ADMINISTRATOR_NAV_ITEMS : ADMIN_NAV;
    this.shellRole = isCoordinator ? 'administrator' : 'admin';

    const u = this.auth.getUser();
    if (u) { this.userName = u.displayName; this.userAvatar = u.initials; }
  }

  ngOnInit() {
    this.load();
    this.refreshRef = setInterval(() => this.load(), REFRESH_MS);
  }

  ngOnDestroy() {
    clearInterval(this.refreshRef);
  }

  load() {
    this.sessionApi.getLiveSessions().pipe(catchError(() => of([]))).subscribe(data => {
      this.sessions   = data;
      this.lastUpdate = new Date();
      this.loading    = false;
    });
  }

  /** Refresco manual: da feedback visible aunque no cambie nada. */
  refreshNow() {
    this.loading = true;
    this.load();
  }

  observe(scheduleId: string) {
    this.router.navigate([`${this.base}/classroom`, scheduleId]);
  }

  remaining(secondsLeft: number): string {
    if (!secondsLeft || secondsLeft <= 0) return 'Fuera de horario';
    const min = Math.floor(secondsLeft / 60);
    if (min < 60) return `${min} min restantes`;
    return `${Math.floor(min / 60)} h ${min % 60} min restantes`;
  }

  hhmm(time: string): string {
    return time ? time.substring(0, 5) : '—';
  }
}
