import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { normalizar } from '../buscador/buscador.component';

interface Grupo { grado: string; etiqueta: string; salones: any[]; }

/**
 * La lista de salones del coordinador, para 5 o para 200.
 *
 * Antes era una lista que ocupaba todo el ancho ARRIBA del detalle: con 50
 * salones, el salón elegido quedaba varias pantallas abajo. Ahora vive en una
 * columna fija con su propio scroll, se filtra por ciclo y por grado, se
 * busca sin acentos (también por maestro) y cada renglón dice si el salón
 * tiene maestro.
 *
 * Lo usan Asignaciones y Salones.
 */
@Component({
  selector: 'app-explorador-salones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ex">
      <div class="ex-head">
        <h3>Salones</h3>
        <span class="tag tag-green">{{ filtrados.length }} de {{ salones.length }}</span>
      </div>

      <input class="input ex-buscar" type="search" [(ngModel)]="busqueda" (ngModelChange)="recalcular()"
             placeholder="🔎 Salón, sección o maestro…" aria-label="Buscar salón">

      <div class="ex-filtros">
        @if (ciclos.length > 1) {
          <select class="select ex-ciclo" [(ngModel)]="ciclo" (ngModelChange)="recalcular()" aria-label="Ciclo escolar">
            @for (c of ciclos; track c) { <option [value]="c">Ciclo {{ c }}</option> }
            <option value="">Todos los ciclos</option>
          </select>
        }
        @if (grados.length > 1) {
          <div class="ex-grados" role="group" aria-label="Grado">
            <button type="button" class="ex-chip" [class.on]="!grado" (click)="elegirGrado('')">Todos</button>
            @for (g of grados; track g.grado) {
              <button type="button" class="ex-chip" [class.on]="grado === g.grado" (click)="elegirGrado(g.grado)">
                {{ g.corta }}
              </button>
            }
          </div>
        }
        @if (busqueda.trim()) {
          <small class="ex-aviso">Buscando en todos los ciclos · <button type="button" (click)="limpiar()">limpiar</button></small>
        }
      </div>

      <div class="ex-lista">
        @if (!filtrados.length) {
          <p class="ex-vacio">{{ busqueda.trim() ? 'Ningún salón coincide.' : vacioTexto }}</p>
        }
        @for (g of grupos; track g.grado) {
          @if (grupos.length > 1) {
            <button type="button" class="ex-grupo" (click)="alternar(g.grado)" [attr.aria-expanded]="abierto(g.grado)">
              <span class="ex-caret" [class.on]="abierto(g.grado)">▸</span>
              <span>{{ g.etiqueta }}</span>
              <span class="ex-n">{{ g.salones.length }}</span>
            </button>
          }
          @if (abierto(g.grado)) {
            @for (s of g.salones; track s.id) {
              <button type="button" class="ex-salon" [class.sel]="s.id === seleccionadoId" (click)="elegir.emit(s)"
                      [attr.aria-current]="s.id === seleccionadoId ? 'true' : null">
                <span class="ex-nombre">{{ s.name }}</span>
                <span class="ex-meta">
                  @if (s.section) { Sec. {{ s.section }} · }
                  @if (s.teacherName) { {{ s.teacherName }} }
                  @else { <span class="ex-sin">⚠ Sin maestro</span> }
                </span>
              </button>
            }
          }
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 0; }
    .ex { display: flex; flex-direction: column; gap: 10px; height: 100%; min-height: 0; }
    .ex-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .ex-head h3 { margin: 0; font-size: 1rem; }
    .ex-buscar { width: 100%; max-width: none; }
    .ex-filtros { display: flex; flex-direction: column; gap: 8px; }
    .ex-ciclo { width: 100%; max-width: none; }
    .ex-grados { display: flex; flex-wrap: wrap; gap: 6px; }
    .ex-chip {
      border: 1px solid var(--border2); background: var(--surface); color: var(--tx2);
      border-radius: 999px; padding: 4px 10px; font-size: .74rem; font-weight: 800; cursor: pointer;
    }
    .ex-chip.on { background: var(--guinda); border-color: var(--guinda); color: #fff; }
    .ex-aviso { font-size: .72rem; color: var(--tx3); }
    .ex-aviso button { border: 0; background: none; color: var(--guinda); font-weight: 800; cursor: pointer; padding: 0; }
    .ex-lista { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; padding-right: 2px; }
    .ex-vacio { font-size: .82rem; color: var(--tx3); text-align: center; padding: 20px 8px; margin: 0; }
    .ex-grupo {
      display: flex; align-items: center; gap: 8px; width: 100%; border: 0; background: none; cursor: pointer;
      padding: 8px 4px 4px; font-size: .72rem; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; color: var(--tx3);
    }
    .ex-caret { transition: transform .15s; display: inline-block; }
    .ex-caret.on { transform: rotate(90deg); }
    .ex-n { margin-left: auto; background: var(--surface2); border-radius: 999px; padding: 1px 8px; font-size: .68rem; }
    .ex-salon {
      display: flex; flex-direction: column; align-items: flex-start; gap: 2px; width: 100%; text-align: left;
      border: 1px solid transparent; background: none; border-radius: 10px; padding: 8px 10px; cursor: pointer;
    }
    .ex-salon:hover { background: var(--surface2); }
    .ex-salon.sel { background: var(--guinda-lt); border-color: var(--guinda); }
    .ex-nombre { font-size: .85rem; font-weight: 800; color: var(--tx1); }
    .ex-meta { font-size: .72rem; color: var(--tx3); }
    .ex-sin { color: #B45309; font-weight: 800; }
  `],
})
export class ExploradorSalonesComponent implements OnChanges {
  @Input() salones: any[] = [];
  @Input() seleccionadoId: string | null = null;
  @Input() vacioTexto = 'No hay salones en este ciclo.';
  @Output() elegir = new EventEmitter<any>();

  busqueda = '';
  ciclo = '';
  grado = '';
  ciclos: string[] = [];
  grados: { grado: string; corta: string }[] = [];
  filtrados: any[] = [];
  grupos: Grupo[] = [];
  private cerrados = new Set<string>();

  ngOnChanges(): void {
    this.ciclos = [...new Set(this.salones.map(s => s.schoolYear).filter(Boolean))].sort().reverse();
    // Arranca en el ciclo más reciente; si ese ciclo desapareció, también.
    if (!this.ciclo || !this.ciclos.includes(this.ciclo)) this.ciclo = this.ciclos[0] ?? '';
    this.recalcular();
  }

  private static gradoDe(s: any): string { return s.gradeLevel != null ? String(s.gradeLevel) : 'sin-grado'; }

  recalcular(): void {
    const t = normalizar(this.busqueda);
    // Al buscar se ignora el ciclo: si escribes un nombre, lo quieres
    // encontrar aunque sea de otro año.
    const delCiclo = this.salones.filter(s => t || !this.ciclo || s.schoolYear === this.ciclo);

    const gs = [...new Set(delCiclo.map(ExploradorSalonesComponent.gradoDe))]
      .sort((a, b) => a === 'sin-grado' ? 1 : b === 'sin-grado' ? -1 : Number(a) - Number(b));
    this.grados = gs.map(g => ({ grado: g, corta: g === 'sin-grado' ? 'Sin grado' : g + '°' }));
    if (this.grado && !gs.includes(this.grado)) this.grado = '';

    this.filtrados = delCiclo.filter(s =>
      (!this.grado || ExploradorSalonesComponent.gradoDe(s) === this.grado) &&
      (!t || normalizar(`${s.name} ${s.section ?? ''} ${s.schoolYear ?? ''} ${s.teacherName ?? ''}`).includes(t)));

    const mapa = new Map<string, any[]>();
    for (const s of this.filtrados) {
      const g = ExploradorSalonesComponent.gradoDe(s);
      if (!mapa.has(g)) mapa.set(g, []);
      mapa.get(g)!.push(s);
    }
    this.grupos = gs.filter(g => mapa.has(g)).map(g => ({
      grado: g,
      etiqueta: g === 'sin-grado' ? 'Sin grado' : `${g}° grado`,
      salones: mapa.get(g)!.sort((a, b) =>
        (a.name ?? '').localeCompare(b.name ?? '', 'es', { sensitivity: 'base' })
        || (a.section ?? '').localeCompare(b.section ?? '', 'es')),
    }));
  }

  elegirGrado(g: string): void { this.grado = g; this.recalcular(); }
  limpiar(): void { this.busqueda = ''; this.recalcular(); }

  /** Al buscar o filtrar por grado se abre todo: no esconder resultados. */
  abierto(g: string): boolean { return !!this.busqueda.trim() || !!this.grado || !this.cerrados.has(g); }
  alternar(g: string): void { this.cerrados.has(g) ? this.cerrados.delete(g) : this.cerrados.add(g); }
}
