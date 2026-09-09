import { Injectable, signal } from '@angular/core';

export interface DatosLlamada {
  /** El horario al que pertenece la sesión. */
  scheduleId: string;
  /** Sala completa de JaaS: appId/ByteKids-xxxx. */
  sala: string;
  /** Token de JaaS. El aula lo pide; aquí solo se usa. */
  jwt: string | null;
  /** Cómo se ve el usuario en la llamada. */
  nombre: string;
  /** Para la barra de la ventanita: materia y salón. */
  titulo: string;
  subtitulo: string;
  icono: string;
  /** Ruta del aula, para el botón "Volver a la clase". */
  volverA: string;
}

/**
 * Dueño de la videollamada, para que sobreviva a navegar por la plataforma.
 *
 * El problema que resuelve: un niño en clase que quiere enseñar sus logros o
 * preguntar por una pantalla tenía que salirse del aula, y salirse del aula
 * mataba la llamada.
 *
 * La restricción que manda sobre todo el diseño: **un iframe no se puede mover
 * de lugar en el DOM**. Sacarlo de un contenedor y meterlo en otro hace que el
 * navegador lo recargue, o sea que la llamada se cae y se vuelve a conectar.
 * Por eso el iframe se crea UNA vez dentro del contenedor que presta el
 * componente flotante --que vive fuera del router y nunca se destruye-- y de
 * ahí no se mueve jamás. Lo que cambia es la posición y el tamaño de ese
 * contenedor: encima del hueco del aula cuando estás en clase, y una ventanita
 * en la esquina cuando andas por otra pantalla.
 *
 * No inyecta nada a propósito. El token lo pide el aula, que ya habla con la
 * API. Así este servicio se puede inyectar desde donde sea --incluido
 * AuthService, para colgar al cerrar sesión-- sin arriesgar un ciclo de
 * dependencias con HttpClient y sus interceptores.
 */
@Injectable({ providedIn: 'root' })
export class LlamadaService {
  /** La clase en curso. null cuando no hay llamada. */
  readonly datos = signal<DatosLlamada | null>(null);

  /**
   * El hueco del aula donde debe acoplarse. null significa que el usuario
   * anda en otra pantalla y la llamada va en la ventanita de la esquina.
   */
  readonly hueco = signal<HTMLElement | null>(null);

  /** El usuario encogió la ventanita a solo la barra del título. */
  readonly minimizada = signal(false);

  /**
   * Se toca cuando el acomodo del aula cambió y la llamada acoplada tiene que
   * volver a medirse: cambiar de pestaña, abrir o cerrar la vista dividida.
   * El ResizeObserver cubre los cambios de tamaño, pero no los de posición.
   */
  readonly pulso = signal(0);

  private api: any = null;
  private contenedor: HTMLElement | null = null;
  /** Petición que llegó antes de que el contenedor existiera. */
  private enEspera: DatosLlamada | null = null;

  get activa(): boolean { return !!this.datos(); }

  /** ¿La llamada en curso es la de esta clase? */
  esDe(scheduleId: string): boolean {
    return this.datos()?.scheduleId === scheduleId;
  }

  /**
   * El componente flotante presta su contenedor al arrancar la aplicación.
   * Es el único que va a haber: aquí dentro se crea el iframe y aquí se queda.
   */
  registrarContenedor(el: HTMLElement): void {
    this.contenedor = el;
    if (this.enEspera) {
      const d = this.enEspera;
      this.enEspera = null;
      this.montar(d);
    }
  }

  /** Entra a la videollamada de esta clase. */
  iniciar(d: DatosLlamada): void {
    const actual = this.datos();
    if (actual) {
      // Ya está en esta misma clase: no hay nada que hacer.
      if (actual.scheduleId === d.scheduleId) return;
      // Es otra clase. Se cuelga la anterior: dos videollamadas a la vez
      // significan dos micrófonos abiertos, y además el iframe es uno solo.
      this.terminar();
    }
    this.datos.set(d);
    this.minimizada.set(false);
    if (this.contenedor) this.montar(d);
    else this.enEspera = d;
  }

  /** Cuelga y suelta el iframe. */
  terminar(): void {
    if (this.api) {
      try { this.api.dispose(); } catch { /* ya estaba desconectado */ }
      this.api = null;
    }
    this.enEspera = null;
    this.datos.set(null);
    this.hueco.set(null);
    this.minimizada.set(false);
  }

  /**
   * El aula ofrece su hueco: la llamada se coloca encima. Es idempotente a
   * propósito, para que el aula pueda llamarlo sin llevar la cuenta.
   */
  acoplar(el: HTMLElement): void {
    if (this.hueco() === el) return;
    this.hueco.set(el);
    this.minimizada.set(false);
  }

  /**
   * El aula se va. Solo suelta el hueco si sigue siendo el suyo: al pasar de
   * un aula a otra, la nueva puede registrarse antes de que la vieja se
   * destruya, y sin esta comparación la vieja le borraría el hueco a la nueva.
   */
  desacoplar(el?: HTMLElement): void {
    if (!el || this.hueco() === el) this.hueco.set(null);
  }

  /** El aula cambió de forma: hay que volver a medir el hueco. */
  refrescar(): void { this.pulso.update(v => v + 1); }

  alternarMinimizada(): void { this.minimizada.set(!this.minimizada()); }

  private montar(d: DatosLlamada): void {
    const cont = this.contenedor;
    if (!cont) return;

    const cargar = () => {
      // Pudo colgarse mientras cargaba el script.
      if (this.datos() !== d) return;
      this.api = new (window as any).JitsiMeetExternalAPI('8x8.vc', {
        roomName: d.sala,
        parentNode: cont,
        width: '100%', height: '100%',
        jwt: d.jwt,
        userInfo: { displayName: d.nombre },
        configOverwrite: { prejoinPageEnabled: false, disableDeepLinking: true },
        interfaceConfigOverwrite: { SHOW_JITSI_WATERMARK: false },
      });
      // Colgar desde los controles de Jitsi también cierra la ventanita.
      this.api.addListener?.('readyToClose', () => this.terminar());
    };

    if ((window as any).JitsiMeetExternalAPI) { cargar(); return; }

    const s = document.createElement('script');
    s.src = `https://8x8.vc/${d.sala.split('/')[0]}/external_api.js`;
    s.onload  = cargar;
    s.onerror = () => this.terminar();
    document.body.appendChild(s);
  }
}
