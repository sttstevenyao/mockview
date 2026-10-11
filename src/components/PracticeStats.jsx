import { useState } from 'react'
import { BASIC_QUESTIONS, PERSONAS, QUESTIONS, TRACKS } from '../data/questions.js'
import { LANG_IDS } from '../data/i18n.js'

// Score trend for the last few sessions. One series, so no legend; hover shows each point.
function Trend({ scores }) {
  const [hover, setHover] = useState(null)
  const W = 160
  const H = 44
  const pad = 5
  const x = (i) => pad + (scores.length === 1 ? (W - pad * 2) / 2 : (i / (scores.length - 1)) * (W - pad * 2))
  const y = (v) => pad + (1 - v / 100) * (H - pad * 2)
  const d = scores.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ')
  return (
    <div className="trend" onMouseLeave={() => setHover(null)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Scores for your last ${scores.length} sessions: ${scores.join(', ')}`}
      >
        {scores.length > 1 && <path className="trend-line" d={d} />}
        {scores.map((v, i) => (
          <circle
            key={i}
            className={`trend-dot ${hover === i || (hover == null && i === scores.length - 1) ? 'on' : ''}`}
            cx={x(i)}
            cy={y(v)}
            r={3}
          />
        ))}
        {scores.map((v, i) => (
          <rect
            key={`h${i}`}
            className="chart-hit"
            x={x(i) - W / Math.max(1, scores.length) / 2}
            width={W / Math.max(1, scores.length)}
            y={0}
            height={H}
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>
      {hover != null && (
        <span className="trend-tip mono tiny" style={{ left: `${(x(hover) / W) * 100}%` }}>
          {scores[hover]}
        </span>
      )}
    </div>
  )
}

// A row of numbers under the setup: your recent practice, or what's here if you haven't started.
export default function PracticeStats({ history = [], onProgress }) {
  if (!history.length) {
    const stats = [
      [QUESTIONS.length + BASIC_QUESTIONS.length, 'questions'],
      [TRACKS.length, 'fields'],
      [LANG_IDS.length, 'languages'],
      [Object.keys(PERSONAS).length, 'interviewers'],
    ]
    return (
      <section className="practice-stats intro-stats" aria-label="What's included">
        {stats.map(([n, label]) => (
          <div key={label} className="pstat">
            <b className="mono">{n}</b>
            <span className="muted tiny">{label}</span>
          </div>
        ))}
      </section>
    )
  }

  const last = history[history.length - 1]
  const best = Math.max(...history.map((s) => s.score))
  const recent = history.slice(-10).map((s) => s.score)
  return (
    <section className="practice-stats" aria-label="Your practice">
      <div className="pstat">
        <b className="mono">{history.length}</b>
        <span className="muted tiny">{history.length === 1 ? 'session' : 'sessions'}</span>
      </div>
      <div className="pstat pstat-trend">
        <div>
          <b className="mono">
            {last.score} <small className="muted">{last.grade}</small>
          </b>
          <span className="muted tiny">latest score</span>
        </div>
        <Trend scores={recent} />
      </div>
      <div className="pstat">
        <b className="mono">{best}</b>
        <span className="muted tiny">best score</span>
      </div>
      <div className="pstat">
        <b className="mono">{last.fillers}</b>
        <span className="muted tiny">fillers per 100 words</span>
      </div>
      <div className="pstat">
        <b className="mono">{last.wpm ?? 'n/a'}</b>
        <span className="muted tiny">words per minute</span>
      </div>
      <button className="link tiny pstat-link" onClick={onProgress}>
        See progress
      </button>
    </section>
  )
}
