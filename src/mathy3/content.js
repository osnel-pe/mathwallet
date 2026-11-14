export const LEVEL_COUNT = 10,
  GATES_PER_LEVEL = 5,
  TOTAL_GATES = 50
export const WORLDS = [
  {
    id: 0,
    name: 'Bosque Esmeralda',
    tag: 'EL DESPERTAR',
    icon: '🌳',
    sky: ['#5dbed8', '#d6f4dc'],
    ground: '#986c47',
    grass: '#51bb72',
    accent: '#b4ff95',
    description: 'Aprende a construir y descubre ruinas entre las copas.',
    mechanics: 'Escaleras · palancas · puentes'
  },
  {
    id: 1,
    name: 'Dunas del Tiempo',
    tag: 'DOMINA EL RITMO',
    icon: '☀️',
    sky: ['#e6ad7e', '#ffe9b5'],
    ground: '#b1764d',
    grass: '#edbf74',
    accent: '#ffe4a3',
    description: 'Templos suspendidos, mecanismos y arena que no espera.',
    mechanics: 'Plataformas móviles · bloques frágiles'
  },
  {
    id: 2,
    name: 'Cumbres de Cristal',
    tag: 'MANTÉN EL EQUILIBRIO',
    icon: '❄️',
    sky: ['#6b9ecb', '#deefff'],
    ground: '#728ba7',
    grass: '#b9f1ff',
    accent: '#c4f6ff',
    description: 'El hielo transforma cada salto en una decisión.',
    mechanics: 'Hielo · resortes · rutas verticales'
  },
  {
    id: 3,
    name: 'Minas del Eclipse',
    tag: 'CONSTRUYE TU CAMINO',
    icon: '💎',
    sky: ['#131a3e', '#3a3261'],
    ground: '#514771',
    grass: '#56cfbc',
    accent: '#9bf5e2',
    description: 'Cristales vivos iluminan puentes y máquinas antiguas.',
    mechanics: 'Construcción · sierras · activadores'
  },
  {
    id: 4,
    name: 'Forja Celeste',
    tag: 'LA PRUEBA FINAL',
    icon: '🔥',
    sky: ['#331b39', '#ad5665'],
    ground: '#554456',
    grass: '#e19172',
    accent: '#ffd07e',
    description: 'Combina todo lo aprendido en una travesía de precisión.',
    mechanics: 'Lava · trampas · secuencias expertas'
  }
]
export const RECIPES = [
  ['stairs', 'switch', 'build', 'gap', 'moving'],
  ['crumble', 'stairs', 'spring', 'switch', 'spikes'],
  ['moving', 'crumble', 'switch', 'moving', 'stairs'],
  ['build', 'spikes', 'moving', 'spring', 'crumble'],
  ['ice', 'stairs', 'spring', 'ice', 'moving'],
  ['crumble', 'ice', 'spikes', 'spring', 'build'],
  ['build', 'switch', 'moving', 'spikes', 'crumble'],
  ['stairs', 'spikes', 'build', 'spring', 'moving'],
  ['spikes', 'moving', 'crumble', 'build', 'spring'],
  ['build', 'spring', 'spikes', 'moving', 'crumble']
]
export const MECHANICS = {
  stairs: ['RUTA VERTICAL', 'Sube por los bloques. Las flechas te muestran la ruta.'],
  switch: ['PALANCA', 'Acércate al interruptor y pulsa E para abrir la barrera.'],
  build: ['CONSTRUCCIÓN', 'Recoge 3 bloques de energía y pulsa E junto al plano del puente.'],
  gap: ['SALTO DE PRECISIÓN', 'Toma impulso y salta antes del borde.'],
  moving: ['PLATAFORMA MÓVIL', 'Salta a la plataforma, viaja con ella y cruza al otro lado.'],
  crumble: ['SUELO FRÁGIL', 'Los bloques se rompen: no te quedes quieto.'],
  spring: ['RESORTE', 'Pisa la base luminosa para alcanzar la ruta superior.'],
  spikes: ['TRAMPAS', 'Salta sobre los pinchos y calcula el paso de la sierra.'],
  ice: ['HIELO', 'Anticipa el frenado: en el hielo te deslizas más.']
}
export function levelTitle(level) {
  return `${Math.floor(level / 2) + 1}–${(level % 2) + 1}`
}
export function gateId(level, local) {
  return level * 5 + local + 1
}
// Solo para la demo de práctica y para generar las semillas SQL del docente.
// El cliente integrado NO recibe esta función ni las respuestas correctas.
