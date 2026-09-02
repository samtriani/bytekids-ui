import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ContentApiService } from '../../../services/api/content-api.service';
import { SubmissionApiService } from '../../../services/api/submission-api.service';
import { QuizApiService } from '../../../services/api/quiz-api.service';
import { AuthService } from '../../../services/auth.service';
import { catchError, of } from 'rxjs';

type Screen = 'loading' | 'work' | 'quiz' | 'done' | 'error';

@Component({
  selector: 'app-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './workspace.component.html',
  styleUrls: ['./workspace.component.scss']
})
export class WorkspaceComponent implements OnInit {

  screen: Screen = 'loading';
  content: any = null;
  existingSub: any = null;
  rejectedSub: any = null;
  student: any = null;

  // Misión / Tarea / Proyecto
  codeAnswer = '';
  submitting = false;
  submitResult: any = null;

  // Quiz
  questions: any[] = [];
  answers: Record<string, string> = {};      // questionId → optionId
  currentQ = 0;
  quizResult: any = null;
  quizSubmitting = false;

  readonly Object = Object;
  get isQuiz(): boolean { return this.content?.type === 'quiz'; }

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
    const id = this.route.snapshot.paramMap.get('id')!;

    // Cargar contenido y mis entregas en paralelo
    Promise.all([
      this.contentApi.getById(id).pipe(catchError(() => of(null))).toPromise(),
      this.submissionApi.getMySubmissions().pipe(catchError(() => of([]))).toPromise(),
    ]).then(([content, subs]) => {
      if (!content) { this.screen = 'error'; return; }
      this.content = content;
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
        this.quizApi.getQuestions(id).pipe(catchError(() => of([]))).subscribe(qs => {
          this.questions = qs;
          this.screen = this.alreadyDone ? 'done' : 'quiz';
        });
      } else {
        // Pre-fill: approved/pending > rejected code > empty
        this.codeAnswer = this.existingSub?.codeSubmitted ?? this.rejectedSub?.codeSubmitted ?? '';
        this.screen = this.alreadyDone ? 'done' : 'work';
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
        this.screen = 'done';
        this.submitting = false;
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
      },
      error: () => { this.quizSubmitting = false; }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  openAiTutor(): void {
    const q = `Ayúdame con "${this.content?.title}" de ${this.content?.subjectName ?? ''}. ${this.content?.description ?? ''}`;
    this.router.navigate(['/student/ai-tutor'], { queryParams: { q } });
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

  scoreColor(score: number): string {
    return score >= 80 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444';
  }
}
