import { useState } from 'react'
import Setup from './components/Setup.jsx'
import Interview from './components/Interview.jsx'
import Feedback from './components/Feedback.jsx'
import { DEFAULT_CONFIG, sampleResult } from './data/questions.js'
import { initAudio } from './lib/audio.js'

export default function App() {
  // Visiting /#sample opens the sample report directly (handy for judges and screenshots).
  const sample = window.location.hash === '#sample'
  const [phase, setPhase] = useState(sample ? 'feedback' : 'setup')
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [result, setResult] = useState(sample ? sampleResult : null)
  const [runId, setRunId] = useState(0)

  const start = (cfg) => {
    initAudio() // must happen inside the click gesture
    setConfig(cfg)
    setRunId((r) => r + 1)
    setPhase('interview')
  }
  const showSample = () => {
    initAudio()
    setResult(sampleResult())
    setPhase('feedback')
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
  return <Setup initial={config} onStart={start} onSample={showSample} />
}
