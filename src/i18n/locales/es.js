// Spanish locale. Keys mirror en.js exactly (enforced by tests/i18n.test.js).
export default {
  ui: { tap: '▶ tap' },
  menu: {
    title: 'THE CASTER',
    subtitle: 'venganza elemental',
    play: '▶  TAP PARA JUGAR',
    wipe: '⟲ borrar guardado (debug)',
    wipeConfirm: '⟲ ¿seguro? toca otra vez',
  },
  speaker: {
    narrator: 'Narrador',
    caster: 'The Caster',
    unknown: '???',
    mage: { fire: 'Mago del Fuego', water: 'Dama del Lago', air: 'Mago del Aire', earth: 'Mago de la Tierra' },
  },
  region: {
    fire: { name: 'El Volcán' }, water: { name: 'El Lago' }, air: { name: 'La Montaña' },
    earth: { name: 'El Bosque' }, castle: { name: 'El Castillo' },
  },
  hud: { levelCleared: 'Nivel superado. +{reward} punto(s) de habilidad, +{gold} oro.' },
  map: {
    title: 'EL MAPA',
    elements: 'Elementos dominados: {n}/4',
    gold: 'Oro: {gold}',
    castleLocked: 'Requiere los 4 elementos',
    skilltree: '🌳 Árbol ({pts})',
    shop: '🛒 Tienda',
  },
  shop: {
    title: 'Tienda',
    gold: 'Oro: {gold}',
    price: '{price} oro',
    have: 'tienes: {n}',
    back: 'Volver',
    item: { potion: 'Poción', elixir: 'Elixir de daño', phoenix: 'Pluma de fénix' },
  },
  story: {
    fire: {
      intro: { 0: 'Un amor prohibido entre una princesa y un hechicero fue castigado por el Consejo de Magos.',
               1: 'Tu madre, exiliada. Tu padre, asesinado. Tú, la huérfana que descendió al volcán por venganza.' },
      mage: { 0: 'Yo encendí la pira de tu padre. Ardió pidiendo clemencia.',
              1: 'Entonces aprenderé tu fuego, y haré que cada mago del Consejo arda igual.' },
    },
    water: {
      intro: { 0: 'Bajo el lago habita la maga que firmó el exilio de tu madre.' },
      mage: { 0: 'Tu madre suplicó por su vida en estas aguas. Yo no escuché.',
              1: 'Pues estas aguas ahora son mías.' },
    },
    air: {
      intro: { 0: 'En la cima, el mago que falsificó la sentencia de tu padre te observa caer y subir.' },
      mage: { 0: 'Yo redacté la mentira que condenó a tu padre. El Consejo solo asintió.',
              1: 'Entonces tu rayo escribirá la verdad sobre tu tumba.' },
    },
    earth: {
      intro: { 0: 'El bosque esconde al más viejo del Consejo, el que envenenó el oído del Rey.' },
      mage: { 0: 'Yo le susurré al Rey que tu familia era una amenaza. Y me creyó.',
              1: 'El Rey ya no te servirá de nada. Lo verás tú misma.' },
    },
    castle: {
      intro: { 0: 'Las puertas del castillo se abren. Los que amaban a quienes mataste te esperan.' },
      clear: { 0: 'Abuelo… el Rey. Por fin.',
               1: 'No queda nada de él que puedas matar. Hace años que el Rey está muerto.',
               2: '¿Quién eres? Conocías a mi padre…',
               3: 'Su amigo. Y quien mueve este cadáver con magia. Tu venganza apenas comienza, niña.',
               4: 'CONTINUARÁ…' },
    },
  },
};
