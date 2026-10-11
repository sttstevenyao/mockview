const tone = (v) => (v >= 70 ? 'good' : v >= 45 ? 'warn' : 'bad')

function ConfidenceCard({ value, history }) {
  const r = 46
  const c = 2 * Math.PI * r
  const prev = history.length > 4 ? history[history.length - 5] : value
  const delta = Math.round(value - prev)
  const pts = history.map((v, i) => `${(i / Math.max(1, history.length - 1)) * 200},${40 - (v / 100) * 38}`).join(' ')
  return (
    <div className="card">
      <div className="card-label">Confidence Score</div>
      <div className="conf-row">
        <svg viewBox="0 0 110 110" className={`ring ${tone(value)}`}>
          <circle cx="55" cy="55" r={r} className="ring-track" />
          <circle cx="55" cy="55" r={r} className="ring-value" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
          <text x="55" y="62" textAnchor="middle" className="ring-text">
            {value}
          </text>
        </svg>
        <div className="conf-side">
          <div className={`delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}`}>
            {delta > 0 ? '▲' : delta < 0 ? '▼' : '■'} {Math.abs(delta)}
          </div>
          <svg viewBox="0 0 200 42" className="spark" preserveAspectRatio="none">
            {history.length > 1 && <polyline points={pts} />}
          </svg>
          <div className="muted tiny">last 45 seconds</div>
        </div>
      </div>
    </div>
  )
}

const MAX_WPM = 240
const polar = (deg, r = 80) => {
  const a = (deg * Math.PI) / 180
  return [100 + r * Math.cos(a), 100 - r * Math.sin(a)]
}
const arc = (from, to) => {
  const a = 180 - (from / MAX_WPM) * 180
  const b = 180 - (to / MAX_WPM) * 180
  const [x1, y1] = polar(a)
  const [x2, y2] = polar(b)
  return `M ${x1} ${y1} A 80 80 0 0 1 ${x2} ${y2}`
}

function PaceGauge({ wpm }) {
  const v = Math.min(wpm, MAX_WPM)
  const zone = !wpm ? '—' : wpm < 110 ? 'Too slow' : wpm <= 170 ? 'Ideal pace' : 'Too fast'
  const zoneCls = !wpm ? '' : wpm < 110 || wpm > 170 ? 'warn' : 'good'
  return (
    <div className="card">
      <div className="card-label">Speaking Pace</div>
      <svg viewBox="0 0 200 116" className="gauge">
        <path d={arc(0, 110)} className="g-slow" />
        <path d={arc(110, 170)} className="g-ideal" />
        <path d={arc(170, 240)} className="g-fast" />
        <g className="needle" style={{ transform: `rotate(${(v / MAX_WPM) * 180 - 90}deg)` }}>
          <line x1="100" y1="100" x2="100" y2="32" />
        </g>
        <circle cx="100" cy="100" r="6" className="hub" />
      </svg>
      <div className="gauge-read">
        <span className="big mono">{Math.round(wpm) || 0}</span>
        <span className="muted"> WPM</span>
        <span className={`zone ${zoneCls}`}>{zone}</span>
      </div>
    </div>
  )
}

function FillerCard({ count, session, breakdown }) {
  const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1])
  return (
    <div className="card">
      <div className="card-label">
        Filler Words <span className="muted tiny">session total {session}</span>
      </div>
      <div className="filler-count">
        <span key={count} className={`big mono ${count ? 'bump amber' : ''}`}>
          {count}
        </span>
        <span className="muted"> this answer</span>
      </div>
      <div className="chips">
        {entries.length ? (
          entries.map(([k, n]) => (
            <span key={k} className="chip amber">
              “{k}” ×{n}
            </span>
          ))
        ) : (
          <span className="muted tiny">No fillers detected yet</span>
        )}
      </div>
    </div>
  )
}

function VocalCard({ vocal, level, simulated, live }) {
  const sc = vocal?.scores
  const rows = sc
    ? [
        ['Volume', sc.labels.volume, sc.projection],
        ['Pitch', `${sc.labels.pitch} · ${vocal.pitchSt} st`, sc.expressiveness],
        ['Flow', sc.labels.flow, sc.flow],
      ]
    : []
  return (
    <div className="card">
      <div className="card-label">
        Vocal Delivery <span className={`mono ${sc ? tone(sc.score) : 'muted'}`}>{sc ? sc.score : '—'}</span>
      </div>
      <div className="vu">
        <div style={{ width: `${Math.round(level * 100)}%` }} />
      </div>
      {simulated ? (
        <div className="muted tiny">Simulated answer — no mic audio to analyze.</div>
      ) : sc ? (
        rows.map(([k, label, v]) => (
          <div key={k} className="vrow">
            <span className="muted tiny">{k}</span>
            <span className={`tiny ${tone(v)}`}>{label}</span>
          </div>
        ))
      ) : (
        <div className="muted tiny">{live ? 'Listening to your voice…' : 'Analyzes volume, pitch variety and pauses.'}</div>
      )}
    </div>
  )
}

const STAR_KEYS = [
  ['situation', 'S', 'Situation'],
  ['task', 'T', 'Task'],
  ['action', 'A', 'Action'],
  ['result', 'R', 'Result'],
]

export default function LiveSidebar({ metrics, history, stage, coaching }) {
  const live = stage === 'listening'
  return (
    <aside className="sidebar">
      <div className="side-head">
        <span>Live Grading</span>
        <span className={`live-pill ${live ? 'on' : ''}`}>
          <i /> {live ? 'LIVE' : 'STANDBY'}
        </span>
      </div>
      <ConfidenceCard value={metrics.confidence} history={history} />
      <PaceGauge wpm={metrics.wpm} />
      <FillerCard count={metrics.fillers} session={metrics.sessionFillers} breakdown={metrics.fillerBreakdown} />
      <VocalCard vocal={metrics.vocal} level={metrics.level || 0} simulated={metrics.simulated} live={live} />
      <div className="card mini-grid">
        <div>
          <div className="mono big-sm">{metrics.words}</div>
          <div className="muted tiny">words</div>
        </div>
        <div>
          <div className={`mono big-sm ${metrics.hedges ? 'amber' : ''}`}>{metrics.hedges}</div>
          <div className="muted tiny">hedges</div>
        </div>
        <div>
          <div className={`mono big-sm ${metrics.flags ? 'red' : ''}`}>{metrics.flags}</div>
          <div className="muted tiny">red flags</div>
        </div>
      </div>
      <div className="card">
        <div className="card-label">STAR Structure</div>
        <div className="star-row">
          {STAR_KEYS.map(([k, letter, label]) => (
            <div key={k} className={`star ${metrics.star[k] ? 'hit' : ''}`} title={label}>
              <b>{letter}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
      {coaching && (
        <div className="coach">
          <span className="coach-label">Live coach</span>
          <p key={metrics.tip} className="fade-in">
            {metrics.tip}
          </p>
        </div>
      )}
    </aside>
  )
}
