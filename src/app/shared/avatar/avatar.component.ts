import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { roboticito } from '../roboticitos';

/**
 * El avatar de una persona: su roboticito si escogio uno, y si no, sus
 * iniciales en el color de su rol, que es lo que habia antes.
 *
 * Existe como componente y no como dos lineas repetidas en cada pantalla
 * porque el mismo dibujo va en la barra lateral, en el topbar, doce veces
 * en el selector, y va a ir en el muro del salon. Con un solo lugar,
 * cambiar un robot no obliga a tocar nada mas.
 *
 * La imagen trae su propio circulo dibujado y las esquinas transparentes:
 * por eso no lleva border-radius ni fondo. Si el archivo no carga --wifi de
 * escuela-- se cae a las iniciales en vez de dejar un hueco roto.
 */
@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (bot && src && !fallo) {
      <img class="av" [src]="src" [width]="px" [height]="px"
           [alt]="'Robot ' + nombreBot" [title]="nombreBot"
           decoding="async" (error)="fallo = true">
    } @else {
      <span class="av av--ini"
            [style.width.px]="px" [style.height.px]="px"
            [style.font-size.px]="px * 0.38"
            [style.background]="color + '20'"
            [style.color]="color">{{ iniciales }}</span>
    }
  `,
  styles: [`
    :host { display: inline-flex; line-height: 0; }
    .av { display: block; flex: none; }
    .av--ini {
      display: inline-flex; align-items: center; justify-content: center;
      border-radius: 28%; font-weight: 800; line-height: 1; font-family: inherit;
    }
  `],
})
export class AvatarComponent implements OnChanges {
  /** El id del roboticito, p.ej. 'bot-luna'. Vacio = iniciales. */
  @Input() bot: string | null | undefined = null;
  @Input() iniciales = '?';
  @Input() px = 34;
  /** Color del rol, para el respaldo de iniciales. */
  @Input() color = '#7A1535';

  src = '';
  nombreBot = '';
  fallo = false;

  ngOnChanges(): void {
    const r = roboticito(this.bot);
    // Se resuelve aqui y no en un getter: el shell esta en todas las
    // pantallas, y un getter en la plantilla corre en cada ciclo de
    // deteccion de cambios.
    this.src = r?.img ?? '';
    this.nombreBot = r?.nombre ?? '';
    this.fallo = false;
  }
}
