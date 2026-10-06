import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/** Una opción del buscador. `detalle` también se busca (usuario, sección…). */
export interface OpcionBuscador { id: string; etiqueta: string; detalle?: string; icono?: string; }

/** Sin acentos ni mayúsculas: "maría" encuentra "Maria" y al revés. */
export function normalizar(t: string | null | undefined): string {
  return (t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Orden alfabético en español: "Ángel" junto a "Ana", no al final. */
export function porEtiqueta(a: OpcionBuscador, b: OpcionBuscador): number {
  return a.etiqueta.localeCompare(b.etiqueta, 'es', { sensitivity: 'base' });
}

const MAX_VISIBLES = 50;

/**
 * Un <select> que se puede escribir. Con 300 alumnos un select nativo es una
 * lista de 300 renglones sin orden que hay que recorrer con la rueda: aquí se
 * escribe "mar" y aparecen María, Mariana y Omar, en orden alfabético.
 *
 * Uso: <app-buscador [opciones]="..." [(valor)]="form.teacherId"
 *        placeholder="Busca un maestro…" vacio="Sin asignar"></app-buscador>
 *
 * `vacio`: si viene, la primera opción permite dejarlo sin valor.
 */
@Component({
  selector: 'app-buscador',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bz" [class.bz--abierto]="abierto" [class.bz--error]="error">
      <input #campo class="input bz-input" type="text" role="combobox" autocomplete="off"
             [attr.aria-expanded]="abierto" [attr.aria-controls]="idLista"
             [attr.aria-activedescendant]="abierto && visibles[activo] ? idLista + '-' + activo : null"
             [placeholder]="placeholder" [disabled]="deshabilitado"
             [(ngModel)]="texto" (focus)="abrir()" (input)="alEscribir()" (keydown)="tecla($event)">
      @if (valor && !deshabilitado) {
        <button type="button" class="bz-limpiar" (mousedown)="$event.preventDefault()" (click)="limpiar()"
                aria-label="Quitar selección">✕</button>
      }
      <span class="bz-flecha" aria-hidden="true">▾</span>

      @if (abierto) {
        <ul class="bz-lista" role="listbox" [id]="idLista">
          @if (vacio) {
            <li role="option" class="bz-op bz-op--vacio" [class.bz-op--activo]="activo === -1"
                (mousedown)="$event.preventDefault()" (click)="elegir(null)">{{ vacio }}</li>
          }
          @for (o of visibles; track o.id; let i = $index) {
            <li role="option" class="bz-op" [id]="idLista + '-' + i"
                [class.bz-op--activo]="i === activo" [class.bz-op--elegida]="o.id === valor"
                [attr.aria-selected]="o.id === valor"
                (mousedown)="$event.preventDefault()" (click)="elegir(o)" (mouseenter)="activo = i">
              @if (o.icono) { <span class="bz-ico">{{ o.icono }}</span> }
              <span class="bz-txt">
                <span class="bz-etq">{{ o.etiqueta }}</span>
                @if (o.detalle) { <small>{{ o.detalle }}</small> }
              </span>
            </li>
          }
          @if (!visibles.length) {
            <li class="bz-nada">{{ opciones.length ? 'Nada coincide con "' + texto + '"' : sinOpciones }}</li>
          }
          @if (restantes > 0) {
            <li class="bz-nada">Y {{ restantes }} más. Sigue escribiendo para encontrarlo.</li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    :host { display: block; position: relative; }
    .bz { position: relative; }
    .bz-input { width: 100%; max-width: none; padding-right: 54px; }
    .bz--error .bz-input { border-color: var(--danger); box-shadow: 0 0 0 3px var(--danger-lt); }
    .bz-flecha { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: .75rem; color: var(--tx3); pointer-events: none; }
    .bz-limpiar {
      position: absolute; right: 30px; top: 50%; transform: translateY(-50%);
      border: 0; background: transparent; color: var(--tx3); cursor: pointer; font-size: .75rem; padding: 4px;
    }
    .bz-limpiar:hover { color: var(--danger); }
    .bz-lista {
      position: absolute; z-index: 60; left: 0; right: 0; top: calc(100% + 4px);
      margin: 0; padding: 4px; list-style: none; max-height: 280px; overflow-y: auto;
      background: var(--surface, #fff); border: 1px solid var(--border2, #E3E4E8); border-radius: 12px;
      box-shadow: 0 12px 28px rgba(26,16,32,.14);
    }
    .bz-op {
      display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 8px;
      cursor: pointer; font-size: .86rem; color: var(--tx1);
    }
    .bz-op--activo { background: var(--guinda-lt, #F7E9EE); }
    .bz-op--elegida .bz-etq { font-weight: 800; color: var(--guinda, #7A1535); }
    .bz-op--vacio { color: var(--tx3); font-style: italic; }
    .bz-ico { flex: none; }
    .bz-txt { min-width: 0; display: flex; flex-direction: column; }
    .bz-txt small { font-size: .72rem; color: var(--tx3); }
    .bz-nada { padding: 8px 10px; font-size: .78rem; color: var(--tx3); }
  `],
})
export class BuscadorComponent implements OnChanges {
  @Input() opciones: OpcionBuscador[] = [];
  @Input() valor: string | null = '';
  @Output() valorChange = new EventEmitter<string>();
  @Input() placeholder = 'Escribe para buscar…';
  /** Etiqueta de "ninguno" (p. ej. "Sin asignar"). Sin ella, no se ofrece. */
  @Input() vacio = '';
  @Input() sinOpciones = 'No hay opciones.';
  @Input() deshabilitado = false;
  @Input() error = false;

  @ViewChild('campo') campo?: ElementRef<HTMLInputElement>;

  private static siguiente = 0;
  readonly idLista = 'bz-' + (BuscadorComponent.siguiente++);

  texto = '';
  abierto = false;
  activo = 0;
  visibles: OpcionBuscador[] = [];
  restantes = 0;
  private ordenadas: OpcionBuscador[] = [];
  private escribiendo = false;

  constructor(private host: ElementRef<HTMLElement>) {}

  ngOnChanges(): void {
    this.ordenadas = [...(this.opciones ?? [])].sort(porEtiqueta);
    if (!this.abierto) this.mostrarSeleccion();
    this.filtrar();
  }

  /** Cerrado, el campo muestra lo elegido; abierto, lo que se escribe. */
  private mostrarSeleccion(): void {
    const o = this.ordenadas.find(x => x.id === this.valor);
    this.texto = o ? o.etiqueta : '';
  }

  private filtrar(): void {
    const t = this.escribiendo ? normalizar(this.texto) : '';
    const todas = t
      ? this.ordenadas.filter(o => normalizar(o.etiqueta + ' ' + (o.detalle ?? '')).includes(t))
      : this.ordenadas;
    this.visibles = todas.slice(0, MAX_VISIBLES);
    this.restantes = todas.length - this.visibles.length;
    if (this.activo >= this.visibles.length) this.activo = Math.max(0, this.visibles.length - 1);
  }

  abrir(): void {
    if (this.deshabilitado) return;
    this.abierto = true;
    this.escribiendo = false;
    this.filtrar();
    const i = this.visibles.findIndex(o => o.id === this.valor);
    this.activo = i >= 0 ? i : 0;
    // Seleccionar el texto: escribir encima reemplaza, como en un buscador.
    setTimeout(() => this.campo?.nativeElement.select());
  }

  alEscribir(): void {
    this.abierto = true;
    this.escribiendo = true;
    this.activo = 0;
    this.filtrar();
  }

  elegir(o: OpcionBuscador | null): void {
    this.valor = o ? o.id : '';
    this.valorChange.emit(this.valor);
    this.cerrar();
  }

  limpiar(): void {
    this.elegir(null);
    this.campo?.nativeElement.focus();
  }

  private cerrar(): void {
    this.abierto = false;
    this.escribiendo = false;
    this.mostrarSeleccion();
  }

  tecla(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!this.abierto) { this.abrir(); return; }
      this.activo = Math.min(this.activo + 1, this.visibles.length - 1);
      this.verActivo();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.activo = Math.max(this.activo - 1, this.vacio ? -1 : 0);
      this.verActivo();
    } else if (e.key === 'Enter') {
      if (!this.abierto) return;
      e.preventDefault();
      if (this.activo === -1) this.elegir(null);
      else if (this.visibles[this.activo]) this.elegir(this.visibles[this.activo]);
    } else if (e.key === 'Escape') {
      if (this.abierto) { e.preventDefault(); this.cerrar(); }
    } else if (e.key === 'Tab') {
      this.cerrar();
    }
  }

  private verActivo(): void {
    setTimeout(() => document.getElementById(this.idLista + '-' + this.activo)?.scrollIntoView({ block: 'nearest' }));
  }

  /** Clic afuera: se cierra y vuelve a mostrar lo elegido. */
  @HostListener('document:mousedown', ['$event'])
  afuera(e: MouseEvent): void {
    if (this.abierto && !this.host.nativeElement.contains(e.target as Node)) this.cerrar();
  }
}
