import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShellComponent } from '../../../shared/shell/shell.component';
import { STUDENT_NAV } from '../shared/student-nav';
import { MessageApiService } from '../../../services/api/message-api.service';
import { AuthService } from '../../../services/auth.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface Contacto {
  id: string;
  displayName: string;
  initials: string;
  role: string;
  motivo: string;
}

interface Conversacion {
  id: string;
  nombre: string;
  motivo: string;
  iniciales: string;
  ultimo: string;
  hora: string;
  sinLeer: number;
}

/**
 * Los mensajes del alumno con sus maestros.
 *
 * El chat del aula solo existe mientras la clase está en vivo y se borra del
 * día siguiente. Esto es lo otro: una duda a las nueve de la noche que el
 * maestro contesta cuando puede.
 *
 * A quién puede escribirle NO lo decide esta pantalla: lo decide el backend
 * en MessageService.contactosPermitidos(), que es la misma regla que valida
 * el envío. Aquí solo se pinta lo que esa lista devuelva.
 */
@Component({
  selector: 'app-student-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, ShellComponent],
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.scss'],
})
export class StudentMessagesComponent implements OnInit, AfterViewChecked {
  @ViewChild('finHilo') finHilo!: ElementRef;

  navItems = STUDENT_NAV;

  yo: any = null;
  contactos: Contacto[] = [];
  conversaciones: Conversacion[] = [];
  hilo: any[] = [];
  seleccionado: string | null = null;

  borrador = '';
  cargando = true;
  enviando = false;
  error = '';

  private recibidos: any[] = [];
  private enviados: any[] = [];
  private bajar = false;

  get miNombre(): string { return this.yo?.displayName || 'Alumno'; }
  get misIniciales(): string { return this.yo?.initials || 'A'; }
  get sinLeerTotal(): number {
    return this.conversaciones.reduce((s, c) => s + c.sinLeer, 0);
  }
  get actual(): Conversacion | null {
    return this.conversaciones.find(c => c.id === this.seleccionado) ?? null;
  }

  /** Los que todavía no tienen conversación: son los que puede estrenar. */
  get contactosNuevos(): Contacto[] {
    const conConversacion = new Set(this.conversaciones.map(c => c.id));
    return this.contactos.filter(c => !conConversacion.has(c.id));
  }

  constructor(
    private messageApi: MessageApiService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.yo = this.auth.getUser();
    forkJoin({
      contactos: this.messageApi.getContactos().pipe(catchError(() => of([]))),
      inbox:     this.messageApi.getInbox().pipe(catchError(() => of([]))),
      sent:      this.messageApi.getSent().pipe(catchError(() => of([]))),
    }).subscribe(({ contactos, inbox, sent }) => {
      this.contactos = contactos as Contacto[];
      this.recibidos = inbox;
      this.enviados  = sent;
      this.armarConversaciones();
      this.cargando = false;
      if (this.conversaciones.length) this.abrir(this.conversaciones[0].id);
    });
  }

  ngAfterViewChecked(): void {
    if (this.bajar && this.finHilo) {
      this.finHilo.nativeElement.scrollIntoView({ behavior: 'smooth' });
      this.bajar = false;
    }
  }

  private armarConversaciones(): void {
    // userId → el mensaje más reciente con esa persona.
    const ultimo = new Map<string, any>();

    for (const m of this.recibidos) {
      const id = this.idRemitente(m);
      if (!id) continue;
      const prev = ultimo.get(id);
      if (!prev || new Date(m.createdAt) > new Date(prev.createdAt)) {
        ultimo.set(id, { ...m, _lado: 'recibido' });
      }
    }
    for (const m of this.enviados) {
      const id = this.idDestinatario(m);
      if (!id) continue;
      const prev = ultimo.get(id);
      if (!prev || new Date(m.createdAt) > new Date(prev.createdAt)) {
        ultimo.set(id, { ...m, _lado: 'enviado' });
      }
    }

    this.conversaciones = Array.from(ultimo.entries()).map(([id, m]) => {
      const enviado = m._lado === 'enviado';
      const contacto = this.contactos.find(c => c.id === id);
      const nombre = contacto?.displayName
        ?? (enviado ? this.nombreDestinatario(m) : this.nombreRemitente(m));
      return {
        id,
        nombre,
        // El motivo viene de contactos. Si el contacto ya no está --un maestro
        // que dejó el salón-- la conversación se sigue viendo, pero sin
        // etiqueta: el historial no se le esconde al niño.
        motivo: contacto?.motivo ?? '',
        iniciales: this.aIniciales(nombre, contacto?.initials),
        ultimo: (m.body ?? '').substring(0, 60),
        hora: this.hora(m.createdAt),
        sinLeer: this.recibidos.filter(x => this.idRemitente(x) === id && !x.isRead).length,
      };
    }).sort((a, b) => b.sinLeer - a.sinLeer || a.nombre.localeCompare(b.nombre));
  }

  /** Empieza una conversación con alguien que todavía no le ha escrito. */
  escribirle(c: Contacto): void {
    if (!this.conversaciones.some(x => x.id === c.id)) {
      this.conversaciones = [{
        id: c.id,
        nombre: c.displayName,
        motivo: c.motivo,
        iniciales: this.aIniciales(c.displayName, c.initials),
        ultimo: '',
        hora: '',
        sinLeer: 0,
      }, ...this.conversaciones];
    }
    this.abrir(c.id);
  }

  abrir(id: string): void {
    this.seleccionado = id;
    this.error = '';
    this.armarHilo(id);

    this.recibidos
      .filter(m => this.idRemitente(m) === id && !m.isRead)
      .forEach(m => {
        m.isRead = true;
        this.messageApi.markAsRead(m.id).pipe(catchError(() => of(void 0))).subscribe();
      });
    const conv = this.conversaciones.find(c => c.id === id);
    if (conv) conv.sinLeer = 0;
    this.bajar = true;
  }

  private armarHilo(id: string): void {
    const suyos = this.recibidos
      .filter(m => this.idRemitente(m) === id)
      .map(m => ({ mio: false, texto: m.body ?? '', hora: this.hora(m.createdAt), ts: +new Date(m.createdAt) }));
    const mios = this.enviados
      .filter(m => this.idDestinatario(m) === id)
      .map(m => ({ mio: true, texto: m.body ?? '', hora: this.hora(m.createdAt), ts: +new Date(m.createdAt) }));
    this.hilo = [...suyos, ...mios].sort((a, b) => a.ts - b.ts);
    this.bajar = true;
  }

  enviar(): void {
    const texto = this.borrador.trim();
    if (!texto || !this.seleccionado || this.enviando) return;
    this.enviando = true;
    this.error = '';

    this.messageApi.send({ recipientId: this.seleccionado, body: texto })
      .pipe(catchError(() => of(null)))
      .subscribe(res => {
        this.enviando = false;
        if (!res) {
          this.error = 'No se pudo enviar. Revisa tu conexión e inténtalo otra vez.';
          return;
        }
        this.enviados.push({
          ...res,
          recipientId: this.seleccionado,
          body: texto,
          createdAt: new Date().toISOString(),
        });
        this.hilo = [...this.hilo, { mio: true, texto, hora: 'Ahora', ts: Date.now() }];
        const conv = this.actual;
        if (conv) { conv.ultimo = texto; conv.hora = 'Ahora'; }
        this.borrador = '';
        this.bajar = true;
      });
  }

  alTeclear(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.enviar(); }
  }

  // ── Los mensajes llegan planos o anidados según el endpoint ──────────────
  private idRemitente(m: any): string    { return m.senderId    || m.sender?.id    || ''; }
  private idDestinatario(m: any): string { return m.recipientId || m.recipient?.id || ''; }
  private nombreRemitente(m: any): string {
    return m.senderName || m.sender?.displayName || 'Tu maestro';
  }
  private nombreDestinatario(m: any): string {
    return m.recipientName || m.recipient?.displayName || 'Tu maestro';
  }

  private aIniciales(nombre: string, dadas?: string): string {
    if (dadas) return dadas.toUpperCase();
    return (nombre || '?').split(' ').filter(Boolean)
      .map(p => p[0]).join('').slice(0, 2).toUpperCase();
  }

  private hora(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    const hoy = new Date();
    const mismoDia = d.toDateString() === hoy.toDateString();
    return mismoDia
      ? d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  }
}
