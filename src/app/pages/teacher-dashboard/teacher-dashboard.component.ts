import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ShellComponent } from '../../shared/shell/shell.component';
import { AvatarComponent } from '../../shared/avatar/avatar.component';
import { TEACHER_NAV } from '../teacher/shared/teacher-nav';
import { ClassroomApiService } from '../../services/api/classroom-api.service';
import { AuthService } from '../../services/auth.service';
import { sobreDiez } from '../../shared/calificacion';
import { ESTADOS, EstadoAlumno, NECESITA_ATENCION, estadoValido } from '../teacher/shared/seguimiento';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

/** Un alumno visto desde el salón que se está mirando. */
interface AlumnoDelSalon {
  id: string;
  nombre: string;
  iniciales: string;
  avatarUrl: string | null;
  hechas: number;        // entregadas (aunque no estén calificadas) + materiales vistos
  totales: number;       // piezas asignadas al salón
  progreso: number;      // %
  porCalificar: number;  // entregas suyas esperando revisión
  promedio: number | null;
  estado: EstadoAlumno;
  razon: string;
}

interface Salon {
  id: string;
  nombre: string;
  ciclo: string;
  color: string;        // el de su materia, para reconocerlo de un vistazo
  alumnos: AlumnoDelSalon[];
  piezas: number;
  promedio: number;
  porCalificar: number;
  atencion: number;     // alumnos con una alerta concreta
}

interface Alerta {
  icono: string;
  texto: string;
  tipo: string;
  accion?: string;      // etiqueta del botón
  ruta?: string;        // a dónde lleva
  params?: Record<string, string>;
}

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ShellComponent, AvatarComponent],
  templateUrl: './teacher-dashboard.component.html',
  styleUrls: ['./teacher-dashboard.component.scss']
})
export class TeacherDashboardComponent implements OnInit {
  @ViewChild('barC') barC!: ElementRef;
  @ViewChild('pieC') pieC!: ElementRef;
  private barChart: Chart | null = null;
  private pieChart: Chart | null = null;

  // Una sola definicion del menu: tenerlo duplicado aqui hacia que el
  // panel se quedara sin las entradas nuevas.
  navItems = TEACHER_NAV;

  readonly ESTADOS = ESTADOS;
  readonly sobreDiez = sobreDiez;

  teacher: any = null;
  salones: Salon[] = [];
  salonActivoId = '';
  loading = true;

  /** Búsqueda del listado. El maestro con 30 alumnos no scrollea: escribe. */
  busqueda = '';
  /** Desde el KPI de atención: la lista muestra solo a quienes la necesitan. */
  soloAtencion = false;

  constructor(
    private classroomApi: ClassroomApiService,
    private auth: AuthService,
    private router: Router,
  ) {}

  get teacherName(): string     { return this.teacher?.displayName || 'Maestro'; }
  get teacherInitials(): string { return this.teacher?.initials || 'M'; }

  get salon(): Salon | null {
    return this.salones.find(s => s.id === this.salonActivoId) ?? this.salones[0] ?? null;
  }

  /** Primero quienes necesitan atención, en el orden en que conviene atenderlos. */
  get alumnosFiltrados(): AlumnoDelSalon[] {
    const t = this.busqueda.trim().toLowerCase();
    let lista = this.salon?.alumnos ?? [];
    if (this.soloAtencion) lista = lista.filter(a => this.necesita(a));
    if (t) lista = lista.filter(a => a.nombre.toLowerCase().includes(t));
    return [...lista].sort((a, b) => ESTADOS[a.estado].orden - ESTADOS[b.estado].orden);
  }

  necesita(a: AlumnoDelSalon): boolean { return NECESITA_ATENCION.includes(a.estado); }

  ngOnInit(): void {
    this.teacher = this.auth.getUser();
    this.cargar();
  }

  // ── Carga ───────────────────────────────────────────────────────────────
  // Una llamada por salón: el seguimiento ya trae avance y alertas de cada
  // alumno. La regla de quién necesita atención vive en la API, con pruebas.
  private cargar(): void {
    this.classroomApi.getMyClassrooms().pipe(catchError(() => of([]))).subscribe(salones => {
      if (!salones?.length) { this.loading = false; return; }

      forkJoin(
        salones.map((c: any) =>
          forkJoin({
            seg:      this.classroomApi.seguimiento(c.id).pipe(catchError(() => of(null))),
            materias: this.classroomApi.getSubjects(c.id).pipe(catchError(() => of([]))),
          }).pipe(
            map(({ seg, materias }) => this.armarSalon(c, seg, materias)),
          ))
      ).subscribe(resultado => {
        this.salones = resultado as Salon[];
        this.salonActivoId = this.salones[0]?.id ?? '';
        this.loading = false;
        setTimeout(() => this.pintarGraficas(), 60);
      });
    });
  }

  private armarSalon(c: any, seg: any, materias: any[] = []): Salon {
    const piezas: number = seg?.piezas ?? 0;
    const alumnos: AlumnoDelSalon[] = (seg?.alumnos ?? []).map((a: any) => ({
      id: a.id,
      nombre: a.nombre,
      iniciales: a.iniciales || this.iniciales(a.nombre),
      avatarUrl: a.avatarUrl ?? null,
      hechas: a.hechas,
      totales: piezas,
      progreso: piezas ? Math.min(100, Math.round((a.hechas / piezas) * 100)) : 0,
      porCalificar: a.porCalificar,
      promedio: a.promedio ?? null,
      estado: estadoValido(a.estado),
      razon: a.razon || '',
    }));

    return {
      id: c.id,
      nombre: c.name,
      ciclo: c.schoolYear ?? '',
      color: materias?.[0]?.color || '#7C3AED',
      alumnos,
      piezas,
      promedio: alumnos.length
        ? Math.round(alumnos.reduce((s, a) => s + a.progreso, 0) / alumnos.length) : 0,
      porCalificar: alumnos.reduce((s, a) => s + a.porCalificar, 0),
      atencion: alumnos.filter(a => this.necesita(a)).length,
    };
  }

  private iniciales(nombre: string): string {
    return (nombre || '').split(' ').map(p => p[0] || '').join('').slice(0, 2).toUpperCase() || '??';
  }

  private primerNombre(nombre: string): string { return (nombre || '').trim().split(/\s+/)[0]; }

  // ── Alertas: cada una con algo que hacer ────────────────────────────────
  // Una por alumno que necesita atención, con SU razón y el botón para
  // resolverla. "3 alumnos necesitan apoyo" no le decía al maestro qué hacer.
  get alertas(): Alerta[] {
    const s = this.salon;
    if (!s) return [];
    const lista: Alerta[] = [];

    if (!s.piezas) {
      lista.push({
        icono: '📭', tipo: 'alert-warn',
        texto: `${s.nombre} no tiene temario asignado, así que sus alumnos no ven actividades.`,
        accion: 'Ver mis contenidos', ruta: '/teacher/content',
      });
      return lista;
    }

    if (s.porCalificar) {
      lista.push({
        icono: '📝', tipo: 'alert-warn',
        texto: s.porCalificar === 1
          ? 'Hay 1 entrega esperando tu calificación.'
          : `Hay ${s.porCalificar} entregas esperando tu calificación.`,
        accion: 'Calificar', ruta: '/teacher/gradebook', params: { salon: s.id },
      });
    }

    const MAX = 5;
    const atender = s.alumnos.filter(a => this.necesita(a))
      .sort((a, b) => ESTADOS[a.estado].orden - ESTADOS[b.estado].orden);
    for (const a of atender.slice(0, MAX)) {
      const e = ESTADOS[a.estado];
      const revisar = a.estado === 'atorado';
      lista.push({
        icono: e.icono, tipo: revisar ? 'alert-warn' : 'alert-info',
        texto: `${this.primerNombre(a.nombre)}: ${a.razon}`,
        accion: revisar ? 'Revisar' : 'Escribirle',
        ruta: revisar ? '/teacher/gradebook' : '/teacher/messages',
        params: revisar ? { salon: s.id } : { to: a.id },
      });
    }
    if (atender.length > MAX) {
      lista.push({
        icono: '👀', tipo: 'alert-info',
        texto: `Y ${atender.length - MAX} más. Puedes verlos todos en la lista de alumnos.`,
      });
    }

    const mejor = [...s.alumnos].sort((a, b) => b.progreso - a.progreso)[0];
    if (mejor && mejor.progreso >= 80) {
      lista.push({
        icono: '🏅', tipo: 'alert-ok',
        texto: `${mejor.nombre} lleva ${mejor.progreso}% del temario. Va muy bien.`,
      });
    }

    if (!lista.length) {
      lista.push({
        icono: '✅', tipo: 'alert-ok',
        texto: 'Todo al corriente: nadie necesita atención y no hay nada por calificar.',
      });
    }
    return lista;
  }

  // ── Interacción ─────────────────────────────────────────────────────────
  cambiarSalon(id: string): void {
    this.salonActivoId = id;
    this.busqueda = '';
    this.soloAtencion = false;
    setTimeout(() => this.pintarGraficas(), 30);
  }

  // El salon viaja en la URL: mandar al maestro a una lista de TODOS sus
  // alumnos, despues de que hizo clic en el contador de UN salon, lo obliga
  // a volver a filtrar lo que ya habia elegido.
  irALibreta(): void   { this.router.navigate(['/teacher/gradebook'], this.conSalon()); }
  irAAlumnos(): void   { this.router.navigate(['/teacher/students'],  this.conSalon()); }
  irAReportes(): void  { this.router.navigate(['/teacher/reports'],   this.conSalon()); }

  private conSalon() {
    return this.salon ? { queryParams: { salon: this.salon.id } } : {};
  }

  /** Desde el KPI de atención: en vez de solo informar, filtra la lista. */
  verAtencion(): void {
    if (!this.salon?.atencion) return;
    this.soloAtencion = true;
    this.busqueda = '';
    document.querySelector('#lista-alumnos')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  limpiarBusqueda(): void { this.busqueda = ''; }

  // ── Gráficas, siempre del salón visible ─────────────────────────────────
  private pintarGraficas(): void {
    const s = this.salon;
    if (!this.barC || !this.pieC || !s) return;
    this.barChart?.destroy();
    this.pieChart?.destroy();

    const alumnos = s.alumnos;

    // El avance es avance, no un juicio: todas las barras del color del salón.
    this.barChart = new Chart(this.barC.nativeElement, {
      type: 'bar',
      data: {
        labels: alumnos.map(a => a.nombre.split(' ')[0]),
        datasets: [{
          label: '% del temario',
          data: alumnos.map(a => a.progreso),
          backgroundColor: s.color + 'CC',
          borderColor: s.color,
          borderWidth: 1.5, borderRadius: 5,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              // El porcentaje solo no dice nada: 50% de 2 no es 50% de 17.
              label: (ctx) => {
                const a = alumnos[ctx.dataIndex];
                return `${a.progreso}% · ${a.hechas} de ${a.totales} actividades`;
              },
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#7A6878', font: { family: 'Nunito', size: 11 } } },
          y: { grid: { color: '#EDEEF1' }, ticks: { color: '#7A6878', font: { family: 'Nunito', size: 11 }, callback: (v) => v + '%' }, max: 100 },
        },
      },
    });

    // ¿Cómo va el grupo? "Va bien" junta a los recién llegados: no hay
    // nada que hacer con ellos todavía.
    const grupos: { etiqueta: string; color: string; n: number }[] = [
      { etiqueta: 'Va bien',              color: ESTADOS.bien.color,                 n: alumnos.filter(a => a.estado === 'bien' || a.estado === 'nuevo').length },
      { etiqueta: 'Atorados',             color: ESTADOS.atorado.color,              n: alumnos.filter(a => a.estado === 'atorado').length },
      { etiqueta: 'Sin empezar',          color: ESTADOS.sin_empezar.color,          n: alumnos.filter(a => a.estado === 'sin_empezar').length },
      { etiqueta: 'Sin actividad',        color: ESTADOS.sin_actividad.color,        n: alumnos.filter(a => a.estado === 'sin_actividad').length },
      { etiqueta: 'Calificaciones bajas', color: ESTADOS.calificaciones_bajas.color, n: alumnos.filter(a => a.estado === 'calificaciones_bajas').length },
    ].filter(g => g.n > 0);

    this.pieChart = new Chart(this.pieC.nativeElement, {
      type: 'doughnut',
      data: {
        labels: grupos.map(g => `${g.etiqueta} (${g.n})`),
        datasets: [{ data: grupos.map(g => g.n), backgroundColor: grupos.map(g => g.color), borderWidth: 0 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { color: '#3D2D3A', font: { family: 'Nunito', size: 11 }, padding: 10, boxWidth: 10 } },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const n = ctx.parsed as number;
                return `${n} ${n === 1 ? 'alumno' : 'alumnos'}`;
              },
            },
          },
        },
      },
    });
  }
}
