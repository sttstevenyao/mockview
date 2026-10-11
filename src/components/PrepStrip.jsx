import { useEffect, useState } from 'react'
import { initAudio } from '../lib/audio.js'
import { speak, stopSpeaking } from '../lib/tts.js'

// A model answer split into its STAR parts, playable in the interviewer's voice.
const PARTS = [
  ['S', 'Situation', 'During my internship at a fintech startup, 40 percent of new users quit on one sign-up screen.'],
  ['T', 'Task', 'My job was to find out why.'],
  ['A', 'Action', 'I watched thirty session recordings, interviewed six users, and cut the form from twelve fields to five.'],
  ['R', 'Result', 'Within a month, drop-off fell to 12 percent.'],
]

export default function PrepStrip({ voiceOpts }) {
  const [playing, setPlaying] = useState(false)
  useEffect(() => () => stopSpeaking(), [])

  const play = async () => {
    if (playing) {
      stopSpeaking()
      return setPlaying(false)
    }
    initAudio()
    setPlaying(true)
    await speak(PARTS.map((p) => p[2]).join(' '), { ...voiceOpts, quality: 'high' })
    setPlaying(false)
  }

  return (
    <section className="panel prep" aria-label="Example answer">
      <div className="prep-head">
        <h2 className="panel-title">A strong answer</h2>
        <button className={`btn ghost sm ${playing ? 'active' : ''}`} onClick={play}>
          {playing ? 'Stop' : 'Hear it'}
        </button>
      </div>
      <p className="prep-answer">
        {PARTS.map(([letter, label, text]) => (
          <span key={letter} className={`prep-part part-${letter}`}>
            <b title={label}>{letter}</b>
            {text}{' '}
          </span>
        ))}
      </p>
    </section>
  )
}
