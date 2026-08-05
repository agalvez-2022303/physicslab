import { describe, it, expect } from 'vitest'
import { computeResultant, getComponents, type Vector2D } from '../physics'

describe('Force Composition Vector Engine', () => {
  it('calculates components of a single vector', () => {
    const v: Vector2D = { id: '1', label: 'F1', magnitude: 10, angleDeg: 60 }
    const comp = getComponents(v)
    expect(comp.x).toBeCloseTo(5)
    expect(comp.y).toBeCloseTo(8.66025, 4)
  })

  it('computes resultant of perpendicular vectors correctly', () => {
    const vectors: Vector2D[] = [
      { id: '1', label: 'F1', magnitude: 3, angleDeg: 0 },  // (3, 0)
      { id: '2', label: 'F2', magnitude: 4, angleDeg: 90 }, // (0, 4)
    ]
    const R = computeResultant(vectors)
    expect(R.x).toBeCloseTo(3)
    expect(R.y).toBeCloseTo(4)
    expect(R.magnitude).toBeCloseTo(5)
    expect(R.angleDeg).toBeCloseTo(53.13, 1)
  })

  it('computes zero resultant for cancelling vectors', () => {
    const vectors: Vector2D[] = [
      { id: '1', label: 'F1', magnitude: 5, angleDeg: 0 },
      { id: '2', label: 'F2', magnitude: 5, angleDeg: 180 },
    ]
    const R = computeResultant(vectors)
    expect(R.magnitude).toBeCloseTo(0)
  })
})
