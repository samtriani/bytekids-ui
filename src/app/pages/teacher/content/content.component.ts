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

interface Grupo { materia: string; icono: string; piezas: any[]; xp: number; }

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
  matFiltro  = '';

  // Feedback y confirmación
  okMsg    = '';
  errorMsg = '';
  pendiente: any = null;

  constructor(
    private contentApi: ContentApiService,
    private auth: AuthService,
    private router: Router,
  ) {}

  get userName():   string { return this.auth.getUser()?.displayName || 'Maestro'; }
  get userAvatar(): string { return this.auth.getUser()?.initials    || 'MA'; }

  get materias(): string[] {
    return [...new Set(this.todo.map(c => c.subjectName).filter(Boolean))].sort();
  }

  get filtrado(): any[] {
    const q = this.busqueda.trim().toLowerCase();
    return this.todo.filter(c =>
      (!this.tipoFiltro || c.type === this.tipoFiltro) &&
      (!this.matFiltro  || c.subjectName === this.matFiltro) &&
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
        mapa.set(materia, { materia, icono: c.subjectIcon || '📘', piezas: [], xp: 0 });
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

  // KPIs sobre el total, no sobre lo filtrado
  get totalPiezas():  number { return this.todo.length; }
  get totalXp():      number { return this.todo.reduce((s, c) => s + (c.xpReward ?? 0), 0); }
  get totalMinutos(): number { return this.todo.reduce((s, c) => s + (c.estimatedMinutes ?? 0), 0); }
  get sinPublicar():  number { return this.todo.filter(c => !c.isPublished).length; }

  conteo(t: Tipo): number { return this.todo.filter(c => c.type === t).length; }

  ngOnInit() { this.cargar(); }

  private cargar() {
    this.loading = true;
    this.contentApi.getMyContent().pipe(catchError(() => of([]))).subscribe(items => {
      this.todo = items ?? [];
      this.loading = false;
    });
  }

  limpiarFiltros() {
    this.busqueda = ''; this.tipoFiltro = ''; this.matFiltro = '';
  }

  get hayFiltros(): boolean {
    return !!(this.busqueda || this.tipoFiltro || this.matFiltro);
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
