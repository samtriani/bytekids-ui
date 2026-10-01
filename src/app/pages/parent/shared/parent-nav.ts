import { NavItem } from '../../../shared/shell/shell.component';

/**
 * El menu de las familias, en un solo lugar.
 *
 * Estaba copiado en siete pantallas y ya se habia desfasado: en una decia
 * "Dashboard" y en otra "Panel Principal". "Progreso" se fundio con "Mis
 * hijos": eran dos pantallas mostrando casi lo mismo con numeros distintos.
 */
export const PARENT_NAV: NavItem[] = [
  { label: 'Panel',        icon: '🏠', route: '/parent' },
  { label: 'Mis hijos',    icon: '👧', route: '/parent/children' },
  { label: 'Logros',       icon: '🏆', route: '/parent/achievements' },
  { label: 'Mensajes',     icon: '💬', route: '/parent/messages' },
  { label: 'Calendario',   icon: '📅', route: '/parent/calendar' },
  { label: 'Asistente IA', icon: '🤖', route: '/parent/ai-assistant', badge: '✨' },
];
