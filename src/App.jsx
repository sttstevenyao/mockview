import { useState } from 'react'
import Setup from './components/Setup.jsx'
import Interview from './components/Interview.jsx'
import Feedback from './components/Feedback.jsx'
import Credits from './components/Credits.jsx'
import Onboarding from './components/Onboarding.jsx'
import TopNav from './components/TopNav.jsx'
import { DEFAULT_CONFIG, sampleResult } from './data/questions.js'
import { initAudio } from './lib/audio.js'
import { clearProfile, loadProfile, pickPrefs, saveProfile } from './lib/profile.js'

export default function App() {
  // Visiting /#sample opens the sample report directly (handy for judges and screenshots).
  const sample = window.location.hash === '#sample'
  const [profile, setProfile] = useState(loadProfile)
  const [phase, setPhase] = useState(sample ? 'feedback' : 'setup')
  const [config, setConfig] = useState(() => ({ ...DEFAULT_CONFIG, ...(profile?.prefs || {}) }))
  const [result, setResult] = useState(sample ? sampleResult : null)
  const [runId, setRunId] = useState(0)
  // First visit without a saved profile → the setup questions pop up.
  const [onboarding, setOnboarding] = useState(!sample && !profile)

  const remember = (cfg, p = profile) => {
    if (!p) return
    const next = { ...p, prefs: pickPrefs(cfg) }
    saveProfile(next)
    setProfile(next)
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
  const finishOnboarding = (answers, newProfile) => {
    const cfg = { ...config, ...answers }
    setConfig(cfg)
    if (newProfile) remember(cfg, { ...newProfile, createdAt: new Date().toISOString() })
    else remember(cfg)
    setOnboarding(false)
  }
  const signOut = () => {
    clearProfile()
    setProfile(null)
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
      <TopNav
        tab={phase}
        onTab={setPhase}
        profile={profile}
        onSignIn={() => setOnboarding(true)}
        onSignOut={signOut}
      />
      {phase === 'credits' ? (
        <Credits />
      ) : (
        <Setup
          cfg={config}
          setCfg={setConfig}
          profile={profile}
          onEdit={() => setOnboarding(true)}
          onStart={start}
          onSample={showSample}
        />
      )}
      <footer className="foot muted tiny mono">Built at HackRU Fall 2026 · Voice by ElevenLabs</footer>
      {onboarding && (
        <Onboarding
          initial={config}
          profile={profile}
          onDone={finishOnboarding}
          onClose={() => setOnboarding(false)}
        />
      )}
    </div>
  )
}
