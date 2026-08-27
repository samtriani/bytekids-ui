import { NavItem } from '../../../shared/shell/shell.component';

export const ADMINISTRATOR_NAV_ITEMS: NavItem[] = [
  { label: 'Detalle Operativo', icon: '🧭', route: '/administrator/operations' },
  { label: 'En Vivo', icon: '🔴', route: '/administrator/live' },
  { label: 'Asignaciones', icon: '🔗', route: '/administrator/assignments' },
  { label: 'Profesores', icon: '👩‍🏫', route: '/administrator/teachers' },
  { label: 'Alumnos', icon: '👨‍🎓', route: '/administrator/students' },
  { label: 'Padres', icon: '👨‍👩‍👧', route: '/administrator/parents' },
  { label: 'Salones', icon: '🏫', route: '/administrator/classrooms' },
  { label: 'Materias', icon: '📚', route: '/administrator/subjects' }
];
