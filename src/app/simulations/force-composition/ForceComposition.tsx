import { useState, useRef, useCallback, useEffect } from 'react'
import { useCanvasRenderer } from '../../hooks/useCanvasRenderer'
import {
  computeResultant,
  getComponents,
  toDegrees,
  type Vector2D,
} from './physics'
import styles from './ForceComposition.module.css'

export default function ForceComposition() {
  const { canvasRef, ctx, size } = useCanvasRenderer()

  // Lista de vectores editables
  const [vectors, setVectors] = useState<Vector2D[]>([
    { id: 'v1', label: 'F₁', magnitude: 6, angleDeg: 30 },
    { id: 'v2', label: 'F₂', magnitude: 4, angleDeg: 120 },
  ])

  // Método de construcción gráfica: 'paralelogramo' | 'punta-cola'
  const [method, setMethod] = useState<'paralelogramo' | 'punta-cola'>('paralelogramo')

  // Arrastre de la punta de vectores
  const draggingId = useRef<string | null>(null)

  // Resultante
  const resultant = computeResultant(vectors)

  // Escala: 1 Newton = N pixels en el canvas
  const SCALE = 24

  // Dibujo en Canvas
  const draw = useCallback(() => {
    const ct = ctx.current
    const { width: W, height: H } = size
    if (!ct || W === 0) return

    ct.clearRect(0, 0, W, H)

    // Fondo
    ct.fillStyle = '#080808'
    ct.fillRect(0, 0, W, H)

    const cx = W / 2
    const cy = H / 2

    // Grid de plano cartesiano
    ct.strokeStyle = 'rgba(255,255,255,0.04)'
    ct.lineWidth = 1
    const step = SCALE
    for (let x = cx % step; x < W; x += step) {
      ct.beginPath(); ct.moveTo(x, 0); ct.lineTo(x, H); ct.stroke()
    }
    for (let y = cy % step; y < H; y += step) {
      ct.beginPath(); ct.moveTo(0, y); ct.lineTo(W, y); ct.stroke()
    }

    // Ejes cartesianos X e Y
    ct.strokeStyle = 'rgba(255,255,255,0.25)'
    ct.lineWidth = 1.5
    ct.beginPath()
    ct.moveTo(0, cy); ct.lineTo(W, cy) // Eje X
    ct.moveTo(cx, 0); ct.lineTo(cx, H) // Eje Y
    ct.stroke()

    // Marcas de los ejes
    ct.font = '9px IBM Plex Mono, monospace'
    ct.fillStyle = 'rgba(255,255,255,0.3)'
    ct.textAlign = 'center'
    ct.fillText('+X', W - 16, cy + 14)
    ct.fillText('+Y', cx + 14, 16)
    ct.fillText('O (0,0)', cx - 20, cy + 14)

    // ── Construcción gráfica ──────────────────────────────────
    if (method === 'punta-cola') {
      // Método Punta-Cola
      let currX = cx
      let currY = cy

      vectors.forEach((v) => {
        const comp = getComponents(v)
        const dx = comp.x * SCALE
        const dy = -comp.y * SCALE // Invertir Y para canvas

        // Dibujar vector desplazado
        drawArrow(
          ct,
          currX,
          currY,
          currX + dx,
          currY + dy,
          'rgba(255,255,255,0.45)',
          2,
          `${v.label}'`,
          [4, 4]
        )

        currX += dx
        currY += dy
      })
    } else if (method === 'paralelogramo' && vectors.length >= 2) {
      // Método del paralelogramo entre F1 y F2
      const c1 = getComponents(vectors[0])
      const c2 = getComponents(vectors[1])

      const dx1 = c1.x * SCALE, dy1 = -c1.y * SCALE
      const dx2 = c2.x * SCALE, dy2 = -c2.y * SCALE

      // Líneas punteadas del paralelogramo
      ct.strokeStyle = 'rgba(255,255,255,0.3)'
      ct.lineWidth = 1
      ct.setLineDash([4, 4])

      // F1 desplazada al final de F2
      ct.beginPath()
      ct.moveTo(cx + dx2, cy + dy2)
      ct.lineTo(cx + dx1 + dx2, cy + dy1 + dy2)
      ct.stroke()

      // F2 desplazada al final de F1
      ct.beginPath()
      ct.moveTo(cx + dx1, cy + dy1)
      ct.lineTo(cx + dx1 + dx2, cy + dy1 + dy2)
      ct.stroke()

      ct.setLineDash([])
    }

    // ── Vectores individuales desde el origen ──────────────────
    vectors.forEach((v) => {
      const comp = getComponents(v)
      const ex = cx + comp.x * SCALE
      const ey = cy - comp.y * SCALE

      const isDragging = draggingId.current === v.id
      const color = isDragging ? 'rgba(255,255,255,1)' : 'rgba(200,200,200,0.85)'

      drawArrow(ct, cx, cy, ex, ey, color, 2.5, v.label)

      // Círculo de agarre en la punta
      ct.fillStyle = isDragging ? '#ffffff' : 'rgba(255,255,255,0.7)'
      ct.beginPath()
      ct.arc(ex, ey, isDragging ? 7 : 5, 0, Math.PI * 2)
      ct.fill()
      ct.strokeStyle = '#080808'
      ct.lineWidth = 1.5
      ct.stroke()
    })

    // ── Vector Resultante R ────────────────────────────────────
    if (vectors.length > 0) {
      const rx = cx + resultant.x * SCALE
      const ry = cy - resultant.y * SCALE

      // Resplandor de la resultante (glow blanco)
      ct.shadowColor = 'rgba(255,255,255,0.6)'
      ct.shadowBlur = 10
      drawArrow(ct, cx, cy, rx, ry, '#ffffff', 3.5, 'R (Resultante)')
      ct.shadowBlur = 0 // Reset

      // Componentes proyectadas en los ejes para R
      ct.strokeStyle = 'rgba(255,255,255,0.2)'
      ct.lineWidth = 1
      ct.setLineDash([2, 4])

      // Proyección X
      ct.beginPath()
      ct.moveTo(rx, ry)
      ct.lineTo(rx, cy)
      ct.stroke()

      // Proyección Y
      ct.beginPath()
      ct.moveTo(rx, ry)
      ct.lineTo(cx, ry)
      ct.stroke()

      ct.setLineDash([])
    }

    // Leyenda en la esquina del canvas
    ct.font = 'bold 11px IBM Plex Mono, monospace'
    ct.fillStyle = '#ffffff'
    ct.textAlign = 'left'
    ct.fillText(`R = ${resultant.magnitude.toFixed(2)} N  |  θ = ${resultant.angleDeg.toFixed(1)}°`, 14, 24)
    ct.font = '10px IBM Plex Mono, monospace'
    ct.fillStyle = 'rgba(255,255,255,0.5)'
    ct.fillText(`Rx = ${resultant.x.toFixed(2)} N  |  Ry = ${resultant.y.toFixed(2)} N`, 14, 40)

  }, [ctx, size, vectors, method, resultant])

  useEffect(() => { draw() }, [draw])

  // ── Handlers de interacción en Canvas (Drag & Drop) ─────────
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const px = (e.clientX - rect.left) * (size.width / rect.width)
    const py = (e.clientY - rect.top) * (size.height / rect.height)

    const cx = size.width / 2
    const cy = size.height / 2

    // Buscar si tocó cerca de la punta de algún vector
    for (const v of vectors) {
      const comp = getComponents(v)
      const ex = cx + comp.x * SCALE
      const ey = cy - comp.y * SCALE

      if (Math.hypot(px - ex, py - ey) < 24) {
        draggingId.current = v.id
        canvas.setPointerCapture(e.pointerId)
        break
      }
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingId.current || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const px = (e.clientX - rect.left) * (size.width / rect.width)
    const py = (e.clientY - rect.top) * (size.height / rect.height)

    const cx = size.width / 2
    const cy = size.height / 2

    // Convertir px a unidades físicas (N)
    const vx = (px - cx) / SCALE
    const vy = -(py - cy) / SCALE // Invertir Y

    const mag = Math.min(15, Math.max(0.5, Math.hypot(vx, vy)))
    const angleDeg = toDegrees(Math.atan2(vy, vx))

    setVectors(prev =>
      prev.map(v =>
        v.id === draggingId.current
          ? { ...v, magnitude: parseFloat(mag.toFixed(1)), angleDeg: parseFloat(angleDeg.toFixed(1)) }
          : v
      )
    )
  }

  const handlePointerUp = () => {
    draggingId.current = null
  }

  // Modificar vector numéricamente
  const updateVector = (id: string, field: 'magnitude' | 'angleDeg', value: number) => {
    setVectors(prev =>
      prev.map(v => (v.id === id ? { ...v, [field]: value } : v))
    )
  }

  const addVector = () => {
    if (vectors.length >= 4) return
    const nextNum = vectors.length + 1
    const newVec: Vector2D = {
      id: `v${Date.now()}`,
      label: `F${nextNum}`,
      magnitude: 5,
      angleDeg: 45 * nextNum,
    }
    setVectors([...vectors, newVec])
  }

  const removeVector = (id: string) => {
    if (vectors.length <= 2) return // mínimo 2 vectores
    setVectors(vectors.filter(v => v.id !== id))
  }

  return (
    <div className={styles.sim}>
      <div className={styles.canvasWrap}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          aria-label="Canvas de composición de fuerzas"
        />
      </div>

      <div className={styles.panel}>
        {/* Vectores de entrada */}
        <section className={styles.section} style={{ gridColumn: 'span 2' }}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Vectores Componentes</h3>
            {vectors.length < 4 && (
              <button className="btn btn--sm btn--secondary" onClick={addVector}>
                + Agregar Fuerza
              </button>
            )}
          </div>

          <div className={styles.vectorGrid}>
            {vectors.map((v) => {
              const comp = getComponents(v)
              return (
                <div key={v.id} className={styles.vectorCard}>
                  <div className={styles.cardHeader}>
                    <span className={styles.vecLabel}>{v.label}</span>
                    {vectors.length > 2 && (
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => removeVector(v.id)}
                        title="Eliminar vector"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className={styles.inputsRow}>
                    <label className={styles.inputField}>
                      <span className={styles.fieldLabel}>Magnitud (N)</span>
                      <input
                        className="input"
                        type="number"
                        min="0.1"
                        max="15"
                        step="0.5"
                        value={v.magnitude}
                        onChange={e => updateVector(v.id, 'magnitude', parseFloat(e.target.value) || 0.1)}
                      />
                    </label>

                    <label className={styles.inputField}>
                      <span className={styles.fieldLabel}>Ángulo θ (°)</span>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        max="360"
                        step="5"
                        value={v.angleDeg}
                        onChange={e => updateVector(v.id, 'angleDeg', parseFloat(e.target.value) || 0)}
                      />
                    </label>
                  </div>

                  <div className={styles.compReadout}>
                    <span>Fx = {comp.x.toFixed(2)} N</span>
                    <span>Fy = {comp.y.toFixed(2)} N</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Método Gráfico */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Método Gráfico</h3>
          <div className={styles.btnGroup}>
            <button
              className={`btn btn--secondary ${method === 'paralelogramo' ? styles.methodActive : ''}`}
              onClick={() => setMethod('paralelogramo')}
            >
              Paralelogramo
            </button>
            <button
              className={`btn btn--secondary ${method === 'punta-cola' ? styles.methodActive : ''}`}
              onClick={() => setMethod('punta-cola')}
            >
              Punta - Cola
            </button>
          </div>
          <p className={styles.hint}>
            Arrastra la punta de cualquier vector directamente sobre el plano cartesiano.
          </p>
        </section>

        {/* Lectura Resultante R */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Fuerza Resultante (R)</h3>
          <div className={styles.resultDisplay}>
            <div className={styles.resultMain}>
              <span className={styles.resultLabel}>Magnitud |R|</span>
              <span className={styles.resultValue}>{resultant.magnitude.toFixed(2)} N</span>
            </div>

            <div className={styles.resultRow}>
              <span>Ángulo θ:</span>
              <strong>{resultant.angleDeg.toFixed(1)}°</strong>
            </div>
            <div className={styles.resultRow}>
              <span>Componente Rx:</span>
              <strong>{resultant.x.toFixed(2)} N</strong>
            </div>
            <div className={styles.resultRow}>
              <span>Componente Ry:</span>
              <strong>{resultant.y.toFixed(2)} N</strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function drawArrow(
  ct: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  lineWidth: number,
  label: string,
  dash: number[] = []
) {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const headLen = 10

  ct.strokeStyle = color
  ct.fillStyle = color
  ct.lineWidth = lineWidth
  ct.setLineDash(dash)

  ct.beginPath()
  ct.moveTo(x1, y1)
  ct.lineTo(x2, y2)
  ct.stroke()

  ct.setLineDash([])

  // Cabeza de flecha
  ct.beginPath()
  ct.moveTo(x2, y2)
  ct.lineTo(
    x2 - headLen * Math.cos(angle - Math.PI / 6),
    y2 - headLen * Math.sin(angle - Math.PI / 6)
  )
  ct.lineTo(
    x2 - headLen * Math.cos(angle + Math.PI / 6),
    y2 - headLen * Math.sin(angle + Math.PI / 6)
  )
  ct.closePath()
  ct.fill()

  // Etiqueta del vector
  ct.font = 'bold 11px IBM Plex Mono, monospace'
  const lx = x2 + Math.cos(angle) * 16
  const ly = y2 + Math.sin(angle) * 16
  ct.textAlign = 'center'
  ct.fillText(label, lx, ly)
}
