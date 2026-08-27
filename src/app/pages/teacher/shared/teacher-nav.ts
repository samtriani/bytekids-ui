import { NavItem } from '../../../shared/shell/shell.component';

export const TEACHER_NAV: NavItem[] = [
  { label:'Mi Panel',        icon:'🏠', route:'/teacher' },
  { label:'Mis Salones',     icon:'🏫', route:'/teacher/classrooms' },
  { label:'Alumnos',         icon:'👨‍🎓', route:'/teacher/students' },
  { label:'Libreta',         icon:'📋', route:'/teacher/gradebook' },
  { label:'Crear Contenido', icon:'📝', route:'/teacher/create' },
  { label:'Mis Contenidos',  icon:'📚', route:'/teacher/content' },
  { label:'Asistente IA',    icon:'🤖', route:'/teacher/ai-assistant', badge:'IA' },
  { label:'Reportes',        icon:'📊', route:'/teacher/reports' },
  { label:'Calendario',      icon:'📅', route:'/teacher/calendar' },
  { label:'Mensajes',        icon:'💬', route:'/teacher/messages' },
];
