/**
 * useAnimationLoop.ts
 *
 * Hook para bucles de animación basados en requestAnimationFrame.
 * Maneja start/stop/pause y expone el tiempo transcurrido en segundos.
 *
 * Uso:
 *   const { start, stop, pause, resume, isRunning } = useAnimationLoop(callback)
 */

import { useRef, useCallback, useEffect } from 'react'

export type FrameCallback = (dt: number, elapsed: number) => void

export function useAnimationLoop(callback: FrameCallback) {
  const rafRef       = useRef<number>(0)
  const lastTimeRef  = useRef<number>(0)
  const elapsedRef   = useRef<number>(0)
  const runningRef   = useRef<boolean>(false)
  const callbackRef  = useRef<FrameCallback>(callback)
  const pausedAtRef  = useRef<number>(0)

  // Actualiza la referencia sin re-crear el loop
  useEffect(() => { callbackRef.current = callback }, [callback])

  const loop = useCallback((timestamp: number) => {
    if (!runningRef.current) return

    if (lastTimeRef.current === 0) lastTimeRef.current = timestamp

    const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1) // clamped a 100ms
    lastTimeRef.current = timestamp
    elapsedRef.current += dt

    callbackRef.current(dt, elapsedRef.current)

    rafRef.current = requestAnimationFrame(loop)
  }, [])

  const start = useCallback(() => {
    if (runningRef.current) return
    runningRef.current = true
    lastTimeRef.current = 0
    elapsedRef.current = 0
    rafRef.current = requestAnimationFrame(loop)
  }, [loop])

  const stop = useCallback(() => {
    runningRef.current = false
    cancelAnimationFrame(rafRef.current)
    lastTimeRef.current = 0
    elapsedRef.current = 0
  }, [])

  const pause = useCallback(() => {
    if (!runningRef.current) return
    runningRef.current = false
    cancelAnimationFrame(rafRef.current)
    pausedAtRef.current = elapsedRef.current
  }, [])

  const resume = useCallback(() => {
    if (runningRef.current) return
    runningRef.current = true
    lastTimeRef.current = 0
    // Restaura el elapsed acumulado
    const savedElapsed = pausedAtRef.current
    const resumeTime   = { current: 0 }

    const resumeLoop = (timestamp: number) => {
      if (!runningRef.current) return
      if (resumeTime.current === 0) resumeTime.current = timestamp

      const dt = Math.min((timestamp - (resumeTime.current || timestamp)) / 1000, 0.1)
      resumeTime.current = timestamp
      elapsedRef.current = savedElapsed + (timestamp - (resumeTime.current - dt * 1000)) / 1000

      callbackRef.current(dt, elapsedRef.current)
      rafRef.current = requestAnimationFrame(resumeLoop)
    }

    rafRef.current = requestAnimationFrame(loop)
    runningRef.current = true
  }, [loop])

  const reset = useCallback(() => {
    stop()
    elapsedRef.current = 0
    pausedAtRef.current = 0
  }, [stop])

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return { start, stop, pause, resume, reset, elapsedRef }
}
