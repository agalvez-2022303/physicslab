import { describe, it, expect } from 'vitest'
import {
  rectangularToPolar,
  polarToRectangular,
  polarToGeographic,
  geographicToPolar,
  geographicToRectangular,
  normalizeAngleDeg,
} from '../physics'

describe('Conversiones de Coordenadas Vectoriales', () => {
  describe('normalizeAngleDeg', () => {
    it('normaliza ángulos mayores a 360 y negativos', () => {
      expect(normalizeAngleDeg(0)).toBe(0)
      expect(normalizeAngleDeg(360)).toBe(0)
      expect(normalizeAngleDeg(720)).toBe(0)
      expect(normalizeAngleDeg(-90)).toBe(270)
      expect(normalizeAngleDeg(450)).toBe(90)
    })
  })

  describe('rectangularToPolar y polarToRectangular', () => {
    it('convierte vector (3, 4) en Cuadrante I', () => {
      const polar = rectangularToPolar(3, 4)
      expect(polar.r).toBeCloseTo(5, 2)
      expect(polar.thetaDeg).toBeCloseTo(53.13, 2)

      const rect = polarToRectangular(polar.r, polar.thetaDeg)
      expect(rect.x).toBeCloseTo(3, 2)
      expect(rect.y).toBeCloseTo(4, 2)
    })

    it('convierte vector (-3, 4) en Cuadrante II', () => {
      const polar = rectangularToPolar(-3, 4)
      expect(polar.r).toBeCloseTo(5, 2)
      expect(polar.thetaDeg).toBeCloseTo(126.87, 2)

      const rect = polarToRectangular(polar.r, polar.thetaDeg)
      expect(rect.x).toBeCloseTo(-3, 2)
      expect(rect.y).toBeCloseTo(4, 2)
    })

    it('convierte vector (-3, -4) en Cuadrante III', () => {
      const polar = rectangularToPolar(-3, -4)
      expect(polar.r).toBeCloseTo(5, 2)
      expect(polar.thetaDeg).toBeCloseTo(233.13, 2)

      const rect = polarToRectangular(polar.r, polar.thetaDeg)
      expect(rect.x).toBeCloseTo(-3, 2)
      expect(rect.y).toBeCloseTo(-4, 2)
    })

    it('convierte vector (3, -4) en Cuadrante IV', () => {
      const polar = rectangularToPolar(3, -4)
      expect(polar.r).toBeCloseTo(5, 2)
      expect(polar.thetaDeg).toBeCloseTo(306.87, 2)

      const rect = polarToRectangular(polar.r, polar.thetaDeg)
      expect(rect.x).toBeCloseTo(3, 2)
      expect(rect.y).toBeCloseTo(-4, 2)
    })

    it('maneja ejes cartesianos exactos', () => {
      // Eje +X (Este)
      const east = rectangularToPolar(10, 0)
      expect(east.r).toBe(10)
      expect(east.thetaDeg).toBe(0)

      // Eje +Y (Norte)
      const north = rectangularToPolar(0, 10)
      expect(north.r).toBe(10)
      expect(north.thetaDeg).toBe(90)

      // Eje -X (Oeste)
      const west = rectangularToPolar(-10, 0)
      expect(west.r).toBe(10)
      expect(west.thetaDeg).toBe(180)

      // Eje -Y (Sur)
      const south = rectangularToPolar(0, -10)
      expect(south.r).toBe(10)
      expect(south.thetaDeg).toBe(270)
    })

    it('maneja el vector nulo (0, 0)', () => {
      const zero = rectangularToPolar(0, 0)
      expect(zero.r).toBe(0)
      expect(zero.thetaDeg).toBe(0)

      const rectZero = polarToRectangular(0, 45)
      expect(rectZero.x).toBe(0)
      expect(rectZero.y).toBe(0)
    })
  })

  describe('polarToGeographic', () => {
    it('convierte ángulos de Cuadrante I a rumbo N α° E', () => {
      // θ = 60° -> Rumbo N 30° E
      const geo = polarToGeographic(10, 60)
      expect(geo.primary).toBe('N')
      expect(geo.angleDeg).toBeCloseTo(30, 2)
      expect(geo.secondary).toBe('E')
      expect(geo.canonicalText).toContain('N 30.00° E')
      expect(geo.azimuthDeg).toBeCloseTo(30, 2)
    })

    it('convierte ángulos de Cuadrante II a rumbo N α° O', () => {
      // θ = 120° -> Rumbo N 30° O
      const geo = polarToGeographic(10, 120)
      expect(geo.primary).toBe('N')
      expect(geo.angleDeg).toBeCloseTo(30, 2)
      expect(geo.secondary).toBe('O')
      expect(geo.canonicalText).toContain('N 30.00° O')
      expect(geo.azimuthDeg).toBeCloseTo(330, 2)
    })

    it('convierte ángulos de Cuadrante III a rumbo S α° O', () => {
      // θ = 225° -> Rumbo S 45° O
      const geo = polarToGeographic(10, 225)
      expect(geo.primary).toBe('S')
      expect(geo.angleDeg).toBeCloseTo(45, 2)
      expect(geo.secondary).toBe('O')
      expect(geo.canonicalText).toContain('S 45.00° O')
      expect(geo.azimuthDeg).toBeCloseTo(225, 2)
    })

    it('convierte ángulos de Cuadrante IV a rumbo S α° E', () => {
      // θ = 315° -> Rumbo S 45° E
      const geo = polarToGeographic(10, 315)
      expect(geo.primary).toBe('S')
      expect(geo.angleDeg).toBeCloseTo(45, 2)
      expect(geo.secondary).toBe('E')
      expect(geo.canonicalText).toContain('S 45.00° E')
      expect(geo.azimuthDeg).toBeCloseTo(135, 2)
    })

    it('identifica rumbos cardinales puros', () => {
      expect(polarToGeographic(5, 0).cardinalExact).toBe('E')
      expect(polarToGeographic(5, 90).cardinalExact).toBe('N')
      expect(polarToGeographic(5, 180).cardinalExact).toBe('O')
      expect(polarToGeographic(5, 270).cardinalExact).toBe('S')
    })
  })

  describe('geographicToPolar y geographicToRectangular', () => {
    it('convierte N 30° E a polar θ = 60°', () => {
      const pol = geographicToPolar(10, 'N', 30, 'E')
      expect(pol.r).toBe(10)
      expect(pol.thetaDeg).toBeCloseTo(60, 2)

      const rect = geographicToRectangular(10, 'N', 30, 'E')
      expect(rect.x).toBeCloseTo(5, 2)
      expect(rect.y).toBeCloseTo(8.66, 2)
    })

    it('convierte S 45° O a polar θ = 225°', () => {
      const pol = geographicToPolar(10, 'S', 45, 'O')
      expect(pol.r).toBe(10)
      expect(pol.thetaDeg).toBeCloseTo(225, 2)

      const rect = geographicToRectangular(10, 'S', 45, 'O')
      expect(rect.x).toBeCloseTo(-7.07, 2)
      expect(rect.y).toBeCloseTo(-7.07, 2)
    })

    it('convierte cardinal puro Norte a polar θ = 90°', () => {
      const pol = geographicToPolar(8, 'N')
      expect(pol.r).toBe(8)
      expect(pol.thetaDeg).toBe(90)
    })
  })
})
