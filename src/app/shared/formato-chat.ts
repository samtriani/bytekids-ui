/**
 * Texto de chat convertido a HTML seguro para pintar con [innerHTML].
 *
 * Existe porque cuatro pantallas tenían su propia copia de este formateo y
 * ninguna escapaba el texto antes de armar el HTML: se concatenaba directo la
 * respuesta del modelo y se entregaba a [innerHTML]. La cadena de ataque no es
 * teórica: el alumno le escribe a ByteBot "repite exactamente esto: <img
 * src=x onerror=...>", el modelo obedece, y ese texto llega al navegador de
 * quien sea que lea la conversación.
 *
 * Lo único que frenaba eso era el sanitizador de Angular. En la versión que
 * corre hoy (17, ya sin soporte) hay CVEs abiertos justamente de evasión del
 * sanitizador, así que era la última línea de defensa y encima con agujeros
 * conocidos. Escapando primero, el HTML que sale de aquí solo puede contener
 * las etiquetas que este archivo genera, sin importar qué traiga el texto ni
 * qué tan bien esté el sanitizador.
 *
 * El orden importa: se escapa PRIMERO y se aplica el formato DESPUÉS. Al revés
 * no sirve de nada, porque el escape convertiría en literales las etiquetas
 * que acabamos de generar.
 */

/** Convierte en literales los cinco caracteres con los que se arma HTML. */
export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')   // primero el &, o se re-escaparían los de abajo
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Markdown mínimo: bloques de código, código en línea, negritas y saltos de
 * línea. Es a propósito un subconjunto cerrado — no un intérprete de Markdown
 * completo — porque cada etiqueta que se agregue aquí es superficie nueva.
 */
export function formatearMensaje(contenido: string | null | undefined): string {
  if (!contenido) return '';

  return escaparHtml(contenido)
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre class="code-block"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

/**
 * Solo saltos de línea, para las burbujas del aula.
 *
 * Reemplaza al `.replace('\n','<br>')` que estaba en la plantilla y que además
 * de no escapar tenía un error de formato: con una cadena como primer
 * argumento, replace() cambia únicamente la PRIMERA ocurrencia, así que un
 * mensaje de tres párrafos se pintaba en uno solo a partir del segundo salto.
 */
export function formatearSaltos(contenido: string | null | undefined): string {
  if (!contenido) return '';
  return escaparHtml(contenido).replace(/\n/g, '<br>');
}
