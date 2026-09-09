/**
 * El content_body de una actividad, ya interpretado.
 *
 * Se guarda como JSON con forma distinta por tipo (misión, material, quiz).
 * El backend ya le quita al alumno las llaves que son del maestro
 * (ContentResponse.cuerpoVisible), así que aquí solo se descompone.
 *
 * Es una clase y no un puñado de getters sueltos en cada componente porque el
 * aula lo lee en CADA ciclo de detección de cambios: se construye una vez,
 * cuando el maestro lanza o cambia la misión, y después solo se leen
 * propiedades. Parsear el JSON dentro de un getter de plantilla devolvería un
 * arreglo nuevo cada ciclo y pondría a Angular a trabajar de más.
 */
export class CuerpoActividad {
  private readonly datos: any;

  /** content_body viejo, guardado como texto plano y no como JSON. */
  readonly textoPlano: string;

  constructor(crudo: any) {
    let datos: any = null;
    if (crudo && typeof crudo === 'object') {
      datos = crudo;
    } else if (typeof crudo === 'string' && crudo.trim()) {
      try { datos = JSON.parse(crudo); } catch { datos = null; }
    }
    this.datos      = (datos && typeof datos === 'object' && !Array.isArray(datos)) ? datos : null;
    this.textoPlano = (!this.datos && typeof crudo === 'string') ? crudo : '';
  }

  get instrucciones(): string { return this.datos?.instructions ?? ''; }
  get starterCode():   string { return this.datos?.starter_code ?? ''; }
  get url():           string { return this.datos?.url ?? ''; }

  /** Solo llega con rol de maestro: al alumno el backend se lo quita. */
  get notasMaestro(): string { return this.datos?.teacher_notes ?? ''; }

  get checklist(): string[] {
    return Array.isArray(this.datos?.checklist) ? this.datos.checklist : [];
  }

  get tipoRecurso(): string {
    const t = this.datos?.resource_type ?? '';
    return ({ video: '🎬 Ver el video', documento: '📄 Abrir el documento', enlace: '🔗 Abrir el enlace' } as any)[t]
      ?? '🔗 Abrir el recurso';
  }

  get tieneDetalle(): boolean {
    return !!(this.instrucciones || this.starterCode || this.url
              || this.checklist.length || this.textoPlano);
  }
}

/** Para arrancar sin misión y no tener que verificar null en la plantilla. */
export const CUERPO_VACIO = new CuerpoActividad(null);
