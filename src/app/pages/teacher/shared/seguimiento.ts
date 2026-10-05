/**
 * Cómo se ve el estado de un alumno. Lo decide la API
 * (SeguimientoService.diagnosticar); aquí solo se pinta. Lo usan el Panel y
 * Reportes: si cada uno tuviera su copia, terminarían diciendo cosas distintas
 * del mismo niño.
 */
export type EstadoAlumno = 'bien' | 'nuevo' | 'sin_empezar' | 'atorado' | 'sin_actividad' | 'calificaciones_bajas';

export interface InfoEstado { etiqueta: string; icono: string; tag: string; color: string; orden: number; }

/** `orden`: lo que el maestro atiende primero. */
export const ESTADOS: Record<EstadoAlumno, InfoEstado> = {
  atorado:              { etiqueta: 'Atorado',              icono: '🧱', tag: 'tag-red',    color: '#9B1414', orden: 0 },
  sin_empezar:          { etiqueta: 'Sin empezar',          icono: '🔕', tag: 'tag-gray',   color: '#9CA3AF', orden: 1 },
  sin_actividad:        { etiqueta: 'Sin actividad',        icono: '😴', tag: 'tag-oro',    color: '#C4992A', orden: 2 },
  calificaciones_bajas: { etiqueta: 'Calificaciones bajas', icono: '📉', tag: 'tag-guinda', color: '#7A1535', orden: 3 },
  nuevo:                { etiqueta: 'Recién llegado',       icono: '🌱', tag: 'tag-blue',   color: '#1A6B3C', orden: 4 },
  bien:                 { etiqueta: 'Va bien',              icono: '✅', tag: 'tag-green',  color: '#1A6B3C', orden: 5 },
};

export const NECESITA_ATENCION: EstadoAlumno[] = ['atorado', 'sin_empezar', 'sin_actividad', 'calificaciones_bajas'];

export function estadoValido(e: string): EstadoAlumno {
  return (e in ESTADOS ? e : 'bien') as EstadoAlumno;
}
