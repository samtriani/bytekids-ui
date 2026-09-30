import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ShellComponent } from '../../../shared/shell/shell.component';
import { AvatarComponent } from '../../../shared/avatar/avatar.component';
import { TEACHER_NAV } from '../shared/teacher-nav';
import { AuthService } from '../../../services/auth.service';
import {
  AlumnoMuro, ComunidadApiService, LogroMuro, MuroSalon, SalonComunidad,
} from '../../../services/api/comunidad-api.service';

/**
 * La Comunidad del maestro: el mismo muro que ven sus alumnos, salon por
 * salon, mas dos cosas que solo el puede hacer.
 *
 *  - Felicitar un logro. Le llega al nino como notificacion con el nombre
 *    de la maestra. La medalla la da el sistema; la felicitacion, una
 *    persona.
 *  - Ver quien todavia no tiene actividad. En la pantalla del alumno eso
 *    seria exhibir a un companero y por eso ahi no sale; aqui es la forma de
 *    no dejar a nadie atras, con un boton para escribirle.
 */
@Component({
  selector: 'app-teacher-community',
  standalone: true,
  imports: [CommonModule, ShellComponent, AvatarComponent],
  templateUrl: './community.component.html',
  styleUrls: ['./community.component.scss'],
})
export class TeacherCommunityComponent implements OnInit, OnDestroy {
  navItems = TEACHER_NAV;

  salones: SalonComunidad[] = [];
  salonId = '';
  muro: MuroSalon | null = null;

  cargandoSalones = true;
  cargandoMuro = false;
  error = '';
  /** Logros que se estan felicitando ahora mismo: el boton no se repite. */
  enviando = new Set<string>();
  aviso = '';
  private temporizador: any = null;

  get maestroNombre(): string { return this.auth.getUser()?.displayName || 'Maestro'; }
  get maestroIniciales(): string { return this.auth.getUser()?.initials || 'M'; }

  constructor(
    private api: ComunidadApiService,
    private auth: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.api.salones().subscribe({
      next: salones => {
        this.salones = salones;
        this.cargandoSalones = false;
        // Se recuerda el ultimo salon visto: el maestro suele volver al mismo.
        const ultimo = this.leerUltimo();
        const inicial = salones.find(s => s.id === ultimo) ?? salones[0];
        if (inicial) this.elegir(inicial.id);
      },
      error: () => {
        this.cargandoSalones = false;
        this.error = 'No se pudieron cargar tus salones. Intenta de nuevo en un momento.';
      },
    });
  }

  ngOnDestroy(): void { clearTimeout(this.temporizador); }

  elegir(id: string): void {
    if (this.salonId === id && this.muro) return;
    this.salonId = id;
    this.guardarUltimo(id);
    this.cargandoMuro = true;
    this.error = '';
    this.api.muro(id).subscribe({
      next: muro => { this.muro = muro; this.cargandoMuro = false; },
      error: () => {
        this.muro = null;
        this.cargandoMuro = false;
        this.error = 'No se pudo cargar el muro de este salón.';
      },
    });
  }

  felicitar(l: LogroMuro): void {
    if (l.felicitado || this.enviando.has(l.id)) return;
    this.enviando.add(l.id);
    this.api.felicitar(l.id).subscribe({
      next: nueva => {
        this.enviando.delete(l.id);
        l.felicitado = true;
        this.avisar(nueva
          ? `👏 Le llegó tu felicitación a ${this.primerNombre(l.nombre)}`
          : `Ya habías felicitado a ${this.primerNombre(l.nombre)} por este logro`);
      },
      error: () => {
        this.enviando.delete(l.id);
        this.avisar('No se pudo enviar la felicitación. Intenta de nuevo.');
      },
    });
  }

  /** Abre Mensajes con la conversacion de ese alumno lista. */
  escribirle(a: AlumnoMuro): void {
    this.router.navigate(['/teacher/messages'], { queryParams: { to: a.id, nombre: a.nombre } });
  }

  medalla(puesto: number): string {
    return ({ 1: '🥇', 2: '🥈', 3: '🥉' } as Record<number, string>)[puesto] ?? String(puesto);
  }

  primerNombre(nombre: string): string { return (nombre || '').split(' ')[0]; }

  iniciales(nombre: string, dadas: string | null): string {
    if (dadas) return dadas.toUpperCase();
    return (nombre || '?').split(' ').filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase();
  }

  cuando(iso: string | null): string {
    if (!iso) return '';
    const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (dias <= 0) return 'hoy';
    if (dias === 1) return 'ayer';
    if (dias < 7) return `hace ${dias} días`;
    return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  }

  private avisar(texto: string): void {
    this.aviso = texto;
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => this.aviso = '', 3500);
  }

  private leerUltimo(): string {
    try { return localStorage.getItem('bk_comunidad_salon') ?? ''; } catch { return ''; }
  }

  private guardarUltimo(id: string): void {
    try { localStorage.setItem('bk_comunidad_salon', id); } catch { /* no pasa nada */ }
  }
}
