import { useEffect, useRef, useState } from 'react'
import { LEVELS, TRACKS } from '../data/questions.js'
import { MODES } from './Onboarding.jsx'

// All setup answers on one screen, for changing them after the first-visit questions.
export default function EditAnswers({ initial, onSave, onClose }) {
  const [a, setA] = useState({
    name: initial.name === 'Candidate' ? '' : initial.name,
    level: initial.level,
    track: initial.track,
    role: initial.role,
    mode: initial.mode,
    count: initial.count,
    minutes: initial.minutes,
  })
  const [closing, setClosing] = useState(false)
  const first = useRef(null)
  const set = (k, v) => setA((x) => ({ ...x, [k]: v }))
  const leave = (fn) => {
    setClosing(true)
    setTimeout(fn, 180)
  }
  const save = (e) => {
    e.preventDefault()
    leave(() => onSave({ ...a, name: a.name.trim() || 'Candidate', role: a.role.trim() }))
  }

  useEffect(() => {
    first.current?.focus()
    const esc = (e) => e.key === 'Escape' && leave(onClose)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [])

  return (
    <div
      className={`overlay ${closing ? 'closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-title"
      onMouseDown={(e) => e.target === e.currentTarget && leave(onClose)}
    >
      <form className="dialog edit-answers" onSubmit={save}>
        <h2 id="edit-title">Your interview</h2>

        <div className="edit-grid">
          <label className="field">
            <span>Name</span>
            <input
              ref={first}
              value={a.name}
              maxLength={40}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Your name"
            />
          </label>
          <label className="field">
            <span>Field</span>
            <select value={a.track} onChange={(e) => set('track', e.target.value)}>
              {TRACKS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span>Specific role (optional)</span>
          <input
            value={a.role}
            maxLength={60}
            onChange={(e) => set('role', e.target.value)}
            placeholder="e.g. Data Analyst Intern at Google"
          />
        </label>

        <div className="field">
          <span>Experience level</span>
          <div className="seg-mini wide" role="radiogroup" aria-label="Experience level">
            {LEVELS.map((l) => (
              <button
                type="button"
                key={l.id}
                role="radio"
                aria-checked={a.level === l.id}
                className={a.level === l.id ? 'on' : ''}
                onClick={() => set('level', l.id)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span>Length</span>
          <div className="seg-mini wide" role="radiogroup" aria-label="Session format">
            {MODES.map((m) => (
              <button
                type="button"
                key={m.id}
                role="radio"
                aria-checked={a.mode === m.id}
                className={a.mode === m.id ? 'on' : ''}
                onClick={() => set('mode', m.id)}
              >
                {m.title}
              </button>
            ))}
          </div>
          {a.mode === 'count' && (
            <label className="range-row">
              <input type="range" min="1" max="10" value={a.count} onChange={(e) => set('count', +e.target.value)} />
              <b className="mono">
                {a.count} question{a.count > 1 ? 's' : ''}
              </b>
            </label>
          )}
          {a.mode === 'timed' && (
            <label className="range-row">
              <input type="range" min="2" max="30" value={a.minutes} onChange={(e) => set('minutes', +e.target.value)} />
              <b className="mono">{a.minutes} min</b>
            </label>
          )}
          {a.mode === 'endless' && <p className="muted tiny">Questions keep coming until you press End interview.</p>}
        </div>

        <div className="ob-actions">
          <span />
          <div className="row">
            <button type="button" className="btn ghost" onClick={() => leave(onClose)}>
              Cancel
            </button>
            <button className="btn primary">Save</button>
          </div>
        </div>
      </form>
    </div>
  )
}
