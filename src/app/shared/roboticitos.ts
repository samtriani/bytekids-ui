/**
 * Los roboticitos de ByteKids: el juego de avatares que puede escoger
 * cualquiera, de alumno a coordinacion.
 *
 * Son imagenes que VIAJAN CON LA APP (src/assets/robots), no fotos subidas.
 * Esa fue la decision de fondo: subir fotos pedia almacenamiento de verdad
 * --el disco de Fly es efimero y la maquina se suspende-- y, sobre todo,
 * pedia guardar caras de menores en algun lado. Un juego cerrado de dibujos
 * no guarda nada, no se modera y no se puede fugar. En la base solo vive el
 * id, en avatar_url.
 *
 * WebP con transparencia, 164 px: el circulo ya viene dibujado en la
 * imagen, asi que la pantalla no tiene que redondear nada. 164 alcanza para
 * los tres tamanos en que se usa --34 en la barra de arriba, 48 en el menu
 * lateral, 52 en el selector-- y para el retrato de 88 px en pantalla
 * retina. Los doce juntos pesan 87 KB.
 *
 * El servidor valida contra esta misma lista (AVATARES en UserService): que
 * la pantalla solo ofrezca estos no basta como regla.
 */
export interface Roboticito {
  id: string;
  nombre: string;
  desc: string;
  /** Ruta del archivo, relativa a la raiz de la app. */
  img: string;
}

export const ROBOTICITOS: Roboticito[] = [
  {
    id: 'bot-chip',
    nombre: 'Chip',
    desc: 'Alegre y directo. El primero en levantar la mano.',
    img: 'assets/robots/chip.webp',
  },
  {
    id: 'bot-nova',
    nombre: 'Nova',
    desc: 'Curioso y explorador. Siempre busca nuevas ideas.',
    img: 'assets/robots/nova.webp',
  },
  {
    id: 'bot-pixel',
    nombre: 'Pixel',
    desc: 'Preciso y ordenado. Amante de la lógica.',
    img: 'assets/robots/pixel.webp',
  },
  {
    id: 'bot-volt',
    nombre: 'Volt',
    desc: 'Energía pura. Siempre listo para la acción.',
    img: 'assets/robots/volt.webp',
  },
  {
    id: 'bot-domo',
    nombre: 'Domo',
    desc: 'Observa, analiza y te da perspectiva.',
    img: 'assets/robots/domo.webp',
  },
  {
    id: 'bot-hex',
    nombre: 'Hex',
    desc: 'Analítico y estratégico. Ve el mundo en patrones.',
    img: 'assets/robots/hex.webp',
  },
  {
    id: 'bot-bit',
    nombre: 'Bit',
    desc: 'Pequeño, pero con grandes ideas.',
    img: 'assets/robots/bit.webp',
  },
  {
    id: 'bot-radar',
    nombre: 'Radar',
    desc: 'Siempre alerta. Te mantiene un paso adelante.',
    img: 'assets/robots/radar.webp',
  },
  {
    id: 'bot-luna',
    nombre: 'Luna',
    desc: 'Creativa y soñadora. Convierte ideas en posibilidades.',
    img: 'assets/robots/luna.webp',
  },
  {
    id: 'bot-mecha',
    nombre: 'Mecha',
    desc: 'Fuerte y confiable. Para los grandes desafíos.',
    img: 'assets/robots/mecha.webp',
  },
  {
    id: 'bot-tuerca',
    nombre: 'Tuerca',
    desc: 'Práctico y resolutivo. Todo tiene solución.',
    img: 'assets/robots/tuerca.webp',
  },
  {
    id: 'bot-byte',
    nombre: 'Byte',
    desc: 'Divertido y empático. Aprende contigo.',
    img: 'assets/robots/byte.webp',
  },
];

/**
 * Busca por id. Devuelve null si nunca escogio, o si trae un id que ya no
 * existe porque el juego cambio: en los dos casos la pantalla cae a sus
 * iniciales, que es lo que habia antes.
 */
export function roboticito(id?: string | null): Roboticito | null {
  if (!id) return null;
  return ROBOTICITOS.find(r => r.id === id) ?? null;
}
