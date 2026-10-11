import { useRef, useState } from 'react'
import { parseResume, readResumeFile, resumeQuestions } from '../lib/resume.js'

function build(text, fileName) {
  const parsed = parseResume(text)
  return {
    fileName,
    questions: resumeQuestions(parsed),
    stats: {
      experiences: parsed.experiences.length,
      projects: parsed.projects.length,
      leadership: parsed.leadership.length,
      skills: parsed.skills.length,
    },
  }
}

export default function ResumePanel({ resume, useResume, onChange }) {
  const [status, setStatus] = useState(null) // { busy } | { error }
  const [pasting, setPasting] = useState(false)
  const [pasted, setPasted] = useState('')
  const [dragging, setDragging] = useState(false)
  const input = useRef(null)

  const load = async (file) => {
    if (!file) return
    setStatus({ busy: true })
    try {
      const text = await readResumeFile(file)
      onChange({ resume: build(text, file.name), useResume: true })
      setStatus(null)
    } catch (e) {
      setStatus({ error: e.message || 'Couldn’t read that file.' })
    }
  }

  const usePasted = () => {
    if (pasted.replace(/\s/g, '').length < 80) return setStatus({ error: 'Paste a bit more of your resume first.' })
    onChange({ resume: build(pasted, 'Pasted resume'), useResume: true })
    setPasting(false)
    setStatus(null)
  }

  const s = resume?.stats
  const drop = {
    onDragOver: (e) => {
      e.preventDefault()
      setDragging(true)
    },
    onDragLeave: () => setDragging(false),
    onDrop: (e) => {
      e.preventDefault()
      setDragging(false)
      load(e.dataTransfer.files[0])
    },
  }
  return (
    <section className={`panel resume-panel ${dragging ? 'over' : ''}`} {...drop}>
      <h2 className="panel-title">
        Resume <span className="muted tiny">(optional)</span>
      </h2>

      {!resume ? (
        <>
          <div className="row">
            <button className="btn ghost sm" onClick={() => input.current?.click()} disabled={status?.busy}>
              {status?.busy ? 'Reading…' : 'Upload PDF'}
            </button>
            <button className="link tiny" onClick={() => setPasting((p) => !p)}>
              {pasting ? 'Cancel' : 'Paste text instead'}
            </button>
            <input
              ref={input}
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              hidden
              onChange={(e) => load(e.target.files[0])}
            />
          </div>
          {pasting && (
            <div className="field paste">
              <textarea
                rows={4}
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                placeholder="Paste your resume text here…"
              />
              <button className="btn ghost sm" onClick={usePasted}>
                Use this text
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="resume-file">
            <span className="mono tiny">{resume.fileName}</span>
            <button className="link tiny" onClick={() => onChange({ resume: null })}>
              Remove
            </button>
          </div>
          <p className="muted tiny">
            Found {s.experiences} experiences, {s.projects} projects, {s.leadership} activities and {s.skills} skills.
          </p>
          <label className="toggle resume-toggle">
            <input type="checkbox" checked={useResume} onChange={(e) => onChange({ useResume: e.target.checked })} />
            <span className="switch" />
            <span>Ask questions from my resume</span>
          </label>
          {useResume && (
            <details className="resume-qs-wrap">
              <summary className="tiny">See the {resume.questions.length} questions</summary>
              <ol className="resume-qs">
                {resume.questions.map((q) => (
                  <li key={q.id}>{q.text}</li>
                ))}
              </ol>
            </details>
          )}
        </>
      )}
      {status?.error && <p className="tiny warn">{status.error}</p>}
    </section>
  )
}
