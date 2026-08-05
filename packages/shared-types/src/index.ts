// ─── Categorías ───────────────────────────────────────────────────────────────

export type CategoryId =
  | 'mecanica'
  | 'oscilaciones-ondas'
  | 'electrodinamica'
  | 'optica'
  | 'termodinamica'
  | 'relatividad'
  | 'fisica-atomica'
  | 'fisica-nuclear'
  | 'estado-solido'

export interface Category {
  id: CategoryId
  nombre: string
  descripcion: string
  icono: string // emoji o nombre de icono
  orden: number
}

// ─── Simulaciones ─────────────────────────────────────────────────────────────

export type SimulationStatus = 'active' | 'coming-soon'

export type DifficultyLevel = 'basico' | 'intermedio' | 'avanzado'

export interface Simulation {
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
}

// ─── Respuestas API ────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  total?: number
}

export interface SimulationsQuery {
  categoriaId?: CategoryId
  q?: string
  estado?: SimulationStatus
}

// ─── Contenido didáctico ──────────────────────────────────────────────────────

export interface Formula {
  expresion: string // LaTeX o texto plano
  descripcion: string
  variables: { simbolo: string; descripcion: string; unidad: string }[]
}

export interface SimulationContent {
  slug: string
  titulo: string
  teoria: string // markdown
  formulas: Formula[]
  unidades: { magnitud: string; unidad: string; simbolo: string }[]
  glosario: { termino: string; definicion: string }[]
}
