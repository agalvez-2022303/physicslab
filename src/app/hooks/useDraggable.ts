/**
 * useDraggable.ts
 *
 * Hook para elementos arrastrables en canvas o DOM.
 * Soporta tanto mouse como touch.
 *
 * Uso:
 *   const { pos, bind } = useDraggable({ x: 100, y: 200 }, { bounds })
 */

import { useRef, useState, useCallback, useEffect } from 'react'

export interface Point { x: number; y: number }
export interface Bounds { minX?: number; maxX?: number; minY?: number; maxY?: number }

export interface UseDraggableOptions {
  bounds?: Bounds
  onDragStart?: (pos: Point) => void
  onDrag?: (pos: Point, delta: Point) => void
  onDragEnd?: (pos: Point) => void
}

export function useDraggable(initial: Point, options: UseDraggableOptions = {}) {
  const [pos, setPos] = useState<Point>(initial)
  const draggingRef = useRef(false)
  const lastRef     = useRef<Point>({ x: 0, y: 0 })

  const clamp = useCallback(
    (p: Point): Point => {
      const b = options.bounds || {}
      return {
        x: Math.min(b.maxX ?? Infinity, Math.max(b.minX ?? -Infinity, p.x)),
        y: Math.min(b.maxY ?? Infinity, Math.max(b.minY ?? -Infinity, p.y)),
      }
    },
    [options.bounds]
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent | PointerEvent) => {
      draggingRef.current = true
      lastRef.current = { x: e.clientX, y: e.clientY }
      ;(e.target as HTMLElement).setPointerCapture?.((e as PointerEvent).pointerId)
      options.onDragStart?.(pos)
    },
    [pos, options]
  )

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!draggingRef.current) return
      const delta = {
        x: e.clientX - lastRef.current.x,
        y: e.clientY - lastRef.current.y,
      }
      lastRef.current = { x: e.clientX, y: e.clientY }
      setPos(prev => {
        const next = clamp({ x: prev.x + delta.x, y: prev.y + delta.y })
        options.onDrag?.(next, delta)
        return next
      })
    },
    [clamp, options]
  )

  const onPointerUp = useCallback(() => {
    draggingRef.current = false
    options.onDragEnd?.(pos)
  }, [pos, options])

  useEffect(() => {
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [onPointerMove, onPointerUp])

  const setPosition = useCallback(
    (p: Point) => setPos(clamp(p)),
    [clamp]
  )

  return {
    pos,
    setPosition,
    isDragging: draggingRef,
    bind: { onPointerDown },
  }
}

/**
 * useDraggableCanvas — versión para coordenadas de canvas con offset
 */
export function useDraggableCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  initial: Point,
  options: UseDraggableOptions & { radius?: number } = {}
) {
  const [pos, setPos] = useState<Point>(initial)
  const draggingRef = useRef(false)

  const getCanvasPos = useCallback(
    (clientX: number, clientY: number): Point => {
      const canvas = canvasRef.current
      if (!canvas) return { x: clientX, y: clientY }
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      }
    },
    [canvasRef]
  )

  const hitTest = useCallback(
    (clientX: number, clientY: number): boolean => {
      const canvasPos = getCanvasPos(clientX, clientY)
      const r = options.radius ?? 16
      const dx = canvasPos.x - pos.x
      const dy = canvasPos.y - pos.y
      return dx * dx + dy * dy <= r * r
    },
    [getCanvasPos, pos, options.radius]
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!hitTest(e.clientX, e.clientY)) return
      draggingRef.current = true
      e.currentTarget.setPointerCapture(e.pointerId)
      options.onDragStart?.(pos)
    },
    [hitTest, pos, options]
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!draggingRef.current) return
      const newPos = getCanvasPos(e.clientX, e.clientY)
      const b = options.bounds || {}
      const clamped = {
        x: Math.min(b.maxX ?? Infinity, Math.max(b.minX ?? -Infinity, newPos.x)),
        y: Math.min(b.maxY ?? Infinity, Math.max(b.minY ?? -Infinity, newPos.y)),
      }
      setPos(clamped)
      options.onDrag?.(clamped, { x: 0, y: 0 })
    },
    [getCanvasPos, options]
  )

  const onPointerUp = useCallback(() => {
    draggingRef.current = false
    options.onDragEnd?.(pos)
  }, [pos, options])

  const setPosition = useCallback((p: Point) => setPos(p), [])

  return {
    pos,
    setPosition,
    isDragging: draggingRef,
    canvasBindings: { onPointerDown, onPointerMove, onPointerUp },
  }
}
