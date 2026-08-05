import { useState, useRef, useCallback, useEffect } from 'react'
import { useCanvasRenderer } from '../../hooks/useCanvasRenderer'
import { useLiveChart } from '../../hooks/useLiveChart'
import { computeKinematics, timeAtPosition, type KinematicsParams } from './physics'
import styles from './ConstantAcceleration.module.css'

const WORLD_MIN = -20   // m — límite izquierdo del mundo
const WORLD_MAX = 120   // m — límite derecho del mundo
const SLOW_FACTOR = 10  // factor de tiempo lento

export default function ConstantAcceleration() {
  // ─── Parámetros editables ───────────────────────────────────
  const [params, setParams] = useState<KinematicsParams>({ x0: 0, v0: 5, a: 2 })
  const [draft,  setDraft]  = useState({ x0: '0', v0: '5', a: '2' })

  // ─── Estado de simulación ───────────────────────────────────
  const [running,    setRunning]    = useState(false)
  const [slowMode,   setSlowMode]   = useState(false)
  const [elapsed,    setElapsed]    = useState(0)
  const [timeGreen,  setTimeGreen]  = useState<number | null>(null)
  const [timeRed,    setTimeRed]    = useState<number | null>(null)
  const [hitGreen,   setHitGreen]   = useState(false)
  const [hitRed,     setHitRed]     = useState(false)

  // Barreras (posición en metros del mundo)
  const [barrierGreen, setBarrierGreen] = useState(40)
  const [barrierRed,   setBarrierRed]   = useState(80)

  // ─── Refs de simulación ─────────────────────────────────────
  const rafRef        = useRef<number>(0)
  const pauseAccRef   = useRef<number>(0)  // tiempo acumulado antes de pause
  const lastTsRef     = useRef<number>(0)
  const runningRef    = useRef(false)

  // ─── Canvas principal ───────────────────────────────────────
  const { canvasRef: mainCanvas, ctx: mainCtx, size: mainSize } = useCanvasRenderer()

  // ─── Gráficas ───────────────────────────────────────────────
  const { canvasRef: chartXRef, ctx: ctxXT, size: sizeXT } = useCanvasRenderer()
  const { canvasRef: chartVRef, ctx: ctxVT, size: sizeVT } = useCanvasRenderer()
  const { canvasRef: chartARef, ctx: ctxAT, size: sizeAT } = useCanvasRenderer()

  const chartX = useLiveChart({ label: 'x', unitX: 's', unitY: 'm',   autoScale: true })
  const chartV = useLiveChart({ label: 'v', unitX: 's', unitY: 'm/s', autoScale: true })
  const chartA = useLiveChart({
    label: 'a', unitX: 's', unitY: 'm/s²',
    autoScale: false, yMin: params.a - 2, yMax: params.a + 2
  })

  // ─── Barreras arrastrables (en canvas) ──────────────────────
  const draggingBarrier = useRef<'green' | 'red' | null>(null)

  const worldToCanvas = useCallback(
    (xWorld: number, canvasW: number): number => {
      const worldRange = WORLD_MAX - WORLD_MIN
      return ((xWorld - WORLD_MIN) / worldRange) * canvasW
    },
    []
  )
  const canvasToWorld = useCallback(
    (px: number, canvasW: number): number => {
      const worldRange = WORLD_MAX - WORLD_MIN
      return WORLD_MIN + (px / canvasW) * worldRange
    },
    []
  )

  // ─── Dibujo del canvas principal ────────────────────────────
  const drawMain = useCallback(
    (t: number) => {
      const ctx = mainCtx.current
      const { width: W, height: H } = mainSize
      if (!ctx || W === 0) return

      ctx.clearRect(0, 0, W, H)

      const state = computeKinematics(params, t)
      const carX  = worldToCanvas(state.x, W)
      const baseY = H * 0.62

      // ── Fondo ────────────────────────────────────────────────
      // Degradado cielo oscuro → suelo
      const sky = ctx.createLinearGradient(0, 0, 0, H)
      sky.addColorStop(0, '#080808')
      sky.addColorStop(0.6, '#0f0f0f')
      sky.addColorStop(0.6, '#111111')
      sky.addColorStop(1, '#080808')
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, W, H)

      // ── Carretera ────────────────────────────────────────────
      const roadH  = H * 0.22
      const roadY  = baseY - 4
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(0, roadY, W, roadH)

      // Líneas de carretera animadas
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'
      ctx.lineWidth = 2
      ctx.setLineDash([30, 22])
      ctx.lineDashOffset = -(state.x * 4) % 52
      ctx.beginPath()
      ctx.moveTo(0, roadY + roadH / 2)
      ctx.lineTo(W, roadY + roadH / 2)
      ctx.stroke()
      ctx.setLineDash([])

      // Bordes de carretera
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, roadY)
      ctx.lineTo(W, roadY)
      ctx.moveTo(0, roadY + roadH - 1)
      ctx.lineTo(W, roadY + roadH - 1)
      ctx.stroke()

      // ── Perspectiva / líneas de horizonte ────────────────────
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'
      ctx.lineWidth = 1
      for (let i = 1; i <= 3; i++) {
        const lx = (i / 4) * W
        ctx.beginPath()
        ctx.moveTo(lx, 0)
        ctx.lineTo(lx, roadY)
        ctx.stroke()
      }

      // ── Escala numérica (metros) ──────────────────────────────
      const tickStep = 10 // metros entre ticks
      ctx.font = '10px IBM Plex Mono, monospace'
      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.textAlign = 'center'
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'
      ctx.lineWidth = 1
      for (let m = Math.ceil(WORLD_MIN / tickStep) * tickStep; m <= WORLD_MAX; m += tickStep) {
        const tx = worldToCanvas(m, W)
        ctx.beginPath()
        ctx.moveTo(tx, roadY + roadH - 6)
        ctx.lineTo(tx, roadY + roadH + 6)
        ctx.stroke()
        ctx.fillText(`${m}m`, tx, roadY + roadH + 18)
      }

      // ── Barrera verde ─────────────────────────────────────────
      const gx = worldToCanvas(barrierGreen, W)
      ctx.strokeStyle = hitGreen ? 'rgba(200,255,200,0.9)' : 'rgba(180,255,180,0.7)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(gx, roadY - 8)
      ctx.lineTo(gx, roadY + roadH + 8)
      ctx.stroke()
      // Flag verde
      drawFlag(ctx, gx, roadY - 8, '#22c55e', '⬥')

      // ── Barrera roja ──────────────────────────────────────────
      const rx = worldToCanvas(barrierRed, W)
      ctx.strokeStyle = hitRed ? 'rgba(255,200,200,0.9)' : 'rgba(255,160,160,0.7)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(rx, roadY - 8)
      ctx.lineTo(rx, roadY + roadH + 8)
      ctx.stroke()
      drawFlag(ctx, rx, roadY - 8, '#ef4444', '⬥')

      // ── Auto ─────────────────────────────────────────────────
      if (carX >= -60 && carX <= W + 60) {
        drawCar(ctx, carX, baseY, state.v)
      }

      // ── Indicadores numéricos ────────────────────────────────
      ctx.font = 'bold 11px IBM Plex Mono, monospace'
      ctx.textAlign = 'left'
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.fillText(`x = ${state.x.toFixed(2)} m`, 12, 20)
      ctx.fillText(`v = ${state.v.toFixed(2)} m/s`, 12, 36)
      ctx.fillText(`a = ${state.a.toFixed(2)} m/s²`, 12, 52)
      ctx.fillText(`t = ${t.toFixed(2)} s`, 12, 68)
    },
    [params, mainCtx, mainSize, worldToCanvas, barrierGreen, barrierRed, hitGreen, hitRed]
  )

  // ─── Loop de animación ───────────────────────────────────────
  const loop = useCallback(
    (timestamp: number) => {
      if (!runningRef.current) return
      if (lastTsRef.current === 0) lastTsRef.current = timestamp

      const rawDt = (timestamp - lastTsRef.current) / 1000
      lastTsRef.current = timestamp

      const dt = slowMode ? rawDt / SLOW_FACTOR : rawDt
      pauseAccRef.current += dt

      const t = pauseAccRef.current

      // Detección de barreras
      const state = computeKinematics(params, t)

      if (!hitGreen) {
        const prevX = computeKinematics(params, Math.max(0, t - dt)).x
        if ((prevX < barrierGreen && state.x >= barrierGreen) ||
            (prevX > barrierGreen && state.x <= barrierGreen)) {
          const exactT = timeAtPosition(params, barrierGreen)
          setTimeGreen(exactT ?? t)
          setHitGreen(true)
        }
      }

      if (!hitRed) {
        const prevX = computeKinematics(params, Math.max(0, t - dt)).x
        if ((prevX < barrierRed && state.x >= barrierRed) ||
            (prevX > barrierRed && state.x <= barrierRed)) {
          const exactT = timeAtPosition(params, barrierRed)
          setTimeRed(exactT ?? t)
          setHitRed(true)
        }
      }

      setElapsed(t)

      // Dibujar escena
      drawMain(t)

      // Gráficas
      chartX.push(t, state.x)
      chartV.push(t, state.v)
      chartA.push(t, state.a)

      const cxT = ctxXT.current
      const cvT = ctxVT.current
      const caT = ctxAT.current
      if (cxT) chartX.draw(cxT, sizeXT.width, sizeXT.height)
      if (cvT) chartV.draw(cvT, sizeVT.width, sizeVT.height)
      if (caT) chartA.draw(caT, sizeAT.width, sizeAT.height)

      rafRef.current = requestAnimationFrame(loop)
    },
    [params, slowMode, hitGreen, hitRed, barrierGreen, barrierRed,
     drawMain, chartX, chartV, chartA, ctxXT, ctxVT, ctxAT, sizeXT, sizeVT, sizeAT]
  )

  const startLoop = useCallback(() => {
    lastTsRef.current = 0
    runningRef.current = true
    rafRef.current = requestAnimationFrame(loop)
  }, [loop])

  // ─── Controles ───────────────────────────────────────────────
  const handleApply = () => {
    const x0 = parseFloat(draft.x0) || 0
    const v0 = parseFloat(draft.v0) || 0
    const a  = parseFloat(draft.a)  || 0
    setParams({ x0, v0, a })
    handleReset()
  }

  const handleReset = useCallback(() => {
    runningRef.current = false
    cancelAnimationFrame(rafRef.current)
    lastTsRef.current   = 0
    pauseAccRef.current = 0
    setRunning(false)
    setElapsed(0)
    setTimeGreen(null)
    setTimeRed(null)
    setHitGreen(false)
    setHitRed(false)
    chartX.reset(); chartV.reset(); chartA.reset()
    drawMain(0)
  }, [drawMain, chartX, chartV, chartA])

  const handlePlay = () => {
    if (running) {
      // Pausar
      runningRef.current = false
      cancelAnimationFrame(rafRef.current)
      setRunning(false)
    } else {
      setRunning(true)
      startLoop()
    }
  }

  // Dibujo inicial
  useEffect(() => { drawMain(0) }, [drawMain])

  // Cleanup
  useEffect(() => () => { cancelAnimationFrame(rafRef.current) }, [])

  // ─── Arrastre de barreras sobre canvas ───────────────────────
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect   = mainCanvas.current!.getBoundingClientRect()
    const px = (e.clientX - rect.left) * (mainSize.width / rect.width)

    const gxW = worldToCanvas(barrierGreen, mainSize.width)
    const rxW = worldToCanvas(barrierRed,   mainSize.width)

    if (Math.abs(px - gxW) < 20) {
      draggingBarrier.current = 'green'
      mainCanvas.current!.setPointerCapture(e.pointerId)
    } else if (Math.abs(px - rxW) < 20) {
      draggingBarrier.current = 'red'
      mainCanvas.current!.setPointerCapture(e.pointerId)
    }
  }

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingBarrier.current || !mainCanvas.current) return
    const rect  = mainCanvas.current.getBoundingClientRect()
    const px    = (e.clientX - rect.left) * (mainSize.width / rect.width)
    const wx    = Math.round(canvasToWorld(px, mainSize.width))
    const clamped = Math.min(WORLD_MAX - 5, Math.max(WORLD_MIN + 5, wx))

    if (draggingBarrier.current === 'green') setBarrierGreen(clamped)
    else setBarrierRed(clamped)
  }

  const handleCanvasPointerUp = () => { draggingBarrier.current = null }

  // ─── Render ──────────────────────────────────────────────────
  const formatTime = (t: number | null, running_: boolean) => {
    if (t === null && !running_) return '——:——'
    if (t === null) return '00:00.00'
    const mins = Math.floor(t / 60)
    const secs = t % 60
    return `${String(mins).padStart(2, '0')}:${secs.toFixed(2).padStart(5, '0')}`
  }

  return (
    <div className={styles.sim}>
      {/* ── Canvas principal ──────────────────────────────────── */}
      <div className={styles.canvasWrap}>
        <canvas
          ref={mainCanvas}
          className={styles.canvas}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          aria-label="Escena de movimiento con aceleración constante"
        />
      </div>

      {/* ── Panel de control ─────────────────────────────────── */}
      <div className={styles.panel}>
        {/* Parámetros */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Parámetros</h3>
          <div className={styles.fields}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>x₀ (m)</span>
              <input
                className="input"
                type="number"
                step="1"
                value={draft.x0}
                onChange={e => setDraft(d => ({ ...d, x0: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleApply()}
                disabled={running}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>v₀ (m/s)</span>
              <input
                className="input"
                type="number"
                step="0.5"
                value={draft.v0}
                onChange={e => setDraft(d => ({ ...d, v0: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleApply()}
                disabled={running}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>a (m/s²)</span>
              <input
                className="input"
                type="number"
                step="0.5"
                value={draft.a}
                onChange={e => setDraft(d => ({ ...d, a: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleApply()}
                disabled={running}
              />
            </label>
          </div>
          <button className="btn btn--secondary" onClick={handleApply} disabled={running} style={{ width: '100%' }}>
            Aplicar
          </button>
        </section>

        {/* Controles */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Controles</h3>
          <div className={styles.controls}>
            <button className="btn btn--primary" onClick={handlePlay} id="btn-play-pause">
              {running ? '⏸ Pausar' : '▶ Iniciar'}
            </button>
            <button className="btn btn--secondary" onClick={handleReset} id="btn-reset">
              ↺ Reiniciar
            </button>
            <button
              className={`btn btn--ghost ${slowMode ? styles.slowActive : ''}`}
              onClick={() => setSlowMode(s => !s)}
              id="btn-slow-motion"
            >
              🐌 Cámara lenta
            </button>
          </div>
        </section>

        {/* Barreras */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Barreras</h3>
          <p className={styles.hint}>Arrastra las barreras en el canvas</p>
          <div className={styles.fields}>
            <label className={styles.field}>
              <span className={styles.fieldLabel} style={{ color: '#86efac' }}>Verde (m)</span>
              <input
                className="input"
                type="number"
                value={barrierGreen}
                onChange={e => setBarrierGreen(Number(e.target.value))}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel} style={{ color: '#fca5a5' }}>Roja (m)</span>
              <input
                className="input"
                type="number"
                value={barrierRed}
                onChange={e => setBarrierRed(Number(e.target.value))}
              />
            </label>
          </div>
        </section>

        {/* Relojes */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Relojes</h3>
          <div className={styles.clocks}>
            <div className={styles.clock}>
              <span className={styles.clockLabel}>Tiempo general</span>
              <span className={styles.clockDisplay}>{formatTime(elapsed, running)}</span>
            </div>
            <div className={`${styles.clock} ${hitGreen ? styles.clockHit : ''}`}>
              <span className={styles.clockLabel} style={{ color: '#86efac' }}>⬥ Barrera verde</span>
              <span className={styles.clockDisplay}>{timeGreen ? formatTime(timeGreen, false) : '——:——'}</span>
            </div>
            <div className={`${styles.clock} ${hitRed ? styles.clockHit : ''}`}>
              <span className={styles.clockLabel} style={{ color: '#fca5a5' }}>⬥ Barrera roja</span>
              <span className={styles.clockDisplay}>{timeRed ? formatTime(timeRed, false) : '——:——'}</span>
            </div>
          </div>
        </section>
      </div>

      {/* ── Gráficas ─────────────────────────────────────────── */}
      <div className={styles.charts}>
        <div className={styles.chartWrap}>
          <div className={styles.chartLabel}>x-t (posición)</div>
          <canvas ref={chartXRef} className={styles.chart} />
        </div>
        <div className={styles.chartWrap}>
          <div className={styles.chartLabel}>v-t (velocidad)</div>
          <canvas ref={chartVRef} className={styles.chart} />
        </div>
        <div className={styles.chartWrap}>
          <div className={styles.chartLabel}>a-t (aceleración)</div>
          <canvas ref={chartARef} className={styles.chart} />
        </div>
      </div>
    </div>
  )
}

/* ─── Dibujo del auto ────────────────────────────────────────── */
function drawCar(ctx: CanvasRenderingContext2D, cx: number, baseY: number, v: number) {
  const w = 72, h = 28
  const x = cx - w / 2

  // Sombra del auto
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.beginPath()
  ctx.ellipse(cx, baseY + 8, w * 0.42, 6, 0, 0, Math.PI * 2)
  ctx.fill()

  // Carrocería inferior
  ctx.fillStyle = '#d4d4d4'
  ctx.beginPath()
  roundRect(ctx, x, baseY - h, w, h, 6)
  ctx.fill()

  // Cabina
  ctx.fillStyle = '#f5f5f5'
  ctx.beginPath()
  roundRect(ctx, x + 14, baseY - h - 18, w - 26, 20, [4, 4, 0, 0])
  ctx.fill()

  // Ventanas
  ctx.fillStyle = '#1a1a1a'
  ctx.beginPath()
  roundRect(ctx, x + 16, baseY - h - 16, 16, 14, 2)
  ctx.fill()
  ctx.beginPath()
  roundRect(ctx, x + 34, baseY - h - 16, 18, 14, 2)
  ctx.fill()

  // Faro delantero (depende de dirección de v)
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  if (v >= 0) {
    ctx.beginPath()
    ctx.ellipse(x + w - 4, baseY - h + 8, 4, 5, 0, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.beginPath()
    ctx.ellipse(x + 4, baseY - h + 8, 4, 5, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // Ruedas
  drawWheel(ctx, x + 14, baseY + 1, v)
  drawWheel(ctx, x + w - 14, baseY + 1, v)

  // Borde del auto
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'
  ctx.lineWidth = 1
  ctx.beginPath()
  roundRect(ctx, x, baseY - h, w, h, 6)
  ctx.stroke()
}

function drawWheel(ctx: CanvasRenderingContext2D, cx: number, cy: number, v: number) {
  const r = 10
  // Llanta
  ctx.fillStyle = '#222'
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()

  // Aro
  ctx.strokeStyle = '#888'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, cy, r - 2, 0, Math.PI * 2)
  ctx.stroke()

  // Radios animados
  const angle = (Date.now() / 100 * v * 0.1) % (Math.PI * 2)
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'
  ctx.lineWidth = 1.5
  for (let i = 0; i < 4; i++) {
    const a = angle + (i * Math.PI) / 2
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2))
    ctx.stroke()
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  radii: number | number[]
) {
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, radii as number)
  } else {
    const r = Array.isArray(radii) ? radii[0] : radii
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }
}

function drawFlag(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, _icon: string) {
  // Poste
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y - 24)
  ctx.stroke()

  // Banderín
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x, y - 24)
  ctx.lineTo(x + 14, y - 18)
  ctx.lineTo(x, y - 12)
  ctx.closePath()
  ctx.fill()
}
