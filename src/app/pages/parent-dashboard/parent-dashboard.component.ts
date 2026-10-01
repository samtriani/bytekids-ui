import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ShellComponent } from '../../shared/shell/shell.component';
import { AvatarComponent } from '../../shared/avatar/avatar.component';
import { MessageApiService } from '../../services/api/message-api.service';
import { AuthService } from '../../services/auth.service';
import { FamiliaApiService, Hijo } from '../../services/api/familia-api.service';
import { PARENT_NAV } from '../parent/shared/parent-nav';
import { consejo, constancia, nivel, primerNombre } from '../parent/shared/familia';

/**
 * El panel de la familia: como va cada hijo, que le toca, y que puede hacer
 * la familia esta semana para acompanarlo.
 *
 * Antes mostraba un "progreso %" que salia de dividir el XP entre 5, un
 * nivel con 200 XP por nivel (el nino ve 500) y un "Activo" que salia
 * siempre, aunque el nino llevara un mes sin entrar. Ahora todo sale de
 * /familia/hijos, de las mismas fuentes que ve el nino.
 */
@Component({
  selector: 'app-parent-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ShellComponent, AvatarComponent],
  templateUrl: './parent-dashboard.component.html',
  styleUrls: ['./parent-dashboard.component.scss'],
})
export class ParentDashboardComponent implements OnInit {
  navItems = PARENT_NAV;

  parentName = '';
  parentInitials = '';
  firstName = '';
  cargando = true;
  error = false;

  hijos: Hijo[] = [];
  mensajes: { de: string; texto: string; cuando: string; bot: string | null; iniciales: string }[] = [];

  /** Logros de todos los hijos juntos, los mas nuevos primero. */
  logrosRecientes: { hijo: Hijo; titulo: string; icono: string; cuando: string; fecha: number }[] = [];

  readonly nivel = nivel;
  readonly constancia = constancia;
  readonly consejo = consejo;
  readonly primerNombre = primerNombre;

  constructor(
    private familia: FamiliaApiService,
    private messageApi: MessageApiService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    const user = this.auth.getUser();
    this.parentName = user?.displayName || 'Familia';
    this.parentInitials = user?.initials || 'F';
    this.firstName = primerNombre(this.parentName);

    this.familia.hijos().subscribe({
      next: hijos => {
        this.hijos = hijos;
        this.logrosRecientes = hijos
          .flatMap(h => h.logros.map(l => ({
            hijo: h, titulo: l.titulo, icono: l.icono || '🏆',
            cuando: this.hace(l.cuando), fecha: l.cuando ? new Date(l.cuando).getTime() : 0,
          })))
          .sort((a, b) => b.fecha - a.fecha)
          .slice(0, 6);
        this.cargando = false;
      },
      error: () => { this.cargando = false; this.error = true; },
    });

    this.messageApi.getInbox().pipe(catchError(() => of([]))).subscribe((inbox: any[]) => {
      this.mensajes = inbox
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3)
        .map(m => ({
          de: m.sender?.displayName || 'Maestro(a)',
          texto: (m.body ?? '').slice(0, 90),
          cuando: this.hace(m.createdAt),
          bot: m.sender?.avatarUrl ?? null,
          iniciales: m.sender?.initials || '?',
        }));
    });
  }

  get nombresHijos(): string {
    const n = this.hijos.map(h => primerNombre(h.nombre));
    return n.length <= 1 ? (n[0] ?? '') : n.slice(0, -1).join(', ') + ' y ' + n[n.length - 1];
  }

  pct(a: number, t: number): number { return t ? Math.round(a / t * 100) : 0; }

  certificadoListo(h: Hijo) { return h.certificados.find(c => c.estado === 'entregado') ?? null; }

  hace(iso: string | null | undefined): string {
    if (!iso) return '';
    const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (min < 60) return min <= 1 ? 'hace un momento' : `hace ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `hace ${h} h`;
    const d = Math.floor(h / 24);
    if (d === 1) return 'ayer';
    if (d < 7) return `hace ${d} días`;
    return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  }
}
