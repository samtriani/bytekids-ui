import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { RolePipe } from '../../../shared/pipes/role.pipe';
import { MessageApiService } from '../../../services/api/message-api.service';
import { AuthService } from '../../../services/auth.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

const NAV: NavItem[] = [
  {label:'Mi Panel',        icon:'🏠', route:'/teacher'},
  {label:'Mis Salones',     icon:'🏫', route:'/teacher/classrooms'},
  {label:'Alumnos',         icon:'👨‍🎓', route:'/teacher/students'},
  {label:'Crear Contenido', icon:'📝', route:'/teacher/create'},
  {label:'Asistente IA',    icon:'🤖', route:'/teacher/ai-assistant', badge:'IA'},
  {label:'Reportes',        icon:'📊', route:'/teacher/reports'},
  {label:'Calendario',      icon:'📅', route:'/teacher/calendar'},
  {label:'Mensajes',        icon:'💬', route:'/teacher/messages'},
];

@Component({
  selector: 'app-teacher-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ShellComponent, RolePipe],
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.scss']
})
export class MessagesComponent implements OnInit, AfterViewChecked {
  @ViewChild('msgBottom') msgBottom!: ElementRef;
  navItems = NAV;

  teacher: any = null;
  conversations: any[] = [];
  selectedId: string | null = null;
  messages: any[] = [];
  newMsg = '';
  loading = true;
  sending = false;
  private shouldScroll = false;

  private inboxRaw: any[] = [];
  private sentRaw: any[] = [];

  get teacherName(): string { return this.teacher?.displayName || 'Maestro'; }
  get teacherInitials(): string { return this.teacher?.initials || 'M'; }
  get totalUnread(): number { return this.conversations.reduce((s, c) => s + c.unread, 0); }
  get selected(): any { return this.conversations.find(c => c.id === this.selectedId) ?? null; }

  constructor(private messageApi: MessageApiService, private auth: AuthService) {}

  ngOnInit(): void {
    this.teacher = this.auth.getUser();
    forkJoin({
      inbox: this.messageApi.getInbox().pipe(catchError(() => of([]))),
      sent:  this.messageApi.getSent().pipe(catchError(() => of([])))
    }).subscribe(({ inbox, sent }) => {
      this.inboxRaw = inbox;
      this.sentRaw  = sent;
      this.buildConversations();
      this.loading = false;
      if (this.conversations.length) this.select(this.conversations[0].id);
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.msgBottom) {
      this.msgBottom.nativeElement.scrollIntoView({ behavior: 'smooth' });
      this.shouldScroll = false;
    }
  }

  private buildConversations(): void {
    // Mapa userId → mensaje más reciente con esa persona
    const map = new Map<string, any>();

    for (const msg of this.inboxRaw) {
      const uid = this.senderId(msg);
      if (!uid) continue;
      const prev = map.get(uid);
      if (!prev || new Date(msg.createdAt) > new Date(prev.createdAt)) {
        map.set(uid, { ...msg, _side: 'inbox' });
      }
    }
    for (const msg of this.sentRaw) {
      const uid = this.recipientId(msg);
      if (!uid) continue;
      if (!map.has(uid)) map.set(uid, { ...msg, _side: 'sent' });
    }

    this.conversations = Array.from(map.entries()).map(([userId, msg]) => {
      const isSent = msg._side === 'sent';
      const name    = isSent ? this.recipientName(msg)    : this.senderName(msg);
      const role    = isSent ? this.recipientRole(msg)    : this.senderRole(msg);
      const initials = this.toInitials(name, isSent ? this.recipientInitials(msg) : this.senderInitials(msg));
      const unread  = this.inboxRaw.filter(m => this.senderId(m) === userId && !m.isRead).length;
      return {
        id: userId, name, role, av: initials,
        lastMsg: (msg.body ?? msg.content ?? '').substring(0, 60),
        time: this.fmtTime(msg.createdAt),
        unread,
      };
    }).sort((a, b) => b.unread - a.unread);
  }

  select(id: string): void {
    this.selectedId = id;
    this.buildThread(id);
    // Marcar como leídos
    this.inboxRaw
      .filter(m => this.senderId(m) === id && !m.isRead)
      .forEach(m => this.messageApi.markAsRead(m.id || m._id).subscribe());
    const conv = this.conversations.find(c => c.id === id);
    if (conv) conv.unread = 0;
    this.shouldScroll = true;
  }

  private buildThread(userId: string): void {
    const received = this.inboxRaw
      .filter(m => this.senderId(m) === userId)
      .map(m => ({ from: 'other', text: m.body ?? m.content ?? '', time: this.fmtTime(m.createdAt), ts: new Date(m.createdAt).getTime() }));
    const sent = this.sentRaw
      .filter(m => this.recipientId(m) === userId)
      .map(m => ({ from: 'me', text: m.body ?? m.content ?? '', time: this.fmtTime(m.createdAt), ts: new Date(m.createdAt).getTime() }));
    this.messages = [...received, ...sent].sort((a, b) => a.ts - b.ts);
    this.shouldScroll = true;
  }

  send(): void {
    if (!this.newMsg.trim() || !this.selectedId || this.sending) return;
    const body = this.newMsg.trim();
    this.sending = true;
    this.messageApi.send({ recipientId: this.selectedId, body }).subscribe({
      next: sent => {
        this.sentRaw.push({ ...(sent ?? {}), recipientId: this.selectedId, body, createdAt: new Date().toISOString() });
        this.messages = [...this.messages, { from: 'me', text: body, time: 'Ahora', ts: Date.now() }];
        if (this.selected) this.selected.lastMsg = body;
        this.newMsg = '';
        this.sending = false;
        this.shouldScroll = true;
      },
      error: () => { this.sending = false; }
    });
  }

  onKey(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
  }

  // ── helpers de campos (API plana o anidada) ──────────────────────────
  private senderId(m: any): string    { return m.senderId    || m.sender?.id    || ''; }
  private senderName(m: any): string  { return m.senderName  || m.sender?.displayName || m.sender?.username || 'Usuario'; }
  private senderRole(m: any): string  { return m.senderRole  || m.sender?.role  || ''; }
  private senderInitials(m: any): string { return m.senderInitials || m.sender?.initials || ''; }

  private recipientId(m: any): string   { return m.recipientId   || m.recipient?.id   || ''; }
  private recipientName(m: any): string { return m.recipientName || m.recipient?.displayName || m.recipient?.username || 'Usuario'; }
  private recipientRole(m: any): string { return m.recipientRole || m.recipient?.role || ''; }
  private recipientInitials(m: any): string { return m.recipientInitials || m.recipient?.initials || ''; }

  private toInitials(name: string, hint: string): string {
    if (hint) return hint.slice(0, 2).toUpperCase();
    return (name || '?').split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
  }

  private fmtTime(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days === 0) return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return 'Ayer';
    if (days < 7)  return d.toLocaleDateString('es-MX', { weekday: 'short' });
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  }
}
