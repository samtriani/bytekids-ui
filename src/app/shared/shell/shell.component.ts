import { Component, Input, OnInit, OnDestroy, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IsActiveMatchOptions, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationApiService } from '../../services/api/notification-api.service';
import { BackendStatusService } from '../../services/backend-status.service';

export interface NavItem {
  label: string;
  icon: string;
  route?: string;
  badge?: string | number;
  /** Solo visible para usuarios dueños (ver OWNER_USERNAMES en el backend). */
  ownerOnly?: boolean;
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
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss']
})
export class ShellComponent implements OnInit, OnDestroy {
  /**
   * Como marcar activa una entrada del menu.
   *
   * Con el atajo {exact:true}, Angular exige que TAMBIEN coincidan los query
   * params. Al navegar a /teacher/students?salon=xxx la entrada dejaba de
   * marcarse: el maestro llegaba a la pantalla correcta con el menu diciendo
   * que estaba en otro lado.
   *
   * Las rutas de primer nivel comparan la ruta exacta --si no, /teacher
   * quedaria activo en todas sus hijas-- y las anidadas por prefijo, para
   * que una pantalla de detalle mantenga marcada su seccion.
   */
  // Referencias FIJAS. routerLinkActiveOptions es un @Input y RouterLinkActive
  // implementa OnChanges: si el metodo devolviera un objeto nuevo en cada
  // llamada, cada ciclo de deteccion lo veria como un valor distinto, correria
  // update(), pediria otro ciclo, y la pagina se quedaria girando. Como el
  // shell esta en todas las pantallas, colgaba la app entera.
  private static readonly EXACTA: IsActiveMatchOptions = {
    paths: 'exact', queryParams: 'ignored', matrixParams: 'ignored', fragment: 'ignored',
  };
  private static readonly POR_PREFIJO: IsActiveMatchOptions = {
    paths: 'subset', queryParams: 'ignored', matrixParams: 'ignored', fragment: 'ignored',
  };

  matchOptions(route?: string): IsActiveMatchOptions {
    return (route ?? '').split('/').length <= 3
      ? ShellComponent.EXACTA
      : ShellComponent.POR_PREFIJO;
  }

  @Input() role: Role = 'student';
  @Input() userName = 'Usuario';
  @Input() userAvatar = 'U';
  @Input() navItems: NavItem[] = [];
  @Input() pageTitle = 'ByteKids Academy';

  /** Oculta del menu lo que este usuario no puede usar. */
  get visibleNavItems(): NavItem[] {
    const isOwner = this.auth.getUser()?.owner === true;
    return this.navItems.filter(i => !i.ownerOnly || isOwner);
  }

  unreadCount = 0;
  notifications: any[] = [];
  showNotif = false;

  /** Estado de conexion con la API, para avisar cuando esta despertando. */
  readonly backend = inject(BackendStatusService);

  /** Menu de la cuenta en el topbar y confirmacion de salida. */
  showUserMenu = false;
  confirmarSalida = false;

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
    this.showUserMenu = false;
  }

  /** Recarga la vista actual para volver a pedir los datos al backend. */
  reintentar(): void {
    this.backend.reiniciar();
    window.location.reload();
  }

  /** Portal de perfiles: NO cierra sesion, solo cambia de panel. */
  goHome(): void {
    this.showUserMenu = false;
    this.router.navigate(['/portal']);
  }

  toggleUserMenu(e: Event): void {
    e.stopPropagation();
    this.showUserMenu = !this.showUserMenu;
    this.showNotif = false;
  }

  pedirSalida(e?: Event): void {
    e?.stopPropagation();
    this.showUserMenu = false;
    this.confirmarSalida = true;
  }

  cancelarSalida(): void { this.confirmarSalida = false; }

  /** Borra token y usuario de localStorage y manda al login. */
  salir(): void {
    this.confirmarSalida = false;
    this.auth.logout();
  }

  toggleNotif(e: Event): void {
    e.stopPropagation();
    this.showNotif = !this.showNotif;
    if (this.showNotif) this.loadNotifications();
  }

  /**
   * Marca como leida y, si sabemos a donde lleva, navega.
   *
   * Se navega SIN esperar al marcado: si la peticion tarda --el backend de
   * Fly puede estar despertando-- el nino ya dio clic y no entiende por que
   * no pasa nada. Marcarla es un efecto secundario, no un requisito.
   */
  markAsRead(n: any): void {
    if (!n.isRead) {
      n.isRead = true;
      this.unreadCount = Math.max(0, this.unreadCount - 1);
      this.notifApi.markAsRead(n.id).subscribe({ error: () => {} });
    }
    const destino = this.rutaDe(n);
    if (destino) {
      this.showNotif = false;
      this.router.navigate(destino.ruta, { queryParams: destino.params });
    }
  }

  /**
   * A donde lleva cada notificacion. referenceType lo pone el backend al
   * crearla; el destino depende ademas del rol, porque la misma
   * conversacion vive en tres pantallas distintas.
   */
  private rutaDe(n: any): { ruta: any[]; params?: any } | null {
    const id = n.referenceId;
    switch (n.referenceType) {
      case 'conversacion':
        if (this.role === 'student') return { ruta: ['/student/messages'] };
        if (this.role === 'teacher') return { ruta: ['/teacher/messages'], params: { to: id } };
        if (this.role === 'parent')  return { ruta: ['/parent/messages'] };
        return null;
      case 'actividad':
        return id && this.role === 'student' ? { ruta: ['/student/missions', id] } : null;
      case 'logro':
        return this.role === 'student' ? { ruta: ['/student/achievements'] } : null;
      case 'entrega':
        return this.role === 'teacher' ? { ruta: ['/teacher/gradebook'] } : null;
      default:
        return null;
    }
  }

  markAllAsRead(): void {
    this.notifApi.markAllAsRead().subscribe(() => {
      this.notifications.forEach(n => n.isRead = true);
      this.unreadCount = 0;
    });
  }

  /**
   * Las llaves son los valores del enum notification_type de la base, en
   * espanol. Antes estaban en ingles --message, achievement_unlocked-- y
   * ninguna casaba: todas caian en el icono por defecto. No se noto porque
   * hasta ahora nadie creaba notificaciones.
   */
  typeIcon(type: string): string {
    const icons: Record<string, string> = {
      mensaje:             '💬',
      calificacion:        '✅',
      logro_desbloqueado:  '🏆',
      mision_asignada:     '🎯',
      proyecto_asignado:   '🏗️',
      alerta_inactividad:  '⏰',
      sistema:             'ℹ️',
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

  /** Cuantas trae el panel. El recorte lo hace el backend, no el cliente. */
  private static readonly CUANTAS = 20;

  private loadNotifications(): void {
    this.notifApi.getAll(ShellComponent.CUANTAS).subscribe(list => {
      this.notifications = list;
      // El contador NO sale de esta lista: viene de countUnread, que cuenta
      // todas. Si hubiera no leidas mas alla de las 20 que se pintan,
      // sacarlo de aqui dejaria el numerito por debajo de la verdad.
      this.loadUnreadCount();
    });
  }

  private loadUnreadCount(): void {
    this.notifApi.getUnreadCount().subscribe(c => this.unreadCount = c);
  }
}
