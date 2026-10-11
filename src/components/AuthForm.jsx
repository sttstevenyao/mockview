import { useEffect, useRef, useState } from 'react'
import { logIn, signUp } from '../lib/accounts.js'

// Email + password, for both signing up and logging in.
// onSuccess(user, mode) fires after the account is created or the password checks out.
export default function AuthForm({ initialMode = 'signup', prefs, onSuccess, onModeChange, secondary }) {
  const [mode, setModeState] = useState(initialMode)
  const setMode = (m) => {
    setModeState(m)
    onModeChange?.(m)
  }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const first = useRef(null)

  useEffect(() => {
    setError('')
    setPassword('')
    first.current?.focus()
  }, [mode])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    const res = mode === 'signup' ? await signUp({ email, password, prefs }) : await logIn({ email, password })
    setBusy(false)
    if (res.error) return setError(res.error)
    onSuccess(res.user, mode)
  }

  return (
    <form onSubmit={submit} noValidate>
      <h2 id="ob-title">{mode === 'signup' ? 'Create an account' : 'Log in'}</h2>

      <label className="field">
        <span>Email</span>
        <input
          ref={first}
          type="email"
          value={email}
          maxLength={120}
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </label>
      <label className="field">
        <span>Password</span>
        <input
          type="password"
          value={password}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === 'signup' ? 'At least 6 characters' : ''}
        />
      </label>

      {error && (
        <p className="tiny bad" role="alert">
          {error}
        </p>
      )}

      <div className="ob-actions">
        <button type="button" className="link tiny" onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}>
          {mode === 'signup' ? 'Already have an account? Log in' : 'New here? Create an account'}
        </button>
        <div className="row">
          {secondary}
          <button className="btn primary" disabled={busy}>
            {busy ? 'Checking…' : mode === 'signup' ? 'Create account' : 'Log in'}
          </button>
        </div>
      </div>
    </form>
  )
}
