import { useEffect, useState } from 'react'
import Brand from './Brand.jsx'
import { ACK_STYLES, INTERRUPT_OPTIONS, PERSONAS, TRACKS, VOICES } from '../data/questions.js'
import { initAudio } from '../lib/audio.js'
import { checkTtsHealth, speak } from '../lib/tts.js'
import { speechSupported } from '../lib/transcriber.js'

const MODES = [
  { id: 'count', title: 'Fixed questions', desc: 'A set number of questions, then your report.' },
  { id: 'timed', title: 'Timed session', desc: 'Answer until the clock runs out.' },
  { id: 'endless', title: 'Endless mode', desc: 'Questions keep coming until you stop.' },
]

function Check({ ok, warn, label, detail }) {
  const cls = ok ? 'good' : warn ? 'warn' : 'bad'
  return (
    <li className="check">
      <span className={`dot ${cls}`} />
      <span>{label}</span>
      <span className={`muted tiny ${cls}`}>{detail}</span>
    </li>
  )
}

export default function Setup({ initial, onStart, onSample }) {
  const [cfg, setCfg] = useState(initial)
  const [health, setHealth] = useState(null)
  const [previewing, setPreviewing] = useState(false)
  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }))
  const setM = (k, v) => setCfg((c) => ({ ...c, mannerisms: { ...c.mannerisms, [k]: v } }))
  // Picking a persona loads its mannerism preset; every knob stays editable.
  const choosePersona = (id) => setCfg((c) => ({ ...c, persona: id, mannerisms: { ...PERSONAS[id].mannerisms } }))
  const m = cfg.mannerisms
  const voiceOpts = { voiceId: cfg.voiceId, quality: cfg.voiceQuality, speed: m.speed, expressiveness: m.expressiveness }

  useEffect(() => {
    checkTtsHealth().then(setHealth)
  }, [])

  const preview = async () => {
    initAudio()
    setPreviewing(true)
    await speak(PERSONAS[cfg.persona].preview, voiceOpts)
    setPreviewing(false)
  }

  const summary =
    cfg.mode === 'count'
      ? `${cfg.count} question${cfg.count > 1 ? 's' : ''}`
      : cfg.mode === 'timed'
        ? `${cfg.minutes} minutes`
        : 'Endless'

  return (
    <div className="setup">
      <nav className="topnav">
        <Brand />
        <span className="muted tiny mono">behavioral interview simulator</span>
      </nav>

      <header className="hero">
        <div className="eyebrow mono">● voice interviewer · live grading · instant feedback</div>
        <h1>
          Practice the interview <span className="grad">before it counts.</span>
        </h1>
        <p className="muted">
          A realistic AI-voiced interviewer asks the questions. MockView grades your delivery live — filler words, pace,
          confidence, STAR structure — then shows you exactly how to say it better.
        </p>
      </header>

      <div className="setup-grid">
        <div className="col">
          <section className="panel">
            <h2 className="panel-title">
              <span className="step">01</span> Interview
            </h2>

            <label className="field">
              <span>Your name</span>
              <input value={cfg.name} maxLength={40} onChange={(e) => set('name', e.target.value)} placeholder="Candidate" />
            </label>

            <div className="field">
              <span>Focus area</span>
              <div className="seg">
                {TRACKS.map((t) => (
                  <button key={t.id} className={cfg.track === t.id ? 'on' : ''} onClick={() => set('track', t.id)}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <span>Interviewer persona</span>
              <div className="persona-grid">
                {Object.values(PERSONAS).map((p) => (
                  <button
                    key={p.id}
                    className={`persona ${cfg.persona === p.id ? 'on' : ''}`}
                    onClick={() => choosePersona(p.id)}
                  >
                    <b>{p.name}</b>
                    <span className="mono tiny">{p.title}</span>
                    <span className="muted tiny">{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="panel">
            <h2 className="panel-title">
              <span className="step">02</span> Voice &amp; mannerisms
            </h2>
            <div className="field">
              <span>Interviewer voice · ElevenLabs</span>
              <div className="row">
                <select value={cfg.voiceId} onChange={(e) => set('voiceId', e.target.value)}>
                  {VOICES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
                <button className="btn ghost" onClick={preview} disabled={previewing}>
                  {previewing ? '♪ Playing…' : '▶ Preview'}
                </button>
              </div>
            </div>

            <div className="field">
              <span>Voice engine</span>
              <div className="seg">
                <button className={cfg.voiceQuality === 'high' ? 'on' : ''} onClick={() => set('voiceQuality', 'high')}>
                  Realistic <span className="muted tiny mono">multilingual v2</span>
                </button>
                <button className={cfg.voiceQuality === 'fast' ? 'on' : ''} onClick={() => set('voiceQuality', 'fast')}>
                  Low latency <span className="muted tiny mono">flash v2.5</span>
                </button>
              </div>
            </div>

            <div className="two-col">
              <label className="field">
                <span>
                  Speaking pace <b className="mono accent">{m.speed.toFixed(2)}×</b>
                </span>
                <input
                  type="range"
                  min="0.8"
                  max="1.15"
                  step="0.01"
                  value={m.speed}
                  onChange={(e) => setM('speed', +e.target.value)}
                />
                <span className="range-ends muted tiny">
                  <i>measured</i>
                  <i>brisk</i>
                </span>
              </label>
              <label className="field">
                <span>
                  Expressiveness <b className="mono accent">{Math.round(m.expressiveness * 100)}%</b>
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={m.expressiveness}
                  onChange={(e) => setM('expressiveness', +e.target.value)}
                />
                <span className="range-ends muted tiny">
                  <i>flat, stoic</i>
                  <i>animated</i>
                </span>
              </label>
            </div>

            <div className="field">
              <span>Reaction after your answers</span>
              <div className="seg four">
                {Object.entries(ACK_STYLES).map(([id, a]) => (
                  <button key={id} className={m.acks === id ? 'on' : ''} onClick={() => setM('acks', id)}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <span>Interrupts long answers</span>
              <div className="seg four">
                {INTERRUPT_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    className={m.interruptSec === o.value ? 'on' : ''}
                    onClick={() => setM('interruptSec', o.value)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="toggle">
              <input type="checkbox" checked={m.backchannel} onChange={(e) => setM('backchannel', e.target.checked)} />
              <span className="switch" />
              <span>
                Natural backchannel <span className="muted tiny">(“Mm-hmm.”, “Okay, so…”)</span>
              </span>
            </label>
            <label className="toggle">
              <input type="checkbox" checked={m.followUps} onChange={(e) => setM('followUps', e.target.checked)} />
              <span className="switch" />
              <span>
                Follow-up probing <span className="muted tiny">(asks for numbers &amp; specifics when you’re vague)</span>
              </span>
            </label>
          </section>
        </div>
        <section className="panel sticky">
          <h2 className="panel-title">
            <span className="step">03</span> Session format
          </h2>

          <div className="mode-grid">
            {MODES.map((m) => (
              <button key={m.id} className={`mode ${cfg.mode === m.id ? 'on' : ''}`} onClick={() => set('mode', m.id)}>
                <b>{m.title}</b>
                <span className="muted tiny">{m.desc}</span>
              </button>
            ))}
          </div>

          {cfg.mode === 'count' && (
            <label className="field">
              <span>
                Number of questions <b className="mono accent">{cfg.count}</b>
              </span>
              <input type="range" min="1" max="10" value={cfg.count} onChange={(e) => set('count', +e.target.value)} />
            </label>
          )}
          {cfg.mode === 'timed' && (
            <label className="field">
              <span>
                Target duration <b className="mono accent">{cfg.minutes} min</b>
              </span>
              <input type="range" min="2" max="30" value={cfg.minutes} onChange={(e) => set('minutes', +e.target.value)} />
            </label>
          )}
          {cfg.mode === 'endless' && (
            <p className="muted tiny endless-note">
              Questions cycle without repeating back-to-back. Press End Interview whenever you’re done.
            </p>
          )}

          <label className="toggle">
            <input type="checkbox" checked={cfg.coaching} onChange={(e) => set('coaching', e.target.checked)} />
            <span className="switch" />
            <span>Live coaching tips during answers</span>
          </label>

          <ul className="checks">
            <Check
              ok={speechSupported}
              label="Speech recognition"
              detail={speechSupported ? 'ready' : 'use Chrome or Edge (or Simulate answer)'}
            />
            <Check
              ok={health?.configured}
              warn={!health || health.reachable}
              label="ElevenLabs voice"
              detail={
                !health
                  ? 'checking…'
                  : health.configured
                    ? 'connected'
                    : health.reachable
                      ? 'no API key — browser voice fallback'
                      : 'API unreachable — browser voice fallback'
              }
            />
          </ul>

          <button className="btn primary big-btn" onClick={() => onStart({ ...cfg, name: cfg.name.trim() || 'Candidate' })}>
            Start interview <span className="mono tiny">· {summary}</span>
          </button>
          <button className="link" onClick={onSample}>
            or view a sample feedback report →
          </button>
        </section>
      </div>
      <footer className="foot muted tiny mono">Built at HackRU Fall 2026 · Voice by ElevenLabs</footer>
    </div>
  )
}
