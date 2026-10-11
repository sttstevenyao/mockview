const STEPS = [
  [
    'Tell it about you',
    'A few quick questions: your experience level, the field you’re applying to, the role, and how long you want to practice. Upload a resume and some questions will be about your own projects.',
  ],
  [
    'The interviewer asks out loud',
    'A realistic interviewer voiced by ElevenLabs asks behavioral questions like “Tell me about a time you disagreed with a teammate.” Pick a friendly recruiter, a hiring manager, or a tough bar raiser.',
  ],
  [
    'You answer out loud',
    'Your words appear as you speak, and a live panel coaches you: which parts of the STAR structure you’ve covered, whether your pace is right, and how many filler words you’ve used. The interviewer reacts to each answer, and if it can’t hear you, it asks again.',
  ],
  [
    'Review your report',
    'Get a grade, your transcript with filler words and red flags highlighted (click one to read what the interviewer was thinking), a rewrite of your weakest sentence, and a button to hear that rewrite spoken the way a confident candidate would say it.',
  ],
]

const LISTENS_FOR = [
  ['STAR structure', 'Did you give the Situation, your Task, the Action you took, and the Result?'],
  ['Filler words', '“Um”, “like”, “you know”, “basically” and friends.'],
  ['Hedging', '“I think”, “maybe”, “kind of”: phrases that make you sound unsure.'],
  ['Red flags', 'Blaming others, badmouthing a past team, or “I don’t know”.'],
  ['Numbers', 'Results you can measure: percentages, time saved, people helped.'],
  ['Delivery', 'Speaking pace, plus your volume, pitch variety, and pauses from the mic signal.'],
]

export default function About({ onStart }) {
  return (
    <div className="about">
      <header className="about-head">
        <h1>About MockView</h1>
        <p className="lead">
          MockView is a practice partner for behavioral interviews, the “tell me about a time when…” questions that decide most
          internship and new-grad offers. You talk to a realistic voiced interviewer, get feedback while you speak, and then see
          and hear how to say it better.
        </p>
      </header>

      <section className="about-block">
        <h2>What it’s for</h2>
        <p className="muted">
          The hard part of an interview is telling your stories clearly under pressure. Most people never get honest feedback on
          how they come across, and practicing out loud with a friend is awkward. MockView gives you unlimited, low-stakes reps.
        </p>
        <ul className="about-list">
          <li>Students preparing for internship, co-op, and new-grad interviews</li>
          <li>Anyone who rambles, freezes, or says “um” more than they’d like</li>
          <li>Career centers, clubs, and mentors who want practice that doesn’t need a person on the other side</li>
          <li>Non-native English speakers working on pacing and delivery</li>
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
        <p className="muted tiny about-note">
          Grading runs on a rules engine in your browser, so it’s instant and every point can be explained.
        </p>
      </section>

      <section className="about-block">
        <h2>Under the hood</h2>
        <dl className="built">
          <div>
            <dt>Interviewer voice</dt>
            <dd className="muted">
              ElevenLabs Text to Speech, with each persona’s pace and expressiveness mapped to voice settings.
            </dd>
          </div>
          <div>
            <dt>Hearing you</dt>
            <dd className="muted">
              Your browser’s built-in speech recognition in Chrome, Edge and Safari. In Brave and Firefox, where that’s blocked or
              missing, ElevenLabs Speech to Text (Scribe) instead.
            </dd>
          </div>
          <div>
            <dt>Voice analysis</dt>
            <dd className="muted">The Web Audio API measures loudness, pitch, and pauses from your microphone.</dd>
          </div>
          <div>
            <dt>Accounts</dt>
            <dd className="muted">Optional. Saves your settings so they load on any device when you log in.</dd>
          </div>
        </dl>
      </section>

      <section className="about-block">
        <h2>Your privacy</h2>
        <ul className="about-list">
          <li>Your resume is read in your browser and never uploaded.</li>
          <li>Recordings of your answers stay in your browser for that session.</li>
          <li>
            To turn speech into text, Chrome and Edge use the browser’s own speech service. In Brave and Firefox, short clips of
            your answer are sent to ElevenLabs to transcribe.
          </li>
          <li>
            An account stores your username, your email if you add one, and your interview settings. Your password is stored only
            as a one-way hash.
          </li>
        </ul>
      </section>

      <div className="about-cta">
        <button className="btn primary" onClick={onStart}>
          Start practicing
        </button>
        <span className="muted tiny">Built at HackRU Fall 2026 · Open source (MIT)</span>
      </div>
    </div>
  )
}
