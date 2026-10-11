import { useEffect, useRef, useState } from 'react'
import { LEVELS, TRACKS } from '../data/questions.js'

export const MODES = [
  { id: 'count', title: 'Fixed questions', desc: 'A set number of questions, then your report.' },
  { id: 'timed', title: 'Timed session', desc: 'Answer until the clock runs out.' },
  { id: 'endless', title: 'Endless mode', desc: 'Questions keep coming until you stop.' },
]

const LEVEL_HINT = {
  intern: 'Applying for internships. Class, club, and project examples are fine.',
  newgrad: 'Graduating soon or recently graduated.',
  experienced: 'You have professional experience to draw on.',
}

const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())

// Pop-up questions shown when the page opens. Answers become the interview setup;
// the last step offers to save them as a profile on this device.
export default function Onboarding({ initial, profile, onDone, onClose }) {
  const [step, setStep] = useState(0)
  const [a, setA] = useState({
    name: initial.name === 'Candidate' ? '' : initial.name,
    level: initial.level,
    track: initial.track,
    role: initial.role,
    mode: initial.mode,
    count: initial.count,
    minutes: initial.minutes,
  })
  const [email, setEmail] = useState(profile?.email || '')
  const [touched, setTouched] = useState(false)
  const firstInput = useRef(null)
  const set = (k, v) => setA((x) => ({ ...x, [k]: v }))
  const steps = profile ? 4 : 5 // signed-in users skip the "create a profile" step

  useEffect(() => {
    firstInput.current?.focus()
  }, [step])

  const answers = () => ({ ...a, name: a.name.trim() || 'Candidate' })
  const next = () => (step + 1 < steps ? setStep(step + 1) : onDone(answers(), null))
  const back = () => setStep(Math.max(0, step - 1))
  const createProfile = (e) => {
    e.preventDefault()
    setTouched(true)
    if (!a.name.trim() || !emailOk(email)) return
    onDone(answers(), { name: a.name.trim(), email: email.trim() })
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="ob-title">
      <div className="dialog onboarding">
        <div className="ob-top">
          <span className="mono tiny muted">
            STEP {step + 1} / {steps}
          </span>
          {onClose && (
            <button className="link tiny" onClick={onClose}>
              Skip for now
            </button>
          )}
        </div>
        <div className="ob-progress">
          <i style={{ width: `${((step + 1) / steps) * 100}%` }} />
        </div>

        {step === 0 && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              next()
            }}
          >
            <h2 id="ob-title">What should the interviewer call you?</h2>
            <p className="muted">Your first name is fine. The interviewer greets you with it.</p>
            <input
              ref={firstInput}
              className="ob-input"
              value={a.name}
              maxLength={40}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Your name"
            />
            <div className="ob-actions">
              <span />
              <button className="btn primary">Continue</button>
            </div>
          </form>
        )}

        {step === 1 && (
          <div>
            <h2 id="ob-title">What is your experience level?</h2>
            <p className="muted">This changes what the interviewer expects from your examples.</p>
            <div className="ob-options">
              {LEVELS.map((l, i) => (
                <button
                  key={l.id}
                  ref={i === 0 ? firstInput : null}
                  className={`ob-option ${a.level === l.id ? 'on' : ''}`}
                  onClick={() => {
                    set('level', l.id)
                    next()
                  }}
                >
                  <b>{l.label}</b>
                  <span className="muted tiny">{LEVEL_HINT[l.id]}</span>
                </button>
              ))}
            </div>
            <div className="ob-actions">
              <button className="btn ghost" onClick={back}>
                Back
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              next()
            }}
          >
            <h2 id="ob-title">What kind of job are you interviewing for?</h2>
            <p className="muted">Questions are picked from this field.</p>
            <div className="ob-tracks">
              {TRACKS.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  className={a.track === t.id ? 'on' : ''}
                  onClick={() => set('track', t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <label className="field">
              <span>Specific role (optional)</span>
              <input
                ref={firstInput}
                value={a.role}
                maxLength={60}
                onChange={(e) => set('role', e.target.value)}
                placeholder="e.g. Data Analyst Intern at Google"
              />
            </label>
            <div className="ob-actions">
              <button type="button" className="btn ghost" onClick={back}>
                Back
              </button>
              <button className="btn primary">Continue</button>
            </div>
          </form>
        )}

        {step === 3 && (
          <div>
            <h2 id="ob-title">How long do you want to practice?</h2>
            <div className="ob-options">
              {MODES.map((m, i) => (
                <button
                  key={m.id}
                  ref={i === 0 ? firstInput : null}
                  className={`ob-option ${a.mode === m.id ? 'on' : ''}`}
                  onClick={() => set('mode', m.id)}
                >
                  <b>{m.title}</b>
                  <span className="muted tiny">{m.desc}</span>
                </button>
              ))}
            </div>
            {a.mode === 'count' && (
              <label className="field">
                <span>
                  Number of questions <b className="mono accent">{a.count}</b>
                </span>
                <input type="range" min="1" max="10" value={a.count} onChange={(e) => set('count', +e.target.value)} />
              </label>
            )}
            {a.mode === 'timed' && (
              <label className="field">
                <span>
                  Duration <b className="mono accent">{a.minutes} min</b>
                </span>
                <input type="range" min="2" max="30" value={a.minutes} onChange={(e) => set('minutes', +e.target.value)} />
              </label>
            )}
            {a.mode === 'endless' && <p className="muted tiny">Press End Interview whenever you’re done.</p>}
            <div className="ob-actions">
              <button className="btn ghost" onClick={back}>
                Back
              </button>
              <button className="btn primary" onClick={next}>
                {steps === 4 ? 'Save' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <form onSubmit={createProfile} noValidate>
            <h2 id="ob-title">Save these settings for next time?</h2>
            <p className="muted">
              Create a free MockView profile and your answers load automatically when you come back. It’s saved in this
              browser only, with no password.
            </p>
            <label className="field">
              <span>Name</span>
              <input value={a.name} maxLength={40} onChange={(e) => set('name', e.target.value)} placeholder="Your name" />
            </label>
            <label className="field">
              <span>Email</span>
              <input
                ref={firstInput}
                type="email"
                value={email}
                maxLength={80}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
              />
            </label>
            {touched && (!a.name.trim() || !emailOk(email)) && (
              <p className="tiny bad">Enter your name and a valid email address.</p>
            )}
            <div className="ob-actions">
              <button type="button" className="btn ghost" onClick={back}>
                Back
              </button>
              <div className="row">
                <button type="button" className="btn ghost" onClick={() => onDone(answers(), null)}>
                  Not now
                </button>
                <button className="btn primary">Create profile</button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
