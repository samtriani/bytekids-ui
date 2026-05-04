import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';

@Component({ selector:'app-roblox', standalone:true, imports:[CommonModule, RouterLink, ShellComponent],
  templateUrl:'./roblox.component.html', styleUrls:['./roblox.component.scss']
})
export class RobloxComponent {
  constructor(private router: Router) {}

  toast = '';

  navItems: NavItem[] = [
    { label:'Mi Dashboard',  icon:'🏠', route:'/student' }, { label:'Mis Misiones', icon:'🎯', route:'/student/missions', badge:3 },
    { label:'Mi Progreso',   icon:'📈', route:'/student/progress' }, { label:'Logros', icon:'🏆', route:'/student/achievements' },
    { label:'Tutor IA',      icon:'🤖', route:'/student/ai-tutor', badge:'✨' }, { label:'Proyectos', icon:'💻', route:'/student/projects' },
    { label:'Roblox Studio', icon:'🎮', route:'/student/roblox' }, { label:'Comunidad', icon:'👥', route:'/student/community' },
  ];

  modules = [
    { title:'Intro a Roblox Studio', lessons:5, done:5, icon:'🎮', color:'#10B981', status:'Completado' },
    { title:'Tu primer personaje', lessons:4, done:3, icon:'🧑‍🚀', color:'#2563EB', status:'En progreso' },
    { title:'Scripting con Lua', lessons:6, done:1, icon:'💻', color:'#7C3AED', status:'En progreso' },
    { title:'Diseño de mundos 3D', lessons:8, done:0, icon:'🌍', color:'#F59E0B', status:'Bloqueado' },
    { title:'Monetización básica', lessons:4, done:0, icon:'💰', color:'#EC4899', status:'Bloqueado' },
  ];

  openModule(m: any) {
    if (m.status === 'Bloqueado') return;
    const action = m.status === 'Completado' ? 'repasar' : 'continuar';
    const q = `Quiero ${action} el módulo "${m.title}" de Roblox Studio. ¿Puedes ayudarme?`;
    this.router.navigate(['/student/ai-tutor'], { queryParams: { q } });
  }

  copySnippet(snippet: any) {
    this.toast = `"${snippet.title}" copiado al portapapeles 📋`;
    setTimeout(() => this.toast = '', 3000);
  }

  luaSnippets = [
    { title:'Mover jugador', code:'local speed = 50\ngame.Players.LocalPlayer\n  .Character.Humanoid\n  .WalkSpeed = speed' },
    { title:'Crear objeto', code:'local parte = Instance.new("Part")\nparte.Size = Vector3.new(4,1,4)\nparte.Parent = workspace' },
    { title:'Imprimir texto', code:'print("¡Hola Roblox!")\n-- Aparece en la consola' },
  ];
}
