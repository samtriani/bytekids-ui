import { NavItem } from '../../../shared/shell/shell.component';

/**
 * El menú del alumno, en un solo lugar.
 *
 * Estaba copiado en las nueve pantallas del alumno y ya se habían separado:
 * la de Roblox se había quedado sin "Calendario". El maestro ya lo tenía
 * compartido (TEACHER_NAV); esto es lo mismo de este lado.
 */
export const STUDENT_NAV: NavItem[] = [
  { label: 'Mi Dashboard',    icon: '🏠', route: '/student' },
  { label: 'Mis Actividades', icon: '🎯', route: '/student/missions' },
  { label: 'Mi Progreso',     icon: '📈', route: '/student/progress' },
  { label: 'Logros',          icon: '🏆', route: '/student/achievements' },
  { label: 'Tutor IA',        icon: '🤖', route: '/student/ai-tutor', badge: '✨' },
  { label: 'Proyectos',       icon: '💻', route: '/student/projects' },
  // { label: 'Roblox Studio', icon: '🎮', route: '/student/roblox' },
  { label: 'Calendario',      icon: '📅', route: '/student/calendar' },
  { label: 'Mensajes',        icon: '💬', route: '/student/messages' },
  { label: 'Comunidad',       icon: '👥', route: '/student/community' },
];
