import { Component } from '@angular/core';
import { Router } from '@angular/router';

interface RoleCard {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
  glowColor: string;
  borderColor: string;
  gradient: string;
  description: string;
  features: string[];
  route: string;
  accentClass: string;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent {
  constructor(private router: Router) {}

  roles: RoleCard[] = [
    {
      id: 'student',
      title: 'Soy Estudiante',
      subtitle: 'Portal del Alumno',
      emoji: '🚀',
      color: '#06B6D4',
      glowColor: 'rgba(6,182,212,0.3)',
      borderColor: 'rgba(6,182,212,0.35)',
      gradient: 'linear-gradient(135deg, rgba(6,182,212,0.12) 0%, rgba(37,99,235,0.06) 100%)',
      description: 'Aprende a tu ritmo: Python, Scratch, Web, Robótica y Roblox Studio. Completa misiones y sube de nivel.',
      features: ['Misiones gamificadas', 'Tutor IA personal 🤖', 'Tablero de logros', 'Proyectos reales'],
      route: '/student',
      accentClass: 'cyan'
    },
    {
      id: 'teacher',
      title: 'Soy Maestro',
      subtitle: 'Portal del Docente',
      emoji: '🎓',
      color: '#7C3AED',
      glowColor: 'rgba(124,58,237,0.3)',
      borderColor: 'rgba(124,58,237,0.35)',
      gradient: 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(236,72,153,0.04) 100%)',
      description: 'Gestiona tus salones con IA. Detecta qué alumnos necesitan apoyo antes de que se queden atrás.',
      features: ['Progreso en tiempo real', 'IA detecta rezago', 'Crea contenido fácil', 'Reportes automáticos'],
      route: '/teacher',
      accentClass: 'purple'
    },
    {
      id: 'parent',
      title: 'Soy Papá / Mamá',
      subtitle: 'Portal de Padres',
      emoji: '💙',
      color: '#2563EB',
      glowColor: 'rgba(37,99,235,0.3)',
      borderColor: 'rgba(37,99,235,0.35)',
      gradient: 'linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(124,58,237,0.04) 100%)',
      description: 'Sigue el progreso de tus hijos en tiempo real. Recibe alertas y comunicación directa con maestros.',
      features: ['Progreso de mis hijos', 'Alertas inteligentes', 'Chat con maestros', 'Logros y recompensas'],
      route: '/parent',
      accentClass: 'blue'
    },
    {
      id: 'admin',
      title: 'Soy Director',
      subtitle: 'Panel Ejecutivo',
      emoji: '🏫',
      color: '#F59E0B',
      glowColor: 'rgba(245,158,11,0.3)',
      borderColor: 'rgba(245,158,11,0.35)',
      gradient: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(252,211,77,0.04) 100%)',
      description: 'Visión 360° de tu institución. Analítica avanzada con IA para tomar decisiones que impacten cada aula.',
      features: ['Dashboard ejecutivo', 'Analítica por IA', 'Todos los salones', 'Reportes de impacto'],
      route: '/admin',
      accentClass: 'yellow'
    }
  ];

  navigate(route: string) {
    this.router.navigate([route]);
  }

  subjects = [
    { icon: '🐍', name: 'Python' },
    { icon: '🧩', name: 'Scratch' },
    { icon: '🌐', name: 'HTML/CSS' },
    { icon: '🤖', name: 'Robótica' },
    { icon: '🎮', name: 'Roblox Studio' },
    { icon: '📐', name: 'Matemáticas' },
    { icon: '🔬', name: 'Ciencias' },
    { icon: '📚', name: 'Español' },
    { icon: '🌍', name: 'Historia' },
    { icon: '🎨', name: 'Arte Digital' },
  ];
}
