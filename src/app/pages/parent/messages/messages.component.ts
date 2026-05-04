import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RolePipe } from '../../../shared/pipes/role.pipe';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
const NAV: NavItem[] = [{label:"Mi Panel",icon:"🏠",route:"/parent"},{label:"Mis Hijos",icon:"👦",route:"/parent/children"},{label:"Progreso",icon:"📈",route:"/parent/progress"},{label:"Logros",icon:"🏆",route:"/parent/achievements"},{label:"Mensajes",icon:"💬",route:"/parent/messages",badge:2},{label:"Calendario",icon:"📅",route:"/parent/calendar"},{label:"Asistente IA",icon:"🤖",route:"/parent/ai-assistant",badge:"IA"}];
@Component({ selector:'app-parent-messages', standalone:true, imports:[CommonModule,FormsModule,RouterLink,ShellComponent,RolePipe],
  templateUrl:'./messages.component.html', styleUrls:['./messages.component.scss']
})
export class MessagesComponent {
  navItems = NAV;
  selectedId = 1;
  conversations = [
    {id:1,name:'Profa. García',role:'Maestra de Axel',av:'MG',lastMsg:'Axel completó la misión de Python ⚡',time:'10 min',unread:1,online:true},
    {id:2,name:'Profa. Mendoza',role:'Maestra de Antonella',av:'AM',lastMsg:'¡Antonella creó su primera animación!',time:'Ayer',unread:0,online:false},
  ];
  chat: Record<number,any[]> = {
    1:[{from:'other',text:'¡Hola Sam! Buenas noticias sobre Axel 😊',time:'10:00'},{from:'other',text:'Completó la misión de Python esta semana ⚡ ¡Va muy bien!',time:'10:01'},{from:'me',text:'¡Excelente! Lo ha estado practicando en casa 👍',time:'10:05'},{from:'other',text:'Axel completó la misión de Python ⚡',time:'10:15'}],
    2:[{from:'other',text:'¡Hola! Antonella hizo su primera animación en Scratch hoy 🎨',time:'Ayer'}],
  };
  newMsg = '';
  get sel() { return this.conversations.find(c=>c.id===this.selectedId)!; }
  get msgs() { return this.chat[this.selectedId]||[]; }
  select(id:number){ this.selectedId=id; const c=this.conversations.find(c=>c.id===id); if(c) c.unread=0; }
  send(){ if(!this.newMsg.trim()) return; this.chat[this.selectedId]=[...this.msgs,{from:'me',text:this.newMsg,time:'Ahora'}]; this.newMsg=''; }
  onKey(e:KeyboardEvent){ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();this.send();} }
}
