import { useEffect, useState } from 'react'
import { LEVELS, PERSONAS, TRACKS, VOICES } from '../data/questions.js'
import ResumePanel from './ResumePanel.jsx'
import { initAudio } from '../lib/audio.js'
import { checkTtsHealth, speak } from '../lib/tts.js'
import { defaultEngine, ENGINE_LABEL } from '../lib/transcriber.js'
import PrepStrip from './PrepStrip.jsx'

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

// How the selected interviewer behaves, from its mannerisms.
const traits = (m) => [
  { warm: 'Warm reactions', neutral: 'Neutral reactions', curt: 'Curt reactions', none: 'No reactions' }[m.acks],
  m.backchannel ? 'Says “mm-hmm”' : 'No small talk',
  m.followUps ? 'Asks follow-ups' : 'No follow-ups',
  m.interruptSec ? `Interrupts after ${m.interruptSec}s` : 'Never interrupts',
]

export default function Setup({ cfg, setCfg, user, onEdit, onStart, onSample, onSettings }) {
  const [health, setHealth] = useState(null)
  const [previewing, setPreviewing] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState(null) // result of the last Preview
  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }))
  // Each persona carries its own mannerisms (pace, reactions, follow-ups, interruptions).
  const choosePersona = (id) => setCfg((c) => ({ ...c, persona: id, mannerisms: { ...PERSONAS[id].mannerisms } }))
  const m = cfg.mannerisms
  const voiceOpts = {
    voiceId: cfg.voiceId,
    quality: cfg.settings.voiceQuality,
    speed: Math.min(1.2, Math.max(0.7, m.speed * cfg.settings.voiceSpeed)),
    expressiveness: m.expressiveness,
  }

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

  const level = LEVELS.find((l) => l.id === cfg.level)?.label
  const track = TRACKS.find((t) => t.id === cfg.track)?.label
  const facts = [
    ['Name', cfg.name || 'Candidate'],
    ['Experience', level],
    ['Field', track],
    ['Role', cfg.role?.trim() || 'Not specified'],
    ['Length', summary],
  ]

  return (
    <>
      <header className="hero">
        <h1>
          {user
            ? `Welcome, ${cfg.name && cfg.name !== 'Candidate' ? cfg.name : user.username}.`
            : 'Practice the interview before it counts.'}
        </h1>
      </header>

      <div className="setup-grid">
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Your interview</h2>
          </div>
          <dl className="facts">
            {facts.map(([k, v]) => (
              <div key={k}>
                <dt className="muted tiny">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
            {/* Fills the grid's last slot, under Field */}
            <div className="facts-action">
              <button className="btn ghost sm" onClick={onEdit}>
                Change answers
              </button>
            </div>
          </dl>
        </section>

        <ResumePanel resume={cfg.resume} useResume={cfg.useResume} onChange={(patch) => setCfg((c) => ({ ...c, ...patch }))} />

        <section className="panel">
          <h2 className="panel-title">Interviewer</h2>
          <div className="persona-row" role="radiogroup" aria-label="Interviewer persona">
            {Object.values(PERSONAS).map((p) => (
              <button
                key={p.id}
                role="radio"
                aria-checked={cfg.persona === p.id}
                className={`persona ${cfg.persona === p.id ? 'on' : ''}`}
                onClick={() => choosePersona(p.id)}
              >
                <b>{p.name}</b>
                <span className="mono tiny">{p.title}</span>
              </button>
            ))}
          </div>
          <ul className="persona-traits">
            {traits(cfg.mannerisms).map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>

          <div className="row voice-row">
            <select value={cfg.voiceId} onChange={(e) => set('voiceId', e.target.value)} aria-label="Interviewer voice">
              {VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
            <button className="btn ghost" onClick={preview} disabled={previewing}>
              {previewing ? 'Playing…' : 'Preview voice'}
            </button>
          </div>
          {voiceStatus?.provider === 'elevenlabs' && <span className="tiny good">Playing through ElevenLabs</span>}
          {voiceStatus?.provider === 'browser' && (
            <span className="tiny warn">ElevenLabs error: {voiceStatus.error}. Using the browser voice instead.</span>
          )}
        </section>

        <section className="panel start-panel">
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
            or view a sample feedback report
          </button>

          <ul className="checks">
            <Check
              ok={defaultEngine === 'webspeech'}
              warn={defaultEngine === 'scribe'}
              label="Voice input"
              detail={defaultEngine === 'none' ? 'not supported, type your answers instead' : ENGINE_LABEL[defaultEngine]}
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
                      ? 'no API key, using the browser voice'
                      : 'unreachable, using the browser voice'
              }
            />
          </ul>
        </section>
      </div>

      <PrepStrip voiceOpts={voiceOpts} />
    </>
  )
}
