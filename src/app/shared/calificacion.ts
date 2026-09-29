/**
 * La calificacion como la lee un nino: sobre 10.
 *
 * En la base se guarda de 0 a 100 --el quiz calcula porcentaje y el maestro
 * califica de 0 a 10 pero la pantalla lo multiplica por 10 al enviar (ver
 * gradebook y classroom)--. Mostrarla es dividir entre 10, y eso se hacia a
 * mano en cada pantalla: en una se olvido y un 100 salia como "100/10".
 *
 * Sin ".0" colgando: "10" y "8.5", no "10.0" y "8.5". Para un nino "10.0"
 * no dice nada que "10" no diga.
 */
export function sobreDiez(score: number | null | undefined): string {
  if (score == null) return '';
  const n = Math.round(score) / 10;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
