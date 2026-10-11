import { DEFAULT_SETTINGS } from '../lib/settings.js'
import { HELP_LANGUAGES } from '../data/translations.js'

function Row({ title, children }) {
  return (
    <div className="set-row">
      <div className="set-title">{title}</div>
      <div className="set-control">{children}</div>
    </div>
  )
}

function Choice({ value, options, onChange, label }) {
  return (
    <div className="seg-mini" role="radiogroup" aria-label={label}>
      {options.map(([v, text]) => (
        <button
          key={String(v)}
          role="radio"
          aria-checked={value === v}
          className={value === v ? 'on' : ''}
          onClick={() => onChange(v)}
        >
          {text}
        </button>
      ))}
    </div>
  )
}

function Switch({ checked, onChange, label }) {
  return (
    <label className="toggle bare">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span className="switch" />
    </label>
  )
}

export default function Settings({ settings, onChange }) {
  const set = (k) => (v) => onChange({ ...settings, [k]: v })
  return (
    <div className="settings">
      <header className="about-head">
        <h1>Settings</h1>
      </header>

      <section className="set-group">
        <h2>Appearance</h2>
        <Row title="Theme">
          <Choice
            label="Theme"
            value={settings.theme}
            onChange={set('theme')}
            options={[
              ['light', 'Light'],
              ['dark', 'Dark'],
              ['system', 'System'],
            ]}
          />
        </Row>
        <Row title="Text size">
          <Choice
            label="Text size"
            value={settings.textSize}
            onChange={set('textSize')}
            options={[
              ['default', 'Default'],
              ['large', 'Large'],
              ['larger', 'Larger'],
            ]}
          />
        </Row>
        <Row title="High contrast">
          <Switch label="High contrast" checked={settings.highContrast} onChange={set('highContrast')} />
        </Row>
        <Row title="Reduce motion">
          <Switch label="Reduce motion" checked={settings.reduceMotion} onChange={set('reduceMotion')} />
        </Row>
      </section>

      <section className="set-group">
        <h2>Language support</h2>
        <Row title="Translate questions into">
          <select
            className="set-select"
            value={settings.helpLang}
            onChange={(e) => set('helpLang')(e.target.value)}
            aria-label="Translate questions into"
          >
            {HELP_LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </Row>
        <Row title="Read the translation aloud">
          <Switch label="Read the translation aloud" checked={settings.readTranslation} onChange={set('readTranslation')} />
        </Row>
        <Row title="Interviewer captions">
          <Switch label="Interviewer captions" checked={settings.captions} onChange={set('captions')} />
        </Row>
      </section>

      <section className="set-group">
        <h2>Interview</h2>
        <Row title="Skip the introduction">
          <Switch label="Skip the introduction" checked={settings.skipIntro} onChange={set('skipIntro')} />
        </Row>
        <Row title="Reactions after answers">
          <Switch label="Reactions after answers" checked={settings.reactions} onChange={set('reactions')} />
        </Row>
        <Row title="Ask again after silence">
          <Choice
            label="Ask again after silence"
            value={settings.silenceSec}
            onChange={set('silenceSec')}
            options={[
              [6, '6s'],
              [9, '9s'],
              [15, '15s'],
              [0, 'Off'],
            ]}
          />
        </Row>
        <Row title="Live tips">
          <Switch label="Live tips" checked={settings.coaching} onChange={set('coaching')} />
        </Row>
        <Row title="Live transcript">
          <Switch label="Live transcript" checked={settings.showTranscript} onChange={set('showTranscript')} />
        </Row>
      </section>

      <section className="set-group">
        <h2>Voice</h2>
        <Row title="Model">
          <Choice
            label="Voice model"
            value={settings.voiceQuality}
            onChange={set('voiceQuality')}
            options={[
              ['high', 'Realistic'],
              ['fast', 'Fast'],
            ]}
          />
        </Row>
        <Row title="Speed">
          <Choice
            label="Speaking speed"
            value={settings.voiceSpeed}
            onChange={set('voiceSpeed')}
            options={[
              [0.9, 'Slower'],
              [1, 'Normal'],
              [1.1, 'Faster'],
            ]}
          />
        </Row>
      </section>

      <div className="about-cta">
        <button className="btn ghost" onClick={() => onChange({ ...DEFAULT_SETTINGS })}>
          Reset to defaults
        </button>
      </div>
    </div>
  )
}
