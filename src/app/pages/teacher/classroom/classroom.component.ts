import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionApiService } from '../../../services/api/session-api.service';
import { ClassroomApiService } from '../../../services/api/classroom-api.service';
import { ContentApiService } from '../../../services/api/content-api.service';
import { SubmissionApiService } from '../../../services/api/submission-api.service';
import { AiTutorService, ChatMessage } from '../../../services/ai-tutor.service';
import { AuthService } from '../../../services/auth.service';
import { catchError, of, forkJoin } from 'rxjs';

@Component({
  selector: 'app-teacher-classroom',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './classroom.component.html',
  styleUrls: ['./classroom.component.scss'],
})
export class TeacherClassroomComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('chatEnd') chatEnd!: ElementRef;

  scheduleId   = '';
  session: any = null;
  loading      = true;
  joining      = false;
  error        = '';

  enrolledStudents: any[] = [];
  attendance:       any[] = [];
  availableContent:   any[] = [];
  selectedContentId = '';
  activeMission:     any   = null;
  launchingMission   = false;
  missionSubmissions: any[] = [];
  reviewingSubmission: any   = null;
  reviewFeedback       = '';
  reviewing            = false;
  activeTab:    'chat' | 'bot' = 'chat';
  chatMessages: any[] = [];
  chatMsg       = '';
  sendingChat   = false;
  private lastMsgTime: string | undefined;
  private seenMsgIds  = new Set<string>();
  messages:   ChatMessage[] = [];
  chatInput   = '';
  botTyping   = false;
  scrollNeeded = false;

  timeRemaining = '—';
  secondsLeft   = 0;
  totalSeconds  = 0;
  progressPct   = 100;

  private timerRef:      any;
  private attendanceRef: any;

  get teacherName():     string { return this.auth.getUser()?.displayName || 'Maestro'; }
  get teacherInitials(): string { return this.auth.getUser()?.initials    || 'MA'; }

  get presentStudents(): any[] {
    const presentIds = new Set(this.attendance.filter(a => a.role === 'student').map(a => a.userId));
    return this.enrolledStudents.map(s => ({ ...s, present: presentIds.has(s.id) }));
  }

  get presentCount(): number { return this.presentStudents.filter(s => s.present).length; }

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
    private classroomApi:  ClassroomApiService,
    private contentApi:    ContentApiService,
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
      forkJoin({
        join:     this.sessionApi.join(this.scheduleId).pipe(catchError(() => of(null))),
        students: this.classroomApi.getStudents(data.classroomId ?? '').pipe(catchError(() => of([]))),
        content:  this.contentApi.getAll().pipe(catchError(() => of([]))),
        mission:  this.sessionApi.getMission(this.scheduleId).pipe(catchError(() => of(null))),
      }).subscribe(({ students, content, mission }) => {
        this.enrolledStudents  = students;
        this.availableContent  = content.filter((c: any) =>
          ['mision','tarea','quiz','proyecto'].includes(c.type));
        this.activeMission     = mission;
        this.joining = false;
        this.initTimer(data);
        this.initBot(data);
        this.pollAttendance();
        this.attendanceRef = setInterval(() => this.pollAttendance(), 8000);
      });
    });
  }

  private initTimer(data: any) {
    this.secondsLeft = data.secondsLeft ?? 0;
    const [sh, sm]   = (data.startTime ?? '00:00').split(':').map(Number);
    const [eh, em]   = (data.endTime   ?? '00:00').split(':').map(Number);
    this.totalSeconds = Math.max(1, (eh * 3600 + em * 60) - (sh * 3600 + sm * 60));

    this.updateTimer();
    this.timerRef = setInterval(() => {
      if (this.secondsLeft > 0) { this.secondsLeft--; this.updateTimer(); }
      else { this.error = 'ended'; clearInterval(this.timerRef); }
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
    const name    = this.teacherName;
    const subject = data.subjectName ?? 'la materia';
    const classroom = data.classroomName ?? 'tu salón';

    this.messages = [{
      role: 'assistant',
      content: `¡Hola ${name}! 👩‍🏫 Bienvenida al aula virtual.\n\nEstoy aquí como tu asistente para la clase de **${subject}** (${classroom}).\n\nPuedo ayudarte a:\n📝 Explicar conceptos a tus alumnos\n🎯 Sugerir actividades para la sesión\n❓ Responder dudas de la materia\n\n¿Cómo puedo apoyarte hoy?`,
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

  private pollAttendance() {
    this.sessionApi.getAttendance(this.scheduleId).pipe(catchError(() => of([]))).subscribe(list => {
      this.attendance = list;
    });
    this.sessionApi.getChatMessages(this.scheduleId, this.lastMsgTime).pipe(catchError(() => of([]))).subscribe(msgs => {
      if (msgs.length) this.addChatMessages(msgs);
    });
    if (this.activeMission?.contentId) {
      this.submissionApi.getByContent(this.activeMission.contentId).pipe(catchError(() => of([]))).subscribe(subs => {
        this.missionSubmissions = subs;
      });
    }
  }

  get studentsWithSubmission(): any[] {
    return this.enrolledStudents.map(s => ({
      ...s,
      sub: this.missionSubmissions.find(m =>
        (m.studentId || m.student?.id) === s.id
      ) ?? null,
    }));
  }

  get submittedCount(): number {
    return this.studentsWithSubmission.filter(s => !!s.sub).length;
  }

  openReview(sub: any) {
    this.reviewingSubmission = sub;
    this.reviewFeedback = sub.teacherFeedback ?? '';
  }

  closeReview() { this.reviewingSubmission = null; this.reviewFeedback = ''; }

  submitReview(status: 'aprobado' | 'rechazado') {
    if (!this.reviewingSubmission || this.reviewing) return;
    this.reviewing = true;
    this.submissionApi.review(this.reviewingSubmission.id, {
      status,
      feedback: this.reviewFeedback || undefined,
    }).subscribe({
      next: updated => {
        this.missionSubmissions = this.missionSubmissions.map(s =>
          s.id === updated.id ? updated : s
        );
        this.reviewing = false;
        this.closeReview();
      },
      error: () => { this.reviewing = false; }
    });
  }

  launchMission() {
    if (!this.selectedContentId || this.launchingMission) return;
    this.launchingMission = true;
    this.sessionApi.launchMission(this.scheduleId, this.selectedContentId)
      .subscribe({
        next: mission => {
          this.activeMission     = mission;
          this.launchingMission  = false;
          this.selectedContentId = '';
        },
        error: (e: any) => {
          this.launchingMission = false;
          // Muestra el error en el chat como mensaje del bot
          this.messages.push({
            role: 'assistant',
            content: `❌ No se pudo lanzar la misión: ${e?.error?.message ?? 'Error desconocido'}`,
            timestamp: new Date(),
          });
          this.scrollNeeded = true;
        }
      });
  }

  send() {
    const text = this.chatInput.trim();
    if (!text || this.botTyping) return;
    this.chatInput = '';
    this.messages.push({ role: 'user', content: text, timestamp: new Date() });
    this.botTyping    = true;
    this.scrollNeeded = true;

    this.aiService.sendMessage(this.messages, 'teacher', text).then(reply => {
      this.messages.push({ role: 'assistant', content: reply, timestamp: new Date() });
      this.botTyping    = false;
      this.scrollNeeded = true;
    }).catch(() => {
      this.messages.push({ role: 'assistant', content: '¡Disculpa! Tuve un problema. Intenta de nuevo. 🙏', timestamp: new Date() });
      this.botTyping = false;
    });
  }

  exitClass() {
    this.sessionApi.leave(this.scheduleId).pipe(catchError(() => of(null))).subscribe(() => {
      this.router.navigate(['/teacher/calendar']);
    });
  }

  ngAfterViewChecked() {
    if (this.scrollNeeded && this.chatEnd) {
      this.chatEnd.nativeElement.scrollIntoView({ behavior: 'smooth' });
      this.scrollNeeded = false;
    }
  }

  ngOnDestroy() {
    clearInterval(this.timerRef);
    clearInterval(this.attendanceRef);
  }
}
