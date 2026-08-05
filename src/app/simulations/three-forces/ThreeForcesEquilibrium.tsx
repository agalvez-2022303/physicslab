import { useState, useRef, useCallback, useEffect } from 'react'
import { useCanvasRenderer } from '../../hooks/useCanvasRenderer'
import { computeEquilibrium, type ForceSystem } from './physics'
import styles from './ThreeForcesEquilibrium.module.css'

const RAD = Math.PI / 180

export default function ThreeForcesEquilibrium() {
  const { canvasRef, ctx, size } = useCanvasRenderer()

  // Magnitudes F1 y F2 (1-10 N)
  const [F1mag, setF1mag] = useState(5)
  const [F2mag, setF2mag] = useState(5)

  // Posición de las poleas en el canvas (en px relativos a centro)
  // La polea está en la cuerda superior — el ángulo sale de ahí
  // Representamos la posición angular con un radio fijo
  const [pulley1Angle, setPulley1Angle] = useState(-50 * RAD) // izquierda
  const [pulley2Angle, setPulley2Angle] = useState( 50 * RAD) // derecha

  // Toggle paralelogramo
  const [showParallelogram, setShowParallelogram] = useState(false)

  // Dragging de poleas
  const dragging = useRef<'p1' | 'p2' | null>(null)

  // Cálculo de equilibrio
  const system: ForceSystem = {
    F1: { magnitude: F1mag, angle: pulley1Angle + Math.PI }, // F1 tira del nudo
    F2: { magnitude: F2mag, angle: pulley2Angle + Math.PI },
  }
  const result = computeEquilibrium(system)

  // ─── Dibujo ────────────────────────────────────────────────
  const PULLEY_RADIUS = 32
  const ROPE_LEN      = 110

  const draw = useCallback(() => {
    const ct = ctx.current
    const { width: W, height: H } = size
    if (!ct || W === 0) return

    ct.clearRect(0, 0, W, H)

    // Fondo
    ct.fillStyle = '#080808'
    ct.fillRect(0, 0, W, H)

    // Grid sutil
    ct.strokeStyle = 'rgba(255,255,255,0.03)'
    ct.lineWidth = 1
    const step = 40
    for (let x = 0; x < W; x += step) {
      ct.beginPath(); ct.moveTo(x, 0); ct.lineTo(x, H); ct.stroke()
    }
    for (let y = 0; y < H; y += step) {
      ct.beginPath(); ct.moveTo(0, y); ct.lineTo(W, y); ct.stroke()
    }

    // Centro del nudo
    const kx = W / 2
    const ky = H * 0.42

    // Posición de las poleas en un arco en la parte superior
    const pulleyR = Math.min(W, H) * 0.28
    const p1x = kx + Math.sin(pulley1Angle) * pulleyR
    const p1y = ky + Math.cos(pulley1Angle) * pulleyR * (-0.7) - 20
    const p2x = kx + Math.sin(pulley2Angle) * pulleyR
    const p2y = ky + Math.cos(pulley2Angle) * pulleyR * (-0.7) - 20

    // ── Soporte (techo/barra) ───────────────────────────────
    ct.fillStyle = '#2a2a2a'
    ct.fillRect(0, 0, W, 18)
    ct.strokeStyle = 'rgba(255,255,255,0.2)'
    ct.lineWidth = 2
    ct.beginPath()
    ct.moveTo(0, 18)
    ct.lineTo(W, 18)
    ct.stroke()
    // Patrón de techo
    ct.strokeStyle = 'rgba(255,255,255,0.07)'
    ct.lineWidth = 1
    for (let x = 0; x < W; x += 20) {
      ct.beginPath()
      ct.moveTo(x, 0)
      ct.lineTo(x - 10, 18)
      ct.stroke()
    }

    // Postes de poleas hasta el techo
    ct.strokeStyle = 'rgba(255,255,255,0.2)'
    ct.lineWidth = 2
    ct.setLineDash([4, 4])
    ct.beginPath()
    ct.moveTo(p1x, 18); ct.lineTo(p1x, p1y)
    ct.moveTo(p2x, 18); ct.lineTo(p2x, p2y)
    ct.stroke()
    ct.setLineDash([])

    // ── Cuerdas (a las poleas) ──────────────────────────────
    // Cuerda 1: nudo → polea1 → peso1
    const rope1dx = p1x - kx
    const rope1dy = p1y - ky
    const rope1len = Math.sqrt(rope1dx * rope1dx + rope1dy * rope1dy)
    const rope1ux = rope1dx / rope1len
    const rope1uy = rope1dy / rope1len

    ct.strokeStyle = 'rgba(255,255,255,0.75)'
    ct.lineWidth = 2
    ct.beginPath()
    ct.moveTo(kx, ky)
    ct.lineTo(p1x, p1y)
    ct.stroke()

    // Tramo de peso de polea 1
    ct.beginPath()
    ct.moveTo(p1x, p1y)
    ct.lineTo(p1x, p1y + ROPE_LEN)
    ct.stroke()

    // Cuerda 2
    ct.beginPath()
    ct.moveTo(kx, ky)
    ct.lineTo(p2x, p2y)
    ct.stroke()
    ct.beginPath()
    ct.moveTo(p2x, p2y)
    ct.lineTo(p2x, p2y + ROPE_LEN)
    ct.stroke()

    // Cuerda 3 (fuerza de equilibrio F3, va "hacia abajo" del nudo)
    const scale = 14
    const f3x = result.F3vec.x * scale
    const f3y = result.F3vec.y * scale
    if (result.valid) {
      ct.strokeStyle = 'rgba(255,255,255,0.6)'
      ct.lineWidth = 2
      ct.beginPath()
      ct.moveTo(kx, ky)
      ct.lineTo(kx + f3x * 2, ky + f3y * 2)
      ct.stroke()
      // Peso fijo
      const fpx = kx + f3x * 2
      const fpy = ky + f3y * 2
      drawWeight(ct, fpx, fpy, result.F3mag, '#aaaaaa')
    }

    // ── Poleas ──────────────────────────────────────────────
    drawPulley(ct, p1x, p1y, PULLEY_RADIUS, pulley1Angle, rope1ux, rope1uy)
    drawPulley(ct, p2x, p2y, PULLEY_RADIUS, pulley2Angle, -rope1ux, rope1uy)

    // ── Pesas ───────────────────────────────────────────────
    drawWeight(ct, p1x, p1y + ROPE_LEN, F1mag, '#e5e5e5')
    drawWeight(ct, p2x, p2y + ROPE_LEN, F2mag, '#e5e5e5')

    // ── Nudo central ────────────────────────────────────────
    const grd = ct.createRadialGradient(kx - 4, ky - 4, 2, kx, ky, 12)
    grd.addColorStop(0, 'rgba(255,255,255,0.95)')
    grd.addColorStop(1, 'rgba(100,100,100,0.6)')
    ct.fillStyle = grd
    ct.beginPath()
    ct.arc(kx, ky, 12, 0, Math.PI * 2)
    ct.fill()

    // ── Vectores de fuerza (como flechas sobre cuerdas) ─────
    const arrowScale = 6
    drawForceArrow(ct, kx, ky, rope1ux * F1mag * arrowScale, rope1uy * F1mag * arrowScale, 'rgba(255,255,255,0.85)', 'F₁')
    drawForceArrow(ct, kx, ky, (p2x - kx) / rope1len * F2mag * arrowScale, (p2y - ky) / rope1len * F2mag * arrowScale, 'rgba(255,255,255,0.85)', 'F₂')

    if (result.valid) {
      const f3n = Math.sqrt(f3x * f3x + f3y * f3y)
      const f3ux = f3x / f3n, f3uy = f3y / f3n
      drawForceArrow(ct, kx, ky, f3ux * result.F3mag * arrowScale, f3uy * result.F3mag * arrowScale, 'rgba(200,200,200,0.7)', 'F₃')
    }

    // ── Paralelogramo ────────────────────────────────────────
    if (showParallelogram && result.valid) {
      const s = 14
      const v1x = rope1ux * F1mag * s, v1y = rope1uy * F1mag * s
      const v2x = (p2x - kx) / rope1len * F2mag * s
      const v2y = (p2y - ky) / rope1len * F2mag * s
      const diagX = v1x + v2x, diagY = v1y + v2y

      ct.fillStyle = 'rgba(255,255,255,0.04)'
      ct.strokeStyle = 'rgba(255,255,255,0.2)'
      ct.lineWidth = 1
      ct.setLineDash([4, 4])
      ct.beginPath()
      ct.moveTo(kx, ky)
      ct.lineTo(kx + v1x, ky + v1y)
      ct.lineTo(kx + diagX, ky + diagY)
      ct.lineTo(kx + v2x, ky + v2y)
      ct.closePath()
      ct.fill()
      ct.stroke()
      ct.setLineDash([])

      // Diagonal (resultante de F1+F2, debería ser opuesta a F3)
      ct.strokeStyle = 'rgba(255,255,255,0.55)'
      ct.lineWidth = 2
      drawArrowLine(ct, kx, ky, kx + diagX, ky + diagY)
    }

    // ── Labels de ángulos ────────────────────────────────────
    const ang1 = Math.atan2(p1x - kx, ky - p1y) * 180 / Math.PI
    const ang2 = Math.atan2(p2x - kx, ky - p2y) * 180 / Math.PI

    ct.font = '11px IBM Plex Mono, monospace'
    ct.fillStyle = 'rgba(255,255,255,0.4)'
    ct.textAlign = 'left'
    ct.fillText(`α₁ = ${Math.abs(ang1).toFixed(1)}°`, 12, H - 40)
    ct.fillText(`α₂ = ${Math.abs(ang2).toFixed(1)}°`, 12, H - 24)

    // Error de validación
    if (!result.valid) {
      ct.font = 'bold 12px IBM Plex Mono, monospace'
      ct.fillStyle = 'rgba(255,100,100,0.9)'
      ct.textAlign = 'center'
      ct.fillText('⚠ Sin equilibrio — magnitudes inválidas', W / 2, H - 16)
    }

    // Indicadores de fuerza
    ct.font = '11px IBM Plex Mono, monospace'
    ct.fillStyle = 'rgba(255,255,255,0.5)'
    ct.textAlign = 'right'
    ct.fillText(`F₁ = ${F1mag.toFixed(1)} N`, W - 12, H - 40)
    ct.fillText(`F₂ = ${F2mag.toFixed(1)} N`, W - 12, H - 24)
    if (result.valid) ct.fillText(`F₃ = ${result.F3mag.toFixed(2)} N`, W - 12, H - 8)

  }, [ctx, size, F1mag, F2mag, pulley1Angle, pulley2Angle, showParallelogram, result])

  useEffect(() => { draw() }, [draw])

  // ─── Drag de poleas ─────────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const px = (e.clientX - rect.left) * (size.width / rect.width)
    const py = (e.clientY - rect.top) * (size.height / rect.height)

    const kx = size.width / 2
    const ky = size.height * 0.42
    const pulleyR = Math.min(size.width, size.height) * 0.28

    const p1x = kx + Math.sin(pulley1Angle) * pulleyR
    const p1y = ky + Math.cos(pulley1Angle) * pulleyR * (-0.7) - 20
    const p2x = kx + Math.sin(pulley2Angle) * pulleyR
    const p2y = ky + Math.cos(pulley2Angle) * pulleyR * (-0.7) - 20

    const d1 = Math.hypot(px - p1x, py - p1y)
    const d2 = Math.hypot(px - p2x, py - p2y)

    if (d1 < 36) { dragging.current = 'p1'; canvas.setPointerCapture(e.pointerId) }
    else if (d2 < 36) { dragging.current = 'p2'; canvas.setPointerCapture(e.pointerId) }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragging.current || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const px = (e.clientX - rect.left) * (size.width / rect.width)
    const py = (e.clientY - rect.top) * (size.height / rect.height)

    const kx = size.width / 2
    const ky = size.height * 0.42
    const angle = Math.atan2(px - kx, ky - py) // ángulo desde Y+

    // Limitar ángulo: -80° a +80° para que no se vaya al suelo
    const clamped = Math.max(-80 * RAD, Math.min(80 * RAD, angle))

    if (dragging.current === 'p1') setPulley1Angle(clamped)
    else setPulley2Angle(clamped)
  }

  const handlePointerUp = () => { dragging.current = null }

  return (
    <div className={styles.sim}>
      <div className={styles.canvasWrap}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          aria-label="Simulación de tres fuerzas en equilibrio"
        />
      </div>

      <div className={styles.panel}>
        {/* Magnitudes */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Fuerzas</h3>
          {[
            { label: 'F₁ (N)', val: F1mag, set: setF1mag },
            { label: 'F₂ (N)', val: F2mag, set: setF2mag },
          ].map(({ label, val, set }) => (
            <label key={label} className={styles.sliderField}>
              <div className={styles.sliderRow}>
                <span className={styles.fieldLabel}>{label}</span>
                <span className={styles.sliderVal}>{val.toFixed(1)} N</span>
              </div>
              <input
                type="range" min="1" max="10" step="0.1"
                value={val}
                onChange={e => set(parseFloat(e.target.value))}
                className={styles.slider}
              />
            </label>
          ))}
        </section>

        {/* Ángulos */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Ángulos</h3>
          <div className={styles.dataRow}>
            <span className={styles.dataLabel}>α₁ (desde vertical)</span>
            <span className={styles.dataVal}>{Math.abs(pulley1Angle * 180 / Math.PI).toFixed(1)}°</span>
          </div>
          <div className={styles.dataRow}>
            <span className={styles.dataLabel}>α₂ (desde vertical)</span>
            <span className={styles.dataVal}>{Math.abs(pulley2Angle * 180 / Math.PI).toFixed(1)}°</span>
          </div>
          <p className={styles.hint}>Arrastra las poleas para cambiar ángulos</p>
        </section>

        {/* F3 resultante */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Equilibrio</h3>
          {result.valid ? (
            <>
              <div className={styles.dataRow}>
                <span className={styles.dataLabel}>F₃ = |F₁ + F₂|</span>
                <span className={styles.dataVal}>{result.F3mag.toFixed(3)} N</span>
              </div>
              <div className={styles.validTag}>✓ En equilibrio</div>
            </>
          ) : (
            <div className={styles.errorTag}>⚠ {result.error}</div>
          )}
        </section>

        {/* Toggle paralelogramo */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Visualización</h3>
          <button
            className={`btn btn--secondary ${showParallelogram ? styles.toggleActive : ''}`}
            onClick={() => setShowParallelogram(p => !p)}
            style={{ width: '100%' }}
          >
            {showParallelogram ? '◈' : '◇'} Paralelogramo de fuerzas
          </button>
        </section>
      </div>
    </div>
  )
}

/* ─── Helpers ─────────────────────────────────────────────────── */
function drawPulley(
  ct: CanvasRenderingContext2D,
  cx: number, cy: number,
  r: number,
  angle: number,
  _ux: number, _uy: number
) {
  // Armazón de la polea
  ct.strokeStyle = 'rgba(255,255,255,0.4)'
  ct.lineWidth = 2
  ct.beginPath()
  ct.arc(cx, cy, r, 0, Math.PI * 2)
  ct.stroke()

  // Rueda interior
  ct.strokeStyle = 'rgba(255,255,255,0.2)'
  ct.lineWidth = 1.5
  ct.beginPath()
  ct.arc(cx, cy, r * 0.65, 0, Math.PI * 2)
  ct.stroke()

  // Radios animados (ángulo estático, ya que la polea no gira en esta sim)
  const spokes = 6
  ct.strokeStyle = 'rgba(255,255,255,0.15)'
  ct.lineWidth = 1
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2 + angle
    ct.beginPath()
    ct.moveTo(cx, cy)
    ct.lineTo(cx + Math.cos(a) * r * 0.65, cy + Math.sin(a) * r * 0.65)
    ct.stroke()
  }

  // Centro de la polea
  ct.fillStyle = 'rgba(255,255,255,0.5)'
  ct.beginPath()
  ct.arc(cx, cy, 5, 0, Math.PI * 2)
  ct.fill()
}

function drawWeight(
  ct: CanvasRenderingContext2D,
  x: number, y: number,
  force: number,
  color: string
) {
  const size = 20 + force * 2
  const halfW = size / 2
  const h = size * 0.7

  // Cuerpo del peso (hexagonal)
  ct.fillStyle = color
  ct.strokeStyle = 'rgba(255,255,255,0.15)'
  ct.lineWidth = 1
  ct.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 6
    const px = x + Math.cos(a) * halfW
    const py = y + Math.sin(a) * h * 0.7 + h / 2
    if (i === 0) ct.moveTo(px, py)
    else ct.lineTo(px, py)
  }
  ct.closePath()
  ct.fill()
  ct.stroke()

  // Etiqueta de magnitud
  ct.font = `bold ${Math.max(9, force * 0.9 + 7)}px IBM Plex Mono, monospace`
  ct.fillStyle = '#080808'
  ct.textAlign = 'center'
  ct.textBaseline = 'middle'
  ct.fillText(`${force.toFixed(1)}N`, x, y + h / 2)
  ct.textBaseline = 'alphabetic'
}

function drawForceArrow(
  ct: CanvasRenderingContext2D,
  x: number, y: number,
  dx: number, dy: number,
  color: string,
  label: string
) {
  ct.strokeStyle = color
  ct.fillStyle   = color
  ct.lineWidth   = 2

  const angle = Math.atan2(dy, dx)
  const headLen = 10

  ct.beginPath()
  ct.moveTo(x, y)
  ct.lineTo(x + dx, y + dy)
  ct.stroke()

  ct.beginPath()
  ct.moveTo(x + dx, y + dy)
  ct.lineTo(x + dx - headLen * Math.cos(angle - Math.PI / 6), y + dy - headLen * Math.sin(angle - Math.PI / 6))
  ct.lineTo(x + dx - headLen * Math.cos(angle + Math.PI / 6), y + dy - headLen * Math.sin(angle + Math.PI / 6))
  ct.closePath()
  ct.fill()

  ct.font = '10px IBM Plex Mono, monospace'
  ct.textAlign = 'center'
  ct.fillText(label, x + dx * 1.15, y + dy * 1.15)
}

function drawArrowLine(
  ct: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number
) {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const headLen = 10
  ct.beginPath()
  ct.moveTo(x1, y1)
  ct.lineTo(x2, y2)
  ct.stroke()
  ct.beginPath()
  ct.moveTo(x2, y2)
  ct.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6))
  ct.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6))
  ct.closePath()
  ct.fill()
}
