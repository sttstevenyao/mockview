import { useEffect, useState } from 'react'
import Setup from './components/Setup.jsx'
import Interview from './components/Interview.jsx'
import Feedback from './components/Feedback.jsx'
import Credits from './components/Credits.jsx'
import About from './components/About.jsx'
import Onboarding from './components/Onboarding.jsx'
import TopNav from './components/TopNav.jsx'
import AuthForm from './components/AuthForm.jsx'
import { DEFAULT_CONFIG, sampleResult } from './data/questions.js'
import { initAudio } from './lib/audio.js'
import { currentUser, logOut, pickPrefs, savePrefs } from './lib/accounts.js'

export default function App() {
  // Visiting /#sample opens the sample report directly (handy for judges and screenshots).
  const sample = window.location.hash === '#sample'
  const [user, setUser] = useState(null)
  const [phase, setPhase] = useState(sample ? 'feedback' : 'setup')
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [result, setResult] = useState(sample ? sampleResult : null)
  const [runId, setRunId] = useState(0)
  const [onboarding, setOnboarding] = useState(false)
  const [auth, setAuth] = useState(null) // 'login' | 'signup' dialog opened from the header

  // Restore the session cookie's account; if nobody is logged in, the setup questions pop up.
  useEffect(() => {
    currentUser().then((u) => {
      if (u) {
        setUser(u)
        if (u.prefs) setConfig((c) => ({ ...c, ...u.prefs }))
      } else if (!sample) setOnboarding(true)
    })
  }, [])

  const remember = (cfg, u = user) => {
    if (u) savePrefs(pickPrefs(cfg)).then((saved) => saved && setUser(saved))
  }
  // Logging in restores that account's saved setup; signing up saves the current one.
  const signedIn = (u, mode, cfg = config) => {
    setUser(u)
    if (mode === 'login' && u.prefs) setConfig({ ...DEFAULT_CONFIG, ...u.prefs })
    else remember(cfg, u)
  }

  const start = (cfg) => {
    initAudio() // must happen inside the click gesture
    setConfig(cfg)
    remember(cfg)
    setRunId((r) => r + 1)
    setPhase('interview')
  }
  const showSample = () => {
    initAudio()
    setResult(sampleResult())
    setPhase('feedback')
  }
  const finishOnboarding = (answers, u, mode) => {
    const cfg = { ...config, ...answers }
    setConfig(cfg)
    if (u) signedIn(u, mode, cfg)
    else remember(cfg)
    setOnboarding(false)
  }
  const signOut = async () => {
    await logOut()
    setUser(null)
    setConfig(DEFAULT_CONFIG)
  }

  if (phase === 'interview')
    return (
      <Interview
        key={runId}
        config={config}
        onComplete={(r) => {
          setResult(r)
          setPhase('feedback')
        }}
        onRestart={() => start(config)}
        onExit={() => setPhase('setup')}
      />
    )
  if (phase === 'feedback')
    return (
      <Feedback
        result={result}
        config={config}
        onRestart={() => start(config)}
        onSetup={() => setPhase('setup')}
        onSample={showSample}
      />
    )
  return (
    <div className="setup">
      <TopNav tab={phase} onTab={setPhase} user={user} onAuth={setAuth} onLogOut={signOut} />
      {phase === 'credits' ? (
        <Credits />
      ) : phase === 'about' ? (
        <About
          onStart={() => {
            setPhase('setup')
            window.scrollTo(0, 0)
          }}
        />
      ) : (
        <Setup
          cfg={config}
          setCfg={setConfig}
          user={user}
          onEdit={() => setOnboarding(true)}
          onStart={start}
          onSample={showSample}
        />
      )}
      <footer className="foot muted tiny mono">Built at HackRU Fall 2026 · Voice by ElevenLabs</footer>
      {onboarding && <Onboarding initial={config} user={user} onDone={finishOnboarding} onClose={() => setOnboarding(false)} />}
      {auth && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="ob-title">
          <div className="dialog">
            <AuthForm
              initialMode={auth}
              prefs={pickPrefs(config)}
              onSuccess={(u, mode) => {
                signedIn(u, mode)
                setAuth(null)
              }}
              secondary={
                <button type="button" className="btn ghost" onClick={() => setAuth(null)}>
                  Cancel
                </button>
              }
            />
          </div>
        </div>
      )}
    </div>
  )
}
