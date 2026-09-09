import { describe, it, expect } from 'vitest'
import {
  computeResultant,
  createVector,
  computeAnalytical,
  polarToRect,
  rectToPolar,
  type Vector2D,
} from '../physics'

describe('Vector Addition Engine (Suma de Vectores)', () => {
  it('converts polar to rectangular and back correctly', () => {
    const rect = polarToRect(10, 60)
    expect(rect.x).toBeCloseTo(5, 2)
    expect(rect.y).toBeCloseTo(8.66, 2)

    const polar = rectToPolar(rect.x, rect.y)
    expect(polar.magnitude).toBeCloseTo(10, 2)
    expect(polar.angleDeg).toBeCloseTo(60, 2)
  })

  it('creates vector with synchronized polar and rectangular data', () => {
    const v1 = createVector('v1', 'V₁', { magnitude: 5, angleDeg: 53.13 }, '#ffffff', 'polar')
    expect(v1.x).toBeCloseTo(3, 1)
    expect(v1.y).toBeCloseTo(4, 1)

    const v2 = createVector('v2', 'V₂', { x: -3, y: 4 }, '#ffffff', 'rectangular')
    expect(v2.magnitude).toBeCloseTo(5, 1)
    expect(v2.angleDeg).toBeCloseTo(126.87, 1)
  })

  it('computes resultant of 2 vectors correctly (Parallelogram / Triangle)', () => {
    const vectors: Vector2D[] = [
      createVector('1', 'V₁', { magnitude: 3, angleDeg: 0 }),
      createVector('2', 'V₂', { magnitude: 4, angleDeg: 90 }),
    ]
    const R = computeResultant(vectors)
    expect(R.x).toBeCloseTo(3, 2)
    expect(R.y).toBeCloseTo(4, 2)
    expect(R.magnitude).toBeCloseTo(5, 2)
    expect(R.angleDeg).toBeCloseTo(53.13, 1)
  })

  it('computes resultant of 3 or more vectors correctly (Polygon Method)', () => {
    const vectors: Vector2D[] = [
      createVector('1', 'V₁', { x: 4, y: 2 }),
      createVector('2', 'V₂', { x: -2, y: 5 }),
      createVector('3', 'V₃', { x: 1, y: -3 }),
    ]
    const R = computeResultant(vectors)
    // Rx = 4 - 2 + 1 = 3
    // Ry = 2 + 5 - 3 = 4
    expect(R.x).toBeCloseTo(3, 2)
    expect(R.y).toBeCloseTo(4, 2)
    expect(R.magnitude).toBeCloseTo(5, 2)
    expect(R.angleDeg).toBeCloseTo(53.13, 1)
  })

  it('generates accurate analytical decomposition table and formulas', () => {
    const vectors: Vector2D[] = [
      createVector('1', 'V₁', { magnitude: 6, angleDeg: 30 }),
      createVector('2', 'V₂', { magnitude: 8, angleDeg: 120 }),
    ]
    const analytical = computeAnalytical(vectors)
    expect(analytical.rows.length).toBe(2)
    expect(analytical.rows[0].formulaX).toContain('cos')
    expect(analytical.rows[0].formulaY).toContain('sen')
    expect(analytical.sumX).toBeCloseTo(vectors[0].x + vectors[1].x, 2)
    expect(analytical.sumY).toBeCloseTo(vectors[0].y + vectors[1].y, 2)
    expect(analytical.magnitudeDerivation).toContain('\\sqrt')
    expect(analytical.angleDerivation).toContain('\\arctan')
  })

  it('handles zero resultant for cancelling vectors', () => {
    const vectors: Vector2D[] = [
      createVector('1', 'V₁', { magnitude: 5, angleDeg: 0 }),
      createVector('2', 'V₂', { magnitude: 5, angleDeg: 180 }),
    ]
    const R = computeResultant(vectors)
    expect(R.magnitude).toBeCloseTo(0, 2)
  })
})
