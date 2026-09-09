import { useState, useRef, useCallback, useEffect } from 'react'
import { useCanvasRenderer } from '../../hooks/useCanvasRenderer'
import {
  rectangularToPolar,
  polarToRectangular,
  polarToGeographic,
  geographicToRectangular,
  normalizeAngleDeg,
  explainRectangularToPolar,
  explainPolarToRectangular,
  type RectangularCoords,
  type PolarCoords,
  type GeographicCoords,
  type CardinalPrimary,
  type CardinalSecondary,
} from './physics'
import styles from './VectorRepresentation.module.css'

type InputMode = 'rectangular' | 'polar' | 'geographic'

interface PracticeChallenge {
  sourceMode: InputMode
  rect: RectangularCoords
  polar: PolarCoords
  geo: GeographicCoords
}

export default function VectorRepresentation() {
  const { canvasRef, ctx, size } = useCanvasRenderer()

  // Modo de edición activo
  const [activeTab, setActiveTab] = useState<InputMode | 'practice'>('rectangular')

  // Estado del vector en coordenadas rectangulares (fuente canónica interna)
  const [coords, setCoords] = useState<RectangularCoords>({ x: 4, y: 3 })

  // Opciones de visualización en canvas
  const [showProjections, setShowProjections] = useState(true)
  const [showArcs, setShowArcs] = useState(true)
  const [showCompass, setShowCompass] = useState(true)
  const [scale, setScale] = useState(26) // pixels por unidad
  const [showMath, setShowMath] = useState(false)

  // Arrastre con puntero
  const isDragging = useRef(false)

  // Coordenadas calculadas
  const polar = rectangularToPolar(coords.x, coords.y)
  const geo = polarToGeographic(polar.r, polar.thetaDeg)

  // Inputs locales para modo geográfico editable
  const [geoPrimary, setGeoPrimary] = useState<CardinalPrimary>('N')
  const [geoAngle, setGeoAngle] = useState(36.87)
  const [geoSecondary, setGeoSecondary] = useState<CardinalSecondary>('E')

  // ─── Estado del Modo Práctica ────────────────────────────────
  const [practiceScore, setPracticeScore] = useState({ correct: 0, total: 0 })
  const [currentChallenge, setCurrentChallenge] = useState<PracticeChallenge | null>(null)
  const [userAnswer, setUserAnswer] = useState({
    val1: '',
    val2: '',
    primary: 'N' as CardinalPrimary,
    secondary: 'E' as CardinalSecondary,
  })
  const [challengeFeedback, setChallengeFeedback] = useState<{
    status: 'idle' | 'success' | 'error'
    message: string
  }>({ status: 'idle', message: '' })
  const [showChallengeSolution, setShowChallengeSolution] = useState(false)

  // ─── Generador de Retos ─────────────────────────────────────
  const generateNewChallenge = useCallback(() => {
    // Generar vector aleatorio con valores pedagógicos (-8 a 8)
    let x = (Math.floor(Math.random() * 16) - 8)
    let y = (Math.floor(Math.random() * 16) - 8)
    if (x === 0 && y === 0) { x = 3; y = 4 }

    const modes: InputMode[] = ['rectangular', 'polar', 'geographic']
    const chosenMode = modes[Math.floor(Math.random() * modes.length)]

    const pol = rectangularToPolar(x, y)
    const g = polarToGeographic(pol.r, pol.thetaDeg)

    setCurrentChallenge({
      sourceMode: chosenMode,
      rect: { x, y },
      polar: pol,
      geo: g,
    })
    setUserAnswer({
      val1: '',
      val2: '',
      primary: 'N',
      secondary: 'E',
    })
    setChallengeFeedback({ status: 'idle', message: '' })
    setShowChallengeSolution(false)
  }, [])

  useEffect(() => {
    if (activeTab === 'practice' && !currentChallenge) {
      generateNewChallenge()
    }
  }, [activeTab, currentChallenge, generateNewChallenge])

  // ─── Handlers de Actualización ──────────────────────────────
  const handleRectChange = (newX: number, newY: number) => {
    const clampedX = parseFloat(Math.max(-15, Math.min(15, newX)).toFixed(2))
    const clampedY = parseFloat(Math.max(-15, Math.min(15, newY)).toFixed(2))
    setCoords({ x: clampedX, y: clampedY })

    // Sincronizar inputs geográficos si procede
    const p = rectangularToPolar(clampedX, clampedY)
    const g = polarToGeographic(p.r, p.thetaDeg)
    if (g.primary) setGeoPrimary(g.primary)
    if (g.secondary) setGeoSecondary(g.secondary)
    setGeoAngle(g.angleDeg)
  }

  const handlePolarChange = (newR: number, newTheta: number) => {
    const clampedR = parseFloat(Math.max(0, Math.min(15, newR)).toFixed(2))
    const normTheta = normalizeAngleDeg(newTheta)
    const rect = polarToRectangular(clampedR, normTheta)
    setCoords(rect)

    const g = polarToGeographic(clampedR, normTheta)
    if (g.primary) setGeoPrimary(g.primary)
    if (g.secondary) setGeoSecondary(g.secondary)
    setGeoAngle(g.angleDeg)
  }

  const handleGeoChange = (r: number, prim: CardinalPrimary, angle: number, sec: CardinalSecondary) => {
    setGeoPrimary(prim)
    setGeoAngle(angle)
    setGeoSecondary(sec)
    const rect = geographicToRectangular(r, prim, angle, sec)
    setCoords(rect)
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

    // ── Rosa de los Vientos / Compás Geográfico de fondo ───────
    if (showCompass) {
      ct.save()
      ct.translate(cx, cy)
      const compassRadius = Math.min(W, H) * 0.38

      // Círculo exterior tenue
      ct.strokeStyle = 'rgba(255, 255, 255, 0.06)'
      ct.lineWidth = 1.5
      ct.setLineDash([3, 3])
      ct.beginPath()
      ct.arc(0, 0, compassRadius, 0, Math.PI * 2)
      ct.stroke()
      ct.setLineDash([])

      // Marcas de 45 grados (NE, NO, SO, SE)
      const subRad = compassRadius * 0.95
      const diagAngles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]
      ct.strokeStyle = 'rgba(255, 255, 255, 0.08)'
      diagAngles.forEach((ang) => {
        ct.beginPath()
        ct.moveTo(0, 0)
        ct.lineTo(Math.cos(ang) * subRad, Math.sin(ang) * subRad)
        ct.stroke()
      })

      // Etiquetas cardinales
      ct.font = '600 12px "Space Grotesk", sans-serif'
      ct.fillStyle = 'rgba(255, 255, 255, 0.45)'
      ct.textAlign = 'center'
      ct.textBaseline = 'middle'

      ct.fillText('N', 0, -compassRadius - 14)
      ct.fillText('S', 0, compassRadius + 14)
      ct.fillText('E', compassRadius + 16, 0)
      ct.fillText('O', -compassRadius - 16, 0)

      // Sub-etiquetas de cuadrante
      ct.font = '9px IBM Plex Mono, monospace'
      ct.fillStyle = 'rgba(255, 255, 255, 0.2)'
      ct.fillText('NE (I)', compassRadius * 0.7, -compassRadius * 0.7)
      ct.fillText('NO (II)', -compassRadius * 0.7, -compassRadius * 0.7)
      ct.fillText('SO (III)', -compassRadius * 0.7, compassRadius * 0.7)
      ct.fillText('SE (IV)', compassRadius * 0.7, compassRadius * 0.7)

      ct.restore()
    }

    // ── Ejes Cartesianos Principales ───────────────────────────
    ct.strokeStyle = 'rgba(255, 255, 255, 0.35)'
    ct.lineWidth = 1.5
    ct.beginPath()
    ct.moveTo(0, cy); ct.lineTo(W, cy) // Eje X
    ct.moveTo(cx, 0); ct.lineTo(cx, H) // Eje Y
    ct.stroke()

    // Graduaciones numéricas en los ejes
    ct.font = '9px IBM Plex Mono, monospace'
    ct.fillStyle = 'rgba(255, 255, 255, 0.35)'
    ct.textAlign = 'center'

    const maxUnitsX = Math.floor(cx / scale)
    for (let u = -maxUnitsX; u <= maxUnitsX; u++) {
      if (u === 0) continue
      const px = cx + u * scale
      ct.beginPath(); ct.moveTo(px, cy - 3); ct.lineTo(px, cy + 3); ct.stroke()
      if (Math.abs(u) % 2 === 0) {
        ct.fillText(`${u}`, px, cy + 13)
      }
    }

    const maxUnitsY = Math.floor(cy / scale)
    ct.textAlign = 'right'
    for (let u = -maxUnitsY; u <= maxUnitsY; u++) {
      if (u === 0) continue
      const py = cy - u * scale
      ct.beginPath(); ct.moveTo(cx - 3, py); ct.lineTo(cx + 3, py); ct.stroke()
      if (Math.abs(u) % 2 === 0) {
        ct.fillText(`${u}`, cx - 6, py + 3)
      }
    }

    // Posición de la punta del vector en canvas
    const vx = cx + coords.x * scale
    const vy = cy - coords.y * scale

    // ── Proyecciones Ortogonales (Ax y Ay) ─────────────────────
    if (showProjections && (Math.abs(coords.x) > 0.05 || Math.abs(coords.y) > 0.05)) {
      ct.setLineDash([3, 3])
      ct.lineWidth = 1.2

      // Proyección vertical a Eje X
      ct.strokeStyle = 'rgba(255, 255, 255, 0.35)'
      ct.beginPath()
      ct.moveTo(vx, vy)
      ct.lineTo(vx, cy)
      ct.stroke()

      // Proyección horizontal a Eje Y
      ct.beginPath()
      ct.moveTo(vx, vy)
      ct.lineTo(cx, vy)
      ct.stroke()
      ct.setLineDash([])

      // Resaltado de componentes en los ejes
      // Componente Ax sobre eje X
      ct.strokeStyle = 'rgba(255, 255, 255, 0.75)'
      ct.lineWidth = 2.5
      ct.beginPath()
      ct.moveTo(cx, cy)
      ct.lineTo(vx, cy)
      ct.stroke()

      // Componente Ay sobre eje Y
      ct.strokeStyle = 'rgba(255, 255, 255, 0.75)'
      ct.lineWidth = 2.5
      ct.beginPath()
      ct.moveTo(cx, cy)
      ct.lineTo(cx, vy)
      ct.stroke()

      // Etiquetas de componentes
      ct.font = 'bold 10px IBM Plex Mono, monospace'
      ct.fillStyle = '#ffffff'
      ct.textAlign = 'center'
      ct.fillText(`Ax = ${coords.x.toFixed(2)}`, (cx + vx) / 2, cy + (coords.y >= 0 ? 18 : -10))

      ct.textAlign = coords.x >= 0 ? 'right' : 'left'
      ct.fillText(`Ay = ${coords.y.toFixed(2)}`, cx + (coords.x >= 0 ? -8 : 8), (cy + vy) / 2)
    }

    // ── Arcos de Ángulo (Polar y Geográfico) ───────────────────
    if (showArcs && polar.r > 0.4) {
      const arcRadius = Math.min(50, polar.r * scale * 0.5)

      // Arco polar θ desde semieje +X (antihorario)
      const radTheta = (polar.thetaDeg * Math.PI) / 180
      ct.strokeStyle = 'rgba(255, 255, 255, 0.6)'
      ct.lineWidth = 1.5
      ct.beginPath()
      ct.arc(cx, cy, arcRadius, 0, -radTheta, true)
      ct.stroke()

      // Etiqueta del ángulo polar
      const midAngle = -radTheta / 2
      const textX = cx + Math.cos(midAngle) * (arcRadius + 14)
      const textY = cy + Math.sin(midAngle) * (arcRadius + 14)
      ct.font = '10px IBM Plex Mono, monospace'
      ct.fillStyle = '#ffffff'
      ct.textAlign = 'center'
      ct.textBaseline = 'middle'
      ct.fillText(`θ = ${polar.thetaDeg.toFixed(1)}°`, textX, textY)
    }

    // ── Vector Principal ──────────────────────────────────────
    if (polar.r > 0.05) {
      // Sombra blanca para resaltar el vector
      ct.shadowColor = 'rgba(255, 255, 255, 0.4)'
      ct.shadowBlur = 8
      drawArrow(ct, cx, cy, vx, vy, '#ffffff', 3)
      ct.shadowBlur = 0

      // Etiqueta de magnitud sobre el vector
      const midVx = (cx + vx) / 2
      const midVy = (cy + vy) / 2
      const offsetDist = 12
      // Vector perpendicular para el offset de texto
      const len = Math.hypot(coords.x, coords.y)
      const nx = -coords.y / len
      const ny = coords.x / len

      ct.font = '600 11px IBM Plex Mono, monospace'
      ct.fillStyle = '#ffffff'
      ct.textAlign = 'center'
      ct.fillText(`|A| = ${polar.r.toFixed(2)} u`, midVx + nx * offsetDist, midVy - ny * offsetDist)
    }

    // Punto interactivo de agarre en la punta
    ct.fillStyle = isDragging.current ? '#ffffff' : 'rgba(255, 255, 255, 0.85)'
    ct.beginPath()
    ct.arc(vx, vy, isDragging.current ? 7 : 5, 0, Math.PI * 2)
    ct.fill()
    ct.strokeStyle = '#080808'
    ct.lineWidth = 2
    ct.stroke()

  }, [ctx, size, coords, polar, scale, showCompass, showProjections, showArcs])

  useEffect(() => {
    draw()
  }, [draw])

  // ── Interacción Canvas (Pointer / Drag) ──────────────────────
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const px = (e.clientX - rect.left) * (size.width / rect.width)
    const py = (e.clientY - rect.top) * (size.height / rect.height)

    const cx = size.width / 2
    const cy = size.height / 2
    const vx = cx + coords.x * scale
    const vy = cy - coords.y * scale

    // Si toca cerca de la punta o en cualquier punto del canvas al hacer click
    if (Math.hypot(px - vx, py - vy) < 28 || e.buttons === 1) {
      isDragging.current = true
      canvas.setPointerCapture(e.pointerId)
      updateFromPointer(px, py, cx, cy)
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging.current || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const px = (e.clientX - rect.left) * (size.width / rect.width)
    const py = (e.clientY - rect.top) * (size.height / rect.height)

    const cx = size.width / 2
    const cy = size.height / 2
    updateFromPointer(px, py, cx, cy)
  }

  const handlePointerUp = () => {
    isDragging.current = false
  }

  const updateFromPointer = (px: number, py: number, cx: number, cy: number) => {
    const newX = (px - cx) / scale
    const newY = -(py - cy) / scale
    handleRectChange(newX, newY)
  }

  // ── Validación de Reto en Modo Práctica ──────────────────────
  const verifyChallengeAnswer = () => {
    if (!currentChallenge) return

    const v1 = parseFloat(userAnswer.val1)
    const v2 = parseFloat(userAnswer.val2)

    if (isNaN(v1) || isNaN(v2)) {
      setChallengeFeedback({
        status: 'error',
        message: 'Por favor ingresa valores numéricos válidos en los campos de respuesta.',
      })
      return
    }

    let isCorrect = false

    if (currentChallenge.sourceMode === 'rectangular') {
      // El alumno debe ingresar forma Polar: v1 = r, v2 = theta
      const expectedR = currentChallenge.polar.r
      const expectedTheta = currentChallenge.polar.thetaDeg
      const diffR = Math.abs(v1 - expectedR)
      const diffTheta = Math.abs(normalizeAngleDeg(v2) - expectedTheta)
      isCorrect = diffR <= 0.25 && (diffTheta <= 1.5 || Math.abs(diffTheta - 360) <= 1.5)
    } else if (currentChallenge.sourceMode === 'polar') {
      // El alumno debe ingresar forma Rectangular: v1 = x, v2 = y
      const expectedX = currentChallenge.rect.x
      const expectedY = currentChallenge.rect.y
      isCorrect = Math.abs(v1 - expectedX) <= 0.25 && Math.abs(v2 - expectedY) <= 0.25
    } else {
      // Origen geográfico -> alumno ingresa polar o rect: validamos magnitud y ángulo
      const expectedR = currentChallenge.polar.r
      const expectedTheta = currentChallenge.polar.thetaDeg
      const diffR = Math.abs(v1 - expectedR)
      const diffTheta = Math.abs(normalizeAngleDeg(v2) - expectedTheta)
      isCorrect = diffR <= 0.25 && (diffTheta <= 1.5 || Math.abs(diffTheta - 360) <= 1.5)
    }

    if (isCorrect) {
      setPracticeScore((prev) => ({ correct: prev.correct + 1, total: prev.total + 1 }))
      setChallengeFeedback({
        status: 'success',
        message: '¡Excelente! Tu respuesta es correcta con alta precisión matemática.',
      })
    } else {
      setPracticeScore((prev) => ({ correct: prev.correct, total: prev.total + 1 }))
      setChallengeFeedback({
        status: 'error',
        message: 'Respuesta incorrecta. Revisa los signos y la orientación en el cuadrante.',
      })
    }
  }

  // Desgloses didácticos
  const rectToPolExplanation = explainRectangularToPolar(coords.x, coords.y)
  const polToRectExplanation = explainPolarToRectangular(polar.r, polar.thetaDeg)

  return (
    <div className={styles.sim}>
      {/* ── Canvas Interactivo 2D ────────────────────────────── */}
      <div className={styles.canvasWrap}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />

        {/* HUD Overlay en esquina superior izquierda */}
        <div className={styles.canvasOverlay}>
          <span className={styles.overlayTitle}>Coordenadas Actuales</span>
          <span className={styles.overlayValue}>
            A = ({coords.x.toFixed(2)}, {coords.y.toFixed(2)}) u
          </span>
          <span className={styles.overlaySub}>
            |A| = {polar.r.toFixed(2)} u &nbsp;|&nbsp; θ = {polar.thetaDeg.toFixed(1)}° &nbsp;|&nbsp; {geo.canonicalText}
          </span>
        </div>

        {/* Controles de Canvas en esquina inferior derecha */}
        <div className={styles.canvasControls}>
          <button
            className={styles.canvasBtn}
            onClick={() => setScale((s) => Math.min(45, s + 4))}
            title="Aumentar zoom"
          >
            + Zoom
          </button>
          <button
            className={styles.canvasBtn}
            onClick={() => setScale((s) => Math.max(14, s - 4))}
            title="Disminuir zoom"
          >
            - Zoom
          </button>
          <button
            className={styles.canvasBtn}
            onClick={() => setShowProjections((v) => !v)}
            title="Alternar proyecciones ortogonales"
          >
            {showProjections ? 'Ocultar Ax/Ay' : 'Ver Ax/Ay'}
          </button>
          <button
            className={styles.canvasBtn}
            onClick={() => setShowArcs((v) => !v)}
            title="Alternar arcos de ángulo"
          >
            {showArcs ? 'Ocultar Arcos' : 'Ver Arcos'}
          </button>
          <button
            className={styles.canvasBtn}
            onClick={() => setShowCompass((v) => !v)}
            title="Alternar rosa de los vientos"
          >
            {showCompass ? 'Ocultar Brújula' : 'Ver Brújula'}
          </button>
        </div>
      </div>

      {/* ── Selector de Modo de Entrada ──────────────────────── */}
      <div className={styles.tabsContainer}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'rectangular' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('rectangular')}
        >
          <span>⊞</span> Rectangular (x, y)
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'polar' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('polar')}
        >
          <span>⊙</span> Polar (r, θ)
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'geographic' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('geographic')}
        >
          <span>🧭</span> Geográfico (Rumbo)
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'practice' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('practice')}
        >
          <span>📝</span> Práctica y Retos
          <span className={styles.practiceBadge}>TEST</span>
        </button>
      </div>

      {/* ── Paneles Principales: Entrada y Conversión en Vivo ── */}
      {activeTab !== 'practice' ? (
        <div className={styles.panelGrid}>
          {/* Panel Izquierdo: Entrada Activa */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>
                {activeTab === 'rectangular' && 'Edición en Coordenadas Rectangulares'}
                {activeTab === 'polar' && 'Edición en Coordenadas Polares'}
                {activeTab === 'geographic' && 'Edición en Coordenadas Geográficas'}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--gray-500)', fontFamily: 'var(--font-mono)' }}>
                Arrastra la punta o usa los controles
              </span>
            </div>

            {/* MODO RECTANGULAR */}
            {activeTab === 'rectangular' && (
              <div className={styles.inputGroup}>
                <div className={styles.inputRow}>
                  <div className={styles.labelRow}>
                    <span>Componente Ax (horizontal)</span>
                    <span>{coords.x.toFixed(2)} u</span>
                  </div>
                  <div className={styles.sliderRow}>
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="0.1"
                      value={coords.x}
                      className={styles.slider}
                      onChange={(e) => handleRectChange(parseFloat(e.target.value), coords.y)}
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={coords.x}
                      className={styles.numInput}
                      onChange={(e) => handleRectChange(parseFloat(e.target.value) || 0, coords.y)}
                    />
                  </div>
                </div>

                <div className={styles.inputRow}>
                  <div className={styles.labelRow}>
                    <span>Componente Ay (vertical)</span>
                    <span>{coords.y.toFixed(2)} u</span>
                  </div>
                  <div className={styles.sliderRow}>
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="0.1"
                      value={coords.y}
                      className={styles.slider}
                      onChange={(e) => handleRectChange(coords.x, parseFloat(e.target.value))}
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={coords.y}
                      className={styles.numInput}
                      onChange={(e) => handleRectChange(coords.x, parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* MODO POLAR */}
            {activeTab === 'polar' && (
              <div className={styles.inputGroup}>
                <div className={styles.inputRow}>
                  <div className={styles.labelRow}>
                    <span>Módulo / Magnitud (r)</span>
                    <span>{polar.r.toFixed(2)} u</span>
                  </div>
                  <div className={styles.sliderRow}>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      step="0.1"
                      value={polar.r}
                      className={styles.slider}
                      onChange={(e) => handlePolarChange(parseFloat(e.target.value), polar.thetaDeg)}
                    />
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={polar.r}
                      className={styles.numInput}
                      onChange={(e) => handlePolarChange(parseFloat(e.target.value) || 0, polar.thetaDeg)}
                    />
                  </div>
                </div>

                <div className={styles.inputRow}>
                  <div className={styles.labelRow}>
                    <span>Ángulo polar (θ respecto a +X)</span>
                    <span>{polar.thetaDeg.toFixed(1)}°</span>
                  </div>
                  <div className={styles.sliderRow}>
                    <input
                      type="range"
                      min="0"
                      max="359.9"
                      step="0.5"
                      value={polar.thetaDeg}
                      className={styles.slider}
                      onChange={(e) => handlePolarChange(polar.r, parseFloat(e.target.value))}
                    />
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="360"
                      value={polar.thetaDeg}
                      className={styles.numInput}
                      onChange={(e) => handlePolarChange(polar.r, parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* MODO GEOGRÁFICO */}
            {activeTab === 'geographic' && (
              <div className={styles.inputGroup}>
                <div className={styles.inputRow}>
                  <div className={styles.labelRow}>
                    <span>Magnitud del Vector</span>
                    <span>{polar.r.toFixed(2)} u</span>
                  </div>
                  <div className={styles.sliderRow}>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      step="0.1"
                      value={polar.r}
                      className={styles.slider}
                      onChange={(e) =>
                        handleGeoChange(parseFloat(e.target.value), geoPrimary, geoAngle, geoSecondary)
                      }
                    />
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={polar.r}
                      className={styles.numInput}
                      onChange={(e) =>
                        handleGeoChange(parseFloat(e.target.value) || 0, geoPrimary, geoAngle, geoSecondary)
                      }
                    />
                  </div>
                </div>

                <div className={styles.inputRow}>
                  <div className={styles.labelRow}>
                    <span>Rumbo Geográfico (Puntos Cardinales)</span>
                    <span>
                      {geoPrimary} {geoAngle.toFixed(1)}° {geoSecondary}
                    </span>
                  </div>
                  <div className={styles.geoSelectRow}>
                    <select
                      className={styles.selectInput}
                      value={geoPrimary}
                      onChange={(e) =>
                        handleGeoChange(polar.r, e.target.value as CardinalPrimary, geoAngle, geoSecondary)
                      }
                    >
                      <option value="N">Norte (N)</option>
                      <option value="S">Sur (S)</option>
                    </select>

                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="90"
                      value={geoAngle}
                      className={styles.numInput}
                      style={{ width: '100%' }}
                      onChange={(e) =>
                        handleGeoChange(polar.r, geoPrimary, parseFloat(e.target.value) || 0, geoSecondary)
                      }
                    />

                    <select
                      className={styles.selectInput}
                      value={geoSecondary}
                      onChange={(e) =>
                        handleGeoChange(polar.r, geoPrimary, geoAngle, e.target.value as CardinalSecondary)
                      }
                    >
                      <option value="E">Hacia el Este (E)</option>
                      <option value="O">Hacia el Oeste (O)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Presets Rápidos Didácticos */}
            <div className={styles.presetsRow}>
              <span style={{ fontSize: '10px', color: 'var(--gray-500)', width: '100%', fontFamily: 'var(--font-mono)' }}>
                Vectores de Referencia:
              </span>
              <button className={styles.presetBtn} onClick={() => handleRectChange(3, 4)}>
                (3, 4) — Clásico 5 u
              </button>
              <button className={styles.presetBtn} onClick={() => handleRectChange(-4, 3)}>
                (-4, 3) — Cuadrante II
              </button>
              <button className={styles.presetBtn} onClick={() => handleRectChange(-5, -5)}>
                (-5, -5) — Cuadrante III
              </button>
              <button className={styles.presetBtn} onClick={() => handleRectChange(6, -8)}>
                (6, -8) — Cuadrante IV
              </button>
              <button className={styles.presetBtn} onClick={() => handleRectChange(10, 0)}>
                10 u al Este
              </button>
              <button className={styles.presetBtn} onClick={() => handleRectChange(0, 10)}>
                10 u al Norte
              </button>
            </div>
          </div>

          {/* Panel Derecho: Visualización Simultánea de las 3 Formas */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Conversión Simultánea de Coordenadas</span>
              <span style={{ fontSize: '11px', color: 'var(--gray-400)', fontFamily: 'var(--font-mono)' }}>
                Cuadrante: {geo.quadrant}
              </span>
            </div>

            <div className={styles.readoutsGrid}>
              {/* Tarjeta Rectangular */}
              <div
                className={`${styles.readoutCard} ${activeTab === 'rectangular' ? styles.readoutActive : ''}`}
              >
                <div className={styles.readoutHeader}>
                  <span>Forma Rectangular</span>
                  {activeTab === 'rectangular' && <span className={styles.readoutBadge}>ORIGEN</span>}
                </div>
                <div className={styles.readoutMain}>
                  A = ({coords.x.toFixed(2)}, {coords.y.toFixed(2)})
                </div>
                <div className={styles.readoutDetails}>
                  <span>Ax = {coords.x.toFixed(2)} u (i)</span>
                  <span>Ay = {coords.y.toFixed(2)} u (j)</span>
                </div>
              </div>

              {/* Tarjeta Polar */}
              <div className={`${styles.readoutCard} ${activeTab === 'polar' ? styles.readoutActive : ''}`}>
                <div className={styles.readoutHeader}>
                  <span>Forma Polar</span>
                  {activeTab === 'polar' && <span className={styles.readoutBadge}>ORIGEN</span>}
                </div>
                <div className={styles.readoutMain}>
                  A = ({polar.r.toFixed(2)} u ; {polar.thetaDeg.toFixed(1)}°)
                </div>
                <div className={styles.readoutDetails}>
                  <span>Módulo (r) = {polar.r.toFixed(2)} u</span>
                  <span>Ángulo (θ) = {polar.thetaDeg.toFixed(1)}°</span>
                </div>
              </div>

              {/* Tarjeta Geográfica */}
              <div
                className={`${styles.readoutCard} ${activeTab === 'geographic' ? styles.readoutActive : ''}`}
              >
                <div className={styles.readoutHeader}>
                  <span>Forma Geográfica</span>
                  {activeTab === 'geographic' && <span className={styles.readoutBadge}>ORIGEN</span>}
                </div>
                <div className={styles.readoutMain}>
                  {geo.canonicalText}
                </div>
                <div className={styles.readoutDetails}>
                  <span>Alt: {geo.alternativeText}</span>
                  <span>Azimut: {geo.azimuthDeg.toFixed(1)}°</span>
                </div>
              </div>
            </div>

            {/* Toggle de Desglose Matemático Paso a Paso */}
            <button className={styles.toggleMathBtn} onClick={() => setShowMath((v) => !v)}>
              <span>{showMath ? '▲ Ocultar' : '▼ Ver'}</span>
              <span>desglose matemático paso a paso con fórmulas</span>
            </button>

            {showMath && (
              <div className={styles.mathPanel}>
                <div className={styles.mathStep}>
                  <span style={{ color: 'var(--gray-400)', fontSize: '11px' }}>1. Cálculo del Módulo (Pitágoras):</span>
                  <span className={styles.mathFormula}>{rectToPolExplanation.magnitudeStep}</span>
                </div>
                <div className={styles.mathStep}>
                  <span style={{ color: 'var(--gray-400)', fontSize: '11px' }}>2. Cálculo del Ángulo Polar (Trigonometría):</span>
                  <span style={{ color: 'var(--gray-300)', fontSize: '11px' }}>{rectToPolExplanation.quadrantStep}</span>
                  <span className={styles.mathFormula}>{rectToPolExplanation.angleStep}</span>
                </div>
                <div className={styles.mathStep}>
                  <span style={{ color: 'var(--gray-400)', fontSize: '11px' }}>3. Componentes Cartesianas Inversas:</span>
                  <span className={styles.mathFormula}>{polToRectExplanation.xStep}</span>
                  <span className={styles.mathFormula}>{polToRectExplanation.yStep}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── MODO PRÁCTICA Y RETOS INTERACTIVOS ─────────────── */
        <div className={styles.practiceCard}>
          <div className={styles.scoreBanner}>
            <span>PRÁCTICA EVALUATIVA DE CONVERSIÓN DE VECTORES</span>
            <span>
              Aciertos: <strong>{practiceScore.correct}</strong> de <strong>{practiceScore.total}</strong> (
              {practiceScore.total > 0
                ? Math.round((practiceScore.correct / practiceScore.total) * 100)
                : 0}
              %)
            </span>
          </div>

          {currentChallenge && (
            <>
              <div className={styles.challengePrompt}>
                <span className={styles.promptTitle}>
                  Reto Activo: Se te proporciona el siguiente vector en forma{' '}
                  {currentChallenge.sourceMode === 'rectangular' && 'RECTANGULAR'}
                  {currentChallenge.sourceMode === 'polar' && 'POLAR'}
                  {currentChallenge.sourceMode === 'geographic' && 'GEOGRÁFICA'}
                </span>
                <span className={styles.promptGiven}>
                  {currentChallenge.sourceMode === 'rectangular' &&
                    `A = (${currentChallenge.rect.x.toFixed(2)}, ${currentChallenge.rect.y.toFixed(2)}) u`}
                  {currentChallenge.sourceMode === 'polar' &&
                    `A = (${currentChallenge.polar.r.toFixed(2)} u ; ${currentChallenge.polar.thetaDeg.toFixed(1)}°)`}
                  {currentChallenge.sourceMode === 'geographic' &&
                    `A = ${currentChallenge.geo.canonicalText}`}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--gray-400)', fontFamily: 'var(--font-mono)' }}>
                  {currentChallenge.sourceMode === 'rectangular' &&
                    'Convierte e ingresa sus coordenadas POLARES (Magnitud r y Ángulo θ en grados):'}
                  {currentChallenge.sourceMode === 'polar' &&
                    'Convierte e ingresa sus componentes RECTANGULARES (Ax horizontal y Ay vertical):'}
                  {currentChallenge.sourceMode === 'geographic' &&
                    'Convierte e ingresa sus coordenadas POLARES (Magnitud r y Ángulo θ en grados):'}
                </span>
              </div>

              <div className={styles.practiceInputs}>
                <div className={styles.inputRow}>
                  <label className={styles.labelRow}>
                    <span>
                      {currentChallenge.sourceMode === 'polar' ? 'Componente Ax' : 'Módulo r (u)'}
                    </span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ej. 5.00"
                    className={styles.numInput}
                    style={{ width: '100%', textAlign: 'left', padding: '8px' }}
                    value={userAnswer.val1}
                    onChange={(e) => setUserAnswer((prev) => ({ ...prev, val1: e.target.value }))}
                  />
                </div>

                <div className={styles.inputRow}>
                  <label className={styles.labelRow}>
                    <span>
                      {currentChallenge.sourceMode === 'polar' ? 'Componente Ay' : 'Ángulo polar θ (°)'}
                    </span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ej. 53.13"
                    className={styles.numInput}
                    style={{ width: '100%', textAlign: 'left', padding: '8px' }}
                    value={userAnswer.val2}
                    onChange={(e) => setUserAnswer((prev) => ({ ...prev, val2: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button className={styles.actionBtn} onClick={verifyChallengeAnswer}>
                  Comprobar Respuesta
                </button>
                <button className={styles.secondaryBtn} onClick={generateNewChallenge}>
                  Siguiente Reto →
                </button>
                <button
                  className={styles.secondaryBtn}
                  onClick={() => setShowChallengeSolution((v) => !v)}
                >
                  {showChallengeSolution ? 'Ocultar Solución' : 'Ver Solución Paso a Paso'}
                </button>
              </div>

              {challengeFeedback.status !== 'idle' && (
                <div
                  className={`${styles.feedbackBox} ${
                    challengeFeedback.status === 'success'
                      ? styles.feedbackSuccess
                      : styles.feedbackError
                  }`}
                >
                  <strong>
                    {challengeFeedback.status === 'success' ? '✓ ¡Correcto!' : '✗ Intenta nuevamente'}
                  </strong>
                  <span>{challengeFeedback.message}</span>
                </div>
              )}

              {showChallengeSolution && (
                <div className={styles.mathPanel}>
                  <span style={{ fontWeight: 600, color: 'var(--white)' }}>Solución Completa del Reto:</span>
                  <div className={styles.mathStep}>
                    <span>Forma Rectangular:</span>
                    <span className={styles.mathFormula}>
                      Ax = {currentChallenge.rect.x.toFixed(2)} u &nbsp;|&nbsp; Ay ={' '}
                      {currentChallenge.rect.y.toFixed(2)} u
                    </span>
                  </div>
                  <div className={styles.mathStep}>
                    <span>Forma Polar:</span>
                    <span className={styles.mathFormula}>
                      r = {currentChallenge.polar.r.toFixed(2)} u &nbsp;|&nbsp; θ ={' '}
                      {currentChallenge.polar.thetaDeg.toFixed(2)}°
                    </span>
                  </div>
                  <div className={styles.mathStep}>
                    <span>Forma Geográfica:</span>
                    <span className={styles.mathFormula}>{currentChallenge.geo.canonicalText}</span>
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
 * Función auxiliar para dibujar una flecha vectorial limpia con punta estilizada
 */
function drawArrow(
  ct: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  lineWidth: number
) {
  const headLen = 14
  const angle = Math.atan2(toY - fromY, toX - fromX)

  ct.strokeStyle = color
  ct.fillStyle = color
  ct.lineWidth = lineWidth
  ct.lineCap = 'round'

  // Línea del tallo
  ct.beginPath()
  ct.moveTo(fromX, fromY)
  ct.lineTo(toX, toY)
  ct.stroke()

  // Cabeza de la flecha
  ct.beginPath()
  ct.moveTo(toX, toY)
  ct.lineTo(
    toX - headLen * Math.cos(angle - Math.PI / 7),
    toY - headLen * Math.sin(angle - Math.PI / 7)
  )
  ct.lineTo(
    toX - headLen * Math.cos(angle + Math.PI / 7),
    toY - headLen * Math.sin(angle + Math.PI / 7)
  )
  ct.closePath()
  ct.fill()
}
