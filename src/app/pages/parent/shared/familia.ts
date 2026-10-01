import { Hijo, MateriaHijo } from '../../../services/api/familia-api.service';

/**
 * Lo que se calcula igual en todas las pantallas de familia. Si cada
 * pantalla lo hiciera a su modo terminarian diciendo cosas distintas, que es
 * justo lo que pasaba: el panel decia nivel con 200 XP por nivel y el nino
 * veia 500.
 */

/** El mismo de StudentDashboardComponent: papa e hijo ven el mismo nivel. */
export const XP_POR_NIVEL = 500;
const NOMBRES_NIVEL = ['Iniciado', 'Explorador', 'Code Explorer', 'Programador Jr.', 'Programador',
  'Dev Avanzado', 'Maestro del Código', 'Elite Coder', 'Leyenda', 'ByteKids Pro'];

export function nivel(xp: number): { n: number; nombre: string; enNivel: number; pct: number } {
  const n = Math.floor(xp / XP_POR_NIVEL) + 1;
  const enNivel = xp % XP_POR_NIVEL;
  return { n, nombre: NOMBRES_NIVEL[Math.min(n - 1, NOMBRES_NIVEL.length - 1)], enNivel,
           pct: Math.round(enNivel / XP_POR_NIVEL * 100) };
}

export function primerNombre(nombre: string): string { return (nombre || '').trim().split(/\s+/)[0]; }

/** Dias desde su ultima actividad. null = nunca ha hecho nada. */
export function diasSinActividad(h: Hijo): number | null {
  if (!h.ultimaActividad) return null;
  return Math.floor((Date.now() - new Date(h.ultimaActividad).getTime()) / 86400000);
}

/** Como va de constancia, en una etiqueta y un tono para el chip. */
export function constancia(h: Hijo): { texto: string; tono: 'ok' | 'medio' | 'alerta' | 'nuevo' } {
  const d = diasSinActividad(h);
  if (d === null) return { texto: 'Todavía no empieza', tono: 'nuevo' };
  if (d === 0) return { texto: 'Activo hoy', tono: 'ok' };
  if (d === 1) return { texto: 'Activo ayer', tono: 'ok' };
  if (d < 5) return { texto: `Hace ${d} días`, tono: 'medio' };
  return { texto: `${d} días sin entrar`, tono: 'alerta' };
}

/**
 * Que puede hacer la familia ESTA semana, segun lo que le toca al nino. Un
 * papa que pregunta "¿y tu tarea?" no ayuda; uno que sabe que su hijo esta
 * entrenando una IA con caritas, si.
 */
export function consejo(h: Hijo): { icono: string; texto: string } {
  const n = primerNombre(h.nombre);
  const d = diasSinActividad(h);
  if (d === null) {
    return { icono: '🚀', texto: `${n} todavía no empieza. Siéntense juntos 20 minutos a hacer la primera actividad: es corta y le va a encantar.` };
  }
  if (d >= 5) {
    return { icono: '⏰', texto: `${n} lleva ${d} días sin entrar. No hace falta mucho: una sesión de 20 minutos basta para retomar el hilo.` };
  }
  const m: MateriaHijo | undefined = h.materias.find(x => x.siguiente) ?? h.materias[0];
  const s = m?.siguiente;
  if (!m || !s) {
    const listo = h.materias.length && h.materias.every(x => x.aprobadas === x.total);
    return listo
      ? { icono: '🎉', texto: `¡${n} terminó todas sus actividades! Pregúntenle por su certificado y celébrenlo juntos.` }
      : { icono: '⏳', texto: `${n} ya entregó todo lo que tenía abierto. Su maestro lo está revisando.` };
  }
  switch (s.tipo) {
    case 'material':
      return { icono: '📚', texto: `${n} está leyendo «${s.titulo}». Pregúntenle qué fue lo más curioso: explicarlo con sus palabras le ayuda a entenderlo.` };
    case 'mision':
      return { icono: '🚀', texto: `${n} está en una misión práctica: «${s.titulo}». Pídanle que les enseñe lo que va haciendo; a los niños les encanta mostrar.` };
    case 'tarea':
      return { icono: '🔍', texto: `Esta semana ${n} va a investigar en casa y les va a hacer una entrevista. Denle 10 minutos: es parte de su actividad.` };
    case 'quiz':
      return { icono: '❓', texto: `${n} tiene un quiz pendiente: «${s.titulo}». Si no sale a la primera, puede repetirlo; equivocarse también es aprender.` };
    case 'proyecto':
      return { icono: '💡', texto: `${n} está inventando una IA para ayudar a alguien. Ayúdenle a pensar en un problema real de la casa o la escuela.` };
    default:
      return { icono: '🎯', texto: `${n} sigue con «${s.titulo}». Pregúntenle cómo va.` };
  }
}

export const ICONO_TIPO: Record<string, string> = {
  material: '📚', mision: '🚀', tarea: '🔍', quiz: '❓', proyecto: '🏗️',
};

export const ETIQUETA_ESTADO: Record<string, string> = {
  aprobada: 'Aprobada', revision: 'Esperando revisión', corregir: 'Por corregir',
  siguiente: 'Le toca', abierta: 'Disponible', bloqueada: 'Bloqueada',
};
