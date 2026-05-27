import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionApiService } from '../../../services/api/session-api.service';
import { SubmissionApiService } from '../../../services/api/submission-api.service';
import { AiTutorService, ChatMessage } from '../../../services/ai-tutor.service';
import { AuthService } from '../../../services/auth.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-student-classroom',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './classroom.component.html',
  styleUrls: ['./classroom.component.scss'],
})
export class StudentClassroomComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('chatEnd') chatEnd!: ElementRef;

  scheduleId   = '';
  session: any = null;
  loading      = true;
  joining      = false;
  error        = '';

  attendance:       any[]  = [];
  activeMission:    any   = null;
  mySubmission:     any   = null;
  activeTab:          'chat' | 'bot' | 'video' = 'chat';
  teacherVideoActive  = false;
  jitsiApi:   any = null;
  chatMessages:  any[] = [];
  chatMsg        = '';
  sendingChat    = false;
  private lastMsgTime: string | undefined;
  private seenMsgIds  = new Set<string>();
  messages:      ChatMessage[] = [];
  chatInput     = '';
  botTyping     = false;
  scrollNeeded  = false;

  timeRemaining   = '—';
  secondsLeft     = 0;
  totalSeconds    = 0;
  progressPct     = 100;

  private timerRef:      any;
  private attendanceRef: any;

  get studentName():     string { return this.auth.getUser()?.displayName || 'Alumno'; }
  get studentInitials(): string { return this.auth.getUser()?.initials    || 'A'; }

  get classmates(): any[] { return this.attendance.filter(a => a.role === 'student'); }
  get teacherOnline(): boolean { return this.attendance.some(a => a.role === 'teacher'); }
  get subjectColor(): string {
    const colors: Record<string, string> = {
      'Python':'#06B6D4','HTML':'#7C3AED','Scratch':'#2563EB',
      'Robótica':'#F59E0B','Roblox':'#10B981','Ciencias':'#059669',
      'Matemáticas':'#EC4899','Arte':'#8B5CF6',
    };
    const name = this.session?.subjectName ?? '';
    return Object.entries(colors).find(([k]) => name.includes(k))?.[1] ?? '#7A1535';
  }

  constructor(
    private route:         ActivatedRoute,
    private router:        Router,
    private sessionApi:    SessionApiService,
    private submissionApi: SubmissionApiService,
    private aiService:     AiTutorService,
    public  auth:          AuthService,
  ) {}

  ngOnInit() {
    this.scheduleId = this.route.snapshot.paramMap.get('scheduleId') ?? '';
    this.loadSession();
  }

  private loadSession() {
    this.sessionApi.getStatus(this.scheduleId).pipe(catchError(() => of(null))).subscribe(data => {
      if (!data) { this.error = 'No se pudo cargar la clase.'; this.loading = false; return; }
      this.session = data;
      this.loading = false;

      if (!data.active) { this.error = 'inactive'; return; }

      this.joining = true;
      this.sessionApi.join(this.scheduleId).pipe(catchError(() => of(null))).subscribe(() => {
        this.joining  = false;
        this.initTimer(data);
        this.initBot(data);
        this.pollAll();
        this.attendanceRef = setInterval(() => this.pollAll(), 8000);
      });
    });
  }

  private initTimer(data: any) {
    this.secondsLeft  = data.secondsLeft ?? 0;
    const [sh, sm]    = (data.startTime ?? '00:00').split(':').map(Number);
    const [eh, em]    = (data.endTime   ?? '00:00').split(':').map(Number);
    this.totalSeconds = Math.max(1, (eh * 3600 + em * 60) - (sh * 3600 + sm * 60));

    this.updateTimer();
    this.timerRef = setInterval(() => {
      if (this.secondsLeft > 0) { this.secondsLeft--; this.updateTimer(); }
      else { this.onClassEnded(); }
    }, 1000);
  }

  private updateTimer() {
    const h = Math.floor(this.secondsLeft / 3600);
    const m = Math.floor((this.secondsLeft % 3600) / 60);
    const s = this.secondsLeft % 60;
    this.timeRemaining = h > 0
      ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
      : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    this.progressPct = Math.round((this.secondsLeft / this.totalSeconds) * 100);
  }

  private initBot(data: any) {
    const name    = this.studentName;
    const subject = data.subjectName ?? 'la materia';
    const teacher = data.teacherName ?? 'tu maestro';
    const classroom = data.classroomName ?? 'tu salón';

    this.messages = [{
      role: 'assistant',
      content: `¡Hola ${name}! 👋 Bienvenido al aula virtual.\n\nEstoy aquí para apoyarte durante la clase de **${subject}** con ${teacher} (${classroom}).\n\n¿Tienes alguna duda sobre ${subject}? ¡Pregúntame lo que sea! 🚀`,
      timestamp: new Date(),
    }];
  }

  private addChatMessages(msgs: any[]) {
    const fresh = msgs.filter(m => !this.seenMsgIds.has(String(m.id)));
    if (!fresh.length) return;
    fresh.forEach(m => this.seenMsgIds.add(String(m.id)));
    this.chatMessages = [...this.chatMessages, ...fresh];
    this.lastMsgTime  = fresh[fresh.length - 1].sentAt;
    this.scrollNeeded = true;
  }

  sendChat() {
    const text = this.chatMsg.trim();
    if (!text || this.sendingChat) return;
    this.chatMsg     = '';
    this.sendingChat = true;
    this.sessionApi.sendChatMessage(this.scheduleId, text).pipe(catchError(() => of(null))).subscribe(msg => {
      if (msg) this.addChatMessages([msg]);
      this.sendingChat = false;
    });
  }

  get jitsiRoom(): string {
    const appId = 'vpaas-magic-cookie-7825138c95d24c7cb6f660d4a535d186';
    return `${appId}/ByteKids-${this.scheduleId.replace(/-/g, '')}`;
  }

  joinVideo() {
    this.activeTab = 'video';
    setTimeout(() => this.mountJitsi(), 300);
  }

  private mountJitsi() {
    const container = document.getElementById('jitsi-student');
    if (!container || this.jitsiApi) return;
    this.sessionApi.getJaasToken(this.scheduleId).pipe(catchError(() => of(null))).subscribe(jwt => {
      const load = () => {
        this.jitsiApi = new (window as any).JitsiMeetExternalAPI('8x8.vc', {
          roomName: this.jitsiRoom,
          parentNode: container,
          width: '100%', height: '100%',
          jwt,
          userInfo: { displayName: this.studentName },
          configOverwrite: { prejoinPageEnabled: false, disableDeepLinking: true },
          interfaceConfigOverwrite: { SHOW_JITSI_WATERMARK: false },
        });
      };
      const apiUrl = `https://8x8.vc/${this.jitsiRoom.split('/')[0]}/external_api.js`;
      if ((window as any).JitsiMeetExternalAPI) { load(); return; }
      const s = document.createElement('script');
      s.src = apiUrl;
      s.onload = load;
      document.body.appendChild(s);
    });
  }

  private destroyJitsi() {
    if (this.jitsiApi) { this.jitsiApi.dispose(); this.jitsiApi = null; }
  }

  private pollAll() {
    this.sessionApi.getAttendance(this.scheduleId).pipe(catchError(() => of({ participants: [], teacherVideoActive: false }))).subscribe(data => {
      this.attendance = data.participants ?? [];
      const wasActive = this.teacherVideoActive;
      this.teacherVideoActive = data.teacherVideoActive ?? false;
      // Notificar si el maestro acaba de iniciar la videollamada
      if (!wasActive && this.teacherVideoActive) {
        this.messages.push({ role: 'assistant', content: '📷 ¡El maestro inició la videollamada! Haz clic en la pestaña **Video** para unirte.', timestamp: new Date() });
        this.scrollNeeded = true;
      }
    });
    this.sessionApi.getChatMessages(this.scheduleId, this.lastMsgTime).pipe(catchError(() => of([]))).subscribe(msgs => {
      if (msgs.length) this.addChatMessages(msgs);
    });
    this.sessionApi.getMission(this.scheduleId).pipe(catchError(() => of(null))).subscribe(m => {
      const wasNull = !this.activeMission;
      this.activeMission = m;
      if (m?.contentId) {
        this.submissionApi.getMySubmissions().pipe(catchError(() => of([]))).subscribe(subs => {
          this.mySubmission = (subs as any[]).find(s =>
            (s.contentId || s.content?.id) === m.contentId
          ) ?? null;
        });
      } else {
        this.mySubmission = null;
      }
      // Notifica al alumno cuando el maestro lanza una misión nueva
      if (wasNull && m) {
        this.messages.push({
          role: 'assistant',
          content: `🎯 ¡Tu maestro acaba de lanzar la misión del día!\n\n**${m.title}** · +${m.xpReward} XP\n\nHaz clic en "Ir a la misión" cuando estés listo. ¡Tú puedes! 💪`,
          timestamp: new Date(),
        });
        this.scrollNeeded = true;
      }
    });
  }

  private onClassEnded() {
    clearInterval(this.timerRef);
    this.error = 'ended';
    this.sessionApi.leave(this.scheduleId).pipe(catchError(() => of(null))).subscribe();
  }

  send() {
    const text = this.chatInput.trim();
    if (!text || this.botTyping) return;
    this.chatInput = '';
    this.messages.push({ role: 'user', content: text, timestamp: new Date() });
    this.botTyping    = true;
    this.scrollNeeded = true;

    this.aiService.sendMessage(this.messages, 'student', text).then(reply => {
      this.messages.push({ role: 'assistant', content: reply, timestamp: new Date() });
      this.botTyping    = false;
      this.scrollNeeded = true;
    }).catch(() => {
      this.messages.push({ role: 'assistant', content: 'Lo siento, tuve un problema. ¡Intenta de nuevo! 😅', timestamp: new Date() });
      this.botTyping = false;
    });
  }

  get jitsiRoomUrl(): string {
    const room = 'ByteKids-' + this.scheduleId.replace(/-/g, '');
    const name = encodeURIComponent(this.studentName);
    return `https://meet.jit.si/${room}#userInfo.displayName="${name}"`;
  }

  openVideo() { window.open(this.jitsiRoomUrl, '_blank'); }

  goToMission() {
    if (!this.activeMission?.contentId) return;
    // returnUrl para volver al aula al terminar la misión
    this.router.navigate(
      ['/student/missions', this.activeMission.contentId],
      { queryParams: { returnUrl: `/student/classroom/${this.scheduleId}` } }
    );
  }

  ngOnDestroy() {
    this.destroyJitsi();
    clearInterval(this.timerRef);
    clearInterval(this.attendanceRef);
  }

  exitClass() {
    this.destroyJitsi();
    this.sessionApi.leave(this.scheduleId).pipe(catchError(() => of(null))).subscribe(() => {
      this.router.navigate(['/student/calendar']);
    });
  }

  ngAfterViewChecked() {
    if (this.scrollNeeded && this.chatEnd) {
      this.chatEnd.nativeElement.scrollIntoView({ behavior: 'smooth' });
      this.scrollNeeded = false;
    }
  }

}
