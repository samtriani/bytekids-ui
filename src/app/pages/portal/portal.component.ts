import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, AppUser } from '../../services/auth.service';

@Component({
  selector: 'app-portal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portal.component.html',
  styleUrls: ['./portal.component.scss']
})
export class PortalComponent {
  user!: AppUser;
  panels: typeof ALL_PANELS = [];

  constructor(private auth: AuthService, private router: Router) {
    const currentUser = this.auth.getUser();
    if (!currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    this.user = currentUser;
    this.panels = ALL_PANELS.filter((panel) => currentUser.panels.includes(panel.id));

    if (this.panels.length === 1) {
      this.router.navigate([this.panels[0].route]);
    }
  }

  go(route: string) {
    this.router.navigate([route]);
  }

  logout() {
    this.auth.logout();
  }

  get roleSummary(): string {
    if (this.user.role === 'admin') return 'Administrador del sistema';
    if (this.user.role === 'director') return 'Director institucional';
    if (this.user.role === 'teacher') return 'Profesor';
    if (this.user.role === 'parent') return 'Padre de familia';
    return 'Alumno';
  }

  get welcomeMessage(): string {
    if (this.user.role === 'admin') {
      return 'Selecciona el modulo que deseas abrir. Desde aqui puedes entrar al administrador operativo o al panel director.';
    }
    if (this.user.role === 'director') {
      return 'Selecciona el panel ejecutivo para revisar el estado general de profesores, alumnos, salones y materias.';
    }
    return 'Selecciona el panel que deseas explorar.';
  }

  get accessBadgeTitle(): string {
    return this.user.role === 'admin' ? 'Acceso Operativo' : 'Acceso Institucional';
  }

  get accessBadgeSubtitle(): string {
    return `${this.panels.length} modulo${this.panels.length === 1 ? '' : 's'} disponible${this.panels.length === 1 ? '' : 's'}`;
  }
}

const ALL_PANELS = [
  {
    id: 'administrador',
    label: 'Modulo Administrador',
    icon: '🧩',
    desc: 'Altas de maestros, alumnos, salones, materias y asignaciones operativas',
    route: '/administrator/operations',
    color: '#7A1535',
    badge: 'Operacion escolar',
    stats: ['Altas de usuarios', 'Alta de salones', 'Asignaciones']
  },
  {
    id: 'director',
    label: 'Panel Director',
    icon: '🏛️',
    desc: 'Vision institucional completa de salones, profesores, alumnos y rendimiento',
    route: '/admin',
    color: '#C4992A',
    badge: 'Supervision',
    stats: ['Metricas globales', 'Estado escolar', 'Reportes IA']
  },
  {
    id: 'alumno',
    label: 'Panel Alumno',
    icon: '🎓',
    desc: 'Misiones, progreso, logros y Tutor IA',
    route: '/student',
    color: '#7A1535',
    badge: 'Experiencia alumno',
    stats: ['14 misiones', '78% progreso', 'Nivel 5']
  },
  {
    id: 'maestro',
    label: 'Panel Maestro',
    icon: '👩‍🏫',
    desc: 'Salones, alumnos, reportes y calendario',
    route: '/teacher',
    color: '#0A4D7A',
    badge: 'Gestion docente',
    stats: ['22 alumnos', '70% promedio', '3 salones']
  },
  {
    id: 'padre',
    label: 'Panel Padre',
    icon: '👪',
    desc: 'Seguimiento de hijos, mensajes y logros',
    route: '/parent',
    color: '#1A6B3C',
    badge: 'Acompanamiento',
    stats: ['2 hijos', '78% / 45%', '6 logros']
  }
];
