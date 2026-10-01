import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShellComponent } from '../../../shared/shell/shell.component';
import { AvatarComponent } from '../../../shared/avatar/avatar.component';
import { AuthService } from '../../../services/auth.service';
import { FamiliaApiService, Hijo } from '../../../services/api/familia-api.service';
import { PARENT_NAV } from '../shared/parent-nav';
import { primerNombre } from '../shared/familia';

/** Un color por hijo, para distinguir sus puntos en el mes. */
const COLORES = ['#7A1535', '#2563EB', '#C4992A', '#1A6B3C', '#7C3AED', '#EC4899'];

interface Celda { fecha: string | null; dia: number | null; hoy: boolean; quien: { color: string; xp: number; nombre: string }[]; }

/**
 * El calendario de la familia: que dias estudio cada hijo y cuando tiene
 * clases en vivo.
 *
 * Antes pedia los salones del nino a /classrooms/student/{id}, una ruta que
 * no deja entrar a papas: fallaba en silencio y el calendario salia vacio
 * siempre. Ahora todo sale de /familia/hijos.
 */
@Component({
  selector: 'app-parent-calendar',
  standalone: true,
  imports: [CommonModule, ShellComponent, AvatarComponent],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
})
export class CalendarComponent implements OnInit {
  navItems = PARENT_NAV;
  parentName = '';
  parentInitials = '';

  hijos: Hijo[] = [];
  cargando = true;
  error = false;

  mes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  semanas: Celda[][] = [];
  readonly DIAS_CORTOS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  readonly primerNombre = primerNombre;

  /** Las clases de todos los hijos, ordenadas de lunes a domingo. */
  clases: { hijo: Hijo; color: string; dia: string; orden: number; inicio: string; fin: string; materia: string }[] = [];

  private readonly ORDEN_DIA: Record<string, [number, string]> = {
    lunes: [1, 'Lunes'], monday: [1, 'Lunes'], martes: [2, 'Martes'], tuesday: [2, 'Martes'],
    miercoles: [3, 'Miércoles'], 'miércoles': [3, 'Miércoles'], wednesday: [3, 'Miércoles'],
    jueves: [4, 'Jueves'], thursday: [4, 'Jueves'], viernes: [5, 'Viernes'], friday: [5, 'Viernes'],
    sabado: [6, 'Sábado'], 'sábado': [6, 'Sábado'], saturday: [6, 'Sábado'],
    domingo: [7, 'Domingo'], sunday: [7, 'Domingo'],
  };

  constructor(private familia: FamiliaApiService, private auth: AuthService) {}

  ngOnInit(): void {
    const user = this.auth.getUser();
    this.parentName = user?.displayName || 'Familia';
    this.parentInitials = user?.initials || 'F';
    this.familia.hijos().subscribe({
      next: hijos => {
        this.hijos = hijos;
        this.clases = hijos.flatMap((h, i) => h.clases.map(c => {
          const [orden, dia] = this.ORDEN_DIA[(c.dia || '').toLowerCase()] ?? [8, c.dia];
          return { hijo: h, color: this.color(i), dia, orden, inicio: (c.inicio || '').slice(0, 5),
                   fin: (c.fin || '').slice(0, 5), materia: c.materia || c.salon };
        })).sort((a, b) => a.orden - b.orden || a.inicio.localeCompare(b.inicio));
        this.armarMes();
        this.cargando = false;
      },
      error: () => { this.cargando = false; this.error = true; },
    });
  }

  color(i: number): string { return COLORES[i % COLORES.length]; }

  get tituloMes(): string {
    const t = this.mes.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  get esEsteMes(): boolean {
    const h = new Date();
    return this.mes.getFullYear() === h.getFullYear() && this.mes.getMonth() === h.getMonth();
  }

  /**
   * /familia/hijos trae los ultimos 70 dias de actividad. Un mes mas viejo
   * saldria "sin actividad" sin ser cierto: no se deja ir hasta alla.
   */
  get puedeAtras(): boolean {
    const limite = new Date(Date.now() - 70 * 86400000);
    return this.mes > new Date(limite.getFullYear(), limite.getMonth(), 1);
  }

  cambiarMes(delta: number): void {
    this.mes = new Date(this.mes.getFullYear(), this.mes.getMonth() + delta, 1);
    this.armarMes();
  }

  /** Dias del mes con actividad, de cualquier hijo. */
  get diasActivos(): number {
    return this.semanas.flat().filter(c => c.quien.length).length;
  }

  private armarMes(): void {
    const y = this.mes.getFullYear(), m = this.mes.getMonth();
    const hoy = new Date();
    const clave = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const hoyClave = clave(hoy);

    // fecha → quien estudio ese dia
    const porDia = new Map<string, { color: string; xp: number; nombre: string }[]>();
    this.hijos.forEach((h, i) => h.xpReciente.forEach(d => {
      if (d.xp <= 0) return;
      const lista = porDia.get(d.fecha) ?? [];
      lista.push({ color: this.color(i), xp: d.xp, nombre: primerNombre(h.nombre) });
      porDia.set(d.fecha, lista);
    }));

    const primero = new Date(y, m, 1);
    const vacias = (primero.getDay() + 6) % 7;   // lunes primero
    const ultimo = new Date(y, m + 1, 0).getDate();
    const celdas: Celda[] = [];
    for (let i = 0; i < vacias; i++) celdas.push({ fecha: null, dia: null, hoy: false, quien: [] });
    for (let d = 1; d <= ultimo; d++) {
      const f = clave(new Date(y, m, d));
      celdas.push({ fecha: f, dia: d, hoy: f === hoyClave, quien: porDia.get(f) ?? [] });
    }
    while (celdas.length % 7) celdas.push({ fecha: null, dia: null, hoy: false, quien: [] });
    this.semanas = [];
    for (let i = 0; i < celdas.length; i += 7) this.semanas.push(celdas.slice(i, i + 7));
  }

  titulo(c: Celda): string {
    return c.quien.map(q => `${q.nombre}: +${q.xp} XP`).join(' · ');
  }
}
