import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../shared/shell/shell.component';
import { ClassroomApiService } from '../../services/api/classroom-api.service';
import { SubmissionApiService } from '../../services/api/submission-api.service';
import { AuthService } from '../../services/auth.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

/** Un alumno visto desde el salón que se está mirando. */
interface AlumnoDelSalon {
  id: string;
  nombre: string;
  iniciales: string;
  hechas: number;        // aprobadas + materiales leídos
  totales: number;       // piezas asignadas al salón
  progreso: number;      // %
  porCalificar: number;  // entregas suyas esperando revisión
  rechazadas: number;
  sinEmpezar: boolean;
  estado: 'Excelente' | 'Bien' | 'Regular' | 'Apoyo' | 'Sin empezar';
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
  enRiesgo: number;
}

interface Alerta {
  icono: string;
  texto: string;
  tipo: string;
  accion?: string;      // etiqueta del botón
  ruta?: string;        // a dónde lleva
}

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ShellComponent],
  templateUrl: './teacher-dashboard.component.html',
  styleUrls: ['./teacher-dashboard.component.scss']
})
export class TeacherDashboardComponent implements OnInit {
  @ViewChild('barC') barC!: ElementRef;
  @ViewChild('pieC') pieC!: ElementRef;
  private barChart: Chart | null = null;
  private pieChart: Chart | null = null;

  navItems: NavItem[] = [
    { label: 'Mi Panel',        icon: '🏠', route: '/teacher' },
    { label: 'Mis Salones',     icon: '🏫', route: '/teacher/classrooms' },
    { label: 'Alumnos',         icon: '👨‍🎓', route: '/teacher/students' },
    { label: 'Libreta',         icon: '📋', route: '/teacher/gradebook' },
    { label: 'Crear Contenido', icon: '📝', route: '/teacher/create' },
    { label: 'Mis Contenidos',  icon: '📚', route: '/teacher/content' },
    { label: 'Asistente IA',    icon: '🤖', route: '/teacher/ai-assistant', badge: 'IA' },
    { label: 'Reportes',        icon: '📊', route: '/teacher/reports' },
    { label: 'Calendario',      icon: '📅', route: '/teacher/calendar' },
    { label: 'Mensajes',        icon: '💬', route: '/teacher/messages' },
  ];

  teacher: any = null;
  salones: Salon[] = [];
  salonActivoId = '';
  loading = true;

  /** Búsqueda del listado. El maestro con 30 alumnos no scrollea: escribe. */
  busqueda = '';

  constructor(
    private classroomApi: ClassroomApiService,
    private submissionApi: SubmissionApiService,
    private auth: AuthService,
    private router: Router,
  ) {}

  get teacherName(): string     { return this.teacher?.displayName || 'Maestro'; }
  get teacherInitials(): string { return this.teacher?.initials || 'M'; }

  get salon(): Salon | null {
    return this.salones.find(s => s.id === this.salonActivoId) ?? this.salones[0] ?? null;
  }

  get alumnosFiltrados(): AlumnoDelSalon[] {
    const t = this.busqueda.trim().toLowerCase();
    const lista = this.salon?.alumnos ?? [];
    return t ? lista.filter(a => a.nombre.toLowerCase().includes(t)) : lista;
  }

  ngOnInit(): void {
    this.teacher = this.auth.getUser();
    this.cargar();
  }

  // ── Carga ───────────────────────────────────────────────────────────────
  // Una sola llamada por salón: la libreta ya trae alumnos, piezas asignadas,
  // calificaciones y materiales leídos. Antes eran tres llamadas POR ALUMNO
  // a endpoints de progreso que ni siquiera traían el dato que se usaba.
  private cargar(): void {
    this.classroomApi.getMyClassrooms().pipe(catchError(() => of([]))).subscribe(salones => {
      if (!salones?.length) { this.loading = false; return; }

      forkJoin(
        salones.map((c: any) =>
          forkJoin({
            libreta:  this.submissionApi.getGradebook(c.id).pipe(catchError(() => of(null))),
            materias: this.classroomApi.getSubjects(c.id).pipe(catchError(() => of([]))),
          }).pipe(
            map(({ libreta, materias }) => this.armarSalon(c, libreta, materias)),
          ))
      ).subscribe(resultado => {
        this.salones = resultado as Salon[];
        this.salonActivoId = this.salones[0]?.id ?? '';
        this.loading = false;
        setTimeout(() => this.pintarGraficas(), 60);
      });
    });
  }

  private armarSalon(c: any, libreta: any, materias: any[] = []): Salon {
    const alumnosRaw: any[] = libreta?.students ?? [];
    const contenidos: any[] = libreta?.content   ?? [];
    const materiales: any[] = libreta?.materials ?? [];
    const grades  = libreta?.grades ?? {};
    const reads   = libreta?.reads  ?? {};
    const piezas  = contenidos.length + materiales.length;

    const alumnos: AlumnoDelSalon[] = alumnosRaw.map(a => {
      const suyas   = grades[a.id] ?? {};
      const leidos  = reads[a.id]  ?? {};

      let aprobadas = 0, porCalificar = 0, rechazadas = 0, entregas = 0;
      for (const c of contenidos) {
        const g = suyas[c.id];
        if (!g) continue;
        entregas++;
        if (g.status === 'aprobado')  aprobadas++;
        else if (g.status === 'enviado')   porCalificar++;
        else if (g.status === 'rechazado') rechazadas++;
      }
      const materialesVistos = materiales.filter(m => leidos[m.id]).length;

      const hechas   = aprobadas + materialesVistos;
      const progreso = piezas ? Math.round((hechas / piezas) * 100) : 0;

      return {
        id: a.id,
        nombre: a.name,
        iniciales: a.initials || this.iniciales(a.name),
        hechas, totales: piezas, progreso, porCalificar, rechazadas,
        sinEmpezar: entregas === 0 && materialesVistos === 0,
        estado: this.estadoDe(progreso, entregas === 0 && materialesVistos === 0),
      };
    });

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
      enRiesgo: alumnos.filter(a => a.progreso < 40).length,
    };
  }

  private iniciales(nombre: string): string {
    return (nombre || '').split(' ').map(p => p[0] || '').join('').slice(0, 2).toUpperCase() || '??';
  }

  private estadoDe(p: number, sinEmpezar: boolean): AlumnoDelSalon['estado'] {
    if (sinEmpezar) return 'Sin empezar';
    return p >= 80 ? 'Excelente' : p >= 60 ? 'Bien' : p >= 40 ? 'Regular' : 'Apoyo';
  }

  // ── Alertas: cada una con algo que hacer ────────────────────────────────
  // Las de antes eran informativas y algunas falsas: "lleva varios días sin
  // actividad" salía de leer un campo que la API no manda, así que le tocaba
  // a todos por igual.
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
        accion: 'Calificar', ruta: '/teacher/gradebook',
      });
    }

    const sinEmpezar = s.alumnos.filter(a => a.sinEmpezar);
    if (sinEmpezar.length) {
      lista.push({
        icono: '🔕', tipo: 'alert-info',
        texto: sinEmpezar.length === 1
          ? `${sinEmpezar[0].nombre} todavía no entrega nada.`
          : `${sinEmpezar.length} alumnos todavía no entregan nada.`,
        accion: 'Escribirles', ruta: '/teacher/messages',
      });
    }

    const conRechazo = s.alumnos.filter(a => a.rechazadas > 0);
    if (conRechazo.length) {
      lista.push({
        icono: '↩️', tipo: 'alert-info',
        texto: `${conRechazo.length} ${conRechazo.length === 1 ? 'alumno tiene una entrega' : 'alumnos tienen entregas'} que pediste corregir.`,
        accion: 'Revisar', ruta: '/teacher/gradebook',
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
        texto: 'Todo al corriente: nada pendiente de calificar en este salón.',
      });
    }
    return lista;
  }

  // ── Interacción ─────────────────────────────────────────────────────────
  cambiarSalon(id: string): void {
    this.salonActivoId = id;
    this.busqueda = '';
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

  /** Desde el KPI de riesgo: en vez de solo informar, filtra la lista. */
  verEnRiesgo(): void {
    const enRiesgo = (this.salon?.alumnos ?? []).filter(a => a.progreso < 40);
    if (enRiesgo.length === 1) this.busqueda = enRiesgo[0].nombre;
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
    const excelente = alumnos.filter(a => a.progreso >= 80).length;
    const medio     = alumnos.filter(a => a.progreso >= 40 && a.progreso < 80).length;
    const apoyo     = alumnos.filter(a => a.progreso < 40).length;

    this.barChart = new Chart(this.barC.nativeElement, {
      type: 'bar',
      data: {
        labels: alumnos.map(a => a.nombre.split(' ')[0]),
        datasets: [{
          label: '% del temario',
          data: alumnos.map(a => a.progreso),
          backgroundColor: alumnos.map(a => this.pc(a.progreso) + 'CC'),
          borderColor: alumnos.map(a => this.pc(a.progreso)),
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

    this.pieChart = new Chart(this.pieC.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Excelente (80%+)', 'En camino (40-79%)', 'Necesita apoyo (<40%)'],
        datasets: [{ data: [excelente, medio, apoyo],
          backgroundColor: ['#1A6B3C', '#C4992A', '#9B1414'], borderWidth: 0 }],
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

  pc(p: number): string { return p >= 80 ? '#1A6B3C' : p < 40 ? '#9B1414' : '#C4992A'; }

  sc(estado: string): string {
    return estado === 'Excelente'   ? 'tag-green'
         : estado === 'Apoyo'       ? 'tag-red'
         : estado === 'Sin empezar' ? 'tag-gray'
         : 'tag-oro';
  }
}
