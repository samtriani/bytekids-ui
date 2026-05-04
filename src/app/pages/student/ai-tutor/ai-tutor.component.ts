import { Component, ViewChild, ElementRef, AfterViewChecked, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { AiTutorService, ChatMessage } from '../../../services/ai-tutor.service';
import { MissionStateService } from '../../../services/mission-state.service';

@Component({
  selector: 'app-ai-tutor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ShellComponent],
  templateUrl: './ai-tutor.component.html',
  styleUrls: ['./ai-tutor.component.scss']
})
export class AiTutorComponent implements AfterViewChecked, OnInit {
  @ViewChild('chatEnd') chatEnd!: ElementRef;
  @ViewChild('inputRef') inputRef!: ElementRef;

  navItems: NavItem[] = [
    { label: 'Mi Dashboard',  icon: '🏠', route: '/student' },
    { label: 'Mis Misiones',  icon: '🎯', route: '/student/missions', badge: 3 },
    { label: 'Mi Progreso',   icon: '📈', route: '/student/progress' },
    { label: 'Logros',        icon: '🏆', route: '/student/achievements' },
    { label: 'Tutor IA',      icon: '🤖', route: '/student/ai-tutor', badge: '✨' },
    { label: 'Proyectos',     icon: '💻', route: '/student/projects' },
    { label: 'Roblox Studio', icon: '🎮', route: '/student/roblox' },
    { label: 'Comunidad',     icon: '👥', route: '/student/community' },
  ];

  messages: ChatMessage[] = [
    {
      role: 'assistant',
      content: '¡Hola! Soy ByteBot, tu tutor de IA de ByteKids Academy 🤖✨\n\n¿En qué te puedo ayudar hoy? Puedo explicarte Python, Scratch, HTML, Robótica, Roblox Studio, o cualquier materia escolar que necesites.\n\n¡No hay preguntas tontas! Todos somos estudiantes. 🚀',
      timestamp: new Date()
    }
  ];

  userInput = '';
  isLoading = false;
  shouldScroll = false;

  // Mission context
  activeMission: { title: string; subject: string; xp: number } | null = null;
  missionCompleted = false;
  showXpToast = false;
  exchangeCount = 0;

  // Workspace
  userCode = '';
  codeOutput = '';
  outputError = false;

  private exercises: Record<string, { instructions: string; starter: string; solution: string; successOutput: string }> = {
    'Variables y Datos': {
      instructions: '📋 Crea 3 variables: tu nombre, tu edad y tu materia favorita. Luego imprime cada una con print().',
      starter: '# Escribe tu código aquí\nnombre = ""\nedad = 0\nmateria = ""\n\nprint(nombre)\nprint(edad)\nprint(materia)',
      solution: 'nombre',
      successOutput: 'Axel\n10\nPython'
    },
    'Condicionales IF/ELSE': {
      instructions: '📋 Crea una variable "puntos" con el valor 850. Si es mayor a 800 imprime "¡Nivel Experto!", si no imprime "¡Sigue practicando!".',
      starter: '# Escribe tu código aquí\npuntos = 0\n\nif puntos > 800:\n    print("")\nelse:\n    print("")',
      solution: 'if',
      successOutput: '¡Nivel Experto!'
    },
    'Bucles For': {
      instructions: '📋 Usa un bucle for para imprimir los números del 1 al 5, cada uno en una línea.',
      starter: '# Escribe tu código aquí\nfor i in range():\n    print()',
      solution: 'range',
      successOutput: '1\n2\n3\n4\n5'
    },
    'Mi Primera Web': {
      instructions: '📋 Escribe el HTML básico de una página con un título <h1> que diga tu nombre y un párrafo <p> con tu descripción.',
      starter: '<!-- Escribe tu HTML aquí -->\n<h1></h1>\n<p></p>',
      solution: '<h1>',
      successOutput: '✅ HTML válido — tu página tiene título y párrafo'
    },
    'Estilos CSS': {
      instructions: '📋 Escribe CSS para que el h1 tenga color rojo y tamaño de fuente 32px.',
      starter: '/* Escribe tu CSS aquí */\nh1 {\n  color: ;\n  font-size: ;\n}',
      solution: 'color',
      successOutput: '✅ CSS aplicado — h1 con color y tamaño definidos'
    },
    'Controla el LED': {
      instructions: '📋 Escribe el código Arduino para hacer parpadear un LED en el pin 13 cada 500ms.',
      starter: 'int ledPin = 13;\n\nvoid setup() {\n  pinMode(ledPin, );\n}\n\nvoid loop() {\n  digitalWrite(ledPin, HIGH);\n  delay();\n  digitalWrite(ledPin, LOW);\n  delay();\n}',
      solution: 'OUTPUT',
      successOutput: '✅ LED parpadeando en pin 13 cada 500ms'
    },
    'Construye tu ciudad': {
      instructions: '📋 Escribe el código Lua para crear una Part (bloque) en Roblox con tamaño 4x1x4 y color rojo.',
      starter: '-- Escribe tu Lua aquí\nlocal parte = Instance.new("")\nparte.Size = Vector3.new()\nparte.BrickColor = BrickColor.new("")\nparte.Parent = workspace',
      solution: 'Part',
      successOutput: '✅ Part creada — 4x1x4, color rojo, en workspace'
    },
    'Juego de Plataformas': {
      instructions: '📋 En Scratch, describe los 3 bloques necesarios para que un sprite salte al presionar la tecla espacio.',
      starter: '// Describe los bloques en orden:\n// 1. Cuando [    ] presionada\n// 2. cambiar y por [    ]\n// 3. esperar [    ] segundos\n// 4. cambiar y por [    ]',
      solution: 'espacio',
      successOutput: '✅ ¡Correcto! Tu sprite salta al presionar espacio'
    },
  };

  get exercise() {
    return this.activeMission ? (this.exercises[this.activeMission.title] ?? null) : null;
  }

  initCode() {
    if (this.exercise && !this.userCode) {
      this.userCode = this.exercise.starter;
    }
  }

  runCode() {
    if (!this.exercise || !this.userCode.trim()) return;
    const hasContent = this.userCode !== this.exercise.starter &&
      this.userCode.replace(/\s/g,'') !== this.exercise.starter.replace(/\s/g,'');
    const hasSolution = this.userCode.includes(this.exercise.solution);

    if (!hasContent || !hasSolution) {
      this.codeOutput = '⚠️ Aún faltan partes por completar. Revisa el ejercicio e intenta de nuevo.';
      this.outputError = true;
    } else {
      this.codeOutput = this.exercise.successOutput;
      this.outputError = false;
    }
  }

  quickQuestions = [
    '¿Qué es una variable en Python? 🐍',
    '¿Cómo hago un bucle for? 🔄',
    '¿Cómo inicio en Roblox Studio? 🎮',
    '¿Qué es HTML? 🌐',
    'Ayúdame con mi tarea de Scratch 🧩',
    '¿Cómo programo un Arduino? 🤖',
  ];

  constructor(
    private aiService: AiTutorService,
    private missionState: MissionStateService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    const q = this.route.snapshot.queryParamMap.get('q');
    if (q) {
      this.parseMissionContext(q);
      setTimeout(() => this.send(q), 400);
    }
  }

  private parseMissionContext(q: string) {
    // Detecta si viene de una misión por el patrón del texto generado en missions.component
    const match = q.match(/misión[:\s]+"([^"]+)"\s+de\s+([^.]+)/i);
    if (match) {
      const title = match[1];
      this.activeMission = { title, subject: match[2].trim(), xp: this.getXpForMission(title) };
      this.missionState.start(title);
      const saved = this.missionState.get(title);
      if (saved?.status === 'Completado') this.missionCompleted = true;
      setTimeout(() => this.initCode(), 0);
    }
  }

  private getXpForMission(title: string): number {
    const map: Record<string, number> = {
      'Variables y Datos': 50, 'Condicionales IF/ELSE': 75, 'Bucles For': 100,
      'Mi Primera Web': 75, 'Estilos CSS': 80, 'Juego de Plataformas': 120,
      'Controla el LED': 100, 'Construye tu ciudad': 200,
    };
    return map[title] ?? 75;
  }

  completeMission() {
    if (!this.activeMission || this.missionCompleted) return;
    this.missionState.complete(this.activeMission.title);
    this.missionCompleted = true;
    this.showXpToast = true;
    this.messages.push({
      role: 'assistant',
      content: `🎉 ¡**Felicitaciones!** Completaste la misión **"${this.activeMission.title}"**.\n\n¡Ganaste **+${this.activeMission.xp} XP**! Sigue así — cada misión completada te acerca más a convertirte en un experto. 💪🏆`,
      timestamp: new Date()
    });
    this.shouldScroll = true;
    setTimeout(() => { this.showXpToast = false; }, 4000);
  }

  backToMissions() {
    this.router.navigate(['/student/missions']);
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  scrollToBottom() {
    try { this.chatEnd.nativeElement.scrollIntoView({ behavior: 'smooth' }); } catch {}
  }

  async send(text?: string) {
    const msg = (text || this.userInput).trim();
    if (!msg || this.isLoading) return;

    this.messages.push({ role: 'user', content: msg, timestamp: new Date() });
    this.userInput = '';
    this.isLoading = true;
    this.shouldScroll = true;

    try {
      const reply = await this.aiService.sendMessage(this.messages.slice(0, -1), 'student', msg);
      this.messages.push({ role: 'assistant', content: reply, timestamp: new Date() });
      this.exchangeCount++;
    } catch {
      this.messages.push({ role: 'assistant', content: '¡Ups! Algo salió mal. Inténtalo de nuevo 🔧', timestamp: new Date() });
    }
    this.isLoading = false;
    this.shouldScroll = true;
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); this.send(); }
  }

  clearChat() {
    this.messages = [this.messages[0]];
    this.exchangeCount = 0;
  }

  formatMessage(content: string): string {
    return content
      .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre class="code-block"><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }
}
