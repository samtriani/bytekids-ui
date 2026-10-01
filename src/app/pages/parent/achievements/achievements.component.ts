import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShellComponent } from '../../../shared/shell/shell.component';
import { AvatarComponent } from '../../../shared/avatar/avatar.component';
import { AuthService } from '../../../services/auth.service';
import { FamiliaApiService, Hijo } from '../../../services/api/familia-api.service';
import { PARENT_NAV } from '../shared/parent-nav';
import { primerNombre } from '../shared/familia';

/**
 * Los logros y certificados de los hijos. Antes los pedia hijo por hijo a
 * /achievements/students/{id}, una ruta que dejaba pedir los de cualquier
 * nino. Ahora salen de /familia/hijos.
 */
@Component({
  selector: 'app-parent-achievements',
  standalone: true,
  imports: [CommonModule, RouterLink, ShellComponent, AvatarComponent],
  templateUrl: './achievements.component.html',
  styleUrls: ['./achievements.component.scss'],
})
export class AchievementsComponent implements OnInit {
  navItems = PARENT_NAV;
  parentName = '';
  parentInitials = '';

  hijos: Hijo[] = [];
  /** id del hijo que se esta viendo; '' = todos. */
  filtro = '';
  cargando = true;
  error = false;

  readonly primerNombre = primerNombre;

  constructor(private familia: FamiliaApiService, private auth: AuthService) {}

  ngOnInit(): void {
    const user = this.auth.getUser();
    this.parentName = user?.displayName || 'Familia';
    this.parentInitials = user?.initials || 'F';
    this.familia.hijos().subscribe({
      next: h => { this.hijos = h; this.cargando = false; },
      error: () => { this.cargando = false; this.error = true; },
    });
  }

  get visibles(): Hijo[] { return this.filtro ? this.hijos.filter(h => h.id === this.filtro) : this.hijos; }

  xpDeLogros(h: Hijo): number { return h.logros.reduce((s, l) => s + (l.xp ?? 0), 0); }

  fecha(iso: string | null): string {
    return iso ? new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', '') : '';
  }
}
