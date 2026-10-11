import { useEffect, useRef, useState } from 'react'
import { logIn, PASSWORD_RULE, signUp, USERNAME_RULE } from '../lib/accounts.js'

// Sign up (username + password, optional email) or log in (username or email + password).
// onSuccess(user, mode) fires after the account is created or the password checks out.
export default function AuthForm({ initialMode = 'signup', prefs, onSuccess, secondary }) {
  const [mode, setMode] = useState(initialMode)
  const [username, setUsername] = useState('')
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
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
    const res = mode === 'signup' ? await signUp({ username, password, email, prefs }) : await logIn(login, password)
    setBusy(false)
    if (res.error) return setError(res.error)
    onSuccess(res.user, mode)
  }

  return (
    <form onSubmit={submit} noValidate>
      <h2 id="ob-title">{mode === 'signup' ? 'Create an account' : 'Log in'}</h2>
      <p className="muted">
        {mode === 'signup'
          ? 'Save your settings so they load automatically when you log in. Accounts are stored in this browser.'
          : 'Use your username, or the email attached to your account.'}
      </p>

      {mode === 'signup' ? (
        <>
          <label className="field">
            <span>Username</span>
            <input
              ref={first}
              value={username}
              maxLength={24}
              autoComplete="username"
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. alex_k"
            />
            <span className="tiny muted hint">{USERNAME_RULE}</span>
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              autoComplete="new-password"
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="tiny muted hint">{PASSWORD_RULE}</span>
          </label>
          <label className="field">
            <span>
              Email <span className="muted">(optional)</span>
            </span>
            <input
              type="email"
              value={email}
              maxLength={80}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <span className="tiny muted hint">Add one if you’d like to log in with your email instead.</span>
          </label>
        </>
      ) : (
        <>
          <label className="field">
            <span>Username or email</span>
            <input ref={first} value={login} autoComplete="username" onChange={(e) => setLogin(e.target.value)} />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        </>
      )}

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
