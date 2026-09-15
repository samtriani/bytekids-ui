import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ShellComponent } from '../../../shared/shell/shell.component';
import { TEACHER_NAV } from '../shared/teacher-nav';
import { ClassroomApiService } from '../../../services/api/classroom-api.service';
import { SubmissionApiService } from '../../../services/api/submission-api.service';
import { AuthService } from '../../../services/auth.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-teacher-gradebook',
  standalone: true,
  imports: [CommonModule, FormsModule, ShellComponent],
  templateUrl: './gradebook.component.html',
  styleUrls: ['./gradebook.component.scss'],
})
export class GradebookComponent implements OnInit {
  navItems = TEACHER_NAV;

  get teacherName():     string { return this.auth.getUser()?.displayName || 'Maestro'; }
  get teacherInitials(): string { return this.auth.getUser()?.initials    || 'M'; }

  classrooms:        any[] = [];
  selectedClassroom  = '';
  loading            = false;
  loadingClassrooms  = true;

  students:  any[] = [];   // [{id, name, initials}]
  content:   any[] = [];   // [{id, title, type, xpReward, dueDate}]
  grades:    Record<string, Record<string, any>> = {};  // studentId → contentId → {score,status,attempts,feedback}

  // Los materiales no se califican, pero el maestro necesita saber quien ya los
  // consulto. Van en tabla aparte para no ensuciar el promedio del salon.
  materials: any[] = [];
  reads:     Record<string, Record<string, any>> = {};

  leyo(studentId: string, materialId: string): boolean {
    return !!this.reads?.[studentId]?.[materialId];
  }

  fechaLectura(studentId: string, materialId: string): string | null {
    return this.reads?.[studentId]?.[materialId]?.readAt ?? null;
  }

  leidosDe(materialId: string): number {
    return this.leidosPorMaterial[materialId] ?? 0;
  }

  filterStatus = 'Todos';
  readonly statusFilters = ['Todos', 'Aprobado', 'Rechazado', 'Pendiente', 'Sin entregar'];

  /**
   * Todo lo derivado de la tabla se calcula UNA vez, cuando llegan los datos o
   * cambia el filtro, y no en cada ciclo de deteccion de cambios.
   *
   * Antes `filteredStudents` era un getter O(alumnos x actividades), y la
   * plantilla lo pedia una vez por columna --`submittedCount` y `avgScore` por
   * cada una de las 29 piezas-- mas una vez por material. Cada clic en la
   * pantalla, incluido Aprobar, rehacia ese trabajo completo decenas de veces
   * antes de poder pintar. Con un salon de prueba se aguanta; con un grupo
   * real el maestro paga esa cuenta en cada tecla.
   */
  alumnosFiltrados: any[] = [];
  resumenPieza: Record<string, { entregadas: number; promedio: string }> = {};
  leidosPorMaterial: Record<string, number> = {};

  setFiltro(f: string) {
    this.filterStatus = f;
    this.recalcular();
  }

  private recalcular(): void {
    this.alumnosFiltrados = this.filterStatus === 'Todos'
      ? this.students
      : this.students.filter(s =>
          this.content.some(c => this.matchFilter(this.getGrade(s.id, c.id))));

    this.resumenPieza = {};
    for (const c of this.content) {
      const notas: number[] = [];
      let entregadas = 0;
      for (const s of this.alumnosFiltrados) {
        const g = this.getGrade(s.id, c.id);
        if (!g) continue;
        entregadas++;
        if (g.score != null) notas.push(g.score as number);
      }
      this.resumenPieza[c.id] = {
        entregadas,
        promedio: notas.length
          ? (notas.reduce((a, b) => a + b, 0) / notas.length / 10).toFixed(1)
          : '—',
      };
    }

    this.leidosPorMaterial = {};
    for (const m of this.materials ?? []) {
      this.leidosPorMaterial[m.id] =
        this.alumnosFiltrados.filter(s => this.leyo(s.id, m.id)).length;
    }
  }

  // ── Revision de una entrega ─────────────────────────────────────────────
  // Calificar solo se podia dentro del aula en vivo, o sea durante la clase.
  // Aqui el maestro abre cualquier celda y ve que entrego el alumno, con que
  // se le califico y que se le respondio, a cualquier hora.
  revisando: any = null;          // { alumno, pieza, entrega }
  cargandoEntrega = false;
  guardandoRevision = false;
  errorRevision = '';

  formRevision = { score: null as number | null, feedback: '' };

  /**
   * El texto de la entrega, acotado para pintarlo.
   *
   * Un alumno puede recargarse en una tecla y mandar una sola "palabra" de
   * miles de caracteres. Pintarla completa con overflow-wrap:anywhere obliga al
   * navegador a buscar puntos de corte caracter por caracter, y eso llega a
   * congelar la pestana entera: el maestro ni siquiera puede hacer clic en la
   * nota, porque el navegador nunca termina de acomodar el modal.
   *
   * Se corta al pintar y no en la base: la entrega original se conserva intacta
   * por si hay que revisarla. 4000 caracteres son varias cuartillas; ninguna
   * respuesta real de un nino se acerca, y lo que se corta se avisa.
   */
  textoEntrega = '';
  entregaRecortada = 0;
  private static readonly MAX_TEXTO = 4000;

  private cacheEntregas: Record<string, any[]> = {};

  abrirCelda(alumno: any, pieza: any) {
    const nota = this.getGrade(alumno.id, pieza.id);
    if (!nota) return;                       // sin entrega no hay nada que ver

    this.revisando = { alumno, pieza, entrega: null };
    this.errorRevision = '';
    this.cargandoEntrega = true;

    const pintar = (entregas: any[]) => {
      const e = entregas
        .filter(x => x.contentId === pieza.id)
        .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))[0] ?? null;
      this.revisando = { alumno, pieza, entrega: e };
      this.formRevision = {
        score: e?.score != null ? e.score / 10 : null,
        feedback: e?.teacherFeedback ?? '',
      };

      const texto = e?.codeSubmitted ?? '';
      const tope = GradebookComponent.MAX_TEXTO;
      this.textoEntrega = texto.length > tope ? texto.slice(0, tope) : texto;
      this.entregaRecortada = Math.max(0, texto.length - tope);
      this.cargandoEntrega = false;
    };

    const cacheado = this.cacheEntregas[alumno.id];
    if (cacheado) { pintar(cacheado); return; }

    this.submissionApi.getByStudent(alumno.id).pipe(catchError(() => of([]))).subscribe(list => {
      this.cacheEntregas[alumno.id] = list ?? [];
      pintar(list ?? []);
    });
  }

  cerrarRevision() { this.revisando = null; this.errorRevision = ''; }

  calificar(status: 'aprobado' | 'rechazado') {
    const e = this.revisando?.entrega;
    if (!e || this.guardandoRevision) return;
    this.guardandoRevision = true;
    this.errorRevision = '';

    this.submissionApi.review(e.id, {
      status,
      feedback: this.formRevision.feedback || undefined,
      score: this.formRevision.score != null ? Math.round(this.formRevision.score * 10) : undefined,
    }).subscribe({
      next: () => {
        this.guardandoRevision = false;
        delete this.cacheEntregas[this.revisando.alumno.id];   // quedó viejo
        this.cerrarRevision();
        this.loadGradebook();
      },
      error: (err: any) => {
        this.guardandoRevision = false;
        this.errorRevision = err?.error?.message ?? 'No se pudo guardar la calificación.';
      },
    });
  }

  estadoLabel(st: string): string {
    return ({ aprobado: 'Aprobada', rechazado: 'Necesita correcciones', enviado: 'Sin revisar' } as any)[st] ?? st;
  }

  constructor(
    private route: ActivatedRoute,
    private classroomApi: ClassroomApiService,
    private submissionApi: SubmissionApiService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.classroomApi.getMyClassrooms().pipe(catchError(() => of([]))).subscribe(cls => {
      this.classrooms      = cls;
      this.loadingClassrooms = false;
      if (cls.length) {
        // El salon puede venir del Panel del Maestro. Si no viene --o si
        // ya no existe-- se cae al primero, pero nunca se ignora.
        const pedido = this.route.snapshot.queryParamMap.get('salon');
        const existe = pedido && cls.some((c: any) => (c.id || c._id) === pedido);
        this.selectedClassroom = existe ? pedido! : (cls[0].id || cls[0]._id);
        this.loadGradebook();
      }
    });
  }

  loadGradebook(): void {
    if (!this.selectedClassroom) return;
    this.loading  = true;
    this.students = [];
    this.content  = [];
    this.grades   = {};
    this.submissionApi.getGradebook(this.selectedClassroom).pipe(catchError(() => of(null))).subscribe(data => {
      if (data) {
        this.students = data.students ?? [];
        this.content  = data.content  ?? [];
        this.grades   = data.grades   ?? {};
        this.materials = data.materials ?? [];
        this.reads     = data.reads     ?? {};
      }
      this.recalcular();
      this.loading = false;
    });
  }

  getGrade(studentId: string, contentId: string): any {
    return this.grades[studentId]?.[contentId] ?? null;
  }

  scoreLabel(grade: any): string {
    if (!grade) return '—';
    if (grade.score != null) return `${(grade.score / 10).toFixed(1)}`;
    return grade.status === 'aprobado' ? '✓' : grade.status === 'rechazado' ? '✗' : '⏳';
  }

  scoreColor(grade: any): string {
    if (!grade) return 'var(--tx3)';
    if (grade.status === 'aprobado')  return grade.score >= 80 ? '#059669' : grade.score >= 60 ? '#B45309' : '#DC2626';
    if (grade.status === 'rechazado') return '#DC2626';
    if (grade.status === 'enviado')   return '#2563EB';
    return 'var(--tx3)';
  }

  private matchFilter(grade: any): boolean {
    if (this.filterStatus === 'Aprobado')    return grade?.status === 'aprobado';
    if (this.filterStatus === 'Rechazado')   return grade?.status === 'rechazado';
    if (this.filterStatus === 'Pendiente')   return grade?.status === 'enviado';
    if (this.filterStatus === 'Sin entregar') return !grade;
    return true;
  }

  /**
   * Los totales de la tabla siguen el filtro. Antes se calculaban sobre
   * TODOS los alumnos: con "Rechazado" no quedaba ninguna fila, pero la
   * fila Promedio seguia mostrando 10.0, y parecia que habia una entrega
   * rechazada con esa calificacion cuando no habia ninguna.
   */
  avgScore(contentId: string): string {
    return this.resumenPieza[contentId]?.promedio ?? '—';
  }

  submittedCount(contentId: string): number {
    return this.resumenPieza[contentId]?.entregadas ?? 0;
  }

  /** Cuantos alumnos se estan mostrando, para los "x de y" del encabezado. */
  get totalMostrado(): number { return this.alumnosFiltrados.length; }

  /** Texto del vacio: nombra el filtro que dejo la tabla sin nadie. */
  get sinResultados(): string {
    const porFiltro: Record<string, string> = {
      'Aprobado':     'Ningún alumno tiene entregas aprobadas todavía.',
      'Rechazado':    'Ningún alumno tiene entregas que hayas pedido corregir.',
      'Pendiente':    'No hay entregas esperando revisión. Todo al corriente.',
      'Sin entregar': 'Todos los alumnos han entregado algo.',
    };
    return porFiltro[this.filterStatus] ?? 'Este salón no tiene alumnos inscritos.';
  }

  typeIcon(type: string): string {
    const m: Record<string, string> = { mision:'🎯', tarea:'📝', quiz:'❓', proyecto:'📦' };
    return m[type] ?? '📄';
  }
}
