import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';

const NAV: NavItem[] = [{label:'Mi Panel',icon:'🏠',route:'/teacher'},{label:'Mis Salones',icon:'🏫',route:'/teacher/classrooms',badge:3},{label:'Alumnos',icon:'👨‍🎓',route:'/teacher/students'},{label:'Crear Contenido',icon:'📝',route:'/teacher/create'},{label:'Asistente IA',icon:'🤖',route:'/teacher/ai-assistant',badge:'IA'},{label:'Reportes',icon:'📊',route:'/teacher/reports'},{label:'Calendario',icon:'📅',route:'/teacher/calendar'},{label:'Mensajes',icon:'💬',route:'/teacher/messages',badge:5}];

const MONTHS = [
  { name:'Enero 2026',   start:3, days:31 },
  { name:'Febrero 2026', start:6, days:28 },
  { name:'Marzo 2026',   start:6, days:31 },
  { name:'Abril 2026',   start:2, days:30 },
];

const ALL_EVENTS: Record<string, Record<number,any[]>> = {
  'Marzo 2026': {
    5: [{title:'Examen Python 4°A',time:'10:00',color:'#7B1034',type:'exam'}],
    10:[{title:'Entrega proyecto HTML',time:'15:00',color:'#0A5C8B',type:'task'}],
    12:[{title:'Clase Robótica 4°A',time:'09:00',color:'#C9A84C',type:'class'},{title:'Tutoría — Carlos M.',time:'14:00',color:'#B01A1A',type:'meeting'}],
    15:[{title:'Junta de maestros',time:'16:00',color:'#1B7A3C',type:'meeting'}],
    20:[{title:'Feria de proyectos',time:'11:00',color:'#7B1034',type:'event'}],
    25:[{title:'Entrega calificaciones',time:'17:00',color:'#C9A84C',type:'task'}],
  },
  'Abril 2026': {
    3: [{title:'Inicio nuevo módulo Python',time:'09:00',color:'#7B1034',type:'class'}],
    8: [{title:'Evaluación Scratch 4°A',time:'11:00',color:'#0A5C8B',type:'exam'}],
    14:[{title:'Semana Santa — Sin clases',time:'Todo el día',color:'#1B7A3C',type:'event'}],
    22:[{title:'Regreso a clases',time:'08:00',color:'#C9A84C',type:'class'}],
    28:[{title:'Junta de padres',time:'17:00',color:'#B01A1A',type:'meeting'}],
  },
};

@Component({ selector:'app-teacher-calendar', standalone:true, imports:[CommonModule,FormsModule,RouterLink,ShellComponent],
  templateUrl:'./calendar.component.html', styleUrls:['./calendar.component.scss']
})
export class CalendarComponent {
  navItems = NAV;
  days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  monthIdx = 2;
  today = 12; selectedDay = 12;
  weeks: (number|null)[][] = [];
  showModal = false;
  selectedEvent: any = null;
  newEvent = { title:'', type:'class', time:'09:00', color:'#7B1034' };
  typeColors: Record<string,string> = {class:'#C9A84C',exam:'#7B1034',task:'#0A5C8B',meeting:'#B01A1A',event:'#1B7A3C'};
  types = ['class','exam','task','meeting','event'];

  constructor() { this.buildGrid(); }

  get month() { return MONTHS[this.monthIdx]; }
  get monthName() { return this.month.name; }
  get events() { return ALL_EVENTS[this.monthName] || {}; }
  get selectedEvents() { return this.events[this.selectedDay] || []; }
  get upcoming() {
    return Object.entries(this.events)
      .filter(([d]) => +d > this.selectedDay)
      .sort(([a],[b]) => +a - +b)
      .slice(0,3)
      .map(([d,evs]) => ({day:+d, ev:(evs as any[])[0]}));
  }

  buildGrid() {
    const {start, days} = this.month;
    let week: (number|null)[] = Array(start).fill(null);
    const grid: (number|null)[][] = [];
    for (let d=1; d<=days; d++) {
      week.push(d);
      if (week.length===7) { grid.push(week); week=[]; }
    }
    if (week.length) { while(week.length<7) week.push(null); grid.push(week); }
    this.weeks = grid;
  }

  prevMonth() { if (this.monthIdx>0) { this.monthIdx--; this.selectedDay=1; this.buildGrid(); } }
  nextMonth() { if (this.monthIdx<MONTHS.length-1) { this.monthIdx++; this.selectedDay=1; this.buildGrid(); } }

  openNewEvent() { this.newEvent={title:'',type:'class',time:'09:00',color:'#7B1034'}; this.showModal=true; }
  closeModal() { this.showModal=false; this.selectedEvent=null; }

  saveEvent() {
    if (!this.newEvent.title.trim()) return;
    if (!this.events[this.selectedDay]) this.events[this.selectedDay] = [];
    this.events[this.selectedDay].push({...this.newEvent, color: this.typeColors[this.newEvent.type]});
    this.closeModal();
  }

  openEvent(e: any) { this.selectedEvent=e; }
  deleteEvent(e: any) {
    const list = this.events[this.selectedDay];
    const i = list.indexOf(e);
    if (i>-1) list.splice(i,1);
    this.selectedEvent=null;
  }

  hasEvent(d: number|null) { return d && this.events[d]?.length; }
  typeLabel(t: string) { return ({class:'Clase',exam:'Examen',task:'Tarea',meeting:'Reunión',event:'Evento'} as any)[t]||'Otro'; }
}
