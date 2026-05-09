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
  get alreadyDone(): boolean { return this.existingSub?.status === 'aprobado'; }
  get progress(): number {
    const answered = Object.keys(this.answers).length;
    return this.questions.length ? Math.round((answered / this.questions.length) * 100) : 0;
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
      this.existingSub = (subs as any[]).find(s =>
        (s.contentId || s.content?.id) === id && s.status !== 'rechazado'
      ) ?? null;

      if (this.isQuiz) {
        this.quizApi.getQuestions(id).pipe(catchError(() => of([]))).subscribe(qs => {
          this.questions = qs;
          this.screen = this.alreadyDone ? 'done' : 'quiz';
        });
      } else {
        this.codeAnswer = this.existingSub?.codeSubmitted ?? '';
        this.screen = this.alreadyDone ? 'done' : 'work';
      }
    });
  }

  // ── Misión / Tarea / Proyecto ─────────────────────────────────────────

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
