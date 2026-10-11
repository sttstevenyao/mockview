import { useEffect, useState } from 'react'
import { grade } from '../lib/analysis.js'

const reducedMotion = () =>
  document.documentElement.dataset.motion === 'reduce'
const ease = (x) => 1 - Math.pow(1 - x, 3)

// Counts from 0 up to `target` once, after `delay` ms.
function useCountUp(target, duration = 1200, delay = 0) {
  const [v, setV] = useState(() => (reducedMotion() ? target : 0))
  useEffect(() => {
    if (target == null || reducedMotion()) return setV(target)
    let raf
    const start = performance.now() + delay
    const step = (now) => {
      const p = Math.min(1, Math.max(0, (now - start) / duration))
      setV(target * ease(p))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target])
  return v
}

// A circle that fills from 0 to `value` (out of `max`) as the number counts up.
function Ring({ value, max = 100, label, sub, delay = 0, decimals = 0 }) {
  const n = useCountUp(value ?? 0, 1300, delay)
  const R = 36
  const C = 2 * Math.PI * R
  const share = value == null ? 0 : Math.min(1, n / max)
  return (
    <figure className="ring">
      <svg viewBox="0 0 88 88" role="img" aria-label={`${label}: ${value ?? 'no data yet'}`}>
        <circle className="ring-track" cx="44" cy="44" r={R} />
        <circle
          className="ring-fill"
          cx="44"
          cy="44"
          r={R}
          strokeDasharray={C}
          strokeDashoffset={C * (1 - share)}
          transform="rotate(-90 44 44)"
        />
      </svg>
      <div className="ring-num">
        <b className="mono">{value == null ? '–' : n.toFixed(decimals)}</b>
        {sub && <small className="muted">{sub}</small>}
      </div>
      <figcaption className="muted tiny">{label}</figcaption>
    </figure>
  )
}

function Count({ value, label, delay = 0, decimals = 0 }) {
  const n = useCountUp(value ?? 0, 1100, delay)
  return (
    <div className="count">
      <b className="mono">{value == null ? '–' : n.toFixed(decimals)}</b>
      <span className="muted tiny">{label}</span>
    </div>
  )
}

// Your numbers, under the headline. Remounts with the tab, so the rings fill each time you open it.
export default function UserStats({ history = [], onProgress }) {
  const has = history.length > 0
  const last = history[history.length - 1]
  const scores = history.map((s) => s.score)
  const best = has ? Math.max(...scores) : null
  const avg = has ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
  const star = [...history].reverse().find((s) => s.star != null)?.star ?? null

  return (
    <section className="user-stats" aria-label="Your practice">
      <div className="rings">
        <Ring value={last?.score ?? null} label="Latest score" sub={last ? grade(last.score) : null} />
        <Ring value={best} label="Best score" delay={120} />
        <Ring value={avg} label="Average score" delay={240} />
        <Ring value={star} label="STAR coverage" sub={star != null ? '%' : null} delay={360} />
      </div>
      <div className="counts">
        <Count value={history.length} label={history.length === 1 ? 'session' : 'sessions'} delay={200} />
        <Count value={last?.fillers ?? null} label="fillers per 100 words" decimals={1} delay={300} />
        <Count value={last?.wpm ?? null} label="words per minute" delay={400} />
        {has ? (
          <button className="link tiny" onClick={onProgress}>
            See progress
          </button>
        ) : (
          <span className="muted tiny">Finish an interview to fill these in.</span>
        )}
      </div>
    </section>
  )
}
