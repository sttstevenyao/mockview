const STEPS = [
  ['Set up', 'Pick your level, field and interviewer. Add a resume for questions about your own work.'],
  ['Answer out loud', 'The interviewer asks; the live panel tracks structure, pace and filler words as you speak.'],
  ['Review', 'See flagged phrases, a rewrite of your weakest sentence, and hear how it should sound.'],
]

const LISTENS_FOR = [
  ['Structure', 'Situation, Task, Action, Result'],
  ['Filler words', '“um”, “like”, “basically”'],
  ['Hedging', '“I think”, “maybe”, “kind of”'],
  ['Red flags', 'Blame, negativity, “I don’t know”'],
  ['Numbers', 'Measurable results'],
  ['Delivery', 'Pace, volume, pitch, pauses'],
]

export default function About({ onStart }) {
  return (
    <div className="about">
      <header className="about-head">
        <h1>About MockView</h1>
        <p className="lead">
          A practice interviewer for behavioral questions. Talk to it out loud, get feedback while you speak, then hear how to say
          it better.
        </p>
      </header>

      <section className="about-block">
        <h2>Built for</h2>
        <ul className="about-list">
          <li>Students heading into internship and new-grad interviews</li>
          <li>Anyone who rambles or freezes under pressure</li>
          <li>Non-native English speakers, with interviews in 12 languages</li>
          <li>Career centers and clubs running practice sessions</li>
        </ul>
      </section>

      <section className="about-block">
        <h2>How it works</h2>
        <ol className="about-steps">
          {STEPS.map(([title, body], i) => (
            <li key={title}>
              <span className="mono step-n">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3>{title}</h3>
                <p className="muted">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="about-block">
        <h2>What it listens for</h2>
        <dl className="built">
          {LISTENS_FOR.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd className="muted">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="about-block">
        <h2>Privacy</h2>
        <p className="muted">Your resume and recordings stay in your browser.</p>
      </section>

      <div className="about-cta">
        <button className="btn primary" onClick={onStart}>
          Start practicing
        </button>
      </div>
    </div>
  )
}
