/**
 * physics.ts — Lógica para composición / suma de vectores
 */

export interface Vector2D {
  id: string
  label: string
  magnitude: number // N
  angleDeg: number  // grados (0° = eje +X, 90° = eje +Y)
  color?: string
}

export interface VectorComponents {
  x: number
  y: number
  magnitude: number
  angleDeg: number
}

export function toRadians(deg: number): number {
  return (deg * Math.PI) / 180
}

export function toDegrees(rad: number): number {
  let deg = (rad * 180) / Math.PI
  if (deg < 0) deg += 360
  return deg
}

/** Calcula componentes X y Y de un vector dado */
export function getComponents(v: Vector2D): VectorComponents {
  const rad = toRadians(v.angleDeg)
  const x = v.magnitude * Math.cos(rad)
  const y = v.magnitude * Math.sin(rad)
  return {
    x,
    y,
    magnitude: v.magnitude,
    angleDeg: v.angleDeg,
  }
}

/** Calcula la resultante de una lista de vectores */
export function computeResultant(vectors: Vector2D[]): VectorComponents {
  let rx = 0
  let ry = 0

  for (const vec of vectors) {
    const comp = getComponents(vec)
    rx += comp.x
    ry += comp.y
  }

  const mag = Math.sqrt(rx * rx + ry * ry)
  const angleRad = Math.atan2(ry, rx)
  const angleDeg = toDegrees(angleRad)

  return {
    x: rx,
    y: ry,
    magnitude: mag,
    angleDeg: mag < 1e-6 ? 0 : angleDeg,
  }
}
