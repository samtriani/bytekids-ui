import { Component, AfterViewInit, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { ProgressApiService } from '../../../services/api/progress-api.service';
import { SubmissionApiService } from '../../../services/api/submission-api.service';
import { ContentApiService } from '../../../services/api/content-api.service';
import { AuthService } from '../../../services/auth.service';
import { forkJoin } from 'rxjs';
import { Chart, registerables } from 'chart.js';
import { STUDENT_NAV } from '../shared/student-nav';
import { xpPorSemana } from '../../../shared/xp-semanas';

/** Un paso del camino: una actividad y como va el nino en ella. */
interface Paso {
  id: string; orden: number; titulo: string; tipo: string; icono: string;
  estado: 'aprobada' | 'revision' | 'corregir' | 'siguiente' | 'abierta' | 'bloqueada';
}

/** Cuanto lleva de cada tipo de actividad. */
interface PorTipo { tipo: string; nombre: string; icono: string; hechas: number; total: number; pct: number; }

/** Como el nino vive el aprendizaje: el mismo orden que Mis Actividades. */
const TIPOS: [string, string, string][] = [
  ['material', 'Lecturas', '📚'], ['mision', 'Misiones', '🚀'], ['tarea', 'Investigaciones', '🔍'],
  ['quiz', 'Quizzes', '❓'], ['proyecto', 'Proyecto final', '🏗️'],
];
Chart.register(...registerables);


@Component({
  selector: 'app-student-progress',
  standalone: true,
  imports: [CommonModule, RouterLink, ShellComponent],
  templateUrl: './progress.component.html',
  styleUrls: ['./progress.component.scss']
})
export class ProgressComponent implements OnInit, AfterViewInit {
  @ViewChild('xpLine')     xpLine!: ElementRef;
  @ViewChild('skillBar')   skillBar!: ElementRef;
  @ViewChild('subjectPie') subjectPie!: ElementRef;

  navItems = STUDENT_NAV;
  private COLORS = ['#06B6D4','#7C3AED','#2563EB','#F59E0B','#10B981','#EC4899'];

  // KPIs
  totalXp       = 0;
  xpThisMonth   = 0;
  completedMissions = 0;
  totalMissions     = 0;
  completionPct     = 0;
  streak        = 0;
  activeDays    = 0;   // esta semana

  skillProgress: any[] = [];
  weekActivity:  any[] = [];

  /**
   * Con UNA materia, las graficas por materia no comparan nada: una dona al
   * 100% y una barra sola. En ese caso se cambian por el camino de la
   * materia y el avance por tipo de actividad. Con dos o mas, se quedan.
   * Las materias salen de sus actividades, igual que en el dashboard.
   */
  cargado = false;
  materias: string[] = [];
  get unaMateria(): boolean { return this.materias.length === 1; }
  camino: Paso[] = [];
  porTipo: PorTipo[] = [];
  get pasoSiguiente(): Paso | undefined { return this.camino.find(p => p.estado === 'siguiente'); }

  private barChart:  any;
  private pieChart:  any;
  private lineChart: any;

  get studentName(): string    { return this.auth.getUser()?.displayName || 'Alumno'; }
  get studentInitials(): string { return this.auth.getUser()?.initials || 'A'; }

  constructor(
    private progressApi: ProgressApiService,
    private submissionApi: SubmissionApiService,
    private contentApi: ContentApiService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    forkJoin({
      xp:        this.progressApi.getMyXp(),
      streak:    this.progressApi.getMyStreak(),
      subjects:  this.progressApi.getMySubjects(),
      activity:  this.progressApi.getMyActivity(),
      xpHistory: this.progressApi.getMyXpHistory(),
      subs:      this.submissionApi.getMySubmissions(),
      missions:  this.contentApi.getMyFeed(),
    }).subscribe({
      next: ({ xp, streak, subjects, activity, xpHistory, subs, missions }) => {
        // KPIs
        this.totalXp = xp;
        this.streak  = streak;

        // El estado de cada actividad: la entrega que mas cuenta gana
        // (aprobada > en revision > por corregir).
        const PESO: Record<string, number> = { aprobado: 3, enviado: 2, revisado: 2, rechazado: 1 };
        const estadoDe = new Map<string, string>();
        for (const s of subs as any[]) {
          const id = s.contentId ?? s.content?.id;
          if (!id) continue;
          const prev = estadoDe.get(id);
          if (!prev || (PESO[s.status] ?? 0) > (PESO[prev] ?? 0)) estadoDe.set(id, s.status);
        }

        // Solo las de su feed: una entrega de una materia que ya no lleva no
        // debe contar en su 3/9.
        const approved = (missions as any[]).filter(c => estadoDe.get(c.id) === 'aprobado').length;
        this.completedMissions = approved;
        this.totalMissions     = missions.length;
        this.completionPct     = missions.length ? Math.round(approved / missions.length * 100) : 0;

        this.materias = [...new Set<string>((missions as any[]).map(c => c.subjectName).filter(Boolean))];
        this.armarCamino(missions as any[], estadoDe);
        this.cargado = true;

        // Días activos en los últimos 7 días
        const now = Date.now();
        this.activeDays = activity.filter((a: any) => {
          const d = new Date(a.activityDate ?? a.createdAt ?? 0).getTime();
          return (now - d) < 7 * 86400000 && ((a.missionsCompleted ?? 0) > 0 || (a.xpEarned ?? 0) > 0);
        }).length;

        // XP ganado este mes
        const m = new Date().getMonth(), y = new Date().getFullYear();
        this.xpThisMonth = xpHistory
          .filter((e: any) => { const d = new Date(e.createdAt); return d.getMonth() === m && d.getFullYear() === y; })
          .reduce((s: number, e: any) => s + (e.amount ?? 0), 0);

        // Habilidades por materia
        this.skillProgress = subjects.map((s: any, i: number) => ({
          name:  s.subject?.name ?? `Materia ${i + 1}`,
          icon:  s.subject?.icon ?? '📚',
          level: s.level ?? 1,
          pct:   Math.min(100, ((s.xpInSubject ?? 0) % 200) / 2),
          color: this.COLORS[i % this.COLORS.length],
          xp:    s.xpInSubject ?? 0,
        }));

        // Actividad semanal (últimos 7 registros)
        const days = ['D','S','V','J','X','M','L'];
        this.weekActivity = days.map((day, i) => {
          const a = activity[i];
          return { day, active: !!a?.missionsCompleted, missions: a?.missionsCompleted ?? 0, xp: a?.xpEarned ?? 0 };
        }).reverse();

        // La barra se mide contra el mejor dia de ESTA semana, no contra un
        // numero fijo. Antes era xp/180*100, o sea 180 XP dados por sentados
        // como techo: un dia de 395 XP daba 219% de alto y la barra se salia
        // de la tarjeta, encimandose sobre la grafica de arriba. Y al reves
        // tambien fallaba: una semana floja se veia como puras rayitas.
        // Se calcula aqui y no en la plantilla porque un metodo en el [style]
        // se reevalua en cada ciclo de deteccion de cambios; esto cambia solo
        // cuando llegan datos nuevos.
        const xpDelMejorDia = Math.max(...this.weekActivity.map(d => d.xp), 0);
        for (const d of this.weekActivity) {
          d.alturaPct = (d.active && xpDelMejorDia > 0)
            // El 8% de piso mantiene visible un dia de poco XP; el tope de 100
            // es la red de seguridad si algun dia el maximo llegara torcido.
            ? Math.max(8, Math.min(100, (d.xp / xpDelMejorDia) * 100))
            : 8;
        }

        this.updateCharts(subjects, xpHistory);
      }
    });
  }

  private armarCamino(feed: any[], estadoDe: Map<string, string>): void {
    const ordenadas = [...feed].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    let yaHaySiguiente = false;
    this.camino = ordenadas.map(c => {
      const st = estadoDe.get(c.id);
      let estado: Paso['estado'];
      if (st === 'aprobado') estado = 'aprobada';
      else if (st === 'rechazado') estado = 'corregir';
      else if (st) estado = 'revision';
      else if (c.bloqueada) estado = 'bloqueada';
      else if (!yaHaySiguiente) { estado = 'siguiente'; yaHaySiguiente = true; }
      else estado = 'abierta';
      const t = TIPOS.find(x => x[0] === c.type);
      return { id: c.id, orden: c.orderIndex ?? 0, titulo: c.title, tipo: c.type, icono: t?.[2] ?? '🎯', estado };
    });

    this.porTipo = TIPOS
      .map(([tipo, nombre, icono]) => {
        const de = feed.filter(c => c.type === tipo);
        const hechas = de.filter(c => estadoDe.get(c.id) === 'aprobado').length;
        return { tipo, nombre, icono, hechas, total: de.length, pct: de.length ? Math.round(hechas / de.length * 100) : 0 };
      })
      .filter(t => t.total > 0);
  }

  /** Que le dice cada estado al nino, en una palabra. */
  readonly ETIQUETA: Record<Paso['estado'], string> = {
    aprobada: '¡Lista!', revision: 'En revisión', corregir: 'Por corregir',
    siguiente: 'Te toca', abierta: 'Disponible', bloqueada: 'Bloqueada',
  };

  private updateCharts(subjects: any[], xpHistory: any[]) {
    const labels  = subjects.map((s: any) => s.subject?.name ?? '');
    const xpData  = subjects.map((s: any) => s.xpInSubject ?? 0);
    const pctData = subjects.map((s: any) => Math.min(100, ((s.xpInSubject ?? 0) % 200) / 2));
    const colors  = labels.map((_: any, i: number) => this.COLORS[i % this.COLORS.length]);

    if (this.barChart && labels.length) {
      this.barChart.data.labels = labels;
      this.barChart.data.datasets[0].data = pctData;
      this.barChart.data.datasets[0].backgroundColor = colors;
      this.barChart.update();
    }
    if (this.pieChart && labels.length) {
      this.pieChart.data.labels = labels;
      this.pieChart.data.datasets[0].data = xpData;
      this.pieChart.data.datasets[0].backgroundColor = colors;
      this.pieChart.update();
    }
    // Por semana de verdad: antes cada EVENTO de XP salia como una "Sem".
    const semanas = xpPorSemana(xpHistory, 8);
    if (this.lineChart && semanas.length) {
      this.lineChart.data.labels = semanas.map(s => s.etiqueta);
      this.lineChart.data.datasets[0].data = semanas.map(s => s.acumulado);
      this.lineChart.update();
    }
  }

  ngAfterViewInit() {
    this.lineChart = new Chart(this.xpLine.nativeElement, {
      type: 'line',
      data: { labels: [],
        datasets: [{ label:'XP', data:[], borderColor:'#7C3AED', backgroundColor:'rgba(124,58,237,0.1)', fill:true, tension:.4, pointBackgroundColor:'#7C3AED', pointRadius:5 }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } },
        scales:{ x:{ grid:{ color:'rgba(255,255,255,0.04)' }, ticks:{ color:'#6B7FBB', font:{ family:'Nunito', weight:'bold' } } },
                 y:{ beginAtZero:true, grid:{ color:'rgba(255,255,255,0.04)' }, ticks:{ color:'#6B7FBB', precision:0, font:{ family:'Nunito', weight:'bold' } } } } }
    });
    this.barChart = new Chart(this.skillBar.nativeElement, {
      type: 'bar',
      data: { labels:[], datasets:[{ label:'Nivel %', data:[], backgroundColor:[], borderRadius:8 }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } },
        scales:{ x:{ grid:{ display:false }, ticks:{ color:'#6B7FBB', font:{ family:'Nunito', weight:'bold' } } },
                 y:{ grid:{ color:'rgba(255,255,255,0.04)' }, ticks:{ color:'#6B7FBB', font:{ family:'Nunito', weight:'bold' } }, max:100 } } }
    });
    this.pieChart = new Chart(this.subjectPie.nativeElement, {
      type: 'doughnut',
      data: { labels:[], datasets:[{ data:[], backgroundColor:[], borderWidth:0 }] },
      options: { responsive:true, maintainAspectRatio:false, cutout:'68%',
        plugins:{ legend:{ position:'right', labels:{ color:'#6B7FBB', font:{ family:'Nunito', weight:'bold' }, padding:8, boxWidth:10 } } } }
    });
  }
}

