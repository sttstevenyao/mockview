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
  return (
    <section className="panel">
      <h2 className="panel-title">
        <span className="step">03</span> Your resume <span className="muted tiny">(optional)</span>
      </h2>

      {!resume ? (
        <>
          <div
            className={`drop ${dragging ? 'over' : ''}`}
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              load(e.dataTransfer.files[0])
            }}
          >
            <b>{status?.busy ? 'Reading your resume…' : 'Drop your resume PDF here, or click to choose'}</b>
            <span className="muted tiny">The interviewer will ask about your real experience, projects and skills.</span>
            <input
              ref={input}
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              hidden
              onChange={(e) => load(e.target.files[0])}
            />
          </div>
          <div className="row resume-foot">
            <span className="muted tiny">🔒 Read on your device. Your resume is never uploaded.</span>
            <button className="link" onClick={() => setPasting((p) => !p)}>
              {pasting ? 'cancel' : 'or paste text'}
            </button>
          </div>
          {pasting && (
            <div className="field">
              <textarea
                rows={6}
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                placeholder="Paste your resume text here…"
              />
              <button className="btn ghost" onClick={usePasted}>
                Use this text
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="resume-file">
            <span className="mono tiny">📄 {resume.fileName}</span>
            <button className="link" onClick={() => onChange({ resume: null })}>
              remove
            </button>
          </div>
          <div className="chips">
            <span className="chip good">{s.experiences} experiences</span>
            <span className="chip good">{s.projects} projects</span>
            <span className="chip good">{s.leadership} activities</span>
            <span className="chip good">{s.skills} skills</span>
          </div>
          <label className="toggle resume-toggle">
            <input type="checkbox" checked={useResume} onChange={(e) => onChange({ useResume: e.target.checked })} />
            <span className="switch" />
            <span>Ask questions from my resume</span>
          </label>
          {useResume && (
            <ol className="resume-qs">
              {resume.questions.map((q) => (
                <li key={q.id}>{q.text}</li>
              ))}
            </ol>
          )}
        </>
      )}
      {status?.error && <p className="tiny warn">⚠ {status.error}</p>}
    </section>
  )
}
