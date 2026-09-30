/**
 * El XP acumulado, semana por semana.
 *
 * Antes las graficas tomaban los ultimos 8 EVENTOS de XP y a cada uno le
 * ponian "Sem 1", "Sem 2"... Dos actividades el mismo dia salian como dos
 * semanas. Aqui se agrupan de verdad por semana (de lunes a domingo), desde
 * la primera semana con actividad, hasta un maximo de `cuantas`.
 *
 * Lo usan el dashboard del alumno y Mi Progreso: si cada uno lo calculara a
 * su modo, dirian cosas distintas.
 */
export interface SemanaXp {
  /** "22 sep": el lunes de esa semana. */
  etiqueta: string;
  /** XP acumulado al cierre de esa semana. */
  acumulado: number;
}

function lunesDe(fecha: Date): Date {
  const d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const dia = (d.getDay() + 6) % 7;          // lunes = 0
  d.setDate(d.getDate() - dia);
  return d;
}

export function xpPorSemana(eventos: any[], cuantas = 8): SemanaXp[] {
  const validos = (eventos ?? [])
    .map(e => ({ t: new Date(e?.createdAt ?? 0), xp: Number(e?.amount ?? 0) }))
    .filter(e => !isNaN(e.t.getTime()) && e.t.getTime() > 0);
  if (!validos.length) return [];

  const estaSemana = lunesDe(new Date());
  const primera = lunesDe(new Date(Math.min(...validos.map(e => e.t.getTime()))));

  // Desde la primera semana con XP, pero nunca mas de `cuantas` hacia atras.
  const semanas: Date[] = [];
  for (let s = new Date(estaSemana); s >= primera && semanas.length < cuantas; s.setDate(s.getDate() - 7)) {
    semanas.unshift(new Date(s));
  }

  // Lo ganado ANTES de la ventana tambien cuenta en el acumulado.
  const inicio = semanas[0].getTime();
  let acumulado = validos.filter(e => e.t.getTime() < inicio).reduce((s, e) => s + e.xp, 0);

  return semanas.map((lunes, i) => {
    const fin = i + 1 < semanas.length ? semanas[i + 1].getTime() : Infinity;
    acumulado += validos.filter(e => e.t.getTime() >= lunes.getTime() && e.t.getTime() < fin)
                        .reduce((s, e) => s + e.xp, 0);
    return {
      etiqueta: lunes.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', ''),
      acumulado,
    };
  });
}
