import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RolePipe } from '../../../shared/pipes/role.pipe';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';

@Component({ selector:'app-teacher-messages', standalone:true, imports:[CommonModule, FormsModule, RouterLink, ShellComponent, RolePipe],
  templateUrl:'./messages.component.html', styleUrls:['./messages.component.scss']
})
export class MessagesComponent {
  navItems: NavItem[] = [{ label:'Mi Panel', icon:'🏠', route:'/teacher' },{ label:'Mis Salones', icon:'🏫', route:'/teacher/classrooms', badge:3 },{ label:'Alumnos', icon:'👨‍🎓', route:'/teacher/students' },{ label:'Crear Contenido', icon:'📝', route:'/teacher/create' },{ label:'Asistente IA', icon:'🤖', route:'/teacher/ai-assistant', badge:'✨' },{ label:'Reportes', icon:'📊', route:'/teacher/reports' },{ label:'Calendario', icon:'📅', route:'/teacher/calendar' },{ label:'Mensajes', icon:'💬', route:'/teacher/messages', badge:5 }];
  selectedId = 1;
  conversations = [
    { id:1, name:'Sam Partida', role:'Padre de Axel', av:'SP', lastMsg:'Gracias por el reporte 😊', time:'10 min', unread:2, online:true },
    { id:2, name:'Director Pérez', role:'Director', av:'DP', lastMsg:'¿Puedes revisar el caso de Carlos?', time:'1h', unread:3, online:true },
    { id:3, name:'Profa. López', role:'Colega', av:'AL', lastMsg:'Nos vemos en la junta del 15.', time:'Ayer', unread:0, online:false },
    { id:4, name:'Monzerrath P.', role:'Mamá de Axel', av:'MP', lastMsg:'¿Cuándo son los exámenes?', time:'Ayer', unread:0, online:false },
  ];
  chat: Record<number,any[]> = {
    1:[{ from:'other', text:'Hola Profa. García, ¿cómo va Axel?', time:'10:05' },{ from:'me', text:'¡Hola Sam! Axel va muy bien, completó la misión de Python esta semana 🎉', time:'10:07' },{ from:'other', text:'¡Qué bueno! Estaba muy emocionado con eso.', time:'10:08' },{ from:'me', text:'Le recomiendo reforzar los bucles en casa. Hay ejercicios en la plataforma.', time:'10:09' },{ from:'other', text:'Gracias por el reporte 😊', time:'10:15' }],
    2:[{ from:'other', text:'Buenos días Profa. García', time:'09:30' },{ from:'other', text:'¿Puedes revisar el caso de Carlos? Lleva varios días sin actividad.', time:'09:31' }],
    3:[{ from:'other', text:'Nos vemos en la junta del 15.', time:'Ayer' }],
    4:[{ from:'other', text:'¿Cuándo son los exámenes de programación?', time:'Ayer' }],
  };
  newMsg = '';
  get selected() { return this.conversations.find(c=>c.id===this.selectedId)!; }
  get messages() { return this.chat[this.selectedId]||[]; }
  select(id: number) { this.selectedId=id; const c=this.conversations.find(c=>c.id===id); if(c) c.unread=0; }
  send() { if(!this.newMsg.trim()) return; this.chat[this.selectedId]=[...this.messages,{from:'me',text:this.newMsg,time:'Ahora'}]; this.newMsg=''; }
  onKey(e: KeyboardEvent) { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();this.send();} }
}
