/**
 * Convierte las instrucciones de una actividad --texto plano-- en secciones
 * con forma, para pintarlas como tarjetas en vez de un bloque de texto.
 *
 * POR QUE EXISTE
 * Las instrucciones se escriben como texto con convenciones: titulos en
 * MAYUSCULAS ("PARTE 1 · ARMA TU PROYECTO"), listas con "1." o "▸", tablas
 * con "|", y el globo "💬 ByteBot dice:". Pintadas tal cual en un <div> con
 * pre-wrap, una mision de 45 minutos era un chorizo de texto que un nino de
 * 9 anos no lee. Aqui se reconoce esa estructura.
 *
 * SEGURO POR CONSTRUCCION
 * No produce HTML. Devuelve datos, y la plantilla los pinta con
 * interpolacion normal, que escapa todo. Nada de esto pasa por [innerHTML].
 *
 * Si un texto no sigue las convenciones, no se rompe: sale como parrafos.
 */

export type TipoSeccion =
  | 'intro' | 'meta' | 'paso' | 'pensar' | 'idea' | 'regla'
  | 'entrega' | 'rubrica' | 'sigue' | 'normal';

export type Bloque =
  | { tipo: 'parrafo'; lead: string; texto: string }
  | { tipo: 'numerada'; items: Item[] }
  | { tipo: 'vinetas'; items: Item[]; marca: 'punto' | 'check' | 'emoji' | 'letra' }
  | { tipo: 'bytebot'; texto: string }
  | { tipo: 'aviso'; texto: string }
  | { tipo: 'tabla'; encabezado: string[]; filas: string[][] };

export interface Item {
  /** Emoji o letra que va en lugar de la viñeta, si lo trae. */
  marca: string;
  /** Primera parte en MAYUSCULAS antes de ":" o ".", que va en negritas. */
  lead: string;
  texto: string;
}

export interface Seccion {
  id: string;
  tipo: TipoSeccion;
  titulo: string;
  /** "1", "2"... si el titulo es "PARTE 1" o "PASO 1". */
  numero: string;
  bloques: Bloque[];
}

// ── Reconocer una linea ────────────────────────────────────────────────────

const MAYUS = /[A-ZÁÉÍÓÚÑÜ]/;
const MINUS = /[a-záéíóúñü]/;

/** Un titulo: todo en mayusculas, sin contar lo que va entre parentesis. */
function esTitulo(linea: string): boolean {
  const t = linea.trim();
  if (!t || t.length > 70) return false;
  // "vs." es la unica minuscula que aparece en un titulo de verdad.
  const sinParentesis = t.replace(/\([^)]*\)/g, '').replace(/\bvs\.?/g, '');
  const letras = sinParentesis.match(/[A-Za-zÁÉÍÓÚÑÜáéíóúñü]/g) ?? [];
  if (letras.length < 4) return false;
  return !MINUS.test(sinParentesis) && MAYUS.test(sinParentesis);
}

/** Empieza con un emoji (o simbolo) seguido de espacio. */
function empiezaConEmoji(t: string): string {
  const m = t.match(/^(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)\s+/u);
  return m ? m[1] : '';
}

/**
 * "📦 DATOS: los ejemplos..." → lead "DATOS:" y el resto.
 * Solo si la parte en mayusculas tiene al menos 3 letras: un "A." no es lead.
 */
function partirLead(texto: string): { lead: string; texto: string } {
  const m = texto.match(/^([A-ZÁÉÍÓÚÑÜ0-9¿?¡!,'"«» ]{3,}?[:.])\s+(.+)$/);
  if (m && (m[1].match(/[A-ZÁÉÍÓÚÑÜ]/g) ?? []).length >= 3 && !MINUS.test(m[1])) {
    return { lead: m[1].trim(), texto: m[2] };
  }
  return { lead: '', texto };
}

function tipoDeTitulo(titulo: string): { tipo: TipoSeccion; numero: string } {
  const t = titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  const num = t.match(/\b(?:PARTE|PASO)\s+(\d+)/);
  if (num) {
    // "PARTE 3 · TU REPORTAJE (esto es lo que entregas)" es un paso, pero es
    // EL paso de la entrega: se trata como entrega.
    if (/ENTREGA|REPORTAJE|FICHA/.test(t)) return { tipo: 'entrega', numero: num[1] };
    return { tipo: 'paso', numero: num[1] };
  }
  if (/HOY VAS A PODER/.test(t))                            return { tipo: 'meta', numero: '' };
  if (/PAUSA|PIENSA|PARA PENSAR|PARA CERRAR/.test(t))       return { tipo: 'pensar', numero: '' };
  if (/LO QUE TE LLEVAS|EL SECRETO|LO QUE ACABA|EN FACIL/.test(t)) return { tipo: 'idea', numero: '' };
  if (/QUE SIGUE/.test(t))                                  return { tipo: 'sigue', numero: '' };
  if (/REGLA/.test(t))                                      return { tipo: 'regla', numero: '' };
  if (/ENTREGA|REPORTAJE|FICHA/.test(t))                    return { tipo: 'entrega', numero: '' };
  if (/SE CALIFICA/.test(t))                                return { tipo: 'rubrica', numero: '' };
  return { tipo: 'normal', numero: '' };
}

/**
 * La seccion donde las instrucciones mandan a abrir el enlace, o null.
 *
 * El boton del enlace va al FINAL de esa seccion, no arriba de todo: arriba,
 * el nino lo picaba antes de leer nada, se iba a la otra pagina y no sabia
 * ni que hacer alla ni cuando regresar. Asi lee el paso, la meta y el
 * "regresa", y luego abre.
 */
export function seccionDelEnlace(secciones: Seccion[]): Seccion | null {
  const textos = (b: Bloque): string[] => {
    switch (b.tipo) {
      case 'parrafo': return [b.lead, b.texto];
      case 'numerada': case 'vinetas': return b.items.flatMap(it => [it.lead, it.texto]);
      case 'aviso': return [b.texto];
      default: return [];
    }
  };
  return secciones.find(s => s.bloques.some(b => textos(b).some(t => /\benlace\b/i.test(t ?? '')))) ?? null;
}

// ── El interprete ──────────────────────────────────────────────────────────

export function interpretarInstrucciones(texto: string): Seccion[] {
  const lineas = (texto ?? '').replace(/\r\n?/g, '\n').split('\n');
  const secciones: Seccion[] = [];
  let actual: Seccion = { id: 's0', tipo: 'intro', titulo: '', numero: '', bloques: [] };

  const cerrar = () => { if (actual.bloques.length || actual.titulo) secciones.push(actual); };
  const ultimo = (): Bloque | undefined => actual.bloques[actual.bloques.length - 1];

  let i = 0;
  while (i < lineas.length) {
    const cruda = lineas[i];
    const t = cruda.trim();

    if (!t) { i++; (actual as any)._corte = true; continue; }
    const hayCorte = !!(actual as any)._corte;
    (actual as any)._corte = false;

    // ── Continuacion de una oracion que quedo a medias en el renglon de arriba
    const previo = actual.bloques[actual.bloques.length - 1];
    if (!hayCorte && previo?.tipo === 'parrafo' && previo.texto !== ''
        && !/[.!?:…)"»”]$/.test(previo.texto) && !/^\s{2,}\S/.test(cruda) && !/^\d+[.)]\s/.test(t)) {
      previo.texto += ' ' + t;
      i++; continue;
    }

    // ── ByteBot dice: junta todo hasta la siguiente linea en blanco
    if (/^💬\s*ByteBot dice:/i.test(t)) {
      let cuerpo = t.replace(/^💬\s*ByteBot dice:\s*/i, '');
      while (i + 1 < lineas.length && lineas[i + 1].trim()) cuerpo += ' ' + lineas[++i].trim();
      actual.bloques.push({ tipo: 'bytebot', texto: cuerpo.replace(/^["“]|["”]$/g, '') });
      i++; continue;
    }

    // ── Campo de plantilla: "   NOMBRE DE MI IA:" con sangria. Parece
    //    titulo --todo mayusculas-- pero es un renglon para llenar.
    if (/^\s{2,}/.test(cruda) && esTitulo(t) && /:$/.test(t)) {
      actual.bloques.push({ tipo: 'parrafo', lead: t, texto: '' });
      i++; continue;
    }

    // ── Titulo de seccion (nunca con sangria)
    if (!/^\s/.test(cruda) && esTitulo(t) && !/\|/.test(t)) {
      cerrar();
      const titulo = t.replace(/\s*[:.…]+$/, '');
      const { tipo, numero } = tipoDeTitulo(titulo);
      actual = { id: 's' + (secciones.length + 1), tipo, titulo, numero, bloques: [] };
      i++; continue;
    }

    // ── Tabla: dos o mas "|" en la linea
    if ((t.match(/\|/g) ?? []).length >= 2 || (t.match(/\|/g) ?? []).length === 1 && /\|/.test(lineas[i + 1] ?? '')) {
      const celdas = (l: string) => l.split('|').map(c => c.trim());
      const encabezado = celdas(t);
      const filas: string[][] = [];
      while (i + 1 < lineas.length && /\|/.test(lineas[i + 1])) filas.push(celdas(lineas[++i]));
      actual.bloques.push({ tipo: 'tabla', encabezado, filas });
      i++; continue;
    }

    // ── Aviso
    if (/^⚠️?/.test(t) && t.startsWith('⚠')) {
      actual.bloques.push({ tipo: 'aviso', texto: t.replace(/^⚠️?\s*/, '') });
      i++; continue;
    }

    // ── Lista numerada: "1. algo"
    const num = t.match(/^(\d+)[.)]\s+(.*)$/);
    if (num) {
      const b = ultimo();
      // "1. 🔒 MIS DATOS SON MÍOS. No comparto..." → emoji aparte, lead en negritas.
      const emo = empiezaConEmoji(num[2]);
      const item: Item = { marca: emo, ...partirLead(num[2].slice(emo.length).trim()) };
      if (b?.tipo === 'numerada' && !hayCorte) b.items.push(item);
      else actual.bloques.push({ tipo: 'numerada', items: [item] });
      i++; continue;
    }

    // ── Opciones con letra: "A) algo"
    const letra = t.match(/^([A-E])\)\s+(.*)$/);
    if (letra) {
      const b = ultimo();
      const item: Item = { marca: letra[1], ...partirLead(letra[2]) };
      if (b?.tipo === 'vinetas' && b.marca === 'letra') b.items.push(item);
      else actual.bloques.push({ tipo: 'vinetas', marca: 'letra', items: [item] });
      i++; continue;
    }

    // ── Viñetas: ▸ - • ✔ ✓ y lineas que empiezan con emoji
    const vineta = t.match(/^([▸•\-–✔✓👉⭐])\s*(.*)$/u);
    const emoji  = vineta ? '' : empiezaConEmoji(t);
    if (vineta || emoji) {
      const marca: 'punto' | 'check' | 'emoji' =
        vineta ? (/[✔✓]/.test(vineta[1]) ? 'check' : (/[👉⭐]/u.test(vineta[1]) ? 'emoji' : 'punto')) : 'emoji';
      const cuerpo = vineta ? vineta[2] : t.slice(emoji.length).trim();
      const item: Item = {
        marca: marca === 'emoji' ? (vineta ? vineta[1] : emoji) : '',
        ...partirLead(cuerpo),
      };
      const b = ultimo();
      if (b?.tipo === 'vinetas' && b.marca === marca && !hayCorte) b.items.push(item);
      else actual.bloques.push({ tipo: 'vinetas', marca, items: [item] });
      i++; continue;
    }

    // ── Continuacion con sangria de un item o de un parrafo
    const b = ultimo();
    if (/^\s{2,}/.test(cruda) && b && (b.tipo === 'numerada' || b.tipo === 'vinetas') && !hayCorte) {
      const it = b.items[b.items.length - 1];
      it.texto = (it.texto + ' ' + t).trim();
      i++; continue;
    }

    // ── Parrafo. Se pega al anterior solo si este no cerraba una oracion:
    //    los textos viejos venian cortados a mano a 75 columnas.
    if (b?.tipo === 'parrafo' && !hayCorte && b.texto !== ''
        && !/[.!?:…)"»”]$/.test(b.texto)) {
      b.texto += ' ' + t;
    } else {
      actual.bloques.push({ tipo: 'parrafo', ...partirLead(t) });
    }
    i++;
  }
  cerrar();

  // Limpia la marca auxiliar.
  for (const s of secciones) delete (s as any)._corte;
  return secciones;
}

/**
 * Lo que el nino tiene que escribir, sacado de la seccion de entrega, para
 * mostrarlo junto al cuadro de respuesta. Vacio si la actividad no tiene.
 */
export function preguntasDeEntrega(secciones: Seccion[]): string[] {
  const entrega = [...secciones].reverse().find(s => s.tipo === 'entrega');
  if (!entrega) return [];
  const out: string[] = [];
  for (const b of entrega.bloques) {
    if (b.tipo === 'numerada' || b.tipo === 'vinetas') {
      for (const it of b.items) {
        // La regla de oro vive ahi para que se lea, no es algo que escribir.
        if (/^REGLA/i.test(it.lead)) continue;
        out.push([it.lead, it.texto].filter(Boolean).join(' '));
      }
    }
    // Campos de plantilla: "NOMBRE DE MI IA:" o "MI DIBUJO: descríbelo..."
    if (b.tipo === 'parrafo' && /:$/.test(b.lead)) out.push([b.lead, b.texto].filter(Boolean).join(' '));
  }
  return out;
}
