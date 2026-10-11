// Live feedback while you answer. Only things you can act on mid-sentence:
// a coaching tip, STAR progress, pace, and filler words. The detailed numbers
// (confidence, hedges, vocal analysis) wait for the report.

const STAR_KEYS = [
  ['situation', 'Situation', 'Where and when'],
  ['task', 'Task', 'What was at stake'],
  ['action', 'Action', 'What you did'],
  ['result', 'Result', 'How it ended'],
]

const SLOW = 115 // same ideal range as the report
const FAST = 175
const MAX_WPM = 220

function Pace({ wpm }) {
  const zone = !wpm ? null : wpm < SLOW ? 'Too slow' : wpm <= FAST ? 'Good pace' : 'Too fast'
  const cls = !wpm ? 'muted' : wpm < SLOW || wpm > FAST ? 'warn' : 'good'
  const pct = (v) => `${(Math.min(v, MAX_WPM) / MAX_WPM) * 100}%`
  return (
    <div className="card">
      <div className="card-label">
        Pace <span className={`tiny ${cls}`}>{zone || 'Waiting for you to speak'}</span>
      </div>
      <div className="pace-bar">
        <div className="pace-ideal" style={{ left: pct(SLOW), width: `calc(${pct(FAST)} - ${pct(SLOW)})` }} />
        {wpm > 0 && <div className={`pace-mark ${cls}`} style={{ left: pct(wpm) }} />}
      </div>
      <div className="pace-scale muted tiny mono">
        <span>slow</span>
        <span>{wpm ? `${Math.round(wpm)} words/min` : ''}</span>
        <span>fast</span>
      </div>
    </div>
  )
}

function Fillers({ count, breakdown }) {
  const top = Object.entries(breakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
  return (
    <div className="card">
      <div className="card-label">
        Filler words
        <span key={count} className={`mono filler-n ${count ? 'bump amber' : 'muted'}`}>
          {count}
        </span>
      </div>
      <div className="chips">
        {top.length ? (
          top.map(([k, n]) => (
            <span key={k} className="chip amber">
              “{k}” ×{n}
            </span>
          ))
        ) : (
          <span className="muted tiny">None yet. Pausing is better than “um”.</span>
        )}
      </div>
    </div>
  )
}

// children: the conversation log, which fills the rest of the column.
export default function LiveSidebar({ metrics, stage, coaching, children }) {
  const live = stage === 'listening'
  return (
    <aside className="sidebar">
      <div className="side-head">
        <span>Live feedback</span>
        <span className={`live-pill ${live ? 'on' : ''}`}>
          <i /> {live ? 'LIVE' : 'STANDBY'}
        </span>
      </div>

      {coaching && (
        <div className="coach">
          <span className="coach-label">Tip</span>
          <p key={metrics.tip} className="fade-in">
            {metrics.tip}
          </p>
        </div>
      )}

      <div className="card">
        <div className="card-label">
          Answer structure <span className="muted tiny">STAR</span>
        </div>
        <ul className="star-list">
          {STAR_KEYS.map(([k, label, hint]) => (
            <li key={k} className={metrics.star[k] ? 'hit' : ''}>
              <span className="star-box">{metrics.star[k] ? '✓' : ''}</span>
              <span>{label}</span>
              <span className="muted tiny">{hint}</span>
            </li>
          ))}
        </ul>
      </div>

      <Pace wpm={metrics.wpm} />
      <Fillers count={metrics.fillers} breakdown={metrics.fillerBreakdown} />
      {children}
    </aside>
  )
}
