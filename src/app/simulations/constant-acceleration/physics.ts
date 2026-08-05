/**
 * physics.ts — Lógica de física para MRUA
 *
 * Ecuaciones cinemáticas con aceleración constante:
 *   x(t) = x₀ + v₀·t + ½·a·t²
 *   v(t) = v₀ + a·t
 *   a(t) = a (constante)
 */

export interface KinematicsState {
  x:  number   // posición actual (m)
  v:  number   // velocidad actual (m/s)
  a:  number   // aceleración (m/s²)
  t:  number   // tiempo (s)
}

export interface KinematicsParams {
  x0: number   // posición inicial (m)
  v0: number   // velocidad inicial (m/s)
  a:  number   // aceleración (m/s²)
}

/**
 * Calcula el estado cinemático en el instante t
 */
export function computeKinematics(p: KinematicsParams, t: number): KinematicsState {
  return {
    x: p.x0 + p.v0 * t + 0.5 * p.a * t * t,
    v: p.v0 + p.a * t,
    a: p.a,
    t,
  }
}

/**
 * Tiempo en que el objeto pasa por una posición x dada (primera solución positiva).
 * Devuelve null si nunca llega.
 */
export function timeAtPosition(p: KinematicsParams, x: number): number | null {
  const dx = x - p.x0
  // Caso a=0: movimiento uniforme
  if (Math.abs(p.a) < 1e-9) {
    if (Math.abs(p.v0) < 1e-9) return null
    const t = dx / p.v0
    return t >= 0 ? t : null
  }
  // Ecuación cuadrática: ½a·t² + v₀·t - dx = 0
  const discriminant = p.v0 * p.v0 + 2 * p.a * dx
  if (discriminant < 0) return null
  const t1 = (-p.v0 + Math.sqrt(discriminant)) / p.a
  const t2 = (-p.v0 - Math.sqrt(discriminant)) / p.a
  const candidates = [t1, t2].filter(t => t >= -1e-9).map(t => Math.max(0, t))
  if (candidates.length === 0) return null
  return Math.min(...candidates)
}
