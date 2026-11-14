import { useEffect, useRef, useState } from 'react'

export function viewport() {
  if (typeof window === 'undefined') return { phone: false, portrait: false, width: 0, height: 0, standalone: false }
  const ua = navigator.userAgent || ''
  const touch = navigator.maxTouchPoints > 0 || window.matchMedia?.('(any-pointer: coarse)').matches
  const phone = !!(navigator.userAgentData?.mobile || /Android|iPhone|iPod|iPad|Mobile/i.test(ua) ||
    (touch && (Math.min(window.screen?.width || innerWidth, window.screen?.height || innerHeight) <= 1100 || /Macintosh/i.test(ua))))
  const vv = window.visualViewport
  return { phone, portrait: innerHeight > innerWidth,
    width: Math.round(vv?.width || innerWidth), height: Math.round(vv?.height || innerHeight),
    left: vv?.offsetLeft || 0, top: vv?.offsetTop || 0,
    standalone: !!navigator.standalone || !!window.matchMedia?.('(display-mode: standalone)').matches }
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
    window.visualViewport?.addEventListener('resize', measure)
    window.visualViewport?.addEventListener('scroll', measure)
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)
    document.addEventListener('fullscreenchange', fs)
    document.addEventListener('visibilitychange', visibility)
    measure()
    return () => {
      mounted.current = false
      window.visualViewport?.removeEventListener('resize', measure)
      window.visualViewport?.removeEventListener('scroll', measure)
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

  useEffect(() => {
    if (!view.phone) return
    const bodyOverflow=document.body.style.overflow
    const rootOverflow=document.documentElement.style.overflow
    document.body.style.overflow='hidden'
    document.documentElement.style.overflow='hidden'
    return () => {document.body.style.overflow=bodyOverflow; document.documentElement.style.overflow=rootOverflow}
  }, [view.phone])

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
    setFallback(!full && !viewport().standalone)
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
