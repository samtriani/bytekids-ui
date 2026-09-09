import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShellComponent } from '../../../shared/shell/shell.component';
import { TEACHER_NAV } from '../shared/teacher-nav';
import { ClassroomApiService } from '../../../services/api/classroom-api.service';
import { ProgressApiService } from '../../../services/api/progress-api.service';
import { SubmissionApiService } from '../../../services/api/submission-api.service';
import { AuthService } from '../../../services/auth.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-teacher-classrooms',
  standalone: true,
  imports: [CommonModule, RouterLink, ShellComponent],
  templateUrl: './classrooms.component.html',
  styleUrls: ['./classrooms.component.scss']
})
export class ClassroomsComponent implements OnInit {
  @ViewChild('radC') radC!: ElementRef;
  navItems = TEACHER_NAV;

  teacher: any = null;
  rooms: any[] = [];
  sel: any = null;
  loading = true;
  private chart: Chart | null = null;

  get teacherName(): string { return this.teacher?.displayName || 'Maestro'; }
  get teacherInitials(): string { return this.teacher?.initials || 'M'; }
  /**
   * Un alumno inscrito en dos salones es UN alumno. Sumar los conteos de
   * cada salon lo contaba dos veces: decia 3 con dos alumnos reales.
   */
  get totalStudents(): number {
    const ids = new Set<string>();
    this.rooms.forEach(r => (r.studentIds ?? []).forEach((id: string) => ids.add(id)));
    return ids.size || this.rooms.reduce((s, r) => s + r.students, 0);
  }
  get globalAvg(): number {
    if (!this.rooms.length) return 0;
    return Math.round(this.rooms.reduce((s, r) => s + r.avg, 0) / this.rooms.length);
  }

  constructor(
    private classroomApi: ClassroomApiService,
    private progressApi: ProgressApiService,
    private submissionApi: SubmissionApiService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.teacher = this.auth.getUser();
    this.loadClassrooms();
  }

  private loadClassrooms(): void {
    this.classroomApi.getMyClassrooms().pipe(
      switchMap(classrooms => {
        if (!classrooms.length) return of([]);
        return forkJoin(classrooms.map(c => {
          const cid = c._id || c.id;
          return this.classroomApi.getStudents(cid).pipe(
            switchMap(students => {
              if (!students.length) return of({ classroom: c, enriched: [] });
              return forkJoin(students.map(s => {
                const sid = s._id || s.id;
                return forkJoin({
                  student: of(s),
                  subjects: this.progressApi.getStudentSubjects(sid).pipe(catchError(() => of([]))),
                  activity: this.progressApi.getStudentActivity(sid).pipe(catchError(() => of([]))),
                });
              })).pipe(map(enriched => ({ classroom: c, enriched })));
            }),
            catchError(() => of({ classroom: c, enriched: [] }))
          );
        }));
      }),
      catchError(() => of([]))
    ).subscribe(results => {
      this.rooms = (results as any[]).map(r => this.buildRoom(r));
      this.sel = this.rooms[0] || null;
      this.loading = false;
      setTimeout(() => this.renderChart(), 80);
      this.cargarMaterias();
      this.corregirPromedios();
    });
  }

  /**
   * El promedio se estimaba con xpInSubject/5 --500 XP = 100%--, que mide
   * cuanto XP junto el alumno, no cuanto del temario lleva. El Panel, la
   * Libreta y Reportes ya usan el avance real, y ver tres cifras distintas
   * del mismo alumno en el mismo modulo es peor que verlas todas mal.
   */
  /** Las materias que imparte el salon, no las que cursan sus alumnos. */
  private cargarMaterias(): void {
    if (!this.rooms.length) return;
    forkJoin(this.rooms.map((r: any) =>
      this.classroomApi.getSubjects(r._id || r.id).pipe(catchError(() => of([])))
    )).subscribe(listas => {
      (listas as any[][]).forEach((materias, i) => {
        this.rooms[i].subjects = (materias ?? []).map((m: any) => m.name).filter(Boolean);
        this.rooms[i].color    = materias?.[0]?.color || '#7A1535';
      });
      if (this.sel) {
        this.sel = this.rooms.find((r: any) => (r._id || r.id) === (this.sel._id || this.sel.id)) ?? this.sel;
      }
    });
  }

  private corregirPromedios(): void {
    if (!this.rooms.length) return;
    forkJoin(this.rooms.map((r: any) =>
      this.submissionApi.getGradebook(r._id || r.id).pipe(catchError(() => of(null)))
    )).subscribe(libretas => {
      // Se recalcula TODO lo que depende del promedio, no solo el numero.
      // Al corregir solo avg, el encabezado seguia diciendo "Promedio del
      // 18%" --texto armado con el valor viejo-- mientras la tarjeta decia
      // 8%. Dos cifras distintas del mismo salon en la misma pantalla.
      (libretas as any[]).forEach((l, i) => this.aplicarLibreta(this.rooms[i], l));
      if (this.sel) {
        this.sel = this.rooms.find((r: any) => (r._id || r.id) === (this.sel._id || this.sel.id)) ?? this.sel;
      }
      setTimeout(() => this.renderChart(), 40);
    });
  }

  /**
   * Vuelca la libreta sobre el salon: promedio, piezas del temario, avance
   * de cada alumno y quien va al frente. Todo del MISMO salon.
   */
  private aplicarLibreta(room: any, libreta: any): void {
    if (!libreta) return;
    const contenidos: any[] = libreta.content   ?? [];
    const materiales: any[] = libreta.materials ?? [];
    const alumnos: any[]    = libreta.students  ?? [];
    const piezas = contenidos.length + materiales.length;
    const grades = libreta.grades ?? {};
    const reads  = libreta.reads  ?? {};

    const avances = alumnos.map(a => {
      const suyas  = grades[a.id] ?? {};
      const leidos = reads[a.id]  ?? {};
      const hechas = contenidos.filter(c => suyas[c.id]?.status === 'aprobado').length
                   + materiales.filter(m => leidos[m.id]).length;
      const porCalificar = contenidos.filter(c => suyas[c.id]?.status === 'enviado').length;
      return {
        id: a.id,
        nombre: a.name,
        hechas, porCalificar,
        prog: piezas ? Math.round((hechas / piezas) * 100) : 0,
      };
    });

    room.studentIds  = alumnos.map(a => a.id);
    room.students    = alumnos.length;
    room.piezas      = piezas;
    room.avances     = avances;
    room.porCalificar = avances.reduce((s, a) => s + a.porCalificar, 0);
    room.avg = avances.length
      ? Math.round(avances.reduce((s, a) => s + a.prog, 0) / avances.length) : 0;

    const mejor = [...avances].sort((a, b) => b.prog - a.prog)[0];
    room.topStudent = mejor?.nombre ?? '—';

    // El estado y su texto se rearman con el promedio ya corregido.
    room.status = !piezas ? 'warn'
                : room.avg >= 80 ? 'excellent'
                : room.avg < 65  ? 'warn' : 'ok';
    room.up = room.avg >= 65;
    room.desc = !piezas
      ? 'Sin temario asignado: sus alumnos todavía no ven actividades.'
      : room.status === 'excellent'
        ? `Grupo de alto rendimiento. Promedio del ${room.avg}% del temario.`
        : room.status === 'warn'
          ? `Promedio del ${room.avg}% de las ${piezas} actividades del temario.`
          : `Grupo en progreso. Promedio del ${room.avg}% del temario.`;
  }

  /** Aprobadas + materiales leidos sobre las piezas asignadas al salon. */
  private promedioDeLibreta(libreta: any): number | null {
    if (!libreta) return null;
    const contenidos: any[] = libreta.content   ?? [];
    const materiales: any[] = libreta.materials ?? [];
    const alumnos: any[]    = libreta.students  ?? [];
    const piezas = contenidos.length + materiales.length;
    if (!piezas || !alumnos.length) return 0;

    const grades = libreta.grades ?? {};
    const reads  = libreta.reads  ?? {};
    const suma = alumnos.reduce((acc, a) => {
      const suyas  = grades[a.id] ?? {};
      const leidos = reads[a.id]  ?? {};
      const hechas = contenidos.filter(c => suyas[c.id]?.status === 'aprobado').length
                   + materiales.filter(m => leidos[m.id]).length;
      return acc + Math.round((hechas / piezas) * 100);
    }, 0);
    return Math.round(suma / alumnos.length);
  }

  private buildRoom(data: { classroom: any; enriched: any[] }): any {
    const { classroom, enriched } = data;
    const now = Date.now();

    const studentProgs = enriched.map(e => this.calcStudentProg(e.subjects));
    const avg = studentProgs.length
      ? Math.round(studentProgs.reduce((s, p) => s + p, 0) / studentProgs.length) : 0;

    const active = enriched.filter(e =>
      e.activity.some((a: any) => now - new Date(a.activityDate).getTime() < 48 * 3600000)
    ).length;

    const missions = enriched.reduce((s, e) =>
      s + e.activity.reduce((acc: number, a: any) => acc + (a.missionsCompleted ?? 0), 0), 0);

    // Las materias del salon se piden aparte, en cargarMaterias(). Aqui se
    // sacaban del progreso de los ALUMNOS, y un alumno inscrito en dos
    // salones arrastra las materias del otro: por eso los dos salones
    // mostraban las mismas dos materias.
    const subjects: string[] = [];
    const subjectAvgs: number[] = [];

    // Top student
    const topIdx = studentProgs.length ? studentProgs.indexOf(Math.max(...studentProgs)) : -1;
    const topStudent = topIdx >= 0 ? (enriched[topIdx]?.student?.displayName || '—') : '—';

    // Weekly activity (last 7 days), scaled 0-100
    const weekly = Array(7).fill(0);
    enriched.forEach(e => e.activity.forEach((a: any) => {
      const d = Math.floor((now - new Date(a.activityDate).getTime()) / 86400000);
      if (d >= 0 && d < 7) weekly[6 - d] += (a.missionsCompleted ?? 1);
    }));
    const maxW = Math.max(...weekly, 1);
    const weeklyScaled = weekly.map(v => Math.round((v / maxW) * 100));

    const status = avg >= 80 ? 'excellent' : avg < 65 ? 'warn' : 'ok';
    const desc = status === 'excellent'
      ? `Grupo de alto rendimiento. Promedio del ${avg}%.`
      : status === 'warn'
      ? `Requiere atención. Promedio del ${avg}%, por debajo de la meta.`
      : `Grupo en progreso. Promedio del ${avg}%.`;

    return {
      _id: classroom._id || classroom.id,
      name: classroom.name,
      students: enriched.length,
      avg, active, missions, subjects, subjectAvgs,
      status, weekly: weeklyScaled, topStudent, desc,
      up: avg >= 65,
    };
  }

  private calcStudentProg(subjects: any[]): number {
    if (!subjects.length) return 0;
    const sum = subjects.reduce((s, sub) => s + this.subjectProgress(sub), 0);
    return Math.round(sum / subjects.length);
  }

  private subjectProgress(sub: any): number {
    // xpInSubject de la API: 500 XP = 100%
    return Math.min(100, Math.round((sub.xpInSubject ?? 0) / 5));
  }

  select(r: any): void {
    this.sel = r;
    setTimeout(() => this.renderChart(), 50);
  }

  /**
   * Barras horizontales de avance por alumno.
   *
   * Antes era un radar "por materia" con dos problemas: los datos venian del
   * progreso de los ALUMNOS --asi que un salon mostraba las materias del
   * otro-- y un radar de dos ejes degenera en una linea vertical, que es
   * literalmente lo que se veia. Un radar necesita tres ejes o mas para
   * significar algo.
   *
   * Quien va adelante y quien atras en ESTE salon si es una pregunta que el
   * maestro se hace, y con pocos alumnos se lee mejor en barras.
   */
  renderChart(): void {
    if (!this.radC || !this.sel) return;
    this.chart?.destroy();

    const avances: any[] = [...(this.sel.avances ?? [])].sort((a, b) => b.prog - a.prog);
    const piezas = this.sel.piezas ?? 0;

    this.chart = new Chart(this.radC.nativeElement, {
      type: 'bar',
      data: {
        labels: avances.length ? avances.map(a => a.nombre.split(' ')[0]) : ['Sin alumnos'],
        datasets: [{
          data: avances.length ? avances.map(a => a.prog) : [0],
          backgroundColor: avances.map(a => this.barColor(a.prog) + 'CC'),
          borderColor: avances.map(a => this.barColor(a.prog)),
          borderWidth: 1.5,
          borderRadius: 5,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              // El porcentaje solo no dice nada sin el tamano del temario.
              label: (ctx) => {
                const a = avances[ctx.dataIndex];
                return a ? `${a.prog}% · ${a.hechas} de ${piezas} actividades` : '';
              },
            },
          },
        },
        scales: {
          x: { max: 100, grid: { color: '#EDEEF1' },
               ticks: { color: '#7A6878', font: { family: 'Nunito', size: 11 },
                        callback: (v) => v + '%' } },
          y: { grid: { display: false },
               ticks: { color: '#3D2D3A', font: { family: 'Nunito', size: 11, weight: 'bold' } } },
        },
      },
    });
  }

  private barColor(p: number): string {
    return p >= 80 ? '#1A6B3C' : p < 40 ? '#9B1414' : '#C4992A';
  }

  rc(avg: number): string { return avg >= 80 ? 'var(--ok)' : avg < 65 ? 'var(--danger)' : 'var(--guinda)'; }
}
