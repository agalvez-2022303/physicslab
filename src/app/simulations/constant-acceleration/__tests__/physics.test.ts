import { describe, it, expect } from 'vitest'
import { computeKinematics, timeAtPosition } from '../physics'

describe('Kinematics Physics Engine', () => {
  it('calculates position and velocity correctly for constant acceleration', () => {
    const params = { x0: 10, v0: 5, a: 2 }
    // x(2) = 10 + 5*2 + 0.5*2*4 = 10 + 10 + 4 = 24
    // v(2) = 5 + 2*2 = 9
    const state = computeKinematics(params, 2)
    expect(state.x).toBe(24)
    expect(state.v).toBe(9)
    expect(state.a).toBe(2)
  })

  it('calculates position for zero acceleration (MRU)', () => {
    const params = { x0: 0, v0: 10, a: 0 }
    const state = computeKinematics(params, 3)
    expect(state.x).toBe(30)
    expect(state.v).toBe(10)
  })

  it('solves time at target position correctly', () => {
    const params = { x0: 0, v0: 0, a: 2 }
    // x(t) = t^2 = 16 => t = 4
    const t = timeAtPosition(params, 16)
    expect(t).toBeCloseTo(4)
  })

  it('returns null if target position is unreachable', () => {
    const params = { x0: 0, v0: -5, a: -2 } // moving left and accelerating left
    const t = timeAtPosition(params, 10) // target to the right
    expect(t).toBeNull()
  })
})
