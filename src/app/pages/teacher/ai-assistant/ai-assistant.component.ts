import { Component, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { AiTutorService, ChatMessage } from '../../../services/ai-tutor.service';

@Component({ selector: 'app-ai-assistant-teacher', standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ShellComponent],
  templateUrl: './ai-assistant.component.html', styleUrls: ['./ai-assistant.component.scss']
})
export class AiAssistantComponent implements AfterViewChecked {
  @ViewChild('chatEnd') chatEnd!: ElementRef;

  navItems: NavItem[] = [
    { label:'Dashboard',       icon:'🏠', route:'/teacher' },
    { label:'Mis Salones',     icon:'🏫', route:'/teacher/classrooms', badge:3 },
    { label:'Alumnos',         icon:'👨‍🎓', route:'/teacher/students' },
    { label:'Crear Contenido', icon:'📝', route:'/teacher/create' },
    { label:'Tutor IA',        icon:'🤖', route:'/teacher/ai-assistant', badge:'✨' },
    { label:'Reportes',        icon:'📊', route:'/teacher/reports' },
    { label:'Calendario',      icon:'📅', route:'/teacher/calendar' },
    { label:'Mensajes',        icon:'💬', route:'/teacher/messages', badge:5 },
  ];

  messages: ChatMessage[] = [{
    role: 'assistant',
    content: '¡Hola! Soy tu Asistente Pedagógico IA de ByteKids 🎓\n\nPuedo ayudarte a:\n• Crear planes de clase y actividades gamificadas\n• Analizar el rendimiento de tu salón\n• Generar rúbricas de evaluación\n• Diseñar proyectos por materia\n• Identificar alumnos en riesgo de rezago\n\n¿Con qué te ayudo hoy?',
    timestamp: new Date()
  }];

  userInput = ''; isLoading = false; shouldScroll = false;

  quickPrompts = [
    '📋 Genera un plan de clase de Python para principiantes',
    '📊 Analiza qué hacer con alumnos rezagados',
    '🎯 Ideas de proyectos Scratch para 4° grado',
    '📝 Crea una rúbrica de evaluación para programación',
    '🎮 Actividad de Roblox Studio para 45 minutos',
    '🤖 Cómo explicar robótica a niños de 10 años',
  ];

  constructor(private aiService: AiTutorService) {}
  ngAfterViewChecked() { if (this.shouldScroll) { try { this.chatEnd.nativeElement.scrollIntoView({behavior:'smooth'}); } catch {} this.shouldScroll=false; } }

  async send(text?: string) {
    const msg = (text || this.userInput).trim();
    if (!msg || this.isLoading) return;
    this.messages.push({ role:'user', content:msg, timestamp:new Date() });
    this.userInput=''; this.isLoading=true; this.shouldScroll=true;
    try {
      const reply = await this.aiService.sendMessage(this.messages.slice(0,-1), 'teacher', msg);
      this.messages.push({ role:'assistant', content:reply, timestamp:new Date() });
    } catch { this.messages.push({ role:'assistant', content:'Error al conectar. Intenta de nuevo.', timestamp:new Date() }); }
    this.isLoading=false; this.shouldScroll=true;
  }
  onKeydown(e: KeyboardEvent) { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();this.send();} }
  formatMessage(c: string) { return c.replace(/```(\w*)\n?([\s\S]*?)```/g,'<pre class="code-block"><code>$2</code></pre>').replace(/`([^`]+)`/g,'<code class="inline-code">$1</code>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>'); }
  clearChat() { this.messages = [this.messages[0]]; }
}
