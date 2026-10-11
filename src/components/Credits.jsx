const TEAM = ['Zexing Yao', 'Soham Bajaj', 'Kevin Wang', 'Daniel Kim']

const BUILT_WITH = [
  ['ElevenLabs Text to Speech', 'The interviewer’s voice and the “Hear Ideal Delivery” playback (eleven_multilingual_v2, eleven_flash_v2_5).'],
  ['ElevenLabs Speech to Text (Scribe)', 'Transcribes your answers in browsers that block built-in speech recognition, like Brave.'],
  ['Web Speech API', 'Live, zero-latency transcription in Chrome, Edge, and Safari.'],
  ['Web Audio API', 'Waveform visualizer, loudness, and pitch analysis of your voice.'],
  ['React + Vite', 'Front end and build tooling.'],
  ['PDF.js (Mozilla)', 'Reads your resume in the browser to generate personal questions. The file never leaves your device.'],
  ['Vercel', 'Hosting and the serverless functions that keep the ElevenLabs key private.'],
  ['IBM Plex Sans & Mono', 'Typefaces, via Google Fonts.'],
]

export default function Credits() {
  return (
    <div className="credits">
      <header className="credits-head">
        <h1>Credits</h1>
        <p className="muted">
          MockView was built in 24 hours at <b className="plain">HackRU Fall 2026</b>, Rutgers University’s hackathon.
        </p>
      </header>

      <section className="credits-block">
        <h2 className="mono tiny muted">TEAM</h2>
        <ul className="team">
          {TEAM.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </section>

      <section className="credits-block">
        <h2 className="mono tiny muted">BUILT WITH</h2>
        <dl className="built">
          {BUILT_WITH.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd className="muted">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="credits-block">
        <h2 className="mono tiny muted">SUBMISSION</h2>
        <dl className="built">
          <div>
            <dt>Track</dt>
            <dd className="muted">Education</dd>
          </div>
          <div>
            <dt>Superlatives</dt>
            <dd className="muted">Best Newbie Hack · Use of ElevenLabs</dd>
          </div>
          <div>
            <dt>License</dt>
            <dd className="muted">MIT. MockView is open source.</dd>
          </div>
        </dl>
      </section>

      <section className="credits-block">
        <h2 className="mono tiny muted">THANKS</h2>
        <p className="muted">
          To the HackRU organizers, mentors, and volunteers, and to ElevenLabs for supporting student builders.
        </p>
      </section>
    </div>
  )
}
