/**
 * physics.ts - Motor de física y conversiones de coordenadas vectoriales
 *
 * Soporta conversiones bidireccionales exactas entre:
 * 1. Coordenadas Rectangulares (Ax, Ay)
 * 2. Coordenadas Polares (r, θ) donde θ ∈ [0°, 360°)
 * 3. Coordenadas Geográficas / Rumbos (r, [N|S] α° [E|O] o rumbos cardinales puros)
 */

export interface RectangularCoords {
  x: number
  y: number
}

export interface PolarCoords {
  r: number
  /** Ángulo en grados respecto al eje +X en sentido antihorario [0, 360) */
  thetaDeg: number
}

export type CardinalPrimary = 'N' | 'S'
export type CardinalSecondary = 'E' | 'O'

export interface GeographicCoords {
  r: number
  /** Si está sobre un eje cardinal exacto: 'N' | 'S' | 'E' | 'O', o null si tiene rumbo angular */
  cardinalExact: 'N' | 'S' | 'E' | 'O' | null
  primary: CardinalPrimary | null
  /** Ángulo de desvío entre 0° y 90° desde el punto primario */
  angleDeg: number
  secondary: CardinalSecondary | null
  /** Notación canónica: ej. "N 30.00° E" o "Norte" */
  canonicalText: string
  /** Notación alternativa desde E/O: ej. "E 60.00° N" o "Norte" */
  alternativeText: string
  /** Azimut: ángulo en grados horario medido desde el Norte [0, 360) */
  azimuthDeg: number
  /** Cuadrante o eje cartesiano */
  quadrant: 'I' | 'II' | 'III' | 'IV' | 'Eje +X' | 'Eje +Y' | 'Eje -X' | 'Eje -Y' | 'Origen'
}

/**
 * Normaliza un ángulo en grados para que pertenezca al intervalo [0, 360)
 */
export function normalizeAngleDeg(deg: number): number {
  let angle = deg % 360
  if (angle < 0) angle += 360
  // Evitar redondeos extraños tipo 359.99999999999994 al aproximar cero
  if (Math.abs(angle - 360) < 1e-9) return 0
  return angle
}

/**
 * Convierte radianes a grados
 */
export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI
}

/**
 * Convierte grados a radianes
 */
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/**
 * Convierte coordenadas Rectangulares (x, y) a Polares (r, θ)
 */
export function rectangularToPolar(x: number, y: number): PolarCoords {
  const r = Math.hypot(x, y)
  if (r < 1e-9) {
    return { r: 0, thetaDeg: 0 }
  }

  const rad = Math.atan2(y, x)
  const deg = radToDeg(rad)
  const thetaDeg = normalizeAngleDeg(deg)

  return {
    r: parseFloat(r.toFixed(4)),
    thetaDeg: parseFloat(thetaDeg.toFixed(2)),
  }
}

/**
 * Convierte coordenadas Polares (r, θ) a Rectangulares (x, y)
 */
export function polarToRectangular(r: number, thetaDeg: number): RectangularCoords {
  const normalizedTheta = normalizeAngleDeg(thetaDeg)
  const rad = degToRad(normalizedTheta)

  let x = r * Math.cos(rad)
  let y = r * Math.sin(rad)

  // Mitigar imprecisiones de coma flotante en múltiplos de 90°
  if (Math.abs(x) < 1e-9) x = 0
  if (Math.abs(y) < 1e-9) y = 0

  return {
    x: parseFloat(x.toFixed(4)),
    y: parseFloat(y.toFixed(4)),
  }
}

/**
 * Convierte coordenadas Polares (r, θ) a Coordenadas Geográficas (Rumbo)
 */
export function polarToGeographic(r: number, thetaDeg: number): GeographicCoords {
  const normTheta = normalizeAngleDeg(thetaDeg)

  if (r < 1e-9) {
    return {
      r: 0,
      cardinalExact: null,
      primary: null,
      angleDeg: 0,
      secondary: null,
      canonicalText: 'Vector Nulo (0 u)',
      alternativeText: 'Vector Nulo (0 u)',
      azimuthDeg: 0,
      quadrant: 'Origen',
    }
  }

  // Azimut: 0° en Norte (+Y), 90° en Este (+X), 180° en Sur (-Y), 270° en Oeste (-X)
  const azimuthDeg = normalizeAngleDeg(90 - normTheta)

  // Casos de ejes cardinales exactos (tolerancia 0.05°)
  if (Math.abs(normTheta - 0) < 0.05 || Math.abs(normTheta - 360) < 0.05) {
    return {
      r,
      cardinalExact: 'E',
      primary: null,
      angleDeg: 0,
      secondary: null,
      canonicalText: `${r.toFixed(2)} u al Este`,
      alternativeText: `${r.toFixed(2)} u al Este`,
      azimuthDeg: 90,
      quadrant: 'Eje +X',
    }
  }
  if (Math.abs(normTheta - 90) < 0.05) {
    return {
      r,
      cardinalExact: 'N',
      primary: null,
      angleDeg: 0,
      secondary: null,
      canonicalText: `${r.toFixed(2)} u al Norte`,
      alternativeText: `${r.toFixed(2)} u al Norte`,
      azimuthDeg: 0,
      quadrant: 'Eje +Y',
    }
  }
  if (Math.abs(normTheta - 180) < 0.05) {
    return {
      r,
      cardinalExact: 'O',
      primary: null,
      angleDeg: 0,
      secondary: null,
      canonicalText: `${r.toFixed(2)} u al Oeste`,
      alternativeText: `${r.toFixed(2)} u al Oeste`,
      azimuthDeg: 270,
      quadrant: 'Eje -X',
    }
  }
  if (Math.abs(normTheta - 270) < 0.05) {
    return {
      r,
      cardinalExact: 'S',
      primary: null,
      angleDeg: 0,
      secondary: null,
      canonicalText: `${r.toFixed(2)} u al Sur`,
      alternativeText: `${r.toFixed(2)} u al Sur`,
      azimuthDeg: 180,
      quadrant: 'Eje -Y',
    }
  }

  // Cuadrante I: 0° < θ < 90°
  if (normTheta > 0 && normTheta < 90) {
    const alphaN = 90 - normTheta
    const alphaE = normTheta
    return {
      r,
      cardinalExact: null,
      primary: 'N',
      angleDeg: parseFloat(alphaN.toFixed(2)),
      secondary: 'E',
      canonicalText: `${r.toFixed(2)} u, N ${alphaN.toFixed(2)}° E`,
      alternativeText: `${r.toFixed(2)} u, E ${alphaE.toFixed(2)}° N`,
      azimuthDeg: parseFloat(azimuthDeg.toFixed(2)),
      quadrant: 'I',
    }
  }

  // Cuadrante II: 90° < θ < 180°
  if (normTheta > 90 && normTheta < 180) {
    const alphaN = normTheta - 90
    const alphaO = 180 - normTheta
    return {
      r,
      cardinalExact: null,
      primary: 'N',
      angleDeg: parseFloat(alphaN.toFixed(2)),
      secondary: 'O',
      canonicalText: `${r.toFixed(2)} u, N ${alphaN.toFixed(2)}° O`,
      alternativeText: `${r.toFixed(2)} u, O ${alphaO.toFixed(2)}° N`,
      azimuthDeg: parseFloat(azimuthDeg.toFixed(2)),
      quadrant: 'II',
    }
  }

  // Cuadrante III: 180° < θ < 270°
  if (normTheta > 180 && normTheta < 270) {
    const alphaS = 270 - normTheta
    const alphaO = normTheta - 180
    return {
      r,
      cardinalExact: null,
      primary: 'S',
      angleDeg: parseFloat(alphaS.toFixed(2)),
      secondary: 'O',
      canonicalText: `${r.toFixed(2)} u, S ${alphaS.toFixed(2)}° O`,
      alternativeText: `${r.toFixed(2)} u, O ${alphaO.toFixed(2)}° S`,
      azimuthDeg: parseFloat(azimuthDeg.toFixed(2)),
      quadrant: 'III',
    }
  }

  // Cuadrante IV: 270° < θ < 360°
  const alphaS = normTheta - 270
  const alphaE = 360 - normTheta
  return {
    r,
    cardinalExact: null,
    primary: 'S',
    angleDeg: parseFloat(alphaS.toFixed(2)),
    secondary: 'E',
    canonicalText: `${r.toFixed(2)} u, S ${alphaS.toFixed(2)}° E`,
    alternativeText: `${r.toFixed(2)} u, E ${alphaE.toFixed(2)}° S`,
    azimuthDeg: parseFloat(azimuthDeg.toFixed(2)),
    quadrant: 'IV',
  }
}

/**
 * Convierte rumbo geográfico a Coordenadas Polares (r, θ)
 * @param r Magnitud
 * @param primary 'N' | 'S' (o 'E' | 'O' para cardinal puro)
 * @param angleDeg Ángulo de desvío (0° a 90°)
 * @param secondary 'E' | 'O' (o null si es cardinal puro)
 */
export function geographicToPolar(
  r: number,
  primary: 'N' | 'S' | 'E' | 'O',
  angleDeg: number = 0,
  secondary: 'E' | 'O' | null = null
): PolarCoords {
  if (r <= 0) return { r: 0, thetaDeg: 0 }

  // Casos cardinales puros
  if (!secondary || angleDeg === 0) {
    switch (primary) {
      case 'E': return { r, thetaDeg: 0 }
      case 'N': return { r, thetaDeg: 90 }
      case 'O': return { r, thetaDeg: 180 }
      case 'S': return { r, thetaDeg: 270 }
    }
  }

  const alpha = Math.max(0, Math.min(90, angleDeg))
  let thetaDeg = 0

  if (primary === 'N') {
    if (secondary === 'E') {
      // N alpha° E -> ángulo polar = 90° - alpha
      thetaDeg = 90 - alpha
    } else {
      // N alpha° O -> ángulo polar = 90° + alpha
      thetaDeg = 90 + alpha
    }
  } else if (primary === 'S') {
    if (secondary === 'O') {
      // S alpha° O -> ángulo polar = 270° - alpha
      thetaDeg = 270 - alpha
    } else {
      // S alpha° E -> ángulo polar = 270° + alpha
      thetaDeg = 270 + alpha
    }
  }

  return {
    r: parseFloat(r.toFixed(4)),
    thetaDeg: parseFloat(normalizeAngleDeg(thetaDeg).toFixed(2)),
  }
}

/**
 * Convierte rumbo geográfico a Coordenadas Rectangulares (x, y)
 */
export function geographicToRectangular(
  r: number,
  primary: 'N' | 'S' | 'E' | 'O',
  angleDeg: number = 0,
  secondary: 'E' | 'O' | null = null
): RectangularCoords {
  const polar = geographicToPolar(r, primary, angleDeg, secondary)
  return polarToRectangular(polar.r, polar.thetaDeg)
}

/**
 * Explicación didáctica paso a paso de la conversión Rectangular -> Polar
 */
export function explainRectangularToPolar(x: number, y: number): {
  magnitudeStep: string
  angleStep: string
  quadrantStep: string
} {
  const r = Math.hypot(x, y)
  const magStep = `r = \\sqrt{(${x.toFixed(2)})^2 + (${y.toFixed(2)})^2} = \\sqrt{${(x * x).toFixed(2)} + ${(y * y).toFixed(2)}} = ${r.toFixed(2)}`

  if (r < 1e-9) {
    return {
      magnitudeStep: magStep,
      angleStep: '\\theta = 0^\\circ \\text{ (Vector nulo)}',
      quadrantStep: 'El vector está ubicado en el origen (0, 0).',
    }
  }

  const alpha = Math.abs(x) > 1e-9 ? Math.atan(Math.abs(y) / Math.abs(x)) * (180 / Math.PI) : 90
  let quadText = ''
  let angleCalc = ''

  if (x >= 0 && y >= 0) {
    quadText = 'Cuadrante I (x ≥ 0, y ≥ 0): θ = α'
    angleCalc = `\\theta = \\arctan\\left(\\frac{|${y.toFixed(2)}|}{|${x.toFixed(2)}|}\\right) = ${alpha.toFixed(2)}^\\circ`
  } else if (x < 0 && y >= 0) {
    quadText = 'Cuadrante II (x < 0, y ≥ 0): θ = 180° - α'
    angleCalc = `\\alpha = \\arctan\\left(\\frac{|${y.toFixed(2)}|}{|${x.toFixed(2)}|}\\right) = ${alpha.toFixed(2)}^\\circ \\implies \\theta = 180^\\circ - ${alpha.toFixed(2)}^\\circ = ${(180 - alpha).toFixed(2)}^\\circ`
  } else if (x < 0 && y < 0) {
    quadText = 'Cuadrante III (x < 0, y < 0): θ = 180° + α'
    angleCalc = `\\alpha = \\arctan\\left(\\frac{|${y.toFixed(2)}|}{|${x.toFixed(2)}|}\\right) = ${alpha.toFixed(2)}^\\circ \\implies \\theta = 180^\\circ + ${alpha.toFixed(2)}^\\circ = ${(180 + alpha).toFixed(2)}^\\circ`
  } else {
    quadText = 'Cuadrante IV (x ≥ 0, y < 0): θ = 360° - α'
    angleCalc = `\\alpha = \\arctan\\left(\\frac{|${y.toFixed(2)}|}{|${x.toFixed(2)}|}\\right) = ${alpha.toFixed(2)}^\\circ \\implies \\theta = 360^\\circ - ${alpha.toFixed(2)}^\\circ = ${(360 - alpha).toFixed(2)}^\\circ`
  }

  return {
    magnitudeStep: magStep,
    angleStep: angleCalc,
    quadrantStep: quadText,
  }
}

/**
 * Explicación didáctica de Polar -> Rectangular
 */
export function explainPolarToRectangular(r: number, thetaDeg: number): {
  xStep: string
  yStep: string
} {
  const normTheta = normalizeAngleDeg(thetaDeg)
  const rad = degToRad(normTheta)
  const x = r * Math.cos(rad)
  const y = r * Math.sin(rad)

  return {
    xStep: `A_x = r \\cdot \\cos(\\theta) = ${r.toFixed(2)} \\cdot \\cos(${normTheta.toFixed(2)}^\\circ) = ${x.toFixed(2)}`,
    yStep: `A_y = r \\cdot \\sin(\\theta) = ${r.toFixed(2)} \\cdot \\sin(${normTheta.toFixed(2)}^\\circ) = ${y.toFixed(2)}`,
  }
}
