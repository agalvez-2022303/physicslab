import { describe, it, expect } from 'vitest'
import { computeEquilibrium, type ForceSystem } from '../physics'

describe('Three Forces Equilibrium Engine', () => {
  it('validates equilibrium when triangle inequality is satisfied', () => {
    const system: ForceSystem = {
      F1: { magnitude: 5, angle: (Math.PI / 180) * 130 },
      F2: { magnitude: 5, angle: (Math.PI / 180) * 230 },
    }
    const result = computeEquilibrium(system)
    expect(result.valid).toBe(true)
    expect(result.F3mag).toBeGreaterThan(0)
  })

  it('rejects equilibrium when forces are parallel (collinear boundary)', () => {
    const system: ForceSystem = {
      F1: { magnitude: 10, angle: Math.PI }, // 180°
      F2: { magnitude: 1, angle: Math.PI },  // 180°
    }
    const result = computeEquilibrium(system)
    // F3 = 11. 11 < 10 + 1 is false (11 < 11 is false)
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
  })
})
