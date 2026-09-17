import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ShellComponent } from '../../../shared/shell/shell.component';
import { TEACHER_NAV } from '../shared/teacher-nav';
import { ContentApiService } from '../../../services/api/content-api.service';
import { AuthService } from '../../../services/auth.service';
import { catchError, of } from 'rxjs';

type Tipo = 'mision' | 'tarea' | 'quiz' | 'proyecto' | 'material';

const TIPO_META: Record<Tipo, { label: string; icon: string }> = {
  mision:   { label: 'Misión',   icon: '🚀' },
  tarea:    { label: 'Tarea',    icon: '📋' },
  quiz:     { label: 'Quiz',     icon: '❓' },
  proyecto: { label: 'Proyecto', icon: '🏗️' },
  material: { label: 'Material', icon: '📚' },
};

const DIF_LABEL: Record<string, string> = {
  facil: 'Fácil', medio: 'Medio', dificil: 'Difícil',
};

interface Grupo { materia: string; icono: string; color: string; piezas: any[]; xp: number; }

/** Una materia del catalogo, con lo que hace falta para elegirla. */
interface Materia {
  nombre: string;
  icono: string;
  color: string;
  piezas: number;
  xp: number;
}

/**
 * Guia para dar la clase. Vive dentro de content_body bajo la llave
 * teacher_notes, que el backend no le manda al alumno.
 */
export interface Guia {
  objetivo?: string;
  duracion?: string;
  explicar?: string[];
  preguntas?: string[];
  errores?: string[];
  cierre?: string;
}

@Component({
  selector: 'app-teacher-content',
  standalone: true,
  imports: [CommonModule, FormsModule, ShellComponent],
  templateUrl: './content.component.html',
  styleUrls: ['./content.component.scss']
})
export class TeacherContentComponent implements OnInit {
  navItems = TEACHER_NAV;

  readonly TIPO_META = TIPO_META;
  readonly tipos: Tipo[] = ['mision', 'tarea', 'quiz', 'proyecto', 'material'];

  todo: any[] = [];
  loading = true;

  // Filtros
  busqueda   = '';
  tipoFiltro: Tipo | '' = '';

  /** Las materias elegidas. Vacio = todavia no se lista nada. */
  materiasSel: string[] = [];
  /** Lo que se escribe en el autocompletado de materias. */
  materiaBusqueda = '';
  sugerenciasAbiertas = false;

  // Feedback y confirmación
  okMsg    = '';
  errorMsg = '';
  pendiente: any = null;

  constructor(
    private contentApi: ContentApiService,
    private auth: AuthService,
    private router: Router,
  ) {}

  private get miId(): string { return this.auth.getUser()?.userId ?? ''; }

  /**
   * Solo el autor edita. El plan base lo mantiene coordinacion, y el contenido
   * de otro maestro es suyo: el backend rechaza ambos casos, asi que mostrar
   * los botones solo llevaria a un error.
   */
  puedeEditar(c: any): boolean { return !c.basePlan && c.createdById === this.miId; }

  motivoSoloLectura(c: any): string {
    return c.basePlan ? 'Lo mantiene coordinación' : `Lo creó ${c.createdByName ?? 'otro maestro'}`;
  }

  get userName():   string { return this.auth.getUser()?.displayName || 'Maestro'; }
  get userAvatar(): string { return this.auth.getUser()?.initials    || 'MA'; }

  /**
   * Las materias del catalogo, con su color. El color viene del backend en
   * subjectColor y es como se reconoce una materia en toda la plataforma;
   * esta pantalla era la unica que lo ignoraba.
   */
  get materias(): Materia[] {
    const mapa = new Map<string, Materia>();
    for (const c of this.todo) {
      const nombre = c.subjectName || 'Sin materia';
      if (!mapa.has(nombre)) {
        mapa.set(nombre, {
          nombre,
          icono: c.subjectIcon  || '📘',
          color: c.subjectColor || '#7A1535',
          piezas: 0, xp: 0,
        });
      }
      const m = mapa.get(nombre)!;
      m.piezas++;
      m.xp += c.xpReward ?? 0;
    }
    return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  /** Las que faltan por elegir, filtradas por lo que se va escribiendo. */
  get materiasSugeridas(): Materia[] {
    const q = this.materiaBusqueda.trim().toLowerCase();
    return this.materias.filter(m =>
      !this.materiasSel.includes(m.nombre) &&
      (!q || m.nombre.toLowerCase().includes(q)));
  }

  colorDe(nombre: string): string {
    return this.materias.find(m => m.nombre === nombre)?.color ?? '#7A1535';
  }

  iconoDe(nombre: string): string {
    return this.materias.find(m => m.nombre === nombre)?.icono ?? '📘';
  }

  elegirMateria(m: Materia): void {
    if (!this.materiasSel.includes(m.nombre)) this.materiasSel = [...this.materiasSel, m.nombre];
    this.materiaBusqueda = '';
    this.sugerenciasAbiertas = false;
  }

  quitarMateria(nombre: string): void {
    this.materiasSel = this.materiasSel.filter(n => n !== nombre);
  }

  /**
   * El clic en una sugerencia se atiende en mousedown y no en click: el
   * blur del campo cierra la lista antes de que llegue el click, y la
   * eleccion se perderia.
   */
  cerrarSugerencias(): void {
    setTimeout(() => this.sugerenciasAbiertas = false, 120);
  }

  /**
   * Lo que cae dentro de las materias elegidas. Con ninguna elegida es
   * vacio a proposito: al entrar se volcaban las 29 piezas de todas las
   * materias y no habia forma de leer eso.
   */
  get deLasMaterias(): any[] {
    if (!this.materiasSel.length) return [];
    return this.todo.filter(c =>
      this.materiasSel.includes(c.subjectName || 'Sin materia'));
  }

  get filtrado(): any[] {
    const q = this.busqueda.trim().toLowerCase();
    return this.deLasMaterias.filter(c =>
      (!this.tipoFiltro || c.type === this.tipoFiltro) &&
      (!q || (c.title ?? '').toLowerCase().includes(q)
          || (c.description ?? '').toLowerCase().includes(q))
    );
  }

  /** Agrupa por materia y respeta el orden del currículo (order_index). */
  get grupos(): Grupo[] {
    const mapa = new Map<string, Grupo>();
    for (const c of this.filtrado) {
      const materia = c.subjectName || 'Sin materia';
      if (!mapa.has(materia)) {
        mapa.set(materia, {
          materia,
          icono: c.subjectIcon  || '📘',
          color: c.subjectColor || '#7A1535',
          piezas: [], xp: 0,
        });
      }
      const g = mapa.get(materia)!;
      g.piezas.push(c);
      g.xp += c.xpReward ?? 0;
    }
    for (const g of mapa.values()) {
      g.piezas.sort((a, b) => (a.orderIndex ?? 999) - (b.orderIndex ?? 999));
    }
    return [...mapa.values()].sort((a, b) => a.materia.localeCompare(b.materia));
  }

  /**
   * Los numeros de arriba siguen a las materias elegidas, y son del catalogo
   * completo mientras no se elija ninguna. Antes eran siempre del total: con
   * una materia filtrada decian 29 piezas mientras abajo se veian 12.
   */
  private get base(): any[] {
    return this.materiasSel.length ? this.deLasMaterias : this.todo;
  }

  get totalPiezas():  number { return this.base.length; }
  get totalXp():      number { return this.base.reduce((s, c) => s + (c.xpReward ?? 0), 0); }
  get totalMinutos(): number { return this.base.reduce((s, c) => s + (c.estimatedMinutes ?? 0), 0); }
  get sinPublicar():  number { return this.base.filter(c => !c.isPublished).length; }

  /** El conteo del chip cuadra con lo que se va a listar al pulsarlo. */
  conteo(t: Tipo): number { return this.base.filter(c => c.type === t).length; }

  /** Cuantas piezas hay en el catalogo entero, para el texto del selector. */
  get piezasEnCatalogo(): number { return this.todo.length; }

  // ── Guia del maestro ────────────────────────────────────────────────────
  private guiasAbiertas = new Set<string>();

  /** Cache: el getter se llama en cada ciclo de deteccion de cambios. */
  private guiaCache = new Map<string, Guia | null>();

  guia(c: any): Guia | null {
    if (this.guiaCache.has(c.id)) return this.guiaCache.get(c.id)!;
    let g: Guia | null = null;
    try {
      const notas = JSON.parse(c.contentBody ?? '{}')?.teacher_notes;
      if (notas && typeof notas === 'object') g = notas as Guia;
    } catch { /* content_body en texto plano: no hay guia */ }
    this.guiaCache.set(c.id, g);
    return g;
  }

  guiaAbierta(id: string): boolean { return this.guiasAbiertas.has(id); }

  alternarGuia(id: string) {
    this.guiasAbiertas.has(id) ? this.guiasAbiertas.delete(id) : this.guiasAbiertas.add(id);
  }

  ngOnInit() { this.cargar(); }

  private cargar() {
    this.loading = true;
    this.contentApi.getMyContent().pipe(catchError(() => of([]))).subscribe(items => {
      this.todo = items ?? [];
      this.guiaCache.clear();
      this.loading = false;
    });
  }

  limpiarFiltros() {
    this.busqueda = ''; this.tipoFiltro = ''; this.materiasSel = [];
    this.materiaBusqueda = '';
  }

  get hayFiltros(): boolean {
    return !!(this.busqueda || this.tipoFiltro || this.materiasSel.length);
  }

  nuevo() {
    this.router.navigate(['/teacher/create']);
  }

  editar(c: any) {
    this.router.navigate(['/teacher/create'], { queryParams: { edit: c.id } });
  }

  duracion(min: number | null): string {
    if (!min) return '—';
    return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60 ? (min % 60) + ' min' : ''}`.trim();
  }

  difLabel(d: string): string { return DIF_LABEL[d] ?? d ?? '—'; }

  tipoLabel(t: string): string { return TIPO_META[t as Tipo]?.label ?? t; }
  tipoIcon(t: string):  string { return TIPO_META[t as Tipo]?.icon  ?? '📄'; }

  // ── Baja ────────────────────────────────────────────────────────────────
  pedirBaja(c: any) { this.pendiente = c; }
  cancelarBaja()    { this.pendiente = null; }

  confirmarBaja() {
    const c = this.pendiente;
    if (!c) return;
    this.pendiente = null;
    this.okMsg = ''; this.errorMsg = '';

    this.contentApi.delete(c.id).subscribe({
      next: () => {
        this.okMsg = `"${c.title}" se quitó del listado de los alumnos.`;
        this.cargar();
      },
      error: (e) => this.errorMsg = e?.error?.message ?? 'No se pudo quitar el contenido.',
    });
  }

  descartar() { this.okMsg = ''; this.errorMsg = ''; }
}
