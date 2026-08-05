/**
 * physics.ts — Lógica de equilibrio de tres fuerzas
 *
 * Sistema: nudo del que salen 3 fuerzas.
 * F3 (fija hacia abajo) se calcula automáticamente para mantener equilibrio.
 * F1 y F2 tienen magnitud ajustable y ángulo determinado por posición de poleas.
 *
 * Equilibrio: F1 + F2 + F3 = 0
 *   => F3 = -(F1 + F2)
 *
 * Validación: cada fuerza < suma de las otras dos (desigualdad triangular)
 */

export interface Vec2 { x: number; y: number }

/** Convierte ángulo (radianes desde el eje +Y hacia arriba) a vector unitario */
export function angleToVec(angleRad: number): Vec2 {
  return { x: Math.sin(angleRad), y: -Math.cos(angleRad) }
}

/** Magnitud de un vector 2D */
export function magnitude(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y)
}

/** Ángulo del vector desde el eje Y+ (hacia arriba), en radianes */
export function vecToAngle(v: Vec2): number {
  return Math.atan2(v.x, -v.y)
}

/** Ángulo en grados desde la vertical */
export function vecToAngleDeg(v: Vec2): number {
  return (vecToAngle(v) * 180) / Math.PI
}

export interface ForceSystem {
  F1: { magnitude: number; angle: number }  // ángulo en radianes desde Y+
  F2: { magnitude: number; angle: number }
}

export interface ForceResult {
  F1vec: Vec2
  F2vec: Vec2
  F3vec: Vec2      // resultante de equilibrio = -(F1+F2)
  F3mag: number    // magnitud de F3
  valid: boolean   // cumple desigualdad triangular
  error?: string
}

export function computeEquilibrium(system: ForceSystem): ForceResult {
  const F1vec: Vec2 = {
    x: system.F1.magnitude * Math.sin(system.F1.angle),
    y: -system.F1.magnitude * Math.cos(system.F1.angle),
  }
  const F2vec: Vec2 = {
    x: system.F2.magnitude * Math.sin(system.F2.angle),
    y: -system.F2.magnitude * Math.cos(system.F2.angle),
  }

  // F3 = -(F1 + F2)  para equilibrio
  const F3vec: Vec2 = {
    x: -(F1vec.x + F2vec.x),
    y: -(F1vec.y + F2vec.y),
  }
  const F3mag = magnitude(F3vec)

  const f1 = system.F1.magnitude
  const f2 = system.F2.magnitude
  const f3 = F3mag

  // Validación de desigualdad triangular
  const valid = f1 < f2 + f3 && f2 < f1 + f3 && f3 < f1 + f2

  return {
    F1vec, F2vec, F3vec, F3mag,
    valid,
    error: valid ? undefined : 'El sistema no puede estar en equilibrio con estas magnitudes.',
  }
}
