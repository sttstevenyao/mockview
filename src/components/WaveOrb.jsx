import { useEffect, useRef } from 'react'

// A ring of dotted sound-wave columns wrapped in 3D. It drifts on its own and turns
// further as you scroll (or wheel, when the page doesn't scroll). Transparent canvas.
const COLS = 96
const DOTS = 15

export default function WaveOrb({ className = '' }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const g = canvas.getContext('2d')
    const reduced =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduce'
    let raf = 0
    let spin = 0 // extra rotation from scrolling, eased toward its target
    let spinTarget = 0
    let lastScroll = window.scrollY

    const onScroll = () => {
      spinTarget += (window.scrollY - lastScroll) * 0.006
      lastScroll = window.scrollY
    }
    const onWheel = (e) => {
      spinTarget += e.deltaY * 0.0025
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('wheel', onWheel, { passive: true })

    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const { width, height } = canvas.getBoundingClientRect()
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      return { width, height }
    }
    let box = size()
    const ro = new ResizeObserver(() => (box = size()))
    ro.observe(canvas)

    const draw = (time) => {
      const t = reduced ? 1.2 : time / 1000
      spin += (spinTarget - spin) * 0.08
      const rot = t * 0.22 + spin
      const { width: w, height: h } = box
      g.clearRect(0, 0, w, h)
      const css = getComputedStyle(document.documentElement)
      const ink = css.getPropertyValue('--text').trim() || '#1f2328'
      const accent = css.getPropertyValue('--accent').trim() || '#0969da'
      const cx = w / 2
      const cy = h / 2
      const R = Math.min(w * 0.42, h * 1.05)
      const colH = h * 0.36
      const f = R * 3.2 // camera distance for perspective

      for (let i = 0; i < COLS; i++) {
        const th = (i / COLS) * Math.PI * 2
        const a = th + rot
        const x3 = Math.sin(a) * R
        const z3 = Math.cos(a) * R
        const scale = f / (f - z3)
        const depth = (z3 / R + 1) / 2 // 0 back, 1 front
        // wave height for this column: a few travelling sines, like an audio envelope
        const env = 0.55 * Math.sin(th * 3 + t * 1.6) + 0.3 * Math.sin(th * 7 - t * 2.3) + 0.15 * Math.sin(th * 13 + t * 3.1)
        const amp = 0.25 + 0.75 * Math.abs(Math.sin(th * 2 + t * 0.7))
        const centre = env * 0.55
        const x = cx + x3 * scale
        for (let j = 0; j < DOTS; j++) {
          const v = (j / (DOTS - 1)) * 2 - 1 // -1..1 along the column
          const y = cy + (v * amp + centre * 0.4) * colH * scale
          const near = 1 - Math.min(1, Math.abs(v - centre) / (0.55 + amp * 0.4))
          const alpha = (0.08 + 0.85 * near * near) * (0.25 + 0.75 * depth)
          if (alpha < 0.04) continue
          const r = (0.8 + 1.6 * near) * scale * (0.6 + 0.4 * depth)
          g.globalAlpha = alpha
          g.fillStyle = near > 0.75 && depth > 0.55 ? accent : ink
          g.beginPath()
          g.arc(x, y, r, 0, Math.PI * 2)
          g.fill()
        }
      }
      g.globalAlpha = 1
      if (!reduced) raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('wheel', onWheel)
    }
  }, [])

  return <canvas ref={ref} className={`wave-orb ${className}`} aria-hidden="true" />
}
