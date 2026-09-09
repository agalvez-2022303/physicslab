/**
 * physics.ts — Motor matemático y analítico para Suma de Vectores
 *
 * Métodos gráficos:
 * - 2 vectores: Paralelogramo y Triángulo
 * - 3 o más vectores: Polígono
 * Método analítico:
 * - Descomposición de componentes rectangulares (Vx, Vy) desde coordenadas polares o rectangulares
 * - Sumatoria de componentes: Rx = Σ Vx, Ry = Σ Vy
 * - Módulo resultante: R = √(Rx² + Ry²)
 * - Ángulo resultante: θ = arctan(Ry / Rx) ajustado por cuadrante
 */

export interface Vector2D {
  id: string
  label: string
  magnitude: number
  angleDeg: number
  x: number
  y: number
  color?: string
  inputMode?: 'polar' | 'rectangular'
}

export interface VectorComponents {
  x: number
  y: number
  magnitude: number
  angleDeg: number
}

export interface AnalyticalRow {
  id: string
  label: string
  magnitude: number
  angleDeg: number
  x: number
  y: number
  formulaX: string
  formulaY: string
}

export interface AnalyticalResult {
  rows: AnalyticalRow[]
  sumX: number
  sumY: number
  resultant: VectorComponents
  quadrant: 'I' | 'II' | 'III' | 'IV' | 'Eje +X' | 'Eje +Y' | 'Eje -X' | 'Eje -Y' | 'Origen'
  magnitudeDerivation: string
  angleDerivation: string
}

export function toRadians(deg: number): number {
  return (deg * Math.PI) / 180
}

export function toDegrees(rad: number): number {
  let deg = (rad * 180) / Math.PI
  deg = deg % 360
  if (deg < 0) deg += 360
  return deg
}

/**
 * Normaliza el ángulo en grados al rango [0, 360)
 */
export function normalizeAngle(deg: number): number {
  let a = deg % 360
  if (a < 0) a += 360
  if (Math.abs(a - 360) < 1e-9) return 0
  return a
}

/**
 * Convierte magnitud y ángulo a componentes cartesianas (x, y)
 */
export function polarToRect(magnitude: number, angleDeg: number): { x: number; y: number } {
  const norm = normalizeAngle(angleDeg)
  const rad = toRadians(norm)
  let x = magnitude * Math.cos(rad)
  let y = magnitude * Math.sin(rad)
  if (Math.abs(x) < 1e-9) x = 0
  if (Math.abs(y) < 1e-9) y = 0
  return {
    x: parseFloat(x.toFixed(4)),
    y: parseFloat(y.toFixed(4)),
  }
}

/**
 * Convierte componentes cartesianas (x, y) a magnitud y ángulo polar
 */
export function rectToPolar(x: number, y: number): { magnitude: number; angleDeg: number } {
  const mag = Math.hypot(x, y)
  if (mag < 1e-9) return { magnitude: 0, angleDeg: 0 }
  const angleRad = Math.atan2(y, x)
  const angleDeg = toDegrees(angleRad)
  return {
    magnitude: parseFloat(mag.toFixed(4)),
    angleDeg: parseFloat(angleDeg.toFixed(2)),
  }
}

/**
 * Crea o actualiza un Vector2D asegurando sincronización entre polar y rectangular
 */
export function createVector(
  id: string,
  label: string,
  data: { magnitude: number; angleDeg: number } | { x: number; y: number },
  color?: string,
  inputMode: 'polar' | 'rectangular' = 'polar'
): Vector2D {
  if ('magnitude' in data) {
    const { x, y } = polarToRect(data.magnitude, data.angleDeg)
    return {
      id,
      label,
      magnitude: parseFloat(data.magnitude.toFixed(2)),
      angleDeg: parseFloat(normalizeAngle(data.angleDeg).toFixed(2)),
      x,
      y,
      color,
      inputMode,
    }
  } else {
    const { magnitude, angleDeg } = rectToPolar(data.x, data.y)
    return {
      id,
      label,
      magnitude,
      angleDeg,
      x: parseFloat(data.x.toFixed(2)),
      y: parseFloat(data.y.toFixed(2)),
      color,
      inputMode,
    }
  }
}

/** Calcula componentes X y Y de un vector dado */
export function getComponents(v: Vector2D): VectorComponents {
  return {
    x: v.x,
    y: v.y,
    magnitude: v.magnitude,
    angleDeg: v.angleDeg,
  }
}

/** Calcula la resultante de una lista de vectores */
export function computeResultant(vectors: Vector2D[]): VectorComponents {
  let rx = 0
  let ry = 0

  for (const vec of vectors) {
    rx += vec.x
    ry += vec.y
  }

  const mag = Math.hypot(rx, ry)
  const angleRad = Math.atan2(ry, rx)
  const angleDeg = mag < 1e-6 ? 0 : toDegrees(angleRad)

  return {
    x: parseFloat(rx.toFixed(4)),
    y: parseFloat(ry.toFixed(4)),
    magnitude: parseFloat(mag.toFixed(4)),
    angleDeg: parseFloat(angleDeg.toFixed(2)),
  }
}

/**
 * Determina el cuadrante cartesiano de un vector
 */
export function getQuadrant(x: number, y: number): 'I' | 'II' | 'III' | 'IV' | 'Eje +X' | 'Eje +Y' | 'Eje -X' | 'Eje -Y' | 'Origen' {
  if (Math.abs(x) < 1e-5 && Math.abs(y) < 1e-5) return 'Origen'
  if (Math.abs(y) < 1e-5) return x > 0 ? 'Eje +X' : 'Eje -X'
  if (Math.abs(x) < 1e-5) return y > 0 ? 'Eje +Y' : 'Eje -Y'
  if (x > 0 && y > 0) return 'I'
  if (x < 0 && y > 0) return 'II'
  if (x < 0 && y < 0) return 'III'
  return 'IV'
}

/**
 * Genera el análisis analítico completo con tabla de descomposición y derivaciones
 */
export function computeAnalytical(vectors: Vector2D[]): AnalyticalResult {
  const rows: AnalyticalRow[] = vectors.map((v) => {
    return {
      id: v.id,
      label: v.label,
      magnitude: v.magnitude,
      angleDeg: v.angleDeg,
      x: v.x,
      y: v.y,
      formulaX: `${v.magnitude.toFixed(2)} · cos(${v.angleDeg.toFixed(1)}°) = ${v.x.toFixed(2)}`,
      formulaY: `${v.magnitude.toFixed(2)} · sen(${v.angleDeg.toFixed(1)}°) = ${v.y.toFixed(2)}`,
    }
  })

  const resultant = computeResultant(vectors)
  const rx = resultant.x
  const ry = resultant.y
  const mag = resultant.magnitude
  const quadrant = getQuadrant(rx, ry)

  const magnitudeDerivation = `R = \\sqrt{R_x^2 + R_y^2} = \\sqrt{(${rx.toFixed(2)})^2 + (${ry.toFixed(2)})^2} = \\sqrt{${(rx * rx).toFixed(2)} + ${(ry * ry).toFixed(2)}} = ${mag.toFixed(2)}`

  let angleDerivation = ''
  if (mag < 1e-5) {
    angleDerivation = '\\theta = 0^\\circ \\text{ (Resultante nula)}'
  } else if (Math.abs(rx) < 1e-5) {
    angleDerivation = ry > 0 ? '\\theta = 90^\\circ \\text{ (Eje +Y)}' : '\\theta = 270^\\circ \\text{ (Eje -Y)}'
  } else {
    const alpha = Math.atan(Math.abs(ry) / Math.abs(rx)) * (180 / Math.PI)
    if (rx > 0 && ry >= 0) {
      angleDerivation = `\\theta = \\arctan\\left(\\frac{|${ry.toFixed(2)}|}{|${rx.toFixed(2)}|}\\right) = ${alpha.toFixed(2)}^\\circ \\text{ (Cuadrante I)}`
    } else if (rx < 0 && ry >= 0) {
      angleDerivation = `\\alpha = ${alpha.toFixed(2)}^\\circ \\implies \\theta = 180^\\circ - ${alpha.toFixed(2)}^\\circ = ${(180 - alpha).toFixed(2)}^\\circ \\text{ (Cuadrante II)}`
    } else if (rx < 0 && ry < 0) {
      angleDerivation = `\\alpha = ${alpha.toFixed(2)}^\\circ \\implies \\theta = 180^\\circ + ${alpha.toFixed(2)}^\\circ = ${(180 + alpha).toFixed(2)}^\\circ \\text{ (Cuadrante III)}`
    } else {
      angleDerivation = `\\alpha = ${alpha.toFixed(2)}^\\circ \\implies \\theta = 360^\\circ - ${alpha.toFixed(2)}^\\circ = ${(360 - alpha).toFixed(2)}^\\circ \\text{ (Cuadrante IV)}`
    }
  }

  return {
    rows,
    sumX: rx,
    sumY: ry,
    resultant,
    quadrant,
    magnitudeDerivation,
    angleDerivation,
  }
}
