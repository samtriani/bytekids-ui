import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';

@Component({ selector:'app-projects', standalone:true, imports:[CommonModule, RouterLink, ShellComponent],
  templateUrl:'./projects.component.html', styleUrls:['./projects.component.scss']
})
export class ProjectsComponent {
  constructor(private router: Router) {}

  navItems: NavItem[] = [
    { label:'Mi Dashboard',  icon:'🏠', route:'/student' }, { label:'Mis Misiones', icon:'🎯', route:'/student/missions', badge:3 },
    { label:'Mi Progreso',   icon:'📈', route:'/student/progress' }, { label:'Logros', icon:'🏆', route:'/student/achievements' },
    { label:'Tutor IA',      icon:'🤖', route:'/student/ai-tutor', badge:'✨' }, { label:'Proyectos', icon:'💻', route:'/student/projects' },
    { label:'Roblox Studio', icon:'🎮', route:'/student/roblox' }, { label:'Comunidad', icon:'👥', route:'/student/community' },
  ];

  selectedProject: any = null;

  myProjects = [
    { title:'Mi Primera Web', subject:'HTML/CSS', icon:'🌐', color:'#7C3AED', status:'Completado', desc:'Una página personal con mi nombre, foto y hobbies. Incluye sección de presentación, lista de hobbies y un formulario de contacto.', xp:120, date:'20 Ene',
      details: ['✅ Estructura HTML completa', '✅ Estilos CSS aplicados', '✅ Responsive design', '✅ Formulario de contacto'] },
    { title:'Calculadora Python', subject:'Python', icon:'🐍', color:'#06B6D4', status:'En progreso', desc:'Calculadora que suma, resta, multiplica y divide. Falta agregar el módulo de historial de operaciones.', xp:150, date:'En curso',
      details: ['✅ Suma y resta', '✅ Multiplicación', '🔄 División (en progreso)', '⏳ Historial de operaciones'] },
    { title:'Juego de Carreras', subject:'Scratch', icon:'🧩', color:'#2563EB', status:'En progreso', desc:'Un juego donde dos coches compiten en una pista. Falta agregar el sistema de puntuación y efectos de sonido.', xp:200, date:'En curso',
      details: ['✅ Movimiento de coches', '✅ Pista diseñada', '🔄 Sistema de puntos', '⏳ Efectos de sonido'] },
  ];

  ideaProjects = [
    { title:'Chatbot de tareas', subject:'Python', icon:'🤖', color:'#EC4899', desc:'Un bot que responde preguntas de matemáticas', xp:300, difficulty:'Difícil' },
    { title:'Portafolio web', subject:'HTML/CSS/JS', icon:'🌐', color:'#7C3AED', desc:'Muestra todos tus proyectos en una web bonita', xp:250, difficulty:'Medio' },
    { title:'Simulador de vida', subject:'Roblox Studio', icon:'🎮', color:'#10B981', desc:'Tu propio juego de simulación en Roblox', xp:400, difficulty:'Difícil' },
    { title:'Sensor de temperatura', subject:'Robótica', icon:'🌡️', color:'#F59E0B', desc:'Mide la temperatura del salón con Arduino', xp:180, difficulty:'Medio' },
  ];

  openProject(p: any) { this.selectedProject = p; }
  closeModal() { this.selectedProject = null; }

  continueProject(p: any) {
    const q = `${p.status === 'Completado' ? 'Quiero ver y mejorar' : 'Continuar'} mi proyecto "${p.title}" de ${p.subject}. ${p.desc}`;
    this.router.navigate(['/student/ai-tutor'], { queryParams: { q } });
  }

  startIdea(p: any) {
    const q = `Quiero empezar el proyecto "${p.title}" de ${p.subject}. ${p.desc}. ¿Por dónde empiezo?`;
    this.router.navigate(['/student/ai-tutor'], { queryParams: { q } });
  }

  newProject() {
    this.router.navigate(['/student/ai-tutor'], { queryParams: { q: 'Quiero crear un nuevo proyecto de programación. ¿Qué me recomiendas según mi nivel?' } });
  }
}
