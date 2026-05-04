import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
const NAV: NavItem[] = [{label:"Mi Panel",icon:"🏠",route:"/parent"},{label:"Mis Hijos",icon:"👦",route:"/parent/children"},{label:"Progreso",icon:"📈",route:"/parent/progress"},{label:"Logros",icon:"🏆",route:"/parent/achievements"},{label:"Mensajes",icon:"💬",route:"/parent/messages",badge:2},{label:"Calendario",icon:"📅",route:"/parent/calendar"},{label:"Asistente IA",icon:"🤖",route:"/parent/ai-assistant",badge:"IA"}];
@Component({ selector:'app-parent-calendar', standalone:true, imports:[CommonModule,RouterLink,ShellComponent],
  templateUrl:'./calendar.component.html', styleUrls:['./calendar.component.scss']
})
export class CalendarComponent {
  navItems = NAV;
  monthName='Marzo 2026'; days=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  weeks:(number|null)[][]=[];today=12;selectedDay=12;
  events:Record<number,any[]>={
    10:[{title:'Entrega proyecto Axel',time:'15:00',color:'#7A1535',who:'Axel'}],
    12:[{title:'Examen Python — Axel',time:'10:00',color:'#7A1535',who:'Axel'},{title:'Clase Arte Antonella',time:'09:00',color:'#0A4D7A',who:'Antonella'}],
    15:[{title:'Junta con Profa. García',time:'16:00',color:'#1A6B3C',who:'Axel'}],
    20:[{title:'Feria de proyectos ByteKids',time:'11:00',color:'#C4992A',who:'Ambos'}],
  };
  constructor(){
    const startDay=6,totalDays=31;let week:(number|null)[]=Array(startDay).fill(null);const grid:(number|null)[][]=[];
    for(let d=1;d<=totalDays;d++){week.push(d);if(week.length===7){grid.push(week);week=[];}}
    if(week.length){while(week.length<7)week.push(null);grid.push(week);}this.weeks=grid;
  }
  get selEvts(){ return this.events[this.selectedDay]||[]; }
  hasEvent(d:number|null){ return d&&this.events[d]; }
}
