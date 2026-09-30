import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ContentApiService } from '../../../services/api/content-api.service';
import { SubmissionApiService } from '../../../services/api/submission-api.service';
import { QuizApiService } from '../../../services/api/quiz-api.service';
import { AuthService } from '../../../services/auth.service';
import { sobreDiez } from '../../../shared/calificacion';
import { InstruccionesComponent } from '../../../shared/instrucciones/instrucciones.component';
import { interpretarInstrucciones, preguntasDeEntrega } from '../../../shared/instrucciones/instrucciones';
import { ByteBotPanelComponent } from '../../../shared/bytebot-panel/bytebot-panel.component';
import { AvatarComponent } from '../../../shared/avatar/avatar.component';
import { catchError, forkJoin, of } from 'rxjs';

type Screen = 'loading' | 'work' | 'quiz' | 'done' | 'error' | 'bloqueada';

@Component({
  selector: 'app-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, InstruccionesComponent, ByteBotPanelComponent, AvatarComponent],
  templateUrl: './workspace.component.html',
  styleUrls: ['./workspace.component.scss']
})
export class WorkspaceComponent implements OnInit {

  screen: Screen = 'loading';
  content: any = null;
  existingSub: any = null;
  rejectedSub: any = null;
  student: any = null;

  // ── ByteBot, borrador y guia de entrega ───────────────────────────────
  /** ByteBot se abre en un panel: el nino nunca sale de la actividad. */
  botAbierto = false;
  /**
   * Lo que la actividad pide entregar, sacado de sus instrucciones. Se
   * muestra junto al cuadro de respuesta: antes habia que ir a buscarlo al
   * final de un texto largo, en la otra columna.
   */
  preguntas: string[] = [];
  /** Lista de "antes de entregar" que el nino va palomeando. */
  revisados = new Set<number>();
  estadoBorrador: '' | 'guardando' | 'guardado' = '';
  private temporizador: any = null;

  /** alumno + actividad: separa borradores y pasos entre hermanos que comparten tablet. */
  get clave(): string {
    return `${this.student?.userId ?? 'anon'}_${this.content?.id ?? ''}`;
  }
  get primerNombre(): string { return (this.student?.displayName ?? '').split(' ')[0]; }

  /**
   * "29 de septiembre", en espanol. El pipe date de Angular sale en ingles
   * porque la app no registra el locale es-MX ("29 Sep").
   */
  get fechaEntrega(): string {
    const f = this.existingSub?.submittedAt;
    return f ? new Date(f).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' }) : '';
  }

  /** Lo que le dice su robot en el encabezado: animo trabajando, festejo al terminar. */
  get mensajeAnimo(): string {
    const nombre = this.primerNombre ? ', ' + this.primerNombre : '';
    if (this.screen !== 'done') return `¡Tú puedes${nombre}! 💪`;
    if (this.ultimoIntento && !this.aprobo) return `¡Casi${nombre}! Otra vez 💪`;
    return this.alreadyDone || this.aprobo ? `¡Lo lograste${nombre}! 🎉` : `¡Bien hecho${nombre}! 🚀`;
  }
  get miBot(): string | null { return this.student?.avatarUrl ?? null; }
  get palabras(): number {
    const t = this.codeAnswer.trim();
    return t ? t.split(/\s+/).length : 0;
  }

  // Misión / Tarea / Proyecto
  codeAnswer = '';
  submitting = false;
  submitResult: any = null;

  // Quiz
  questions: any[] = [];
  answers: Record<string, string> = {};      // questionId → optionId
  currentQ = 0;
  quizResult: any = null;
  /**
   * Intentos anteriores. Sin esto el alumno reabria el quiz y lo empezaba
   * de cero, sin ver nunca que calificacion habia sacado.
   */
  intentos: any[] = [];
  quizSubmitting = false;

  readonly Object = Object;
  get isQuiz(): boolean { return this.content?.type === 'quiz'; }

  /** El intento mas reciente, que es el que se le muestra. */
  get ultimoIntento(): any { return this.quizResult ?? this.intentos[0] ?? null; }

  get califica(): number { return this.ultimoIntento?.score ?? 0; }
  get aprobo(): boolean  { return this.califica >= 70; }

  /** Vuelve a abrir el cuestionario, con las respuestas en blanco. */
  reintentarQuiz(): void {
    this.answers = {};
    this.currentQ = 0;
    this.quizResult = null;
    this.screen = 'quiz';
  }

  /**
   * Un material se consulta, no se entrega: el maestro no lo califica y ni
   * siquiera aparece en su libreta. Antes le poniamos el mismo formulario de
   * "Tu respuesta" que a una mision, y quedaba "En progreso" para siempre.
   */
  get isMaterial(): boolean { return this.content?.type === 'material'; }

  // ── content_body ────────────────────────────────────────────────────────
  // Se guarda como JSON con forma distinta por tipo. Antes se volcaba crudo en
  // la pantalla, lo que ademas le enseñaba al alumno los campos de respuesta
  // (expected_output, solution_check). Aqui se descompone y esos NUNCA se
  // exponen: son para el maestro al calificar.
  private get body(): any {
    const raw = this.content?.contentBody;
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    try { return JSON.parse(raw); } catch { return null; }
  }

  /** Texto plano cuando content_body no es JSON valido (contenido viejo). */
  get bodyTexto(): string {
    const raw = this.content?.contentBody;
    return (raw && !this.body) ? String(raw) : '';
  }

  get instrucciones(): string { return this.body?.instructions ?? ''; }
  get starterCode():   string { return this.body?.starter_code ?? ''; }
  get materialUrl():   string { return this.body?.url ?? ''; }

  get materialTipo(): string {
    const t = this.body?.resource_type ?? '';
    return ({ video: '🎬 Video', documento: '📄 Documento', enlace: '🔗 Enlace' } as any)[t] ?? '🔗 Recurso';
  }

  get checklist(): string[] {
    return Array.isArray(this.body?.checklist) ? this.body.checklist : [];
  }

  get tieneDetalle(): boolean {
    return !!(this.instrucciones || this.starterCode || this.materialUrl
              || this.checklist.length || this.bodyTexto);
  }
  get alreadyDone(): boolean { return this.existingSub?.status === 'aprobado'; }
  get submitted(): boolean { return !!this.existingSub && this.existingSub.status !== 'rechazado'; }
  get progress(): number {
    const answered = Object.keys(this.answers).length;
    return this.questions.length ? Math.round((answered / this.questions.length) * 100) : 0;
  }
  get isCodeSubject(): boolean {
    const s = (this.content?.subjectName ?? '').toLowerCase();
    return s.includes('python') || s.includes('html') || s.includes('scratch') ||
           s.includes('robot') || s.includes('roblox') || s.includes('program');
  }
  get subjectColor(): string {
    if (this.content?.subjectColor) return this.content.subjectColor;
    // Fallback por nombre para contenido sin color configurado
    const s = (this.content?.subjectName ?? '').toLowerCase();
    if (s.includes('python'))   return '#06B6D4';
    if (s.includes('html'))     return '#7C3AED';
    if (s.includes('scratch'))  return '#2563EB';
    if (s.includes('robot'))    return '#F59E0B';
    if (s.includes('roblox'))   return '#10B981';
    if (s.includes('ciencia'))  return '#059669';
    if (s.includes('matem'))    return '#EC4899';
    if (s.includes('arq') || s.includes('arte') || s.includes('diseñ')) return '#F97316';
    return '#7C3AED';
  }
  get responseLabel(): string {
    const t = this.content?.type ?? '';
    if (this.isCodeSubject)    return '💻 Tu código';
    if (t === 'proyecto')      return '📦 Describe tu proyecto';
    if (t === 'tarea')         return '📝 Tu respuesta';
    return '✏️ Tu trabajo';
  }
  get responsePlaceholder(): string {
    const t = this.content?.type ?? '';
    const s = (this.content?.subjectName ?? '').toLowerCase();
    if (this.isCodeSubject)
      return `# Escribe tu código aquí\n# Materia: ${this.content?.subjectName ?? ''}\n\n`;
    if (s.includes('arq') || s.includes('diseñ') || s.includes('arte'))
      return 'Describe cómo realizaste tu diseño:\n• ¿Qué figuras o formas usaste?\n• ¿Cómo lo construiste?\n• ¿Qué aprendiste?\n\nPuedes incluir una descripción detallada de tu trabajo.';
    if (t === 'proyecto')
      return 'Describe tu proyecto:\n• ¿Qué construiste o creaste?\n• ¿Qué pasos seguiste?\n• ¿Qué desafíos encontraste?\n• ¿Qué aprendiste?';
    return 'Escribe tu respuesta aquí, explica tu proceso y lo que aprendiste…';
  }
  get isRejected(): boolean { return !!this.rejectedSub && !this.existingSub; }

  get dueLabel(): string {
    if (!this.content?.dueDate) return '';
    const diff = Math.ceil((new Date(this.content.dueDate).getTime() - Date.now()) / 86400000);
    if (diff < 0)   return '⚠️ Fecha límite vencida';
    if (diff === 0) return '⚠️ Vence hoy';
    if (diff === 1) return '📅 Vence mañana';
    if (diff <= 3)  return `📅 Vence en ${diff} días`;
    return `📅 Vence el ${new Date(this.content.dueDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`;
  }

  get dueUrgent(): boolean {
    if (!this.content?.dueDate) return false;
    return Math.ceil((new Date(this.content.dueDate).getTime() - Date.now()) / 86400000) <= 1;
  }

  get fromClassroom(): boolean {
    return !!this.route.snapshot.queryParamMap.get('returnUrl');
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private contentApi: ContentApiService,
    private submissionApi: SubmissionApiService,
    private quizApi: QuizApiService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.student = this.auth.getUser();
    // Se escucha el id y no se lee una vez: "Siguiente actividad" navega a
    // la misma ruta con otro id, y Angular reusa el componente en vez de
    // crearlo de nuevo. Sin esto la pantalla se quedaba en la anterior.
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) this.cargar(id);
    });
  }

  /** Todo lo de una actividad, desde cero: tambien al pasar a la siguiente. */
  /** Cuenta las cargas: si el nino salta rapido, la respuesta vieja se ignora. */
  private cargaVigente = 0;

  private cargar(id: string): void {
    const esta = ++this.cargaVigente;
    this.screen = 'loading';
    this.content = null;
    this.existingSub = null;
    this.rejectedSub = null;
    this.codeAnswer = '';
    this.submitResult = null;
    this.questions = [];
    this.answers = {};
    this.currentQ = 0;
    this.quizResult = null;
    this.intentos = [];
    this.preguntas = [];
    this.revisados = new Set<number>();
    this.estadoBorrador = '';
    this.siguiente = null;
    this.botAbierto = false;
    window.scrollTo({ top: 0 });

    // Cargar contenido y mis entregas en paralelo
    Promise.all([
      this.contentApi.getById(id).pipe(catchError(() => of(null))).toPromise(),
      this.submissionApi.getMySubmissions().pipe(catchError(() => of([]))).toPromise(),
    ]).then(([content, subs]) => {
      if (esta !== this.cargaVigente) return;
      if (!content) { this.screen = 'error'; return; }
      this.content = content;
      // Entro directo por la URL a algo que todavia no le toca. La API no le
      // dejaria entregar; aqui se le dice por que y a donde ir.
      if (content.bloqueada) { this.screen = 'bloqueada'; return; }
      const allSubs = subs as any[];
      this.existingSub = allSubs.find(s =>
        (s.contentId || s.content?.id) === id && s.status !== 'rechazado'
      ) ?? null;
      // Find most recent rejected sub (for feedback + pre-fill)
      const rejectedSubs = allSubs
        .filter(s => (s.contentId || s.content?.id) === id && s.status === 'rechazado')
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      this.rejectedSub = rejectedSubs[0] ?? null;

      if (this.isQuiz) {
        forkJoin({
          qs:       this.quizApi.getQuestions(id).pipe(catchError(() => of([]))),
          intentos: this.quizApi.getMyAttempts(id).pipe(catchError(() => of([]))),
        }).subscribe(({ qs, intentos }) => {
          if (esta !== this.cargaVigente) return;
          this.questions = qs;
          this.intentos  = intentos ?? [];
          // Si ya lo contesto, primero ve su resultado. Puede repetirlo desde
          // ahi, pero enterandose de como le fue.
          this.screen = (this.alreadyDone || this.intentos.length) ? 'done' : 'quiz';
          if (this.screen === 'done') this.buscarSiguiente();
        });
      } else {
        // El borrador gana: es lo ultimo que el nino escribio, aunque se haya
        // salido sin entregar. Despues, lo entregado o lo que le regresaron.
        const borrador = this.alreadyDone ? '' : this.leerBorrador();
        this.codeAnswer = borrador || this.existingSub?.codeSubmitted || this.rejectedSub?.codeSubmitted || '';
        if (borrador) this.estadoBorrador = 'guardado';
        this.preguntas = preguntasDeEntrega(interpretarInstrucciones(this.instrucciones));
        this.revisados = new Set(this.leer('bk_revisado_'));
        this.screen = this.alreadyDone ? 'done' : 'work';
        if (this.alreadyDone) this.buscarSiguiente();
      }
    });
  }

  // ── Misión / Tarea / Proyecto ─────────────────────────────────────────

  /** Marca el material como consultado. El backend lo aprueba y paga el XP. */
  marcarVisto(): void {
    if (this.submitting || this.alreadyDone) return;
    this.codeAnswer = 'Material consultado';
    this.submit();
  }

  submit(): void {
    if (!this.codeAnswer.trim() || this.submitting) return;
    this.submitting = true;
    this.submissionApi.submit({
      contentId: this.content.id || this.content._id,
      codeSubmitted: this.codeAnswer,
    }).subscribe({
      next: result => {
        this.submitResult = result;
        this.borrarBorrador();
        this.screen = 'done';
        this.submitting = false;
        this.buscarSiguiente();
      },
      error: () => { this.submitting = false; }
    });
  }

  // ── Quiz ──────────────────────────────────────────────────────────────

  selectOption(questionId: string, optionId: string): void {
    this.answers[questionId] = optionId;
  }

  prevQ(): void { if (this.currentQ > 0) this.currentQ--; }
  nextQ(): void { if (this.currentQ < this.questions.length - 1) this.currentQ++; }

  isAnswered(questionId: string): boolean { return !!this.answers[questionId]; }
  allAnswered(): boolean { return this.questions.every(q => this.isAnswered(q.id || q._id)); }

  submitQuiz(): void {
    if (!this.allAnswered() || this.quizSubmitting) return;
    this.quizSubmitting = true;

    // Convierte a Record<questionId, optionId>
    const payload: Record<string, string> = {};
    for (const [qId, oId] of Object.entries(this.answers)) {
      payload[qId] = oId;
    }

    this.quizApi.submitAttempt(this.content.id || this.content._id, payload).subscribe({
      next: result => {
        this.quizResult = result;
        this.screen = 'done';
        this.quizSubmitting = false;
        this.buscarSiguiente();
      },
      error: () => { this.quizSubmitting = false; }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  /**
   * Antes navegaba a /student/ai-tutor y el nino perdia la actividad de
   * vista y lo que llevaba escrito. Ahora abre el panel aqui mismo.
   */
  openAiTutor(): void { this.botAbierto = true; }

  // ── Siguiente actividad ─────────────────────────────────────────────

  /** La que sigue en el temario de esta materia, si ya esta abierta. */
  siguiente: any = null;

  /**
   * Se pide el feed otra vez y no se calcula aqui: lo que acaba de entregar
   * pudo haber desbloqueado la siguiente, y quien lo sabe es la API.
   */
  buscarSiguiente(): void {
    const actual = this.content;
    if (!actual) return;
    this.contentApi.getMyFeed().pipe(catchError(() => of([]))).subscribe((feed: any[]) => {
      this.siguiente = (feed ?? [])
        .filter(c => c.subjectId === actual.subjectId && (c.orderIndex ?? 0) > (actual.orderIndex ?? 0))
        .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))[0] ?? null;
    });
  }

  /** A otra actividad. cargar() se dispara solo con el cambio de id. */
  irA(id: string): void {
    this.router.navigate(['/student/missions', id]);
  }

  /** Lleva al cuadro de respuesta y lo deja listo para escribir. */
  irARespuesta(): void {
    const el = document.getElementById('ws-respuesta') as HTMLTextAreaElement | null;
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => el?.focus({ preventScroll: true }), 400);
  }

  // ── Borrador ──────────────────────────────────────────────────────────

  /** Se guarda solo, un momento despues de que el nino deja de teclear. */
  alEscribir(): void {
    this.estadoBorrador = 'guardando';
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => {
      try {
        if (this.codeAnswer.trim()) localStorage.setItem('bk_borrador_' + this.clave, this.codeAnswer);
        else localStorage.removeItem('bk_borrador_' + this.clave);
        this.estadoBorrador = 'guardado';
      } catch { this.estadoBorrador = ''; }
    }, 700);
  }

  private leerBorrador(): string {
    try { return localStorage.getItem('bk_borrador_' + this.clave) ?? ''; } catch { return ''; }
  }

  private borrarBorrador(): void {
    clearTimeout(this.temporizador);
    try {
      localStorage.removeItem('bk_borrador_' + this.clave);
      localStorage.removeItem('bk_revisado_' + this.clave);
    } catch { /* nada que borrar */ }
  }

  /**
   * Pone en el cuadro las preguntas de la entrega, para que el nino solo
   * tenga que contestar debajo de cada una. Solo con el cuadro vacio: nunca
   * se le encima a lo que ya escribio.
   */
  usarPlantilla(): void {
    if (this.codeAnswer.trim() || !this.preguntas.length) return;
    this.codeAnswer = this.preguntas.map((p, i) =>
      /^[A-ZÁÉÍÓÚÑÜ ]+:/.test(p) ? p.split(':')[0] + ':\n\n' : `${i + 1}. ${p}\n\n`
    ).join('');
    this.alEscribir();
  }

  alternarRevisado(i: number): void {
    if (this.revisados.has(i)) this.revisados.delete(i); else this.revisados.add(i);
    try { localStorage.setItem('bk_revisado_' + this.clave, JSON.stringify([...this.revisados])); } catch { /* */ }
  }

  private leer(prefijo: string): number[] {
    try { return JSON.parse(localStorage.getItem(prefijo + this.clave) || '[]'); } catch { return []; }
  }

  goBack(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    this.router.navigateByUrl(returnUrl ?? '/student/missions');
  }

  diffLabel(d: string): string {
    return d === 'facil' ? 'Fácil' : d === 'dificil' ? 'Difícil' : 'Medio';
  }

  typeLabel(t: string): string {
    return ({ mision:'Misión', tarea:'Tarea', quiz:'Quiz', proyecto:'Proyecto', material:'Material' } as any)[t] ?? t;
  }

  /** Para la plantilla. Ver shared/calificacion.ts. */
  readonly sobreDiez = sobreDiez;

  /** Recibe el score tal como se guarda: de 0 a 100. */
  scoreColor(score: number): string {
    return score >= 80 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444';
  }
}
