import { useState, useRef, useCallback, useEffect } from 'react'
import { useCanvasRenderer } from '../../hooks/useCanvasRenderer'
import {
  createVector,
  computeAnalytical,
  polarToRect,
  rectToPolar,
  type Vector2D,
} from './physics'
import styles from './ForceComposition.module.css'

type GraphicalMethod = 'paralelogramo' | 'triangulo' | 'poligono'

const DEFAULT_COLORS = [
  '#ffffff', // V1 Blanco
  '#cccccc', // V2 Gris claro
  '#999999', // V3 Gris medio
  '#777777', // V4 Gris oscuro
  '#e5e5e5', // V5
  '#aaaaaa', // V6
]

interface ChallengeState {
  vectors: Vector2D[]
  expectedRx: number
  expectedRy: number
  expectedR: number
  expectedTheta: number
}

export default function ForceComposition() {
  const { canvasRef, ctx, size } = useCanvasRenderer()

  // Lista de vectores editables
  const [vectors, setVectors] = useState<Vector2D[]>([
    createVector('v1', 'V₁', { magnitude: 6, angleDeg: 30 }, DEFAULT_COLORS[0], 'polar'),
    createVector('v2', 'V₂', { magnitude: 5, angleDeg: 120 }, DEFAULT_COLORS[1], 'polar'),
  ])

  // Método gráfico activo: si hay 2 vectores -> 'paralelogramo' o 'triangulo'; si >= 3 -> 'poligono'
  const [method, setMethod] = useState<GraphicalMethod>('paralelogramo')

  // Modo de vista: 'simulacion' o 'practica'
  const [activeTab, setActiveTab] = useState<'simulacion' | 'practica'>('simulacion')

  // Zoom de escala (px por unidad)
  const [scale, setScale] = useState(24)
  const [showFormulas, setShowFormulas] = useState(false)

  // Arrastre en Canvas
  const draggingId = useRef<string | null>(null)

  // Estado analítico calculado
  const analytical = computeAnalytical(vectors)
  const resultant = analytical.resultant

  // Asegurar que si vectors.length >= 3 el método sea polígono
  useEffect(() => {
    if (vectors.length >= 3) {
      setMethod('poligono')
    } else if (method === 'poligono') {
      setMethod('paralelogramo')
    }
  }, [vectors.length, method])

  // ─── Estado del Modo Práctica ────────────────────────────────
  const [challenge, setChallenge] = useState<ChallengeState | null>(null)
  const [practiceAnswers, setPracticeAnswers] = useState({ rx: '', ry: '', r: '', theta: '' })
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [feedback, setFeedback] = useState<{ status: 'idle' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: '',
  })
  const [showSolution, setShowSolution] = useState(false)

  const generateChallenge = useCallback(() => {
    // Generar 2 o 3 vectores con magnitudes amigables
    const count = Math.random() > 0.5 ? 2 : 3
    const newVecs: Vector2D[] = []
    for (let i = 0; i < count; i++) {
      const mag = Math.floor(Math.random() * 7) + 3
      const ang = Math.floor(Math.random() * 12) * 30
      newVecs.push(
        createVector(
          `cv${i + 1}`,
          `V${i + 1}`,
          { magnitude: mag, angleDeg: ang },
          DEFAULT_COLORS[i],
          'polar'
        )
      )
    }

    const res = computeAnalytical(newVecs)
    setChallenge({
      vectors: newVecs,
      expectedRx: res.sumX,
      expectedRy: res.sumY,
      expectedR: res.resultant.magnitude,
      expectedTheta: res.resultant.angleDeg,
    })
    setPracticeAnswers({ rx: '', ry: '', r: '', theta: '' })
    setFeedback({ status: 'idle', message: '' })
    setShowSolution(false)
  }, [])

  useEffect(() => {
    if (activeTab === 'practica' && !challenge) {
      generateChallenge()
    }
  }, [activeTab, challenge, generateChallenge])

  // ─── Manipulación de Vectores ────────────────────────────────
  const addVector = () => {
    if (vectors.length >= 6) return
    const nextIdx = vectors.length + 1
    const newVec = createVector(
      `v${Date.now()}`,
      `V${nextIdx}`,
      { magnitude: 4, angleDeg: 45 * nextIdx },
      DEFAULT_COLORS[(nextIdx - 1) % DEFAULT_COLORS.length],
      'polar'
    )
    setVectors((prev) => [...prev, newVec])
  }

  const removeVector = (id: string) => {
    if (vectors.length <= 2) return
    setVectors((prev) => prev.filter((v) => v.id !== id))
  }

  const updateVectorPolar = (id: string, magnitude: number, angleDeg: number) => {
    const clampedMag = Math.max(0, Math.min(15, magnitude))
    const { x, y } = polarToRect(clampedMag, angleDeg)
    setVectors((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              magnitude: parseFloat(clampedMag.toFixed(2)),
              angleDeg: parseFloat((angleDeg % 360).toFixed(2)),
              x,
              y,
            }
          : v
      )
    )
  }

  const updateVectorRect = (id: string, x: number, y: number) => {
    const clampedX = Math.max(-15, Math.min(15, x))
    const clampedY = Math.max(-15, Math.min(15, y))
    const { magnitude, angleDeg } = rectToPolar(clampedX, clampedY)
    setVectors((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              x: parseFloat(clampedX.toFixed(2)),
              y: parseFloat(clampedY.toFixed(2)),
              magnitude,
              angleDeg,
            }
          : v
      )
    )
  }

  const toggleInputMode = (id: string) => {
    setVectors((prev) =>
      prev.map((v) =>
        v.id === id
          ? { ...v, inputMode: v.inputMode === 'rectangular' ? 'polar' : 'rectangular' }
          : v
      )
    )
  }

  // ─── Dibujo en Canvas ────────────────────────────────────────
  const draw = useCallback(() => {
    const ct = ctx.current
    const { width: W, height: H } = size
    if (!ct || W === 0 || H === 0) return

    ct.clearRect(0, 0, W, H)

    // Fondo
    ct.fillStyle = '#080808'
    ct.fillRect(0, 0, W, H)

    const cx = W / 2
    const cy = H / 2

    // Grilla cartesiana
    ct.strokeStyle = 'rgba(255, 255, 255, 0.04)'
    ct.lineWidth = 1
    for (let x = cx % scale; x < W; x += scale) {
      ct.beginPath(); ct.moveTo(x, 0); ct.lineTo(x, H); ct.stroke()
    }
    for (let y = cy % scale; y < H; y += scale) {
      ct.beginPath(); ct.moveTo(0, y); ct.lineTo(W, y); ct.stroke()
    }

    // Ejes cartesianos
    ct.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ct.lineWidth = 1.5
    ct.beginPath()
    ct.moveTo(0, cy); ct.lineTo(W, cy) // Eje X
    ct.moveTo(cx, 0); ct.lineTo(cx, H) // Eje Y
    ct.stroke()

    // Graduaciones numéricas
    ct.font = '9px IBM Plex Mono, monospace'
    ct.fillStyle = 'rgba(255, 255, 255, 0.3)'
    ct.textAlign = 'center'
    const maxUnitsX = Math.floor(cx / scale)
    for (let u = -maxUnitsX; u <= maxUnitsX; u++) {
      if (u === 0) continue
      const px = cx + u * scale
      ct.beginPath(); ct.moveTo(px, cy - 3); ct.lineTo(px, cy + 3); ct.stroke()
      if (Math.abs(u) % 2 === 0) ct.fillText(`${u}`, px, cy + 13)
    }
    const maxUnitsY = Math.floor(cy / scale)
    ct.textAlign = 'right'
    for (let u = -maxUnitsY; u <= maxUnitsY; u++) {
      if (u === 0) continue
      const py = cy - u * scale
      ct.beginPath(); ct.moveTo(cx - 3, py); ct.lineTo(cx + 3, py); ct.stroke()
      if (Math.abs(u) % 2 === 0) ct.fillText(`${u}`, cx - 6, py + 3)
    }

    // ─── Construcción Gráfica según el Método ──────────────────
    if (method === 'paralelogramo' && vectors.length === 2) {
      const v1 = vectors[0]
      const v2 = vectors[1]

      const dx1 = v1.x * scale, dy1 = -v1.y * scale
      const dx2 = v2.x * scale, dy2 = -v2.y * scale

      // Líneas punteadas del paralelogramo
      ct.strokeStyle = 'rgba(255, 255, 255, 0.35)'
      ct.lineWidth = 1.2
      ct.setLineDash([4, 4])

      // V1 desplazado en la punta de V2
      ct.beginPath()
      ct.moveTo(cx + dx2, cy + dy2)
      ct.lineTo(cx + dx1 + dx2, cy + dy1 + dy2)
      ct.stroke()

      // V2 desplazado en la punta de V1
      ct.beginPath()
      ct.moveTo(cx + dx1, cy + dy1)
      ct.lineTo(cx + dx1 + dx2, cy + dy1 + dy2)
      ct.stroke()

      ct.setLineDash([])
    } else if (method === 'triangulo' && vectors.length === 2) {
      // Método del Triángulo: V1 desde el origen, V2 en la punta de V1
      const v1 = vectors[0]
      const v2 = vectors[1]

      const p1x = cx + v1.x * scale
      const p1y = cy - v1.y * scale
      const p2x = p1x + v2.x * scale
      const p2y = p1y - v2.y * scale

      // Vector V2 trasladado a la punta de V1 (punteado/tenue)
      drawArrow(ct, p1x, p1y, p2x, p2y, 'rgba(255, 255, 255, 0.45)', 2, `${v2.label}'`, [4, 4])
    } else if (method === 'poligono') {
      // Método del Polígono: encadenar todos los vectores cabeza-cola
      let currX = cx
      let currY = cy

      vectors.forEach((v, idx) => {
        const dx = v.x * scale
        const dy = -v.y * scale
        const nextX = currX + dx
        const nextY = currY + dy

        if (idx > 0) {
          // Dibujar vector trasladado
          drawArrow(
            ct,
            currX,
            currY,
            nextX,
            nextY,
            'rgba(255, 255, 255, 0.45)',
            2,
            `${v.label}'`,
            [4, 4]
          )
        }

        currX = nextX
        currY = nextY
      })
    }

    // ─── Vectores Concurrentes desde el Origen ────────────────
    vectors.forEach((v) => {
      const ex = cx + v.x * scale
      const ey = cy - v.y * scale
      const isDraggingThis = draggingId.current === v.id
      const color = isDraggingThis ? '#ffffff' : (v.color || '#cccccc')

      drawArrow(ct, cx, cy, ex, ey, color, 2.5, v.label)

      // Círculo interactivo en la punta
      ct.fillStyle = isDraggingThis ? '#ffffff' : 'rgba(255, 255, 255, 0.75)'
      ct.beginPath()
      ct.arc(ex, ey, isDraggingThis ? 7 : 5, 0, Math.PI * 2)
      ct.fill()
      ct.strokeStyle = '#080808'
      ct.lineWidth = 1.5
      ct.stroke()
    })

    // ─── Vector Resultante R ──────────────────────────────────
    if (vectors.length > 0 && resultant.magnitude > 0.05) {
      const rx = cx + resultant.x * scale
      const ry = cy - resultant.y * scale

      // Glow blanco en la resultante
      ct.shadowColor = 'rgba(255, 255, 255, 0.7)'
      ct.shadowBlur = 10
      drawArrow(ct, cx, cy, rx, ry, '#ffffff', 3.5, 'R (Resultante)')
      ct.shadowBlur = 0

      // Proyecciones punteadas para Rx y Ry
      ct.strokeStyle = 'rgba(255, 255, 255, 0.2)'
      ct.lineWidth = 1
      ct.setLineDash([2, 4])
      ct.beginPath(); ct.moveTo(rx, ry); ct.lineTo(rx, cy); ct.stroke()
      ct.beginPath(); ct.moveTo(rx, ry); ct.lineTo(cx, ry); ct.stroke()
      ct.setLineDash([])
    }

  }, [ctx, size, vectors, method, resultant, scale])

  useEffect(() => {
    draw()
  }, [draw])

  // ─── Interacción Canvas (Drag & Drop) ───────────────────────
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const px = (e.clientX - rect.left) * (size.width / rect.width)
    const py = (e.clientY - rect.top) * (size.height / rect.height)

    const cx = size.width / 2
    const cy = size.height / 2

    // Buscar el vector más cercano a la punta
    for (const v of vectors) {
      const ex = cx + v.x * scale
      const ey = cy - v.y * scale
      if (Math.hypot(px - ex, py - ey) < 26) {
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

    const vx = (px - cx) / scale
    const vy = -(py - cy) / scale

    updateVectorRect(draggingId.current, vx, vy)
  }

  const handlePointerUp = () => {
    draggingId.current = null
  }

  // ─── Validación en Modo Práctica ────────────────────────────
  const checkPracticeAnswer = () => {
    if (!challenge) return

    const rx = parseFloat(practiceAnswers.rx)
    const ry = parseFloat(practiceAnswers.ry)
    const r = parseFloat(practiceAnswers.r)
    const theta = parseFloat(practiceAnswers.theta)

    if (isNaN(rx) || isNaN(ry) || isNaN(r) || isNaN(theta)) {
      setFeedback({
        status: 'error',
        message: 'Por favor ingresa valores numéricos en los cuatro campos (Rx, Ry, R y θ).',
      })
      return
    }

    const tol = 0.35
    const matchRx = Math.abs(rx - challenge.expectedRx) <= tol
    const matchRy = Math.abs(ry - challenge.expectedRy) <= tol
    const matchR = Math.abs(r - challenge.expectedR) <= tol
    const diffTheta = Math.abs((theta % 360) - challenge.expectedTheta)
    const matchTheta = diffTheta <= 2 || Math.abs(diffTheta - 360) <= 2

    if (matchRx && matchRy && matchR && matchTheta) {
      setScore((prev) => ({ correct: prev.correct + 1, total: prev.total + 1 }))
      setFeedback({
        status: 'success',
        message: '¡Excelente cálculo! Has descompuesto y sumado los vectores con total precisión.',
      })
    } else {
      setScore((prev) => ({ correct: prev.correct, total: prev.total + 1 }))
      setFeedback({
        status: 'error',
        message: 'Discrepancia encontrada. Verifica las componentes individuales y los signos.',
      })
    }
  }

  return (
    <div className={styles.sim}>
      {/* ── Canvas 2D Interactivo ────────────────────────────── */}
      <div className={styles.canvasWrap}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />

        {/* HUD Resultante */}
        <div className={styles.canvasOverlay}>
          <span className={styles.overlayTitle}>Vector Resultante (R)</span>
          <span className={styles.overlayValue}>
            |R| = {resultant.magnitude.toFixed(2)} u &nbsp;|&nbsp; θ = {resultant.angleDeg.toFixed(1)}°
          </span>
          <span className={styles.overlaySub}>
            Rx = {resultant.x.toFixed(2)} u &nbsp;|&nbsp; Ry = {resultant.y.toFixed(2)} u &nbsp;({analytical.quadrant})
          </span>
        </div>

        {/* Controles de Zoom */}
        <div className={styles.canvasControls}>
          <button className={styles.canvasBtn} onClick={() => setScale((s) => Math.min(42, s + 4))}>
            + Zoom
          </button>
          <button className={styles.canvasBtn} onClick={() => setScale((s) => Math.max(14, s - 4))}>
            - Zoom
          </button>
        </div>
      </div>

      {/* ── Barra de Métodos y Pestañas ──────────────────────── */}
      <div className={styles.methodBar}>
        <div className={styles.methodButtons}>
          <button
            className={`${styles.methodBtn} ${activeTab === 'simulacion' && method === 'paralelogramo' ? styles.methodActive : ''}`}
            onClick={() => { setActiveTab('simulacion'); setMethod('paralelogramo') }}
            disabled={vectors.length >= 3}
            title={vectors.length >= 3 ? 'Exclusivo para 2 vectores' : 'Método del paralelogramo'}
          >
            <span>▱</span> Paralelogramo (2 vectores)
          </button>

          <button
            className={`${styles.methodBtn} ${activeTab === 'simulacion' && method === 'triangulo' ? styles.methodActive : ''}`}
            onClick={() => { setActiveTab('simulacion'); setMethod('triangulo') }}
            disabled={vectors.length >= 3}
            title={vectors.length >= 3 ? 'Exclusivo para 2 vectores' : 'Método del triángulo'}
          >
            <span>△</span> Triángulo (2 vectores)
          </button>

          <button
            className={`${styles.methodBtn} ${activeTab === 'simulacion' && method === 'poligono' ? styles.methodActive : ''}`}
            onClick={() => { setActiveTab('simulacion'); setMethod('poligono') }}
            title="Método del polígono (cabeza-cola)"
          >
            <span>⬡</span> Polígono ({vectors.length >= 3 ? `${vectors.length} vectores` : 'Punta-Cola'})
          </button>

          <button
            className={`${styles.methodBtn} ${activeTab === 'practica' ? styles.methodActive : ''}`}
            onClick={() => setActiveTab('practica')}
          >
            <span>📝</span> Práctica Evaluativa
          </button>
        </div>

        {vectors.length >= 3 && activeTab === 'simulacion' && (
          <span className={styles.methodNotice}>
            ℹ Con 3 o más vectores se aplica el método del polígono.
          </span>
        )}
      </div>

      {activeTab === 'simulacion' ? (
        <>
          {/* ── MÉTODO ANALÍTICO: Tabla de Descomposición ───────── */}
          <div className={styles.tableCard}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>
                <span>∑</span> Método Analítico: Tabla de Descomposición de Componentes
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className={styles.actionBtn}
                  onClick={addVector}
                  disabled={vectors.length >= 6}
                >
                  + Agregar Vector ({vectors.length}/6)
                </button>
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.analytTable}>
                <thead>
                  <tr>
                    <th>Vector</th>
                    <th>Modo Entrada</th>
                    <th>Módulo (|V|)</th>
                    <th>Ángulo (θ)</th>
                    <th>Componente X (Vx = |V|·cos θ)</th>
                    <th>Componente Y (Vy = |V|·sen θ)</th>
                    <th style={{ textAlign: 'center' }}>Eliminar</th>
                  </tr>
                </thead>
                <tbody>
                  {analytical.rows.map((row, idx) => {
                    const vec = vectors[idx]
                    const isRect = vec.inputMode === 'rectangular'

                    return (
                      <tr key={row.id}>
                        <td>
                          <span className={styles.vecBadge}>
                            <span
                              className={styles.vecColorDot}
                              style={{ background: vec.color || '#fff' }}
                            />
                            {row.label}
                          </span>
                        </td>
                        <td>
                          <button
                            className={styles.modeToggleBtn}
                            onClick={() => toggleInputMode(vec.id)}
                            title="Cambiar entre modo Polar y Rectangular"
                          >
                            {isRect ? 'Rectangular [X, Y]' : 'Polar [r, θ]'} ⇄
                          </button>
                        </td>
                        <td>
                          {isRect ? (
                            <span className={styles.compCell}>{row.magnitude.toFixed(2)} u</span>
                          ) : (
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="15"
                              value={row.magnitude}
                              className={styles.tableInput}
                              onChange={(e) =>
                                updateVectorPolar(vec.id, parseFloat(e.target.value) || 0, row.angleDeg)
                              }
                            />
                          )}
                        </td>
                        <td>
                          {isRect ? (
                            <span className={styles.compCell}>{row.angleDeg.toFixed(1)}°</span>
                          ) : (
                            <input
                              type="number"
                              step="1"
                              min="0"
                              max="360"
                              value={row.angleDeg}
                              className={styles.tableInput}
                              onChange={(e) =>
                                updateVectorPolar(vec.id, row.magnitude, parseFloat(e.target.value) || 0)
                              }
                            />
                          )}
                        </td>
                        <td>
                          {isRect ? (
                            <input
                              type="number"
                              step="0.1"
                              value={row.x}
                              className={styles.tableInput}
                              onChange={(e) =>
                                updateVectorRect(vec.id, parseFloat(e.target.value) || 0, row.y)
                              }
                            />
                          ) : (
                            <span className={styles.compCell}>{row.x.toFixed(2)} u</span>
                          )}
                        </td>
                        <td>
                          {isRect ? (
                            <input
                              type="number"
                              step="0.1"
                              value={row.y}
                              className={styles.tableInput}
                              onChange={(e) =>
                                updateVectorRect(vec.id, row.x, parseFloat(e.target.value) || 0)
                              }
                            />
                          ) : (
                            <span className={styles.compCell}>{row.y.toFixed(2)} u</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className={styles.deleteBtn}
                            onClick={() => removeVector(vec.id)}
                            disabled={vectors.length <= 2}
                            title={vectors.length <= 2 ? 'Mínimo 2 vectores requeridos' : 'Eliminar vector'}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    )
                  })}

                  {/* Fila de Sumatoria Total */}
                  <tr className={styles.summaryRow}>
                    <td colSpan={4}>
                      <strong>SUMATORIA TOTAL (RESULTANTE R)</strong>
                    </td>
                    <td>
                      <strong>Rx = ∑ Vx = {analytical.sumX.toFixed(2)} u</strong>
                    </td>
                    <td>
                      <strong>Ry = ∑ Vy = {analytical.sumY.toFixed(2)} u</strong>
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Panel Inferior: Resumen y Desglose Matemático ──── */}
          <div className={styles.bottomGrid}>
            <div className={styles.resultCard}>
              <span className={styles.cardTitle}>Vector Resultante Analítico</span>
              <div className={styles.resultHighlight}>
                |R| = {resultant.magnitude.toFixed(2)} u
              </div>
              <div className={styles.resultSubtext}>
                Dirección angular: <strong>θ = {resultant.angleDeg.toFixed(2)}°</strong> ({analytical.quadrant})
              </div>
              <div className={styles.resultSubtext}>
                Forma cartesiana: <strong>R = ({resultant.x.toFixed(2)}î + {resultant.y.toFixed(2)}ĵ) u</strong>
              </div>

              <button
                className={styles.secondaryBtn}
                onClick={() => setShowFormulas((v) => !v)}
                style={{ alignSelf: 'flex-start', marginTop: '4px' }}
              >
                {showFormulas ? '▲ Ocultar Derivación' : '▼ Ver Derivación Paso a Paso'}
              </button>

              {showFormulas && (
                <div className={styles.formulaBox}>
                  <div className={styles.formulaStep}>
                    <span style={{ color: 'var(--gray-400)' }}>1. Módulo Resultante (Teorema de Pitágoras):</span>
                    <span style={{ color: 'var(--white)', fontWeight: 600 }}>
                      {analytical.magnitudeDerivation}
                    </span>
                  </div>
                  <div className={styles.formulaStep}>
                    <span style={{ color: 'var(--gray-400)' }}>2. Ángulo y Cuadrante:</span>
                    <span style={{ color: 'var(--white)', fontWeight: 600 }}>
                      {analytical.angleDerivation}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.resultCard}>
              <span className={styles.cardTitle}>Guía de Métodos Gráficos</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: 'var(--gray-300)', fontFamily: 'var(--font-mono)' }}>
                <p>
                  <strong>Paralelogramo (2 vectores):</strong> Se sitúan ambos vectores en el origen común. Se trazan paralelas por sus extremos. La diagonal principal representa la resultante R.
                </p>
                <p>
                  <strong>Triángulo (2 vectores):</strong> Se sitúa el vector V₂ desplazado con su origen en el extremo de V₁. El vector que une el origen con el extremo de V₂ es la resultante R.
                </p>
                <p>
                  <strong>Polígono (≥3 vectores):</strong> Se colocan todos los vectores consecutivamente en cadena (punta con cola). La resultante R cierra el polígono desde el origen hasta el extremo final.
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ── MODO PRÁCTICA EVALUATIVA ────────────────────────── */
        <div className={styles.practiceCard}>
          <div className={styles.scoreBanner}>
            <span>PRÁCTICA: SUMA ANALÍTICA DE VECTORES</span>
            <span>
              Aciertos: <strong>{score.correct}</strong> de <strong>{score.total}</strong> (
              {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}%)
            </span>
          </div>

          {challenge && (
            <>
              <div className={styles.challengePrompt}>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--gray-400)' }}>
                  Reto: Calcula analíticamente la resultante de los siguientes {challenge.vectors.length} vectores:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: '6px 0' }}>
                  {challenge.vectors.map((v) => (
                    <div key={v.id} style={{ fontSize: '14px', color: 'var(--white)' }}>
                      <strong>{v.label}</strong>: Módulo = {v.magnitude.toFixed(1)} u, Ángulo θ ={' '}
                      {v.angleDeg.toFixed(1)}°
                    </div>
                  ))}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>
                  Descompón cada vector en componentes, calcula Rx, Ry, el módulo R y el ángulo resultante θ:
                </span>
              </div>

              <div className={styles.practiceGrid}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--gray-300)', fontFamily: 'var(--font-mono)' }}>
                    Sumatoria Rx = ∑ Vx (u)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ej. 3.20"
                    className={styles.tableInput}
                    style={{ width: '100%' }}
                    value={practiceAnswers.rx}
                    onChange={(e) => setPracticeAnswers((prev) => ({ ...prev, rx: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--gray-300)', fontFamily: 'var(--font-mono)' }}>
                    Sumatoria Ry = ∑ Vy (u)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ej. 4.50"
                    className={styles.tableInput}
                    style={{ width: '100%' }}
                    value={practiceAnswers.ry}
                    onChange={(e) => setPracticeAnswers((prev) => ({ ...prev, ry: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--gray-300)', fontFamily: 'var(--font-mono)' }}>
                    Módulo de la Resultante |R| (u)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ej. 5.52"
                    className={styles.tableInput}
                    style={{ width: '100%' }}
                    value={practiceAnswers.r}
                    onChange={(e) => setPracticeAnswers((prev) => ({ ...prev, r: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--gray-300)', fontFamily: 'var(--font-mono)' }}>
                    Ángulo de la Resultante θ (grados)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ej. 54.6"
                    className={styles.tableInput}
                    style={{ width: '100%' }}
                    value={practiceAnswers.theta}
                    onChange={(e) => setPracticeAnswers((prev) => ({ ...prev, theta: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button className={styles.actionBtn} onClick={checkPracticeAnswer}>
                  Comprobar Respuesta
                </button>
                <button className={styles.secondaryBtn} onClick={generateChallenge}>
                  Siguiente Reto →
                </button>
                <button
                  className={styles.secondaryBtn}
                  onClick={() => setShowSolution((v) => !v)}
                >
                  {showSolution ? 'Ocultar Solución' : 'Ver Solución Paso a Paso'}
                </button>
              </div>

              {feedback.status !== 'idle' && (
                <div
                  className={`${styles.feedbackBox} ${
                    feedback.status === 'success' ? styles.feedbackSuccess : styles.feedbackError
                  }`}
                >
                  <strong>{feedback.status === 'success' ? '✓ ¡Correcto!' : '✗ Respuesta inexacta'}</strong>
                  <span>{feedback.message}</span>
                </div>
              )}

              {showSolution && (
                <div className={styles.formulaBox}>
                  <strong style={{ color: 'var(--white)' }}>Solución Paso a Paso:</strong>
                  {challenge.vectors.map((v) => (
                    <div key={v.id} style={{ fontSize: '11px' }}>
                      {v.label}: Vx = {v.magnitude.toFixed(2)}·cos({v.angleDeg.toFixed(1)}°) ={' '}
                      {v.x.toFixed(2)} u, Vy = {v.magnitude.toFixed(2)}·sen({v.angleDeg.toFixed(1)}°) ={' '}
                      {v.y.toFixed(2)} u
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px' }}>
                    Rx = {challenge.expectedRx.toFixed(2)} u &nbsp;|&nbsp; Ry ={' '}
                    {challenge.expectedRy.toFixed(2)} u
                  </div>
                  <div>
                    R = √(({challenge.expectedRx.toFixed(2)})² + ({challenge.expectedRy.toFixed(2)})²) ={' '}
                    <strong>{challenge.expectedR.toFixed(2)} u</strong>
                  </div>
                  <div>
                    θ = <strong>{challenge.expectedTheta.toFixed(2)}°</strong>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Función auxiliar para dibujar flechas vectoriales en canvas
 */
function drawArrow(
  ct: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  lineWidth: number,
  label?: string,
  dash: number[] = []
) {
  const headLen = 12
  const angle = Math.atan2(toY - fromY, toX - fromX)

  ct.save()
  ct.strokeStyle = color
  ct.fillStyle = color
  ct.lineWidth = lineWidth
  ct.lineCap = 'round'
  ct.setLineDash(dash)

  ct.beginPath()
  ct.moveTo(fromX, fromY)
  ct.lineTo(toX, toY)
  ct.stroke()

  ct.setLineDash([])

  // Cabeza de la flecha
  ct.beginPath()
  ct.moveTo(toX, toY)
  ct.lineTo(toX - headLen * Math.cos(angle - Math.PI / 7), toY - headLen * Math.sin(angle - Math.PI / 7))
  ct.lineTo(toX - headLen * Math.cos(angle + Math.PI / 7), toY - headLen * Math.sin(angle + Math.PI / 7))
  ct.closePath()
  ct.fill()

  if (label) {
    const midX = (fromX + toX) / 2
    const midY = (fromY + toY) / 2
    const dist = Math.hypot(toX - fromX, toY - fromY)
    if (dist > 10) {
      const nx = -(toY - fromY) / dist
      const ny = (toX - fromX) / dist
      ct.font = '600 10px IBM Plex Mono, monospace'
      ct.fillText(label, midX + nx * 10, midY + ny * 10)
    }
  }

  ct.restore()
}
