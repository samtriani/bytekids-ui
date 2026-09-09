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
import { LlamadaService } from '../../../services/llamada.service';
import { CuerpoActividad, CUERPO_VACIO } from '../../../shared/mission-body';
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
  /** El hueco donde se acopla la videollamada mientras estas en el aula. */
  @ViewChild('huecoVideo') huecoVideo?: ElementRef<HTMLElement>;

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
  reviewScore:         number | null = null;
  reviewing            = false;

  // ── Actividad dentro del aula ───────────────────────────────────────
  /** El content_body ya interpretado. Se rearma solo cuando cambia. */
  cuerpo: CuerpoActividad = CUERPO_VACIO;
  private cuerpoCrudo = '';
  /** El maestro puede cerrar el video para ver la actividad completa. */
  verVideoAlLado = true;
  activeTab:         'chat' | 'bot' | 'video' | 'work' = 'chat';
  teacherVideoActive = false;
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

  get esQuiz():     boolean { return this.activeMission?.type === 'quiz'; }
  get esMaterial(): boolean { return this.activeMission?.type === 'material'; }

  /**
   * Video y actividad a la vez, para explicar sobre lo que los alumnos
   * tienen enfrente. El ancho lo decide el CSS, no un listener de resize.
   */
  get vistaDividida(): boolean {
    return this.activeTab === 'work' && this.teacherVideoActive && this.verVideoAlLado;
  }

  /**
   * El panel de video NUNCA se saca del DOM: montado con @if, cambiar de
   * pestana destruye el iframe de Jitsi y se cae la clase entera.
   */
  get videoVisible(): boolean {
    return this.activeTab === 'video' || this.vistaDividida;
  }

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
    public  llamada:       LlamadaService,
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
        content:  this.contentApi.getMyContent().pipe(catchError(() => of([]))),
        mission:  this.sessionApi.getMission(this.scheduleId).pipe(catchError(() => of(null))),
      }).subscribe(({ students, content, mission }) => {
        this.enrolledStudents  = students;
        this.availableContent  = content.filter((c: any) =>
          ['mision','tarea','quiz','proyecto'].includes(c.type));
        this.activeMission     = mission;
        this.aplicarMision(mission);
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

  get jitsiRoom(): string {
    const appId = 'vpaas-magic-cookie-7825138c95d24c7cb6f660d4a535d186';
    return `${appId}/ByteKids-${this.scheduleId.replace(/-/g, '')}`;
  }

  startVideo() {
    this.sessionApi.toggleVideo(this.scheduleId).pipe(catchError(() => of(false))).subscribe(active => {
      this.teacherVideoActive = active;
      if (active) {
        // Desde la actividad se queda ahi: el video aparece a un lado.
        if (this.activeTab !== 'work') this.activeTab = 'video';
        this.entrarALlamada();
      } else {
        this.llamada.terminar();
      }
    });
  }


  private pollAttendance() {
    this.sessionApi.getAttendance(this.scheduleId).pipe(catchError(() => of({ participants: [], teacherVideoActive: false }))).subscribe(data => {
      this.attendance = data.participants ?? [];
      // El maestro nunca leia su propio estado de video: solo se lo ponia
      // el mismo al encenderlo. Al recargar el aula --o al volver desde
      // otra pantalla-- veia "Iniciar videollamada" con la llamada
      // sonando, y encenderla otra vez la habria apagado en el servidor.
      this.teacherVideoActive = data.teacherVideoActive ?? false;
      if (this.teacherVideoActive && this.llamada.esDe(this.scheduleId)) this.recolocar();
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

  /** Deja lista la actividad cuando se lanza o cambia la mision. */
  private aplicarMision(m: any): void {
    const crudo = m?.contentBody ?? '';
    if (crudo !== this.cuerpoCrudo) {
      this.cuerpoCrudo = crudo;
      this.cuerpo      = new CuerpoActividad(crudo);
    }
  }

  abrirActividad(): void { this.activeTab = 'work'; this.recolocar(); }

  /**
   * Le presta el hueco al servicio para que la llamada se coloque encima.
   * acoplar() se ignora si el hueco ya es ese, asi que llamarlo de mas
   * no cuesta nada.
   */
  /** Pide el token y entra. El servicio ya no habla con la API. */
  private entrarALlamada(): void {
    // esDe() y no activa: si hay una llamada de OTRA clase, el maestro
    // entra a esta y el servicio cuelga la anterior.
    if (this.llamada.esDe(this.scheduleId)) { this.recolocar(); return; }
    this.sessionApi.getJaasToken(this.scheduleId)
      .pipe(catchError(() => of(null)))
      .subscribe(jwt => {
        this.llamada.iniciar({
          scheduleId: this.scheduleId,
          sala:       this.jitsiRoom,
          jwt,
          nombre:     this.teacherName,
          titulo:     this.session?.subjectName ?? 'Clase',
          subtitulo:  this.session?.classroomName ?? '',
          icono:      this.session?.subjectIcon ?? '\u{1F4F7}',
          volverA:    `/teacher/classroom/${this.scheduleId}`,
        });
        this.recolocar();
      });
  }

  private acoplarLlamada(): void {
    const el = this.huecoVideo?.nativeElement;
    if (el) this.llamada.acoplar(el);
  }

  /**
   * Cambio el acomodo: la llamada acoplada tiene que recolocarse.
   *
   * Va en un setTimeout para que el DOM ya se haya repintado cuando se mida
   * el hueco, y se llama SOLO desde manejadores de eventos. Colgarlo de
   * ngAfterViewChecked haria un bucle: recolocar escribe estilos, los
   * estilos disparan otro ciclo de deteccion, y ese ciclo vuelve a recolocar.
   */
  private recolocar(): void {
    // Dos intentos: al volver al aula desde otra pantalla, el hueco puede no
    // estar pintado todavia en el primero --depende de que ya haya llegado
    // teacherVideoActive-- y sin el segundo la llamada se quedaria en la
    // esquina encima de su propia aula.
    const intento = () => { this.acoplarLlamada(); this.llamada.refrescar(); };
    setTimeout(intento, 0);
    setTimeout(intento, 300);
  }

  /** Las pestanas cambian el tamano del hueco, no solo lo que se ve. */
  cambiarPestana(t: 'chat' | 'bot' | 'video' | 'work'): void {
    this.activeTab = t;
    this.recolocar();
  }

  mostrarVideoAlLado(v: boolean): void {
    this.verVideoAlLado = v;
    this.recolocar();
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
    this.reviewScore    = sub.score != null ? sub.score / 10 : null;
  }

  closeReview() { this.reviewingSubmission = null; this.reviewFeedback = ''; this.reviewScore = null; }

  submitReview(status: 'aprobado' | 'rechazado') {
    if (!this.reviewingSubmission || this.reviewing) return;
    this.reviewing = true;
    this.submissionApi.review(this.reviewingSubmission.id, {
      status,
      feedback: this.reviewFeedback || undefined,
      score: this.reviewScore != null ? Math.round(this.reviewScore * 10) : undefined,
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
          this.aplicarMision(mission);
          this.launchingMission  = false;
          this.selectedContentId = '';
          // Se abre sola: lanzarla es justo el momento de explicarla.
          this.activeTab = 'work';
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

  /**
   * Sale del aula SIN colgar: la clase sigue y la videollamada se va a la
   * ventanita de la esquina. Es lo que permite que un alumno ensene su
   * progreso o pregunte por una pantalla en plena clase, compartiendo
   * pantalla, sin desconectarse.
   *
   * No llama a leave(): no se esta saliendo de la clase, solo se esta
   * moviendo por la plataforma.
   */
  irAlMenu(): void {
    this.router.navigate(['/teacher']);
  }

  exitClass() {
    // Salir de clase si cuelga: es la decision explicita del maestro.
    this.llamada.terminar();
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
    // La llamada NO se cuelga al salir del aula: esa es toda la gracia.
    // Solo se le retira el hueco y se va a la ventanita de la esquina.
    this.llamada.desacoplar(this.huecoVideo?.nativeElement);
    clearInterval(this.timerRef);
    clearInterval(this.attendanceRef);
  }
}
