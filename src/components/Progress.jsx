import { useState } from 'react'
import { LEVELS, TRACKS } from '../data/questions.js'

const fmtDate = (iso) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const fmtTime = (iso) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

// One series over time. Single series, so no legend: the title names it.
function LineChart({ title, points, domain, unit, band, lowerIsBetter }) {
  const [hover, setHover] = useState(null)
  const W = 320
  const H = 150
  const pad = { l: 34, r: 12, t: 12, b: 24 }
  const iw = W - pad.l - pad.r
  const ih = H - pad.t - pad.b
  const [lo, hi] = domain
  const x = (i) => pad.l + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw)
  const y = (v) => pad.t + ih - ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * ih
  const ticks = [lo, (lo + hi) / 2, hi]
  const valid = points.map((p, i) => ({ ...p, i })).filter((p) => p.v != null)
  const path = valid.map((p, k) => `${k ? 'L' : 'M'}${x(p.i)},${y(p.v)}`).join(' ')
  const last = valid[valid.length - 1]
  const first = valid[0]
  const delta = last && first && valid.length > 1 ? Math.round((last.v - first.v) * 10) / 10 : null
  // With a target band, "better" means the latest value sits inside it.
  const inBand = band && last ? last.v >= band[0] && last.v <= band[1] : null
  const better = band ? inBand : delta == null || delta === 0 ? null : lowerIsBetter ? delta < 0 : delta > 0

  return (
    <figure className="chart">
      <figcaption>
        <span className="chart-title">{title}</span>
        {last && (
          <span className="chart-now">
            <b className="mono">
              {last.v}
              {unit}
            </b>
            {band ? (
              <span className={`tiny mono ${inBand ? 'good' : 'bad'}`}> {inBand ? 'in range' : 'out of range'}</span>
            ) : (
              delta != null &&
              delta !== 0 && (
                <span className={`tiny mono ${better ? 'good' : 'bad'}`}>
                  {' '}
                  {delta > 0 ? '+' : ''}
                  {delta} since first
                </span>
              )
            )}
          </span>
        )}
      </figcaption>
      <div className="chart-plot" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title} across ${points.length} sessions`}>
          {band && <rect className="chart-band" x={pad.l} width={iw} y={y(band[1])} height={y(band[0]) - y(band[1])} />}
          {ticks.map((t) => (
            <g key={t}>
              <line className="chart-grid" x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} />
              <text className="chart-axis" x={pad.l - 6} y={y(t) + 3} textAnchor="end">
                {Math.round(t)}
              </text>
            </g>
          ))}
          {points.length > 1 &&
            [0, points.length - 1].map((i) => (
              <text key={i} className="chart-axis" x={x(i)} y={H - 6} textAnchor={i ? 'end' : 'start'}>
                {fmtDate(points[i].at)}
              </text>
            ))}
          {hover != null && <line className="chart-cross" x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} />}
          {valid.length > 1 && <path className="chart-line" d={path} />}
          {valid.map((p) => (
            <circle key={p.i} className={`chart-dot ${hover === p.i ? 'on' : ''}`} cx={x(p.i)} cy={y(p.v)} r={4} />
          ))}
          {/* hit targets wider than the marks */}
          {points.map((p, i) => (
            <rect
              key={i}
              className="chart-hit"
              x={x(i) - Math.max(8, iw / Math.max(1, points.length - 1) / 2)}
              width={Math.max(16, iw / Math.max(1, points.length - 1))}
              y={pad.t}
              height={ih}
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>
        {hover != null && (
          <div className="chart-tip" style={{ left: `${(x(hover) / W) * 100}%` }}>
            <div className="tiny muted">
              {fmtDate(points[hover].at)}, {fmtTime(points[hover].at)}
            </div>
            <b className="mono">
              {points[hover].v ?? 'n/a'}
              {points[hover].v != null ? unit : ''}
            </b>
          </div>
        )}
      </div>
    </figure>
  )
}

export default function Progress({ history, onStart }) {
  if (!history.length)
    return (
      <div className="progress">
        <header className="about-head">
          <h1>Progress</h1>
          <p className="muted">Finish an interview and it shows up here.</p>
        </header>
        <button className="btn primary" onClick={onStart}>
          Start practicing
        </button>
      </div>
    )

  const last = history[history.length - 1]
  const first = history[0]
  const best = Math.max(...history.map((s) => s.score))
  const label = (list, id) => list.find((x) => x.id === id)?.label || id

  return (
    <div className="progress">
      <header className="about-head">
        <h1>Progress</h1>
      </header>

      <div className="tiles progress-tiles">
        <div className="tile">
          <span className="muted tiny">Sessions</span>
          <b className="mono">{history.length}</b>
        </div>
        <div className="tile">
          <span className="muted tiny">Latest</span>
          <b className="mono">
            {last.score} <small>{last.grade}</small>
          </b>
        </div>
        <div className="tile">
          <span className="muted tiny">Best</span>
          <b className="mono">{best}</b>
        </div>
        <div className="tile">
          <span className="muted tiny">Since first</span>
          <b className={`mono ${last.score >= first.score ? 'good' : 'bad'}`}>
            {last.score - first.score >= 0 ? '+' : ''}
            {last.score - first.score}
          </b>
        </div>
      </div>

      <div className="chart-grid-3">
        <LineChart title="Score" points={history.map((s) => ({ at: s.at, v: s.score }))} domain={[0, 100]} unit="" />
        <LineChart
          title="Filler words per 100 words"
          points={history.map((s) => ({ at: s.at, v: s.fillers }))}
          domain={[0, Math.max(10, Math.ceil(Math.max(...history.map((s) => s.fillers)) / 5) * 5)]}
          unit=""
          lowerIsBetter
        />
        <LineChart
          title="Pace (words per minute)"
          points={history.map((s) => ({ at: s.at, v: s.wpm }))}
          domain={[60, 240]}
          unit=""
          band={[115, 175]}
        />
      </div>

      <table className="history-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Level</th>
            <th>Field</th>
            <th className="num">Questions</th>
            <th className="num">Score</th>
            <th className="num">Fillers / 100</th>
            <th className="num">Pace</th>
          </tr>
        </thead>
        <tbody>
          {[...history].reverse().map((s) => (
            <tr key={s.at}>
              <td>
                {fmtDate(s.at)} <span className="muted tiny">{fmtTime(s.at)}</span>
              </td>
              <td>{label(LEVELS, s.level)}</td>
              <td>{label(TRACKS, s.track)}</td>
              <td className="num mono">
                {s.questions}
                {s.planned ? <span className="muted"> of {s.planned}</span> : null}
              </td>
              <td className="num mono">
                {s.score} <span className="muted">{s.grade}</span>
              </td>
              <td className="num mono">{s.fillers}</td>
              <td className="num mono">{s.wpm ?? 'n/a'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
