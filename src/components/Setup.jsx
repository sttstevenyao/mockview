import { useEffect, useState } from 'react'
import Brand from './Brand.jsx'
import { LEVELS, PERSONAS, TRACKS, VOICES } from '../data/questions.js'
import ResumePanel from './ResumePanel.jsx'
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
  const [voiceStatus, setVoiceStatus] = useState(null) // result of the last Preview
  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }))
  // Each persona carries its own mannerisms (pace, reactions, follow-ups, interruptions).
  const choosePersona = (id) => setCfg((c) => ({ ...c, persona: id, mannerisms: { ...PERSONAS[id].mannerisms } }))
  const m = cfg.mannerisms
  const voiceOpts = { voiceId: cfg.voiceId, quality: cfg.voiceQuality, speed: m.speed, expressiveness: m.expressiveness }

  useEffect(() => {
    checkTtsHealth().then(setHealth)
  }, [])

  const preview = async () => {
    initAudio()
    setPreviewing(true)
    await speak(PERSONAS[cfg.persona].preview, voiceOpts, (provider, error) => setVoiceStatus({ provider, error }))
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
              <span>Job field</span>
              <div className="seg tracks">
                {TRACKS.map((t) => (
                  <button key={t.id} className={cfg.track === t.id ? 'on' : ''} onClick={() => set('track', t.id)}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="two-col">
              <label className="field">
                <span>Target role (optional)</span>
                <input
                  value={cfg.role}
                  maxLength={60}
                  onChange={(e) => set('role', e.target.value)}
                  placeholder="e.g. Data Analyst Intern at Google"
                />
              </label>
              <div className="field">
                <span>Experience level</span>
                <div className="seg three">
                  {LEVELS.map((l) => (
                    <button key={l.id} className={cfg.level === l.id ? 'on' : ''} onClick={() => set('level', l.id)}>
                      {l.label}
                    </button>
                  ))}
                </div>
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
              {voiceStatus?.provider === 'elevenlabs' && <span className="tiny good">✓ Playing through ElevenLabs</span>}
              {voiceStatus?.provider === 'browser' && (
                <span className="tiny warn">⚠ ElevenLabs error: {voiceStatus.error}. Using the browser voice instead.</span>
              )}
            </div>
          </section>

          <ResumePanel resume={cfg.resume} useResume={cfg.useResume} onChange={(patch) => setCfg((c) => ({ ...c, ...patch }))} />
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

          <button
            className="btn primary big-btn"
            onClick={() =>
              onStart({
                ...cfg,
                name: cfg.name.trim() || 'Candidate',
                resumeQuestions: cfg.useResume && cfg.resume ? cfg.resume.questions : [],
              })
            }
          >
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
