import { Component, Input } from '@angular/core';

/** Lo que cabe en una pregunta a ByteBot. El servidor revisa lo mismo (AiTutorService). */
export const MAX_PREGUNTA_ALUMNO = 1000;
export const MAX_PREGUNTA_OTROS = 4000;

/**
 * Cuántas letras lleva una pregunta, contra el máximo. Solo aparece cerca
 * del límite: quien escribe una pregunta normal nunca lo ve. Va con
 * maxlength en el cuadro de texto: si alguien pega un texto enorme, el
 * navegador lo recorta y aquí se explica por qué.
 */
@Component({
  selector: 'app-contador-letras',
  standalone: true,
  template: `
    @if (actual >= max * 0.7) {
      <p class="cl" [class.cl--cerca]="actual >= max * 0.9" [class.cl--tope]="actual >= max" aria-live="polite">
        @if (actual >= max) {
          Llegaste al máximo. Si te falta algo, pregúntalo en otro mensaje 😊 ·
        }
        {{ actual }} / {{ max }} letras
      </p>
    }
  `,
  styles: [`
    :host { display: block; }
    .cl { margin: 0 0 6px; text-align: right; font-size: .74rem; font-weight: 700; color: var(--tx3, #7A6878); }
    .cl--cerca { color: #B45309; }
    .cl--tope { color: var(--danger, #9B1414); }
  `],
})
export class ContadorLetrasComponent {
  @Input() actual = 0;
  @Input() max = MAX_PREGUNTA_ALUMNO;
}
