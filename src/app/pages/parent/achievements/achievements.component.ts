import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
const NAV: NavItem[] = [{label:"Mi Panel",icon:"🏠",route:"/parent"},{label:"Mis Hijos",icon:"👦",route:"/parent/children"},{label:"Progreso",icon:"📈",route:"/parent/progress"},{label:"Logros",icon:"🏆",route:"/parent/achievements"},{label:"Mensajes",icon:"💬",route:"/parent/messages",badge:2},{label:"Calendario",icon:"📅",route:"/parent/calendar"},{label:"Asistente IA",icon:"🤖",route:"/parent/ai-assistant",badge:"IA"}];
@Component({ selector:'app-parent-achievements', standalone:true, imports:[CommonModule,RouterLink,ShellComponent],
  templateUrl:'./achievements.component.html', styleUrls:['./achievements.component.scss']
})
export class AchievementsComponent {
  navItems = NAV;
  filt = 'Todos';
  achievements = [
    {child:'Axel',  icon:'⚡',title:'Primer Código',    xp:25,  date:'10 Ene',earned:true,  desc:'Completó su primera misión'},
    {child:'Axel',  icon:'🐛',title:'Bug Hunter',       xp:50,  date:'18 Ene',earned:true,  desc:'Corrigió 5 errores de código'},
    {child:'Axel',  icon:'🔄',title:'Loop Master',      xp:75,  date:'25 Ene',earned:true,  desc:'Usó bucles en 10 misiones'},
    {child:'Axel',  icon:'🔥',title:'Racha 7 días',     xp:100, date:'01 Feb',earned:true,  desc:'Estudió 7 días seguidos'},
    {child:'Axel',  icon:'🌐',title:'Web Wizard',       xp:120, date:null,    earned:false, desc:'Completar todas las misiones HTML'},
    {child:'Axel',  icon:'🐍',title:'Python Pro',       xp:150, date:null,    earned:false, desc:'Alcanzar nivel 5 en Python'},
    {child:'Anton.',icon:'🎨',title:'Primera Animación',xp:30,  date:'15 Feb',earned:true,  desc:'Creó su primera animación'},
    {child:'Anton.',icon:'✏️',title:'Artista Digital',  xp:40,  date:'22 Feb',earned:true,  desc:'Completó módulo de arte digital'},
    {child:'Anton.',icon:'🌟',title:'Racha 5 días',     xp:60,  date:null,    earned:false, desc:'Estudiar 5 días consecutivos'},
  ];
  get rows() { return this.achievements.filter(a=>this.filt==='Todos'||a.child.startsWith(this.filt==='Axel'?'Axel':'Anton')); }
  totalXp(child: string) { return this.achievements.filter(a=>a.child.startsWith(child)&&a.earned).reduce((acc,a)=>acc+a.xp,0); }
}
