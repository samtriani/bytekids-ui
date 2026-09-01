import { Injectable, signal } from '@angular/core';

export type BackendStatus = 'ok' | 'waking' | 'down';

/**
 * Estado de la conexion con la API.
 *
 * El backend vive en Fly con auto_stop_machines, asi que tras un rato sin uso
 * la maquina se apaga y el primer request tarda ~40s en despertarla. Sin esto,
 * las pantallas mostraban ceros —indistinguibles de "no tienes nada"— y el
 * usuario creia que la sesion se habia caido.
 */
@Injectable({ providedIn: 'root' })
export class BackendStatusService {
  readonly status = signal<BackendStatus>('ok');

  /** Cuantas peticiones estan reintentando ahora mismo. */
  private pendientes = 0;

  marcarDespertando(): void {
    this.pendientes++;
    if (this.status() !== 'down') this.status.set('waking');
  }

  marcarOk(): void {
    this.pendientes = Math.max(0, this.pendientes - 1);
    if (this.pendientes === 0) this.status.set('ok');
  }

  marcarCaido(): void {
    this.pendientes = Math.max(0, this.pendientes - 1);
    this.status.set('down');
  }

  reiniciar(): void {
    this.pendientes = 0;
    this.status.set('ok');
  }
}
