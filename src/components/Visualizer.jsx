import { useEffect, useRef } from 'react'
import { getAnalysers } from '../lib/audio.js'

const PALETTES = {
  voice: ['#58a6ff', '#79c0ff', '#58a6ff'],
  mic: ['#3fb950', '#56d364', '#3fb950'],
  idle: ['#30363d', '#3d444d', '#30363d'],
}

// mode: 'voice' (interviewer speaking), 'mic' (candidate speaking), 'idle'.
// synthetic: animate even without analyser data (browser-voice fallback).
export default function Visualizer({ mode = 'idle', synthetic = false, height = 150, bars = 56 }) {
  const ref = useRef(null)
  const live = useRef({ mode, synthetic })
  live.current = { mode, synthetic }

  useEffect(() => {
    const canvas = ref.current
    const g = canvas.getContext('2d')
    const buf = new Uint8Array(128)
    const levels = new Float32Array(bars)
    let raf

    const draw = (t) => {
      const dpr = window.devicePixelRatio || 1
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, w, h)

      const { mode, synthetic } = live.current
      const { voice, mic } = getAnalysers()
      const an = mode === 'voice' ? voice : mode === 'mic' ? mic : null
      let hasSignal = false
      if (an) {
        an.getByteFrequencyData(buf)
        for (let i = 0; i < 64; i++)
          if (buf[i] > 10) {
            hasSignal = true
            break
          }
      }

      const half = bars / 2
      for (let i = 0; i < bars; i++) {
        const d = Math.abs(i - half + 0.5) / half // 0 at center → 1 at edges
        let target
        if (hasSignal) target = (buf[Math.floor(d * 56) + 2] / 255) * (1.1 - d * 0.35)
        else if (synthetic && mode !== 'idle')
          target =
            (0.38 + 0.32 * Math.sin(t / 110 + i * 0.55) * Math.sin(t / 290 + i * 0.13) + Math.random() * 0.18) * (1 - d * 0.6)
        else target = 0.05 + 0.035 * Math.sin(t / 650 + i * 0.32)
        levels[i] += (target - levels[i]) * 0.22
      }

      const pal = PALETTES[hasSignal || synthetic ? mode : 'idle'] || PALETTES.idle
      const grad = g.createLinearGradient(0, 0, w, 0)
      grad.addColorStop(0, pal[0])
      grad.addColorStop(0.5, pal[1])
      grad.addColorStop(1, pal[2])
      g.fillStyle = grad
      g.shadowColor = pal[1]
      g.shadowBlur = 0

      const gap = 3
      const bw = Math.max(2, (w - gap * (bars - 1)) / bars)
      for (let i = 0; i < bars; i++) {
        const bh = Math.max(4, Math.min(1, levels[i]) * h * 0.92)
        const x = i * (bw + gap)
        const y = (h - bh) / 2
        g.beginPath()
        if (g.roundRect) g.roundRect(x, y, bw, bh, bw / 2)
        else g.rect(x, y, bw, bh)
        g.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [bars])

  return <canvas ref={ref} className="viz" style={{ height }} aria-hidden="true" />
}
