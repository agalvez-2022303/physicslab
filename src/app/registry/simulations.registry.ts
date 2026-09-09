/**
 * simulations.registry.ts
 *
 * Registro central de simulaciones del frontend.
 * Cada entrada tiene la metadata estática necesaria para renderizar
 * la tarjeta en Home y cargar el componente lazy.
 *
 * Para agregar la simulación #4:
 *   1. Añadir una entrada aquí con el slug, categoría, etc.
 *   2. Crear el componente en src/app/simulations/<slug>/
 *   3. Agregar la Route en App.tsx con React.lazy
 *   4. Insertar el registro en data/simulations.json (para la API)
 *   5. Crear data/content/<slug>.json (para el contenido didáctico)
 */

import type { CategoryId, DifficultyLevel, SimulationStatus } from '@physicslab/shared-types'

export interface SimulationEntry {
  id: string
  slug: string
  titulo: string
  descripcionCorta: string
  categoriaId: CategoryId
  dificultad: DifficultyLevel
  estado: SimulationStatus
  orden: number
  icono: string
  etiquetas: string[]
  /** Ruta de la simulación en el router */
  path: string
}

export const SIMULATIONS_REGISTRY: SimulationEntry[] = [
  {
    id: 'sim-000',
    slug: 'vectores',
    titulo: 'Vectores',
    descripcionCorta: 'Coordenadas rectangulares, polares y geográficas con práctica interactiva.',
    categoriaId: 'mecanica',
    dificultad: 'basico',
    estado: 'active',
    orden: 1,
    icono: '↗',
    etiquetas: ['vectores', 'coordenadas', 'polar', 'rectangular', 'geográfico', 'práctica'],
    path: '/sim/vectores',
  },
  {
    id: 'sim-001',
    slug: 'movimiento-aceleracion-constante',
    titulo: 'Movimiento con Aceleración Constante',
    descripcionCorta: 'MRUA con gráficas x-t, v-t y a-t en tiempo real.',
    categoriaId: 'mecanica',
    dificultad: 'basico',
    estado: 'active',
    orden: 1,
    icono: '→',
    etiquetas: ['cinemática', 'MRUA', 'gráficas'],
    path: '/sim/movimiento-aceleracion-constante',
  },
  {
    id: 'sim-002',
    slug: 'tres-fuerzas-equilibrio',
    titulo: 'Tres Fuerzas en Equilibrio',
    descripcionCorta: 'Equilibrio estático con poleas y pesas arrastrables.',
    categoriaId: 'mecanica',
    dificultad: 'basico',
    estado: 'active',
    orden: 2,
    icono: '△',
    etiquetas: ['estática', 'equilibrio', 'vectores'],
    path: '/sim/tres-fuerzas-equilibrio',
  },
  {
    id: 'sim-003',
    slug: 'suma-vectores',
    titulo: 'Suma de vectores',
    descripcionCorta: 'Método del paralelogramo, triángulo, polígono y método analítico.',
    categoriaId: 'mecanica',
    dificultad: 'basico',
    estado: 'active',
    orden: 3,
    icono: '⊕',
    etiquetas: ['vectores', 'suma vectorial', 'resultante', 'analítico'],
    path: '/sim/suma-vectores',
  },
  // ─── Próximamente ──────────────────────────────────────────────
  {
    id: 'sim-004',
    slug: 'pendulo-simple',
    titulo: 'Péndulo Simple',
    descripcionCorta: 'Oscilación y periodo en función de la longitud.',
    categoriaId: 'mecanica',
    dificultad: 'basico',
    estado: 'coming-soon',
    orden: 4,
    icono: '◷',
    etiquetas: ['péndulo', 'oscilación'],
    path: '/sim/pendulo-simple',
  },
  {
    id: 'sim-005',
    slug: 'tiro-parabolico',
    titulo: 'Tiro Parabólico',
    descripcionCorta: 'Trayectoria de un proyectil bajo gravedad.',
    categoriaId: 'mecanica',
    dificultad: 'basico',
    estado: 'coming-soon',
    orden: 5,
    icono: '⌒',
    etiquetas: ['proyectil', 'parábola'],
    path: '/sim/tiro-parabolico',
  },
  {
    id: 'sim-006',
    slug: 'ley-de-hooke',
    titulo: 'Ley de Hooke',
    descripcionCorta: 'Deformación de un resorte y relación fuerza-elongación.',
    categoriaId: 'mecanica',
    dificultad: 'basico',
    estado: 'coming-soon',
    orden: 6,
    icono: '⌀',
    etiquetas: ['resorte', 'elasticidad'],
    path: '/sim/ley-de-hooke',
  },
  {
    id: 'sim-007',
    slug: 'onda-transversal',
    titulo: 'Onda Transversal',
    descripcionCorta: 'Propagación de ondas y parámetros de onda.',
    categoriaId: 'oscilaciones-ondas',
    dificultad: 'intermedio',
    estado: 'coming-soon',
    orden: 1,
    icono: '≋',
    etiquetas: ['onda', 'amplitud', 'frecuencia'],
    path: '/sim/onda-transversal',
  },
  {
    id: 'sim-008',
    slug: 'campo-electrico',
    titulo: 'Campo Eléctrico',
    descripcionCorta: 'Campo eléctrico por cargas puntuales.',
    categoriaId: 'electrodinamica',
    dificultad: 'intermedio',
    estado: 'coming-soon',
    orden: 1,
    icono: '⚡',
    etiquetas: ['campo eléctrico', 'Coulomb'],
    path: '/sim/campo-electrico',
  },
  {
    id: 'sim-009',
    slug: 'espejo-convergente',
    titulo: 'Espejo Convergente',
    descripcionCorta: 'Trazado de rayos en espejos esféricos.',
    categoriaId: 'optica',
    dificultad: 'intermedio',
    estado: 'coming-soon',
    orden: 1,
    icono: '◑',
    etiquetas: ['espejos', 'óptica'],
    path: '/sim/espejo-convergente',
  },
  {
    id: 'sim-010',
    slug: 'ciclo-carnot',
    titulo: 'Ciclo de Carnot',
    descripcionCorta: 'Ciclo termodinámico ideal en diagrama P-V.',
    categoriaId: 'termodinamica',
    dificultad: 'avanzado',
    estado: 'coming-soon',
    orden: 1,
    icono: '♨',
    etiquetas: ['Carnot', 'termodinámica'],
    path: '/sim/ciclo-carnot',
  },
]

/** Si es false, oculta las tarjetas "Próximamente" de la interfaz */
export const SHOW_COMING_SOON = false

/** Devuelve simulaciones agrupadas por categoría */
export function getByCategory(includeComingSoon = SHOW_COMING_SOON) {
  const registry = includeComingSoon
    ? SIMULATIONS_REGISTRY
    : SIMULATIONS_REGISTRY.filter(s => s.estado === 'active')

  return registry.reduce(
    (acc, sim) => {
      if (!acc[sim.categoriaId]) acc[sim.categoriaId] = []
      acc[sim.categoriaId].push(sim)
      return acc
    },
    {} as Record<string, SimulationEntry[]>
  )
}

/** Filtra por texto (título, descripción o etiquetas) */
export function filterByText(sims: SimulationEntry[], q: string) {
  const query = q.toLowerCase()
  return sims.filter(
    s =>
      s.titulo.toLowerCase().includes(query) ||
      s.descripcionCorta.toLowerCase().includes(query) ||
      s.etiquetas.some(t => t.toLowerCase().includes(query))
  )
}
