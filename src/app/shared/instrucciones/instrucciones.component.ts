import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { interpretarInstrucciones, Seccion, TipoSeccion } from './instrucciones';

/**
 * Las instrucciones de una actividad, como camino de tarjetas.
 *
 * Cada PARTE / PASO trae su boton "¡Listo!". Al marcarlo, la tarjeta se
 * encoge a un renglon y la barra de avance crece: una mision de 45 minutos
 * se va haciendo chica conforme el nino avanza, en vez de ser un bloque de
 * texto que hay que volver a recorrer para encontrar donde iba.
 *
 * Lo marcado se recuerda por alumno y por actividad en este navegador. Es
 * una comodidad, no un dato: si se pierde, no pasa nada.
 */
@Component({
  selector: 'app-instrucciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './instrucciones.component.html',
  styleUrls: ['./instrucciones.component.scss'],
})
export class InstruccionesComponent implements OnChanges {
  @Input() texto = '';
  /** Para recordar los pasos marcados: alumno + actividad. */
  @Input() clave = '';
  @Input() color = '#7C3AED';
  /**
   * trabajo: el camino con "¡Listo!" y barra de avance.
   * repaso:  para una actividad ya hecha. Sin pasos que marcar, cada seccion
   *          cerrada; solo las metas y lo aprendido abiertas. Abrir el curso
   *          entero para repasar era un chorizo.
   */
  @Input() modo: 'trabajo' | 'repaso' = 'trabajo';
  /** Pide abrir a ByteBot desde un globo de ByteBot. */
  @Output() pedirByteBot = new EventEmitter<void>();

  secciones: Seccion[] = [];
  /** Las secciones que se pueden marcar como listas. */
  marcables = new Set<string>();
  listas = new Set<string>();

  readonly ICONO: Record<TipoSeccion, string> = {
    intro: '', meta: '🎯', paso: '', pensar: '🤔', idea: '💡', regla: '🔒',
    entrega: '📝', rubrica: '⭐', sigue: '➡️', normal: '📌',
  };

  get total(): number { return this.marcables.size; }
  get hechas(): number { return [...this.listas].filter(id => this.marcables.has(id)).length; }
  get pct(): number { return this.total ? Math.round(this.hechas / this.total * 100) : 0; }

  ngOnChanges(): void {
    this.secciones = interpretarInstrucciones(this.texto);

    // Se marcan los pasos. Si el texto no trae PARTE/PASO --textos viejos--
    // se marcan sus secciones con titulo, para que tambien se puedan encoger.
    const pasos = this.secciones.filter(s => s.tipo === 'paso');
    const base = pasos.length >= 2 ? pasos
      : this.secciones.filter(s => s.titulo && ['normal', 'paso'].includes(s.tipo) && s.bloques.length);
    this.marcables = new Set(base.length >= 2 ? base.map(s => s.id) : []);

    this.listas = new Set(this.leer());
  }

  esMarcable(s: Seccion): boolean { return this.marcables.has(s.id); }
  estaLista(s: Seccion): boolean { return this.listas.has(s.id); }

  alternar(s: Seccion): void {
    if (this.listas.has(s.id)) this.listas.delete(s.id);
    else this.listas.add(s.id);
    this.guardar();
  }

  irA(s: Seccion): void {
    // Ir a un paso ya marcado lo vuelve a abrir: si el nino lo busca, es
    // porque lo quiere leer.
    if (this.listas.has(s.id)) { this.listas.delete(s.id); this.guardar(); }
    document.getElementById('ins-' + s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Nombre corto para el indice: "PARTE 2 · ARMA TU PROYECTO (5 min)" → "Arma tu proyecto". */
  corto(s: Seccion): string {
    const t = s.titulo.replace(/^(PARTE|PASO)\s+\d+\s*[·\-–:]\s*/i, '').replace(/\([^)]*\)/g, '').trim();
    const limpio = t.toLowerCase().replace(/[^\p{L}\p{N}¿?¡! ]/gu, '').trim();
    return limpio.charAt(0).toUpperCase() + limpio.slice(1);
  }

  private leer(): string[] {
    if (!this.clave) return [];
    try { return JSON.parse(localStorage.getItem('bk_pasos_' + this.clave) || '[]'); } catch { return []; }
  }

  private guardar(): void {
    if (!this.clave) return;
    try { localStorage.setItem('bk_pasos_' + this.clave, JSON.stringify([...this.listas])); } catch { /* sin espacio: no pasa nada */ }
  }
}
