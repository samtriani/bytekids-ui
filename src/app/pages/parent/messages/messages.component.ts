import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { MessageApiService } from '../../../services/api/message-api.service';
import { AuthService } from '../../../services/auth.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

const NAV: NavItem[] = [
  {label:'Mi Panel',      icon:'🏠', route:'/parent'},
  {label:'Mis Hijos',     icon:'👦', route:'/parent/children'},
  {label:'Progreso',      icon:'📈', route:'/parent/progress'},
  {label:'Logros',        icon:'🏆', route:'/parent/achievements'},
  {label:'Mensajes',      icon:'💬', route:'/parent/messages'},
  {label:'Calendario',    icon:'📅', route:'/parent/calendar'},
  {label:'Asistente IA',  icon:'🤖', route:'/parent/ai-assistant', badge:'IA'},
];

@Component({
  selector: 'app-parent-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ShellComponent],
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.scss']
})
export class MessagesComponent implements OnInit {
  navItems = NAV;
  parentName = '';
  parentInitials = '';
  loading = true;
  conversations: any[] = [];
  selectedConvId: string | null = null;
  messages: any[] = [];
  newMsg = '';
  sending = false;

  get sel(): any { return this.conversations.find(c => c.id === this.selectedConvId) ?? null; }
  get totalUnread(): number { return this.conversations.reduce((acc, c) => acc + (c.unread ?? 0), 0); }

  constructor(
    private messageApi: MessageApiService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.auth.getUser();
    this.parentName    = user?.displayName || 'Padre/Madre';
    this.parentInitials = user?.initials   || 'P';
    const myId = user?.userId ?? '';

    forkJoin({
      inbox: this.messageApi.getInbox().pipe(catchError(() => of([]))),
      sent:  this.messageApi.getSent().pipe(catchError(() => of([]))),
    }).subscribe(({ inbox, sent }) => {
      const convMap = new Map<string, any>();
      const allMsgs = [...(inbox as any[]), ...(sent as any[])];

      for (const m of allMsgs) {
        const isFromMe = (m.sender?.id ?? m.senderId) === myId;
        const other    = isFromMe ? m.recipient : m.sender;
        const otherId  = other?.id ?? other?.userId;
        if (!otherId) continue;

        if (!convMap.has(otherId)) {
          const av = other.initials ||
            (other.displayName || '?').split(' ').map((w: string) => w[0] || '').join('').slice(0, 2).toUpperCase();
          convMap.set(otherId, {
            id:       otherId,
            name:     other.displayName || 'Contacto',
            av,
            role:     other.role === 'teacher' ? 'Maestro/a' : other.role || '',
            lastMsg:  '',
            lastTime: '',
            unread:   0,
            rawMsgs:  [],
          });
        }
        const conv = convMap.get(otherId)!;
        conv.rawMsgs.push({ ...m, isFromMe });
        if (!m.readAt && !isFromMe) conv.unread++;
      }

      // Sort each conversation's messages by date and set lastMsg
      this.conversations = Array.from(convMap.values()).map(c => {
        c.rawMsgs.sort((a: any, b: any) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const last = c.rawMsgs[c.rawMsgs.length - 1];
        c.lastMsg  = last?.body?.slice(0, 55) ?? '';
        c.lastTime = last?.createdAt
          ? new Date(last.createdAt).toLocaleDateString('es-MX', {day:'numeric', month:'short'})
          : '';
        return c;
      }).sort((a, b) => {
        const ta = a.rawMsgs[a.rawMsgs.length - 1]?.createdAt ?? '';
        const tb = b.rawMsgs[b.rawMsgs.length - 1]?.createdAt ?? '';
        return ta < tb ? 1 : -1;
      });

      if (this.conversations.length) this.selectConv(this.conversations[0].id);
      this.loading = false;
    });
  }

  selectConv(id: string): void {
    this.selectedConvId = id;
    const conv = this.conversations.find(c => c.id === id);
    if (!conv) return;
    conv.unread = 0;
    this.messages = conv.rawMsgs.map((m: any) => ({
      from: m.isFromMe ? 'me' : 'other',
      text: m.body ?? '',
      time: m.createdAt
        ? new Date(m.createdAt).toLocaleTimeString('es-MX', {hour:'2-digit', minute:'2-digit'})
        : '',
    }));
    conv.rawMsgs.filter((m: any) => !m.readAt && !m.isFromMe)
      .forEach((m: any) => this.messageApi.markAsRead(m.id).pipe(catchError(() => of(null))).subscribe());
  }

  send(): void {
    if (!this.newMsg.trim() || !this.selectedConvId || this.sending) return;
    const text = this.newMsg.trim();
    this.newMsg = '';
    this.sending = true;
    this.messageApi.send({ recipientId: this.selectedConvId, body: text })
      .pipe(catchError(() => of(null)))
      .subscribe(msg => {
        this.messages = [...this.messages, { from: 'me', text, time: 'Ahora' }];
        const conv = this.conversations.find(c => c.id === this.selectedConvId);
        if (conv) { conv.lastMsg = text; conv.lastTime = 'Ahora'; }
        this.sending = false;
      });
  }

  onKey(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
  }
}
