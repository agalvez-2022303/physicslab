/**
 * useLiveChart.ts
 *
 * Hook que mantiene un buffer circular de datos para gráficas
 * en tiempo real. Se dibuja sobre un canvas 2D directamente
 * (sin dependencias externas) para minimizar el bundle.
 */

import { useRef, useCallback } from 'react'

export interface ChartPoint { t: number; value: number }

export interface ChartConfig {
  label: string
  unitX: string
  unitY: string
  color?: string        // por defecto blanco
  maxPoints?: number    // default 300
  yMin?: number
  yMax?: number
  autoScale?: boolean
}

export function useLiveChart(config: ChartConfig) {
  const dataRef    = useRef<ChartPoint[]>([])
  const maxPoints  = config.maxPoints ?? 300

  const push = useCallback((t: number, value: number) => {
    dataRef.current.push({ t, value })
    if (dataRef.current.length > maxPoints) {
      dataRef.current.shift()
    }
  }, [maxPoints])

  const reset = useCallback(() => {
    dataRef.current = []
  }, [])

  /**
   * Dibuja la gráfica en el canvas dado.
   * Llamar en cada frame del animation loop.
   */
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const data = dataRef.current
      const lineColor = config.color ?? '#ffffff'
      const padding = { top: 20, right: 12, bottom: 28, left: 44 }
      const chartW = w - padding.left - padding.right
      const chartH = h - padding.top - padding.bottom

      // Fondo
      ctx.fillStyle = 'rgba(0,0,0,0)'
      ctx.clearRect(0, 0, w, h)

      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 1
      const gridLines = 4
      for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + (i / gridLines) * chartH
        ctx.beginPath()
        ctx.moveTo(padding.left, y)
        ctx.lineTo(padding.left + chartW, y)
        ctx.stroke()
      }

      // Ejes
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(padding.left, padding.top)
      ctx.lineTo(padding.left, padding.top + chartH)
      ctx.lineTo(padding.left + chartW, padding.top + chartH)
      ctx.stroke()

      // Labels de ejes
      ctx.font = '10px IBM Plex Mono, monospace'
      ctx.fillStyle = 'rgba(255,255,255,0.45)'
      ctx.textAlign = 'right'

      if (data.length < 2) return

      // Escala
      const tMin = data[0].t
      const tMax = data[data.length - 1].t
      const values = data.map(d => d.value)
      let yMin = config.autoScale !== false ? Math.min(...values) : config.yMin ?? 0
      let yMax = config.autoScale !== false ? Math.max(...values) : config.yMax ?? 10
      if (yMin === yMax) { yMin -= 1; yMax += 1 }

      // Tick labels Y
      for (let i = 0; i <= gridLines; i++) {
        const v = yMax - (i / gridLines) * (yMax - yMin)
        const y = padding.top + (i / gridLines) * chartH
        ctx.fillText(v.toFixed(1), padding.left - 4, y + 3)
      }

      // Etiqueta Y
      ctx.save()
      ctx.translate(10, padding.top + chartH / 2)
      ctx.rotate(-Math.PI / 2)
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.font = '9px IBM Plex Mono, monospace'
      ctx.fillText(`${config.label} (${config.unitY})`, 0, 0)
      ctx.restore()

      // Etiqueta X
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.font = '9px IBM Plex Mono, monospace'
      ctx.fillText(`t (${config.unitX})`, padding.left + chartW / 2, h - 4)

      // Línea de datos
      ctx.strokeStyle = lineColor
      ctx.lineWidth = 1.5
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.beginPath()

      data.forEach((point, i) => {
        const px = padding.left + ((point.t - tMin) / (tMax - tMin || 1)) * chartW
        const py = padding.top + chartH - ((point.value - yMin) / (yMax - yMin)) * chartH

        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      })

      ctx.stroke()

      // Punto actual (último)
      const last = data[data.length - 1]
      const lx = padding.left + ((last.t - tMin) / (tMax - tMin || 1)) * chartW
      const ly = padding.top + chartH - ((last.value - yMin) / (yMax - yMin)) * chartH
      ctx.fillStyle = lineColor
      ctx.beginPath()
      ctx.arc(lx, ly, 3, 0, Math.PI * 2)
      ctx.fill()
    },
    [config]
  )

  return { push, reset, draw, dataRef }
}
