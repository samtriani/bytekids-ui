import { Component, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { AiTutorService, ChatMessage } from '../../../services/ai-tutor.service';

@Component({ selector: 'app-ai-assistant-parent', standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ShellComponent],
  templateUrl: './ai-assistant.component.html', styleUrls: ['./ai-assistant.component.scss']
})
export class AiAssistantComponent implements AfterViewChecked {
  @ViewChild('chatEnd') chatEnd!: ElementRef;

  navItems: NavItem[] = [
    { label:'Dashboard',     icon:'🏠', route:'/parent' },
    { label:'Mis Hijos',     icon:'👦', route:'/parent/children' },
    { label:'Progreso',      icon:'📈', route:'/parent/progress' },
    { label:'Logros',        icon:'🏆', route:'/parent/achievements' },
    { label:'Mensajes',      icon:'💬', route:'/parent/messages', badge:2 },
    { label:'Calendario',    icon:'📅', route:'/parent/calendar' },
    { label:'Asistente IA',  icon:'🤖', route:'/parent/ai-assistant', badge:'✨' },
  ];

  messages: ChatMessage[] = [{
    role: 'assistant',
    content: '¡Hola! Soy tu Coach Familiar IA de ByteKids 💙\n\nEstoy aquí para ayudarte a:\n• Entender qué está aprendiendo tu hijo/a\n• Motivar el aprendizaje en casa\n• Interpretar su progreso y logros\n• Comunicarte mejor con sus maestros\n• Sugerir actividades para reforzar en casa\n\n¿En qué te puedo ayudar hoy?',
    timestamp: new Date()
  }];

  userInput = ''; isLoading = false; shouldScroll = false;

  quickPrompts = [
    '💙 ¿Cómo puedo motivar a mi hijo a programar?',
    '📊 ¿Qué significa el progreso del 78%?',
    '🏠 Actividades de programación para hacer en casa',
    '🤔 ¿Qué es Python y para qué sirve?',
    '📱 ¿Roblox Studio es educativo?',
    '💬 ¿Cómo hablar con el maestro sobre el progreso?',
  ];

  constructor(private aiService: AiTutorService) {}
  ngAfterViewChecked() { if(this.shouldScroll){try{this.chatEnd.nativeElement.scrollIntoView({behavior:'smooth'});}catch{}this.shouldScroll=false;} }

  async send(text?: string) {
    const msg = (text || this.userInput).trim();
    if (!msg || this.isLoading) return;
    this.messages.push({role:'user', content:msg, timestamp:new Date()});
    this.userInput=''; this.isLoading=true; this.shouldScroll=true;
    try {
      const reply = await this.aiService.sendMessage(this.messages.slice(0,-1), 'parent', msg);
      this.messages.push({role:'assistant', content:reply, timestamp:new Date()});
    } catch { this.messages.push({role:'assistant', content:'Error al conectar. Intenta de nuevo.', timestamp:new Date()}); }
    this.isLoading=false; this.shouldScroll=true;
  }
  onKeydown(e: KeyboardEvent) { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();this.send();} }
  formatMessage(c: string) { return c.replace(/```[\s\S]*?```/g,'<pre class="code-block"><code>...</code></pre>').replace(/`([^`]+)`/g,'<code class="inline-code">$1</code>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>'); }
  clearChat() { this.messages = [this.messages[0]]; }
}
