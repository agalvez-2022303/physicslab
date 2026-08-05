import { useEffect, useRef } from 'react'
import styles from './HeroCanvas.module.css'

/**
 * HeroCanvas — escena animada en canvas 2D (sin WebGL, máx rendimiento en móviles)
 *
 * Muestra 3 objetos físicos animados:
 *  1. Péndulo simple con movimiento oscilatorio correcto
 *  2. Trayectoria parabólica de un proyectil con partícula
 *  3. Vectores de fuerza rotando suavemente
 *
 * Reacciona al movimiento del mouse con un efecto parallax sutil.
 */
export default function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef  = useRef({ x: 0, y: 0 })
  const rafRef    = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let W = 0, H = 0

    function resize() {
      if (!canvas || !ctx) return
      W = canvas.offsetWidth
      H = canvas.offsetHeight
      canvas.width  = W * dpr
      canvas.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener('resize', resize)

    // Mouse / touch parallax
    function onMouseMove(e: MouseEvent) {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth  - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      }
    }
    function onTouchMove(e: TouchEvent) {
      if (e.touches[0]) {
        mouseRef.current = {
          x: (e.touches[0].clientX / window.innerWidth  - 0.5) * 2,
          y: (e.touches[0].clientY / window.innerHeight - 0.5) * 2,
        }
      }
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('touchmove', onTouchMove, { passive: true })

    let t = 0
    const FPS_TARGET = 1000 / 60
    let lastFrame = 0

    function draw(timestamp: number) {
      rafRef.current = requestAnimationFrame(draw)

      // Limitar a ~60fps para ahorrar batería en móvil
      if (timestamp - lastFrame < FPS_TARGET * 0.8) return
      lastFrame = timestamp

      if (!ctx) return
      ctx.clearRect(0, 0, W, H)
      t += 0.016

      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      // ── FONDO: partículas/nodos conectados (campo vectorial) ──────────
      drawFieldLines(ctx, W, H, t, mx, my)

      // ── 1. PÉNDULO ────────────────────────────────────────────────────
      drawPendulum(ctx, W, H, t, mx, my)

      // ── 2. PROYECTIL / PARÁBOLA ───────────────────────────────────────
      drawProjectile(ctx, W, H, t, mx, my)

      // ── 3. VECTORES DE FUERZA ─────────────────────────────────────────
      drawForceVectors(ctx, W, H, t, mx, my)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
}

/* ─── Helpers de dibujo ─────────────────────────────────────────────────── */

function drawFieldLines(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  t: number, mx: number, my: number
) {
  // Líneas de cuadrícula animadas muy sutiles — fondo de "campo de física"
  const spacing = 60
  ctx.strokeStyle = 'rgba(255,255,255,0.03)'
  ctx.lineWidth = 1
  for (let x = 0; x < W + spacing; x += spacing) {
    for (let y = 0; y < H + spacing; y += spacing) {
      const angle = Math.sin(x * 0.01 + t * 0.3) * 0.5 + Math.cos(y * 0.01 + t * 0.2) * 0.5
      const len = 20
      const cx = x + mx * 8
      const cy = y + my * 8
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len)
      ctx.stroke()
    }
  }
}

function drawPendulum(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  t: number, mx: number, my: number
) {
  // Péndulo en el tercio izquierdo
  const pivotX = W * 0.22 + mx * 6
  const pivotY = H * 0.15 + my * 3
  const L = Math.min(H * 0.28, 140)
  const angle = Math.sin(t * 1.8) * 0.55 // amplitud ≈31°, periodo ~3.5s

  const bobX = pivotX + Math.sin(angle) * L
  const bobY = pivotY + Math.cos(angle) * L

  // Soporte pivote
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(pivotX - 30, pivotY)
  ctx.lineTo(pivotX + 30, pivotY)
  ctx.stroke()

  // Marca pivot
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.beginPath()
  ctx.arc(pivotX, pivotY, 4, 0, Math.PI * 2)
  ctx.fill()

  // Cuerda con tensión visual (línea recta)
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(pivotX, pivotY)
  ctx.lineTo(bobX, bobY)
  ctx.stroke()

  // Trayectoria del bob (arco fantasma)
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(pivotX, pivotY, L, Math.PI * 0.5 - 0.6, Math.PI * 0.5 + 0.6)
  ctx.stroke()

  // Bob — esfera con gradiente radial simulado
  const bobR = 16
  const grd = ctx.createRadialGradient(bobX - bobR * 0.3, bobY - bobR * 0.3, 2, bobX, bobY, bobR)
  grd.addColorStop(0, 'rgba(255,255,255,0.9)')
  grd.addColorStop(0.5, 'rgba(200,200,200,0.7)')
  grd.addColorStop(1, 'rgba(80,80,80,0.8)')
  ctx.fillStyle = grd
  ctx.beginPath()
  ctx.arc(bobX, bobY, bobR, 0, Math.PI * 2)
  ctx.fill()

  // Sombra del bob (proyección en "suelo")
  const shadowY = pivotY + L + 20
  const shadowScale = 0.4 + 0.6 * Math.cos(angle)
  ctx.fillStyle = 'rgba(255,255,255,0.04)'
  ctx.beginPath()
  ctx.ellipse(bobX, shadowY, bobR * shadowScale, 4, 0, 0, Math.PI * 2)
  ctx.fill()

  // Label
  ctx.font = '10px IBM Plex Mono, monospace'
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.textAlign = 'center'
  ctx.fillText('Péndulo', pivotX, pivotY - 14)
}

function drawProjectile(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  t: number, mx: number, my: number
) {
  // Proyectil en la parte inferior central
  const originX = W * 0.35 + mx * 4
  const originY = H * 0.72 + my * 2
  const maxH = H * 0.22
  const range = W * 0.3

  // Dibuja la parábola de trayectoria
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.lineWidth = 1.5
  ctx.setLineDash([4, 6])
  ctx.beginPath()
  for (let i = 0; i <= 100; i++) {
    const tau = i / 100
    const px = originX + tau * range
    const py = originY - 4 * maxH * tau * (1 - tau)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.stroke()
  ctx.setLineDash([])

  // Partícula animada recorriendo la parábola
  const loopT = (t * 0.55) % 1
  const px = originX + loopT * range
  const py = originY - 4 * maxH * loopT * (1 - loopT)

  // Estela
  for (let i = 1; i <= 8; i++) {
    const trailT = Math.max(0, loopT - i * 0.02)
    const trailX = originX + trailT * range
    const trailY = originY - 4 * maxH * trailT * (1 - trailT)
    ctx.fillStyle = `rgba(255,255,255,${0.12 - i * 0.014})`
    ctx.beginPath()
    ctx.arc(trailX, trailY, 5 - i * 0.5, 0, Math.PI * 2)
    ctx.fill()
  }

  // Proyectil — esferoide metálico
  const pr = 10
  const grd2 = ctx.createRadialGradient(px - 3, py - 3, 1, px, py, pr)
  grd2.addColorStop(0, 'rgba(255,255,255,0.95)')
  grd2.addColorStop(0.6, 'rgba(160,160,160,0.85)')
  grd2.addColorStop(1, 'rgba(40,40,40,0.9)')
  ctx.fillStyle = grd2
  ctx.beginPath()
  ctx.arc(px, py, pr, 0, Math.PI * 2)
  ctx.fill()

  // Vectores velocidad sobre el proyectil
  const vx = range / 100 * 60
  const vy = (-4 * maxH * (1 - 2 * loopT)) / 100 * 60

  drawArrow(ctx, px, py, px + vx * 0.18, py + vy * 0.18, 'rgba(255,255,255,0.6)', 1.5)

  // Label
  ctx.font = '10px IBM Plex Mono, monospace'
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.textAlign = 'center'
  ctx.fillText('Proyectil', originX + range / 2, originY + 20)
}

function drawForceVectors(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  t: number, mx: number, my: number
) {
  // Tres vectores convergiendo en un punto — equilibrio de fuerzas
  const cx = W * 0.75 + mx * 6
  const cy = H * 0.4  + my * 4
  const len = Math.min(W * 0.1, 70)

  const angles = [
    t * 0.25 + Math.PI * 0.5,
    t * 0.25 + Math.PI * (0.5 + 2/3),
    t * 0.25 + Math.PI * (0.5 + 4/3),
  ]

  angles.forEach((angle, i) => {
    const brightness = 0.5 + 0.2 * Math.sin(t * 2 + i * Math.PI / 1.5)
    const color = `rgba(255,255,255,${brightness})`
    const ex = cx + Math.cos(angle) * len
    const ey = cy + Math.sin(angle) * len
    drawArrow(ctx, cx, cy, ex, ey, color, 2)

    // Etiqueta de magnitud
    const labelX = cx + Math.cos(angle) * (len + 16)
    const labelY = cy + Math.sin(angle) * (len + 16)
    ctx.font = '9px IBM Plex Mono, monospace'
    ctx.fillStyle = `rgba(255,255,255,${brightness * 0.6})`
    ctx.textAlign = 'center'
    ctx.fillText(`F${i+1}`, labelX, labelY)
  })

  // Nudo central
  const grd3 = ctx.createRadialGradient(cx, cy, 1, cx, cy, 8)
  grd3.addColorStop(0, 'rgba(255,255,255,0.95)')
  grd3.addColorStop(1, 'rgba(150,150,150,0.5)')
  ctx.fillStyle = grd3
  ctx.beginPath()
  ctx.arc(cx, cy, 8, 0, Math.PI * 2)
  ctx.fill()

  // Label
  ctx.font = '10px IBM Plex Mono, monospace'
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.textAlign = 'center'
  ctx.fillText('Equilibrio', cx, cy + len + 28)
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  color: string,
  lineWidth = 2
) {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const headLen = 9

  ctx.strokeStyle = color
  ctx.fillStyle   = color
  ctx.lineWidth   = lineWidth

  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()

  // Cabeza de flecha
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(
    x2 - headLen * Math.cos(angle - Math.PI / 6),
    y2 - headLen * Math.sin(angle - Math.PI / 6)
  )
  ctx.lineTo(
    x2 - headLen * Math.cos(angle + Math.PI / 6),
    y2 - headLen * Math.sin(angle + Math.PI / 6)
  )
  ctx.closePath()
  ctx.fill()
}
