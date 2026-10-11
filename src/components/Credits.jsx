const TEAM = [
  ['Zexing Yao', 'Project lead'],
  ['Kevin Wang', 'Pitcher & UI designer'],
  ['Daniel Kim', 'Asst. Programmer'],
  ['Soham Bajaj', 'Domain expert'],
]

const BUILT_WITH = [
  ['ElevenLabs Text to Speech', 'Interviewer voice and ideal-delivery playback'],
  ['ElevenLabs Speech to Text', 'Transcription in Brave and Firefox'],
  ['Web Speech API', 'Live transcription'],
  ['Web Audio API', 'Waveform and voice analysis'],
  ['React + Vite', 'Front end'],
  ['PDF.js', 'Resume parsing'],
  ['Vercel', 'Hosting, serverless functions, storage'],
  ['IBM Plex', 'Type'],
]

export default function Credits() {
  return (
    <div className="credits">
      <header className="credits-head">
        <h1>Credits</h1>
        <p className="muted">
          Built in 24 hours at <b className="plain">HackRU Fall 2026</b>.
        </p>
      </header>

      <section className="credits-block">
        <h2 className="mono tiny muted">TEAM</h2>
        <ul className="team">
          {TEAM.map(([name, role]) => (
            <li key={name}>
              <span className="team-name">{name}</span>
              <span className="muted tiny">{role}</span>
            </li>
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
        <p className="muted">HackRU organizers, mentors and volunteers, and ElevenLabs.</p>
      </section>
    </div>
  )
}
