import { useEffect, useMemo, useRef, useState } from 'react'
import Brand from './Brand.jsx'
import Visualizer from './Visualizer.jsx'
import { analyzeSession, diffWords } from '../lib/analysis.js'
import { speak, stopSpeaking } from '../lib/tts.js'
import { vocalNotes } from '../lib/voiceAnalysis.js'

const tone = (v) => (v >= 70 ? 'good' : v >= 50 ? 'warn' : 'bad')
const KIND = { flag: 'Red flag', filler: 'Filler', hedge: 'Hedge' }
const fmtDur = (s) => `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, '0')}s`

function ScoreRing({ value, grade }) {
  const r = 52
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 124 124" className={`ring lg ${tone(value)}`}>
      <circle cx="62" cy="62" r={r} className="ring-track" />
      <circle cx="62" cy="62" r={r} className="ring-value" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
      <text x="62" y="62" textAnchor="middle" className="ring-text">
        {grade}
      </text>
      <text x="62" y="84" textAnchor="middle" className="ring-sub">
        {value}/100
      </text>
    </svg>
  )
}

function VocalReport({ vocal }) {
  const sc = vocal?.scores
  if (!sc)
    return (
      <div className="vocal-report">
        <h3>How you sounded</h3>
        <p className="muted tiny">
          No microphone audio for this answer (simulated, or mic blocked), so there’s no vocal analysis.
        </p>
      </div>
    )
  const bars = [
    ['Projection', sc.projection, `${sc.labels.volume} · ${vocal.meanDb} dBFS`],
    ['Expressiveness', sc.expressiveness, `${sc.labels.pitch} · ±${vocal.pitchSt} semitones around ${vocal.pitchHz} Hz`],
    ['Steadiness', sc.steadiness, `volume swing ±${vocal.dbStd} dB`],
    ['Flow', sc.flow, `${Math.round(vocal.talkRatio * 100)}% talk time · ${vocal.longPauses} long pauses`],
  ]
  return (
    <div className="vocal-report">
      <div className="right-head">
        <h3>How you sounded</h3>
        <span className={`mono ${tone(sc.score)}`}>{sc.score}/100</span>
      </div>
      {bars.map(([k, v, d]) => (
        <div key={k} className="vbar">
          <div className="vbar-top">
            <span>{k}</span>
            <span className="muted tiny mono">{d}</span>
          </div>
          <div className="track">
            <div className={`fill ${tone(v)}`} style={{ width: `${v}%` }} />
          </div>
        </div>
      ))}
      <ul className="changes">
        {vocalNotes(vocal, sc).map((n) => (
          <li key={n}>→ {n}</li>
        ))}
      </ul>
    </div>
  )
}

function EmptyState({ onSample, onSetup }) {
  return (
    <div className="feedback">
      <header className="fb-top">
        <Brand />
      </header>
      <div className="panel empty">
        <h2>We didn’t capture any answers</h2>
        <p className="muted">
          Speech recognition needs Chrome or Edge and microphone permission. You can also use <b>Simulate answer</b> during the
          interview, or open a sample report.
        </p>
        <div className="row center">
          <button className="btn primary" onClick={onSample}>
            View sample report
          </button>
          <button className="btn ghost" onClick={onSetup}>
            Back to setup
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Feedback({ result, config, onRestart, onSetup, onSample }) {
  const report = useMemo(() => analyzeSession(result.answers), [result])
  const [active, setActive] = useState(report.weakestIndex)
  const [pop, setPop] = useState(null)
  const [playing, setPlaying] = useState(null)
  const [voiceSrc, setVoiceSrc] = useState(null)
  const bodyRef = useRef(null)

  useEffect(() => {
    setActive(report.weakestIndex)
    setPop(null)
  }, [report])
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && setPop(null)
    window.addEventListener('keydown', k)
    return () => {
      window.removeEventListener('keydown', k)
      stopSpeaking()
    }
  }, [])

  const o = report.overall
  if (!report.answers.length || o.words < 3) return <EmptyState onSample={onSample} onSetup={onSetup} />

  const a = report.answers[active]
  const diff = a.rewrite ? diffWords(a.weakest.text, a.rewrite.text) : null
  const m = a.metrics

  const openPill = (seg, e) => {
    e.stopPropagation()
    const el = e.currentTarget
    const maxX = Math.max(0, bodyRef.current.clientWidth - 320)
    setPop({ seg, x: Math.min(el.offsetLeft, maxX), y: el.offsetTop + el.offsetHeight + 10 })
  }

  const play = async (which) => {
    if (playing) {
      stopSpeaking()
      if (playing === which) return setPlaying(null)
    }
    setPlaying(which)
    const text = which === 'ideal' ? a.rewrite.text : a.weakest.text
    await speak(
      text,
      {
        voiceId: config.voiceId,
        quality: 'high',
        speed: which === 'ideal' ? 0.98 : 1.05,
        expressiveness: which === 'ideal' ? 0.6 : 0.2,
      },
      (p) => setVoiceSrc(p),
    )
    setPlaying((p) => (p === which ? null : p))
  }

  const selectQ = (i) => {
    stopSpeaking()
    setPlaying(null)
    setPop(null)
    setActive(i)
  }

  return (
    <div className="feedback">
      <header className="fb-top">
        <Brand />
        <div className="muted tiny mono hide-sm">
          INTERVIEW REPORT · {new Date().toLocaleDateString()} · {fmtDur(result.totalSec)}
          {result.reason === 'sample' && ' · SAMPLE DATA'}
        </div>
        <div className="row">
          <button className="btn ghost" onClick={onSetup}>
            New setup
          </button>
          <button className="btn primary" onClick={onRestart}>
            ↻ Practice again
          </button>
        </div>
      </header>

      <section className="fb-summary panel">
        <ScoreRing value={o.score} grade={o.grade} />
        <div className="tiles">
          <div className="tile">
            <span className="muted tiny">Questions</span>
            <b className="mono">{report.answers.length}</b>
          </div>
          <div className="tile">
            <span className="muted tiny">Avg pace</span>
            <b className="mono">
              {o.avgWpm}
              <small> wpm</small>
            </b>
          </div>
          <div className="tile">
            <span className="muted tiny">Filler words</span>
            <b className="mono amber">{o.fillers}</b>
          </div>
          <div className="tile">
            <span className="muted tiny">Red flags</span>
            <b className={`mono ${o.flags ? 'red' : 'good'}`}>{o.flags}</b>
          </div>
          <div className="tile">
            <span className="muted tiny">Vocal delivery</span>
            <b className={`mono ${o.vocal == null ? 'muted' : tone(o.vocal)}`}>{o.vocal ?? '—'}</b>
          </div>
          <div className="tile">
            <span className="muted tiny">STAR coverage</span>
            <b className="mono">{o.starCoverage}%</b>
          </div>
        </div>
        <div className="notes">
          <div>
            <div className="notes-h good">Strengths</div>
            <ul>
              {report.strengths.length ? (
                report.strengths.map((s) => <li key={s}>{s}</li>)
              ) : (
                <li className="muted">Keep practicing — strengths will show up here.</li>
              )}
            </ul>
          </div>
          <div>
            <div className="notes-h warn">Focus next</div>
            <ul>
              {report.focus.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="fb-split">
        <section className="panel fb-left">
          <div className="qtabs">
            {report.answers.map((x, i) => (
              <button key={i} className={`qtab ${i === active ? 'on' : ''}`} onClick={() => selectQ(i)}>
                {x.question?.followUp
                  ? '↳ follow-up'
                  : `Q${report.answers.slice(0, i + 1).filter((y) => !y.question?.followUp).length}`}{' '}
                <span className={`dot ${tone(x.confidence)}`} />
                {i === report.weakestIndex && <span className="tiny muted"> weakest</span>}
              </button>
            ))}
          </div>
          <h3 className="fb-q">{a.question?.text}</h3>
          <div className="legend tiny">
            <span>
              <i className="lg-flag" /> Red flag
            </span>
            <span>
              <i className="lg-filler" /> Filler
            </span>
            <span>
              <i className="lg-hedge" /> Hedge
            </span>
            <span className="muted">Click a highlight to hear what the interviewer was thinking.</span>
          </div>

          <div className="fb-transcript" ref={bodyRef} onClick={() => setPop(null)}>
            {a.text ? (
              a.segments.map((seg, i) =>
                seg.type === 'text' ? (
                  <span key={i}>{seg.text}</span>
                ) : (
                  <button
                    key={seg.key}
                    className={`pill pill-${seg.type} ${pop?.seg.key === seg.key ? 'sel' : ''}`}
                    onClick={(e) => openPill(seg, e)}
                  >
                    {seg.text}
                  </button>
                ),
              )
            ) : (
              <span className="muted">No answer captured for this question.</span>
            )}
            {pop && (
              <div className="monologue" style={{ left: pop.x, top: pop.y }} onClick={(e) => e.stopPropagation()}>
                <div className="mono-head">
                  <span className={`tag tag-${pop.seg.type}`}>
                    {KIND[pop.seg.type]} · {pop.seg.label}
                  </span>
                  <button className="x" onClick={() => setPop(null)} aria-label="Close">
                    ×
                  </button>
                </div>
                <div className="mono tiny muted">// interviewer’s inner monologue</div>
                <p className="mono-text">{pop.seg.mono}</p>
                <div className="mono-fix">
                  <b>Try instead:</b> {pop.seg.fix}
                </div>
              </div>
            )}
          </div>

          <div className="answer-stats">
            <span className={`chip ${tone(a.confidence)}`}>Confidence {a.confidence}</span>
            <span className="chip">{Math.round(m.wpm)} wpm</span>
            <span className="chip amber">{m.fillers} fillers</span>
            <span className="chip">{m.hedges} hedges</span>
            <span className={`chip ${m.flags ? 'red' : ''}`}>{m.flags} red flags</span>
            {['situation', 'task', 'action', 'result'].map((k) => (
              <span key={k} className={`chip star-chip ${m.star[k] ? 'good' : 'off'}`}>
                {m.star[k] ? '✓' : '○'} {k[0].toUpperCase()}
              </span>
            ))}
          </div>
        </section>

        <section className="panel fb-right">
          <div className="right-head">
            <h3>Rewrite your weakest sentence</h3>
            {diff && (
              <span className="mono tiny">
                <span className="red">−{diff.removed}</span> <span className="good">+{diff.added}</span>
              </span>
            )}
          </div>

          {!a.weakest ? (
            <p className="muted">Nothing to rewrite for this answer.</p>
          ) : !a.rewrite ? (
            <p className="muted">Your weakest sentence here is already clean and quantified. Nice work.</p>
          ) : (
            <>
              <div className="diff">
                <div className="diff-file mono tiny">
                  <span>answer_q{active + 1}.txt</span>
                  <span className="muted">suggested change</span>
                </div>
                <div className="diff-line del">
                  <span className="ln mono">1</span>
                  <span className="sign mono">−</span>
                  <span className="code">
                    {diff.left.map((w, i) => (
                      <span key={i} className={w.removed ? 'x-del' : ''}>
                        {w.text}{' '}
                      </span>
                    ))}
                  </span>
                </div>
                <div className="diff-line add">
                  <span className="ln mono">1</span>
                  <span className="sign mono">+</span>
                  <span className="code">
                    {diff.right.map((w, i) => (
                      <span key={i} className={w.added ? 'x-add' : ''}>
                        {w.text}{' '}
                      </span>
                    ))}
                  </span>
                </div>
              </div>

              <ul className="changes">
                {a.rewrite.changes.map((c) => (
                  <li key={c}>
                    <span className="good">✓</span> {c}
                  </li>
                ))}
              </ul>

              <div className="playback">
                <button className={`btn primary ${playing === 'ideal' ? 'active' : ''}`} onClick={() => play('ideal')}>
                  {playing === 'ideal' ? '■ Stop' : '▶ Hear Ideal Delivery'}
                </button>
                <button className={`btn ghost ${playing === 'original' ? 'active' : ''}`} onClick={() => play('original')}>
                  {playing === 'original' ? '■ Stop' : '▶ Hear original'}
                </button>
              </div>
              <div className={`viz-wrap small ${playing ? 'voice' : 'idle'}`}>
                <Visualizer mode={playing ? 'voice' : 'idle'} synthetic={!!playing} height={70} bars={44} />
              </div>
              <p className="muted tiny mono">
                {voiceSrc === 'browser'
                  ? 'Playing with browser voice (ElevenLabs unavailable).'
                  : 'Ideal delivery voiced by ElevenLabs eleven_multilingual_v2 · rewrite by MockView’s local rules engine.'}
              </p>
            </>
          )}
          <VocalReport vocal={a.vocal} />
        </section>
      </div>
    </div>
  )
}
