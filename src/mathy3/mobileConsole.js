import { useEffect, useRef, useState } from 'react'

function viewport() {
  if (typeof window === 'undefined') return { phone: false, portrait: false }
  const coarse = window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0
  const shortSide = Math.min(window.screen?.width || innerWidth, window.screen?.height || innerHeight)
  return { phone: !!coarse && shortSide <= 950, portrait: innerHeight > innerWidth }
}

export function useMobileConsole(pause) {
  const [view, setView] = useState(viewport)
  const [ready, setReady] = useState(false)
  const [fallback, setFallback] = useState(false)
  const pauseRef = useRef(pause)
  const rootRef = useRef(null)
  const wasFullscreen = useRef(false)
  const wake = useRef(null)
  const mounted = useRef(false)
  pauseRef.current = pause
  const blocked = view.phone && (view.portrait || !ready)

  useEffect(() => {
    mounted.current = true
    const measure = () => {
      const next = viewport()
      if (next.phone && next.portrait) pauseRef.current()
      setView(next)
    }
    const fs = () => {
      const active = !!document.fullscreenElement
      if (wasFullscreen.current && !active && viewport().phone) {
        setReady(false)
        pauseRef.current()
      }
      wasFullscreen.current = active
      measure()
    }
    const visibility = () => {
      if (document.hidden) {
        pauseRef.current()
        wake.current?.release?.().catch(() => {})
        wake.current = null
      }
    }
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)
    document.addEventListener('fullscreenchange', fs)
    document.addEventListener('visibilitychange', visibility)
    measure()
    return () => {
      mounted.current = false
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
      document.removeEventListener('fullscreenchange', fs)
      document.removeEventListener('visibilitychange', visibility)
      wake.current?.release?.().catch(() => {})
      // El bloqueo de orientación solo corresponde a esta experiencia.
      try { window.screen.orientation?.unlock?.() } catch {}
      if (document.fullscreenElement === rootRef.current) document.exitFullscreen?.().catch(() => {})
    }
  }, [])

  async function enter(element) {
    rootRef.current = element
    let full = !!document.fullscreenElement
    // Se invoca desde un toque; el navegador exige este gesto del usuario.
    try {
      if (!full && element?.requestFullscreen) {
        await element.requestFullscreen({ navigationUI: 'hide' })
        full = !!document.fullscreenElement
      }
    } catch {}
    try { if (full) await window.screen.orientation?.lock?.('landscape') } catch {}
    if (!mounted.current) return
    setFallback(!full)
    setReady(true)
    setView(viewport())
    try {
      if (!document.hidden && navigator.wakeLock?.request) {
        wake.current?.release?.().catch(() => {})
        wake.current = null
        const sentinel = await navigator.wakeLock.request('screen')
        if (mounted.current) wake.current = sentinel
        else await sentinel.release()
      }
    } catch {}
  }
  return { ...view, blocked, ready, fallback, enter }
}
