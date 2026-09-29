import {
  AfterViewChecked, Component, ElementRef, EventEmitter, HostListener, Input,
  OnChanges, Output, SimpleChanges, ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiTutorService, ChatMessage } from '../../services/ai-tutor.service';
import { formatearMensaje } from '../formato-chat';

interface Mensaje {
  rol: 'user' | 'assistant';
  /** Lo que ve el nino. */
  texto: string;
  /** Lo que se le manda al modelo. Solo difiere en el primer mensaje. */
  paraModelo: string;
  /** Ya escapado y formateado: se calcula una vez, no en cada ciclo. */
  html: string;
}

/**
 * ByteBot dentro de la actividad, en un panel lateral.
 *
 * Antes el boton "Pedir ayuda a ByteBot" navegaba a /student/ai-tutor: el
 * nino perdia la mision de vista, lo que llevaba escrito, y no sabia como
 * volver. Aqui la mision se queda detras --las instrucciones siguen a la
 * vista en escritorio-- y cerrar el panel lo devuelve exactamente donde iba.
 *
 * La conversacion se guarda por actividad durante la sesion: cerrar y volver
 * a abrir el panel no la borra.
 *
 * EL CONTEXTO DE LA ACTIVIDAD
 * Va pegado al PRIMER mensaje del nino, del lado del modelo, y no se le
 * muestra. Antes se mandaba solo un mensaje automatico con el titulo y la
 * descripcion que ademas gastaba un turno sin que el nino preguntara nada.
 * El contexto es corto a proposito: el backend corta cada mensaje en 4000
 * caracteres, y un contexto largo le cortaria la pregunta al nino.
 */
@Component({
  selector: 'app-bytebot-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bytebot-panel.component.html',
  styleUrls: ['./bytebot-panel.component.scss'],
})
export class ByteBotPanelComponent implements OnChanges, AfterViewChecked {
  @Input() abierto = false;
  /** Identifica la conversacion: alumno + actividad. */
  @Input() clave = '';
  @Input() titulo = '';
  @Input() materia = '';
  @Input() descripcion = '';
  @Input() nombreAlumno = '';
  @Output() cerrar = new EventEmitter<void>();

  @ViewChild('fin') fin?: ElementRef<HTMLElement>;
  @ViewChild('entrada') entrada?: ElementRef<HTMLTextAreaElement>;

  mensajes: Mensaje[] = [];
  texto = '';
  pensando = false;
  private bajar = false;
  private enfocar = false;

  readonly sugerencias = [
    '🤔 No entiendo qué tengo que hacer',
    '💡 Dame una pista, sin darme la respuesta',
    '🧒 Explícamelo con un ejemplo',
  ];

  constructor(private ai: AiTutorService) {}

  ngOnChanges(c: SimpleChanges): void {
    if (c['clave'] || c['titulo']) this.cargar();
    if (c['abierto'] && this.abierto) { this.bajar = true; this.enfocar = true; }
  }

  ngAfterViewChecked(): void {
    // Solo cuando algo lo pidio: este gancho corre en cada ciclo.
    if (this.bajar && this.fin) { this.fin.nativeElement.scrollIntoView({ block: 'end' }); this.bajar = false; }
    if (this.enfocar && this.entrada) { this.entrada.nativeElement.focus(); this.enfocar = false; }
  }

  @HostListener('document:keydown.escape')
  alEscape(): void { if (this.abierto) this.cerrar.emit(); }

  get primerNombre(): string { return (this.nombreAlumno || '').split(' ')[0]; }

  async enviar(textoForzado?: string): Promise<void> {
    const texto = (textoForzado ?? this.texto).trim();
    if (!texto || this.pensando) return;

    const esPrimero = !this.mensajes.some(m => m.rol === 'user');
    const contexto = `[Estoy en la actividad "${this.titulo}" de ${this.materia}. `
      + `${(this.descripcion || '').slice(0, 300)}]\n\n`;
    const paraModelo = esPrimero ? contexto + texto : texto;

    this.agregar('user', texto, paraModelo);
    this.texto = '';
    this.pensando = true;
    this.bajar = true;

    // El historial va con lo que vio el MODELO, no lo que vio el nino: asi en
    // cada turno sigue sabiendo de que actividad se habla.
    const historial: ChatMessage[] = this.mensajes.slice(0, -1).map(m => ({
      role: m.rol, content: m.paraModelo, timestamp: new Date(),
    }));
    const respuesta = await this.ai.sendMessage(historial, 'student', paraModelo);

    this.agregar('assistant', respuesta, respuesta);
    this.pensando = false;
    this.bajar = true;
    this.enfocar = true;
  }

  alTeclear(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.enviar(); }
  }

  reiniciar(): void {
    this.mensajes = [];
    this.guardar();
    this.saludar();
  }

  // ── Conversacion ──────────────────────────────────────────────────────

  private agregar(rol: 'user' | 'assistant', texto: string, paraModelo: string): void {
    this.mensajes.push({ rol, texto, paraModelo, html: formatearMensaje(texto) });
    this.guardar();
  }

  /** El saludo es local: no gasta un turno del modelo. */
  private saludar(): void {
    const nombre = this.primerNombre ? `, ${this.primerNombre}` : '';
    this.mensajes = [{
      rol: 'assistant',
      texto: `¡Hola${nombre}! 👋 Aquí estoy para ayudarte con «${this.titulo}».\n\n`
           + `Cuéntame en qué parte vas o qué no entiendes. Te doy pistas para que tú lo descubras. 🚀`,
      paraModelo: `Hola, soy ByteBot. Voy a ayudarte con la actividad "${this.titulo}".`,
      html: '',
    }];
    this.mensajes[0].html = formatearMensaje(this.mensajes[0].texto);
  }

  private cargar(): void {
    this.mensajes = [];
    if (this.clave) {
      try {
        const guardados = JSON.parse(sessionStorage.getItem('bk_bytebot_' + this.clave) || '[]');
        if (Array.isArray(guardados) && guardados.length) {
          // El html se recalcula: lo guardado es texto, nunca HTML.
          this.mensajes = guardados.map((m: any) => ({
            rol: m.rol === 'user' ? 'user' : 'assistant',
            texto: String(m.texto ?? ''), paraModelo: String(m.paraModelo ?? m.texto ?? ''),
            html: formatearMensaje(String(m.texto ?? '')),
          }));
        }
      } catch { /* conversacion ilegible: se empieza de nuevo */ }
    }
    if (!this.mensajes.length) this.saludar();
  }

  private guardar(): void {
    if (!this.clave) return;
    try {
      sessionStorage.setItem('bk_bytebot_' + this.clave, JSON.stringify(
        this.mensajes.map(m => ({ rol: m.rol, texto: m.texto, paraModelo: m.paraModelo }))));
    } catch { /* sin espacio: la conversacion sigue en pantalla */ }
  }
}
