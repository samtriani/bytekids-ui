import {
  Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, NgZone, effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LlamadaService } from '../../services/llamada.service';

type Modo = 'acoplada' | 'esquina' | 'escondida';
interface Caja { top: number; left: number; width: number; height: number; }

/**
 * La casa del iframe de la videollamada.
 *
 * Vive colgado del componente raíz, al lado del router-outlet, así que no se
 * destruye nunca mientras la aplicación esté abierta. Eso es justo el punto:
 * un iframe que cambia de padre en el DOM se recarga --la llamada se caería al
 * navegar--, así que el iframe se queda quieto aquí dentro y lo que se mueve
 * es esta caja, que está en position:fixed.
 *
 * Tres modos:
 *   acoplada  — encima del hueco que ofrece el aula, del tamaño exacto.
 *   esquina   — ventanita arrastrable, cuando andas por otra pantalla.
 *   escondida — el aula existe pero su hueco no se ve (otra pestaña abierta).
 *               Se respeta el comportamiento que ya tenía el aula.
 */
@Component({
  selector: 'app-llamada-flotante',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './llamada-flotante.component.html',
  styleUrls: ['./llamada-flotante.component.scss'],
})
export class LlamadaFlotanteComponent implements AfterViewInit, OnDestroy {
  /** static: true — el contenedor debe existir desde el arranque. */
  @ViewChild('contenedor', { static: true }) contenedorRef!: ElementRef<HTMLElement>;

  modo: Modo = 'esquina';
  caja: Caja = { top: 0, left: 0, width: 320, height: 236 };

  /** Dónde dejó el usuario la ventanita. null = todavía no la ha movido. */
  private esquina: { top: number; left: number } | null = null;
  private observador?: ResizeObserver;
  private arrastre: { dx: number; dy: number } | null = null;

  private readonly ANCHO  = 320;
  private readonly ALTO   = 236;
  private readonly BARRA  = 38;
  private readonly MARGEN = 18;

  constructor(
    public llamada: LlamadaService,
    private router: Router,
    private zone: NgZone,
  ) {
    // Cuando el aula ofrece o retira su hueco hay que recolocarse, y observar
    // el elemento nuevo.
    effect(() => {
      const hueco = this.llamada.hueco();
      this.observar(hueco);
      this.sincronizar();
    });
    // Minimizar cambia la altura. El pulso lo toca el aula al cambiar de
    // acomodo: el ResizeObserver ve los cambios de tamaño del hueco, pero no
    // los de posición.
    effect(() => {
      this.llamada.minimizada();
      this.llamada.pulso();
      this.sincronizar();
    });
  }

  ngAfterViewInit(): void {
    this.llamada.registrarContenedor(this.contenedorRef.nativeElement);
    this.sincronizar();
    // Fuera de la zona de Angular a propósito: un listener de scroll en
    // captura ve TODOS los scrolls de la aplicación, y registrado dentro de la
    // zona dispararía un ciclo de detección de cambios por cada uno. Aquí solo
    // se vuelve a entrar cuando la caja de verdad se movió.
    this.zone.runOutsideAngular(() => {
      window.addEventListener('resize', this.alMoverseElMundo);
      window.addEventListener('scroll', this.alMoverseElMundo, true);
    });
  }

  ngOnDestroy(): void {
    this.observador?.disconnect();
    window.removeEventListener('resize', this.alMoverseElMundo);
    window.removeEventListener('scroll', this.alMoverseElMundo, true);
    document.removeEventListener('mousemove', this.alMover);
    document.removeEventListener('mouseup', this.alSoltar);
  }

  private alMoverseElMundo = () => this.sincronizar();

  private observar(hueco: HTMLElement | null): void {
    this.observador?.disconnect();
    if (!hueco || typeof ResizeObserver === 'undefined') return;
    // El hueco cambia de tamaño al alternar pestañas y al abrir la vista
    // dividida; también reporta 0×0 cuando se oculta, que es lo que distingue
    // "acoplada" de "escondida".
    this.zone.runOutsideAngular(() => {
      this.observador = new ResizeObserver(() => this.sincronizar());
      this.observador!.observe(hueco);
    });
  }

  /** Dónde y de qué tamaño debe estar la llamada en este momento. */
  private calcular(): { modo: Modo; caja: Caja } {
    const hueco = this.llamada.hueco();

    if (hueco) {
      const r = hueco.getBoundingClientRect();
      // Hueco de tamaño cero: el aula está en otra pestaña. Antes de todo esto
      // el video simplemente se ocultaba, y esa es la conducta que se conserva:
      // sacarlo a la esquina encima del chat sería un cambio que nadie pidió.
      if (r.width < 40 || r.height < 40) return { modo: 'escondida', caja: this.caja };
      return {
        modo: 'acoplada',
        caja: { top: r.top, left: r.left, width: r.width, height: r.height },
      };
    }

    const alto = this.llamada.minimizada() ? this.BARRA : this.ALTO;
    const pos  = this.esquina ?? {
      top:  window.innerHeight - alto       - this.MARGEN,
      left: window.innerWidth  - this.ANCHO - this.MARGEN,
    };
    return {
      modo: 'esquina',
      caja: { width: this.ANCHO, height: alto, ...this.limitar(pos.top, pos.left, alto) },
    };
  }

  /**
   * Recoloca solo si algo cambió. La comparación es la que permite atar esto a
   * scroll y resize sin castigar el rendimiento.
   */
  private sincronizar(): void {
    if (!this.llamada.activa) return;
    const { modo, caja } = this.calcular();
    if (modo === this.modo && this.mismaCaja(caja)) return;
    // Puede venir de fuera de la zona (scroll, ResizeObserver): hay que
    // volver a entrar para que Angular repinte.
    this.zone.run(() => { this.modo = modo; this.caja = caja; });
  }

  private mismaCaja(c: Caja): boolean {
    const a = this.caja;
    return Math.abs(a.top - c.top) < 1 && Math.abs(a.left - c.left) < 1
        && Math.abs(a.width - c.width) < 1 && Math.abs(a.height - c.height) < 1;
  }

  /** Que la ventanita no se pierda fuera de la pantalla. */
  private limitar(top: number, left: number, alto: number) {
    return {
      top:  Math.max(8, Math.min(top,  window.innerHeight - alto       - 8)),
      left: Math.max(8, Math.min(left, window.innerWidth  - this.ANCHO - 8)),
    };
  }

  // ── Arrastrar la ventanita ──────────────────────────────────────────────

  empezarArrastre(e: MouseEvent): void {
    if (this.modo !== 'esquina') return;
    e.preventDefault();
    this.arrastre = { dx: e.clientX - this.caja.left, dy: e.clientY - this.caja.top };
    document.addEventListener('mousemove', this.alMover);
    document.addEventListener('mouseup', this.alSoltar);
  }

  private alMover = (e: MouseEvent) => {
    if (!this.arrastre) return;
    const pos = this.limitar(e.clientY - this.arrastre.dy, e.clientX - this.arrastre.dx, this.caja.height);
    this.esquina = pos;
    this.caja = { ...this.caja, ...pos };
  };

  private alSoltar = () => {
    this.arrastre = null;
    document.removeEventListener('mousemove', this.alMover);
    document.removeEventListener('mouseup', this.alSoltar);
  };

  // ── Acciones de la barra ────────────────────────────────────────────────

  volverAlAula(): void {
    const ruta = this.llamada.datos()?.volverA;
    if (ruta) this.router.navigateByUrl(ruta);
  }

  colgar(): void { this.llamada.terminar(); }
}
