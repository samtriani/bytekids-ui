import { NavItem } from '../../../shared/shell/shell.component';

export const ADMIN_NAV: NavItem[] = [
  { label:'Panel Ejecutivo', icon:'🏫', route:'/admin' },
  { label:'En Vivo',         icon:'🔴', route:'/admin/live' },
  { label:'Salones',         icon:'🎓', route:'/admin/classrooms' },
  { label:'Maestros',        icon:'👩‍🏫', route:'/admin/teachers' },
  { label:'Estudiantes',     icon:'👨‍🎓', route:'/admin/students' },
  { label:'Horarios',        icon:'🕐', route:'/admin/schedule' },
  { label:'Reportes IA',     icon:'🤖', route:'/admin/ai-reports', badge:'IA' },
  { label:'Materias',        icon:'📚', route:'/admin/subjects' },
  { label:'Métricas',        icon:'📊', route:'/admin/metrics' },
];
