import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ShellComponent } from '../../../shared/shell/shell.component';
import { AvatarComponent } from '../../../shared/avatar/avatar.component';
import { TEACHER_NAV } from '../shared/teacher-nav';
import { ESTADOS, EstadoAlumno, NECESITA_ATENCION, estadoValido } from '../shared/seguimiento';
import { ClassroomApiService } from '../../../services/api/classroom-api.service';
import { AuthService } from '../../../services/auth.service';
import { sobreDiez } from '../../../shared/calificacion';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

interface SalonOpcion { id: string; nombre: string; color: string; }

interface Fila {
  id: string; nombre: string; iniciales: string; avatarUrl: string | null;
  hechas: number; progreso: number; promedio: number | null;
  enMes: number; mesAnterior: number; tendencia: '↑' | '↓' | '→';
  estado: EstadoAlumno; razon: string;
}

interface Alerta { icono: string; texto: string; tipo: string; }

/**
 * El reporte de UN salón en UN mes. Antes mezclaba los cuatro salones en una
 * sola tabla, juzgaba "Necesita apoyo" por porcentaje y sus botones de
 * "Exportar PDF" y "Enviar al Director" solo mostraban un aviso: no hacían
 * nada. Los datos salen del mismo seguimiento que el Panel.
 */
@Component({
  selector: 'app-teacher-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ShellComponent, AvatarComponent],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {
  @ViewChild('barC') barC?: ElementRef;
  @ViewChild('semC') semC?: ElementRef;
  navItems = TEACHER_NAV;

  readonly ESTADOS = ESTADOS;
  readonly sobreDiez = sobreDiez;

  teacher: any = null;
  salones: SalonOpcion[] = [];
  salonId = '';
  loading = true;
  cargandoSalon = false;

  periodo = '';
  periodos: string[] = [];

  piezas = 0;
  /** Lo que mandó la API para el salón elegido. */
  private alumnos: any[] = [];

  filas: Fila[] = [];
  alertas: Alerta[] = [];
  kpis = { alumnos: 0, avance: 0, actividades: 0, atencion: 0 };
  semanas: { etiqueta: string; n: number }[] = [];

  private barChart: Chart | null = null;
  private semChart: Chart | null = null;

  get teacherName(): string { return this.teacher?.displayName || 'Maestro'; }
  get teacherInitials(): string { return this.teacher?.initials || 'M'; }
  get salon(): SalonOpcion | null { return this.salones.find(s => s.id === this.salonId) ?? null; }
  get fechaImpresion(): string {
    return new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private classroomApi: ClassroomApiService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.teacher = this.auth.getUser();
    this.armarPeriodos();
    this.classroomApi.getMyClassrooms().pipe(catchError(() => of([]))).subscribe(salones => {
      if (!salones?.length) { this.loading = false; return; }
      forkJoin(salones.map((c: any) =>
        this.classroomApi.getSubjects(c.id || c._id).pipe(catchError(() => of([])))
      )).subscribe(materias => {
        this.salones = salones.map((c: any, i: number) => ({
          id: c.id || c._id,
          nombre: c.name,
          color: (materias as any[][])[i]?.[0]?.color || '#7A1535',
        }));
        // Si viene del Panel o de Mis Salones, abre ese salón.
        const pedido = this.route.snapshot.queryParamMap.get('salon');
        this.loading = false;
        this.elegirSalon(this.salones.find(s => s.id === pedido)?.id ?? this.salones[0].id);
      });
    });
  }

  elegirSalon(id: string): void {
    this.salonId = id;
    // El salón queda en la URL: al recargar o compartir, se abre el mismo.
    this.router.navigate([], { queryParams: { salon: id }, replaceUrl: true });
    this.cargandoSalon = true;
    this.classroomApi.seguimiento(id).pipe(catchError(() => of(null))).subscribe(seg => {
      if (this.salonId !== id) return;
      this.piezas = seg?.piezas ?? 0;
      this.alumnos = seg?.alumnos ?? [];
      this.cargandoSalon = false;
      this.recalcular();
    });
  }

  private armarPeriodos(): void {
    const hoy = new Date();
    this.periodos = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      this.periodos.push(`${MESES[d.getMonth()]} ${d.getFullYear()}`);
    }
    this.periodo = this.periodos[this.periodos.length - 1];
  }

  private mesDe(periodo: string): { mes: number; anio: number } {
    const [m, a] = periodo.split(' ');
    return { mes: MESES.indexOf(m), anio: parseInt(a, 10) };
  }

  private enMes(fechas: string[], mes: number, anio: number): Date[] {
    return fechas.map(f => new Date(f)).filter(d => d.getMonth() === mes && d.getFullYear() === anio);
  }

  /** Todo lo que depende del salón y del mes elegidos. */
  recalcular(): void {
    const { mes, anio } = this.mesDe(this.periodo);
    const antes = new Date(anio, mes - 1, 1);

    this.filas = this.alumnos.map((a: any) => {
      const fechas: string[] = a.actividad ?? [];
      const enMes = this.enMes(fechas, mes, anio).length;
      const mesAnterior = this.enMes(fechas, antes.getMonth(), antes.getFullYear()).length;
      return {
        id: a.id, nombre: a.nombre, iniciales: a.iniciales || '?', avatarUrl: a.avatarUrl ?? null,
        hechas: a.hechas,
        progreso: this.piezas ? Math.min(100, Math.round((a.hechas / this.piezas) * 100)) : 0,
        promedio: a.promedio ?? null,
        enMes, mesAnterior,
        tendencia: enMes > mesAnterior ? '↑' : enMes < mesAnterior ? '↓' : '→',
        estado: estadoValido(a.estado),
        razon: a.razon || '',
      } as Fila;
    }).sort((x, y) => y.progreso - x.progreso);

    // Actividad del salón por semana del mes.
    const cortes = [7, 14, 21, 28, 31];
    this.semanas = cortes.map((fin, i) => ({ etiqueta: `Semana ${i + 1}`, n: 0 }));
    for (const a of this.alumnos) {
      for (const d of this.enMes(a.actividad ?? [], mes, anio)) {
        const i = cortes.findIndex(fin => d.getDate() <= fin);
        this.semanas[i].n++;
      }
    }
    if (!this.semanas[4].n && new Date(anio, mes + 1, 0).getDate() <= 28) this.semanas.pop();

    const atender = this.filas.filter(f => NECESITA_ATENCION.includes(f.estado));
    this.kpis = {
      alumnos: this.filas.length,
      avance: this.filas.length ? Math.round(this.filas.reduce((s, f) => s + f.progreso, 0) / this.filas.length) : 0,
      actividades: this.filas.reduce((s, f) => s + f.enMes, 0),
      atencion: atender.length,
    };

    this.alertas = [];
    for (const f of [...atender].sort((x, y) => ESTADOS[x.estado].orden - ESTADOS[y.estado].orden).slice(0, 5)) {
      this.alertas.push({ icono: ESTADOS[f.estado].icono, texto: `${f.nombre}: ${f.razon}`,
                          tipo: f.estado === 'atorado' ? 'alert-warn' : 'alert-info' });
    }
    const subieron = this.filas.filter(f => f.tendencia === '↑' && f.mesAnterior > 0);
    if (subieron.length) {
      this.alertas.push({ icono: '📈', tipo: 'alert-ok',
        texto: `${subieron.map(f => f.nombre.split(' ')[0]).join(', ')} ${subieron.length === 1 ? 'hizo' : 'hicieron'} más que el mes pasado.` });
    }
    const mejor = this.filas[0];
    if (mejor && mejor.progreso >= 80) {
      this.alertas.push({ icono: '🏅', tipo: 'alert-ok', texto: `${mejor.nombre} lleva ${mejor.progreso}% del temario.` });
    }
    if (!this.alertas.length) {
      this.alertas.push({ icono: '✅', tipo: 'alert-ok', texto: 'Nadie necesita atención en este salón.' });
    }

    setTimeout(() => this.pintar(), 40);
  }

  private pintar(): void {
    this.barChart?.destroy();
    this.semChart?.destroy();
    const color = this.salon?.color || '#7A1535';
    const ticks = { color: '#7A6878', font: { family: 'Nunito', size: 11 } };

    if (this.barC) {
      const filas = this.filas;
      this.barChart = new Chart(this.barC.nativeElement, {
        type: 'bar',
        data: {
          labels: filas.map(f => f.nombre.split(' ')[0]),
          datasets: [{ label: '% del temario', data: filas.map(f => f.progreso),
            backgroundColor: color + 'CC', borderColor: color, borderWidth: 1.5, borderRadius: 5 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: {
            label: (ctx) => `${filas[ctx.dataIndex].progreso}% · ${filas[ctx.dataIndex].hechas} de ${this.piezas} actividades` } } },
          scales: { x: { grid: { display: false }, ticks }, y: { grid: { color: '#EDEEF1' }, ticks: { ...ticks, callback: (v) => v + '%' }, max: 100, min: 0 } },
        },
      });
    }

    if (this.semC) {
      this.semChart = new Chart(this.semC.nativeElement, {
        type: 'bar',
        data: {
          labels: this.semanas.map(s => s.etiqueta),
          datasets: [{ label: 'Actividades', data: this.semanas.map(s => s.n),
            backgroundColor: '#C4992ACC', borderColor: '#C4992A', borderWidth: 1.5, borderRadius: 5 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: {
            label: (ctx) => { const n = ctx.parsed.y as number; return `${n} ${n === 1 ? 'actividad' : 'actividades'}`; } } } },
          scales: { x: { grid: { display: false }, ticks }, y: { grid: { color: '#EDEEF1' }, ticks: { ...ticks, precision: 0 }, beginAtZero: true } },
        },
      });
    }
  }

  /** Imprimir o "Guardar como PDF" del navegador: lo de antes no exportaba nada. */
  imprimir(): void { window.print(); }

  tc(t: string): string { return t === '↑' ? 'var(--ok)' : t === '↓' ? 'var(--danger)' : 'var(--tx3)'; }
}
