import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
const NAV: NavItem[] = [{label:"Mi Panel",icon:"🏠",route:"/parent"},{label:"Mis Hijos",icon:"👦",route:"/parent/children"},{label:"Progreso",icon:"📈",route:"/parent/progress"},{label:"Logros",icon:"🏆",route:"/parent/achievements"},{label:"Mensajes",icon:"💬",route:"/parent/messages",badge:2},{label:"Calendario",icon:"📅",route:"/parent/calendar"},{label:"Asistente IA",icon:"🤖",route:"/parent/ai-assistant",badge:"IA"}];
@Component({ selector:'app-parent-children', standalone:true, imports:[CommonModule,RouterLink,ShellComponent],
  templateUrl:'./children.component.html', styleUrls:['./children.component.scss']
})
export class ChildrenComponent {
  navItems = NAV;
  children = [
    { name:'Axel Partida', age:9, grade:'4°A', teacher:'Profa. García', av:'AX', initColor:'var(--info)',
      prog:78, xp:1250, streak:12, level:5, missions:14, completed:11,
      subjects:['Python','HTML/CSS','Scratch','Robótica'],
      recent:['Completó misión Python ⚡','Ganó logro "Bug Hunter" 🐛','12 días de racha consecutiva 🔥'],
      next:'Condicionales IF/ELSE', alert:'' },
    { name:'Antonella Partida', age:3, grade:'Preescolar A', teacher:'Profa. Mendoza', av:'AN', initColor:'var(--guinda-md)',
      prog:45, xp:420, streak:5, level:2, missions:6, completed:3,
      subjects:['Scratch','Arte Digital','Matemáticas'],
      recent:['Creó su primera animación en Scratch 🎨','Aprendió colores con bloques 🧩'],
      next:'Mi primera animación completa', alert:'' },
  ];
  sel = this.children[0];
  pc(p:number){ return p>=80?'var(--ok)':p<60?'var(--danger)':'var(--guinda)'; }
}
