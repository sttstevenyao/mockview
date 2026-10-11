import { useEffect, useState } from 'react'
import Setup from './components/Setup.jsx'
import Interview from './components/Interview.jsx'
import Feedback from './components/Feedback.jsx'
import Credits from './components/Credits.jsx'
import About from './components/About.jsx'
import Settings from './components/Settings.jsx'
import Progress from './components/Progress.jsx'
import { addSession, loadHistory, mergeHistory, saveHistory, summarize } from './lib/history.js'
import { analyzeSession } from './lib/analysis.js'
import Onboarding from './components/Onboarding.jsx'
import EditAnswers from './components/EditAnswers.jsx'
import Intro from './components/Intro.jsx'
import TopNav from './components/TopNav.jsx'
import AuthForm from './components/AuthForm.jsx'
import { DEFAULT_CONFIG, sampleResult } from './data/questions.js'
import { initAudio } from './lib/audio.js'
import { currentUser, logOut, pickPrefs, savePrefs } from './lib/accounts.js'
import { applyAppearance, loadSettings, saveSettings, withDefaults } from './lib/settings.js'

export default function App() {
  // Visiting /#sample opens the sample report directly (handy for judges and screenshots).
  const sample = window.location.hash === '#sample'
  const [user, setUser] = useState(null)
  const [phase, setPhase] = useState(sample ? 'feedback' : 'setup')
  // config.settings holds the Settings tab values; they travel with the rest of your saved setup.
  const [config, setConfig] = useState(() => ({ ...DEFAULT_CONFIG, settings: loadSettings(), history: loadHistory() }))
  const [result, setResult] = useState(sample ? sampleResult : null)
  const [runId, setRunId] = useState(0)
  const [onboarding, setOnboarding] = useState(false)
  const [editing, setEditing] = useState(false) // one-screen editor for setup answers
  // Opening animation: once per browser session, skipped with reduced motion or a direct link to the sample.
  const [intro, setIntro] = useState(() => {
    try {
      const reduced =
        window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduce'
      return !sample && !reduced && !sessionStorage.getItem('mockview.intro') ? 'playing' : false
    } catch {
      return false
    }
  })
  const endIntro = () => {
    try {
      sessionStorage.setItem('mockview.intro', '1')
    } catch {}
    setIntro(false)
  }
  const revealPage = () => setIntro((v) => (v ? 'fading' : v))
  const [auth, setAuth] = useState(null) // 'login' | 'signup' dialog opened from the header

  // Restore the session cookie's account; if nobody is logged in, the setup questions pop up.
  useEffect(() => {
    currentUser().then((u) => {
      if (u) {
        setUser(u)
        if (u.prefs)
          setConfig((c) => ({
            ...c,
            ...u.prefs,
            settings: withDefaults(u.prefs.settings || c.settings),
            history: mergeHistory(c.history, u.prefs.history),
          }))
      } else if (!sample) setOnboarding(true)
    })
  }, [])

  useEffect(() => {
    applyAppearance(config.settings)
    saveSettings(config.settings)
  }, [config.settings])

  useEffect(() => saveHistory(config.history), [config.history])

  const remember = (cfg, u = user) => {
    if (u) savePrefs(pickPrefs(cfg)).then((saved) => saved && setUser(saved))
  }
  // Logging in restores that account's saved setup; signing up saves the current one.
  const signedIn = (u, mode, cfg = config) => {
    setUser(u)
    if (mode === 'login' && u.prefs)
      setConfig({
        ...DEFAULT_CONFIG,
        ...u.prefs,
        settings: withDefaults(u.prefs.settings || cfg.settings),
        history: mergeHistory(cfg.history, u.prefs.history),
      })
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
  const finishOnboarding = ({ helpLang, ...answers }, u, mode) => {
    const cfg = { ...config, ...answers, settings: { ...config.settings, helpLang } }
    setConfig(cfg)
    if (u) signedIn(u, mode, cfg)
    else remember(cfg)
    setOnboarding(false)
  }
  const signOut = async () => {
    await logOut()
    setUser(null)
    setConfig((c) => ({ ...DEFAULT_CONFIG, settings: c.settings, history: loadHistory() })) // appearance stays with the device
  }

  if (phase === 'interview')
    return (
      <Interview
        key={runId}
        config={config}
        onComplete={(r) => {
          // Save a summary of real sessions (not empty ones) to the practice history.
          const report = analyzeSession(r.answers)
          const previous = config.history[config.history.length - 1] || null
          if (report.overall.words >= 3) {
            const cfg = { ...config, history: addSession(config.history, summarize(report, config)) }
            setConfig(cfg)
            remember(cfg)
          }
          setResult({ ...r, previous })
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
      {intro && <Intro onReveal={revealPage} onDone={endIntro} />}
      <TopNav tab={phase} onTab={setPhase} user={user} onAuth={setAuth} onLogOut={signOut} />
      {/* Mounted as the opening animation fades, so the page's entrance cascade plays underneath */}
      {intro !== 'playing' && (
        <div key={phase} className="tab-view">
          {phase === 'progress' ? (
            <Progress history={config.history} onStart={() => setPhase('setup')} />
          ) : phase === 'credits' ? (
            <Credits />
          ) : phase === 'settings' ? (
            <Settings
              settings={config.settings}
              user={user}
              onChange={(settings) => {
                const cfg = { ...config, settings }
                setConfig(cfg)
                remember(cfg)
              }}
            />
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
              onEdit={() => setEditing(true)}
              onStart={start}
              onSample={showSample}
              onSettings={() => setPhase('settings')}
            />
          )}
        </div>
      )}
      <footer className="foot muted tiny mono">Built at HackRU Fall 2026 · Voice by ElevenLabs</footer>
      {onboarding && !intro && (
        <Onboarding initial={config} user={user} onDone={finishOnboarding} onClose={() => setOnboarding(false)} />
      )}
      {editing && (
        <EditAnswers
          initial={config}
          onSave={(answers) => {
            const cfg = { ...config, ...answers }
            setConfig(cfg)
            remember(cfg)
            setEditing(false)
          }}
          onClose={() => setEditing(false)}
        />
      )}
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
