import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PasoCamino {
  id: string; orden: number; titulo: string; tipo: string;
  estado: 'aprobada' | 'revision' | 'corregir' | 'siguiente' | 'abierta' | 'bloqueada';
}

const ICONO: Record<string, string> = { material: '📚', mision: '🚀', tarea: '🔍', quiz: '❓', proyecto: '🏗️' };
const ETIQUETA: Record<string, string> = {
  aprobada: 'Aprobada', revision: 'Esperando revisión', corregir: 'Por corregir',
  siguiente: 'Le toca', abierta: 'Disponible', bloqueada: 'Bloqueada',
};

/**
 * El camino de una materia: cada actividad con su estado, unidas por una
 * linea que se pinta de verde conforme avanza. Solo lectura: lo usa la
 * familia para ver por donde va su hijo.
 */
@Component({
  selector: 'app-camino',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ol class="cm" [style.--c]="color">
      @for (p of pasos; track p.id) {
        <li class="cm-paso cm-paso--{{ p.estado }}">
          <span class="cm-n">{{ p.estado === 'aprobada' ? '✓' : p.estado === 'bloqueada' ? '🔒' : p.orden }}</span>
          <span class="cm-txt">
            <span class="cm-titulo">{{ icono(p.tipo) }} {{ p.titulo }}</span>
            <span class="cm-estado">{{ etiqueta(p.estado) }}</span>
          </span>
        </li>
      }
    </ol>
  `,
  styles: [`
    :host { display: block; }
    .cm { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; --c: #7A1535; }
    .cm-paso { position: relative; display: flex; align-items: center; gap: 12px; padding: 6px 8px; border-radius: 12px; }
    .cm-paso:not(:last-child)::after {
      content: ''; position: absolute; left: 21px; top: 34px; bottom: -8px; width: 2px; background: #E3E4E8;
    }
    .cm-n {
      position: relative; z-index: 1; flex: none; width: 28px; height: 28px; border-radius: 50%;
      display: grid; place-items: center; font-size: .76rem; font-weight: 900;
      background: #F8F8FA; color: #7A6878; border: 2px solid #E3E4E8;
    }
    .cm-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .cm-titulo { font-size: .86rem; font-weight: 700; color: #1A1020; line-height: 1.35; }
    .cm-estado { font-size: .72rem; font-weight: 800; color: #7A6878; }

    .cm-paso--aprobada .cm-n { background: #1A6B3C; border-color: #1A6B3C; color: #fff; }
    .cm-paso--aprobada .cm-estado { color: #1A6B3C; }
    .cm-paso--aprobada:not(:last-child)::after { background: #1A6B3C; }
    .cm-paso--revision .cm-n { border-color: #2563EB; color: #2563EB; }
    .cm-paso--revision .cm-estado { color: #2563EB; }
    .cm-paso--corregir .cm-n { border-color: #F59E0B; color: #B45309; }
    .cm-paso--corregir .cm-estado { color: #B45309; }
    .cm-paso--siguiente { background: color-mix(in srgb, var(--c) 8%, #fff); }
    .cm-paso--siguiente .cm-n { background: var(--c); border-color: var(--c); color: #fff; box-shadow: 0 0 0 4px color-mix(in srgb, var(--c) 18%, transparent); }
    .cm-paso--siguiente .cm-estado { color: var(--c); }
    .cm-paso--bloqueada { opacity: .55; }
    .cm-paso--bloqueada .cm-n { font-size: .66rem; }
  `],
})
export class CaminoComponent {
  @Input() pasos: PasoCamino[] = [];
  @Input() color = '#7A1535';

  icono(t: string): string { return ICONO[t] ?? '🎯'; }
  etiqueta(e: string): string { return ETIQUETA[e] ?? e; }
}
