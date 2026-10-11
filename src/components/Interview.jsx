import { useEffect, useRef, useState } from 'react'
import Brand from './Brand.jsx'
import Visualizer from './Visualizer.jsx'
import LiveSidebar from './LiveSidebar.jsx'
import {
  BACKCHANNELS,
  buildQueue,
  describeFormat,
  describeRole,
  LEVELS,
  extendQueue,
  followUpFor,
  INTERRUPTS,
  PERSONAS,
  SIM_ANSWERS,
  TRANSITIONS,
} from '../data/questions.js'
import { liveMetrics, liveTip, segmentText } from '../lib/analysis.js'
import { fetchSpeech, speak, stopSpeaking } from '../lib/tts.js'
import { browserNote, createTranscriber, defaultEngine, ENGINE_LABEL } from '../lib/transcriber.js'
import { getAnalysers, getMicStream, initMic } from '../lib/audio.js'
import { NUDGES, reactTo, SILENCE_GOODBYE } from '../lib/reactions.js'
import { createVoiceMeter } from '../lib/voiceAnalysis.js'

const fmt = (s) => {
  s = Math.max(0, Math.floor(s))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
const pick = (a) => a[Math.floor(Math.random() * a.length)]
const BREAK = '<break time="0.6s" />' // ElevenLabs pause tag: a natural beat before the question
const plain = (t) =>
  t
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
const NUDGE_AFTER_MS = 9000 // silence before the interviewer asks "what?"
const MAX_NUDGES = 2 // after this many unanswered nudges, the interview stops

// Records one answer's mic audio so it can be replayed on the report.
function recordAnswer() {
  const stream = getMicStream()
  if (!stream || typeof MediaRecorder === 'undefined') return null
  const parts = []
  let rec
  try {
    rec = new MediaRecorder(stream)
  } catch {
    return null
  }
  rec.ondataavailable = (e) => e.data?.size && parts.push(e.data)
  rec.start()
  const safe = (fn) => {
    try {
      fn()
    } catch {}
  }
  return {
    pause: () => rec.state === 'recording' && safe(() => rec.pause()),
    resume: () => rec.state === 'paused' && safe(() => rec.resume()),
    stop: () =>
      new Promise((resolve) => {
        if (rec.state === 'inactive') return resolve(null)
        rec.onstop = () => resolve(parts.length ? URL.createObjectURL(new Blob(parts, { type: rec.mimeType })) : null)
        safe(() => rec.stop())
      }),
  }
}

const EMPTY_METRICS = {
  words: 0,
  wpm: 0,
  confidence: 50,
  fillers: 0,
  fillerBreakdown: {},
  sessionFillers: 0,
  hedges: 0,
  flags: 0,
  star: { situation: false, task: false, action: false, result: false },
  tip: 'Your interviewer is about to ask the first question.',
  vocal: null,
  level: 0,
}

const STAGE_LABEL = {
  asking: 'Interviewer speaking',
  listening: 'Your turn — answer out loud',
  thinking: 'Next question…',
  reacting: 'Interviewer responding',
  ending: 'Wrapping up…',
}

export default function Interview({ config, onComplete, onRestart, onExit }) {
  const persona = PERSONAS[config.persona]
  const mann = config.mannerisms
  const voiceOpts = {
    voiceId: config.voiceId,
    quality: config.voiceQuality,
    speed: mann.speed,
    expressiveness: mann.expressiveness,
  }
  const [stage, setStage] = useState('asking')
  const [qIndex, setQIndex] = useState(0)
  const [question, setQuestion] = useState(null)
  const [transcript, setTranscript] = useState({ final: '', interim: '' })
  const [elapsed, setElapsed] = useState(0)
  const [speaking, setSpeaking] = useState(false)
  const [provider, setProvider] = useState(null)
  const [ttsError, setTtsError] = useState(null)
  const [metrics, setMetrics] = useState(EMPTY_METRICS)
  const [history, setHistory] = useState([])
  const [simulating, setSimulating] = useState(false)
  const [micStatus, setMicStatus] = useState('pending')
  const [engine, setEngine] = useState(defaultEngine)
  const [sttError, setSttError] = useState(null)
  const [pending, setPending] = useState(false)
  const [typed, setTyped] = useState('')
  const [log, setLog] = useState([])
  const [showLog, setShowLog] = useState(true)
  const [silentExit, setSilentExit] = useState(false)
  const transcriptRef = useRef(null)
  const logRef = useRef(null)

  // Mutable session state read by timers and async flows (avoids stale closures).
  const S = useRef(null)
  if (!S.current)
    S.current = {
      questions: buildQueue(config.track, config.resumeQuestions),
      answers: [],
      stage: 'asking',
      qIndex: 0,
      answering: false,
      ended: false,
      startTime: Date.now(),
      answerStart: 0,
      final: '',
      interim: '',
      pastFillers: 0,
      conf: 55,
      wpm: 0,
      tick: 0,
      nextLead: null,
      sim: null,
      simCount: 0,
      transcriber: null,
      meter: null,
      simUsed: false,
      interrupted: false,
      lastActivity: Date.now(),
      nudges: 0,
      pending: false,
      recorder: null,
      log: [],
    }

  const addLog = (who, text) => {
    text = plain(text || '')
    if (!text) return
    S.current.log = [...S.current.log, { who, text, at: (Date.now() - S.current.startTime) / 1000 }]
    setLog(S.current.log)
  }

  const go = (stage) => {
    S.current.stage = stage
    if (stage === 'listening') S.current.lastActivity = Date.now()
    setStage(stage)
  }

  const say = async (text, onBegin) => {
    if (!plain(text)) return
    addLog('interviewer', text)
    await speak(text, voiceOpts, (prov, err) => {
      S.current.provider = prov
      setProvider(prov)
      setTtsError(err || null)
      setSpeaking(true)
      onBegin?.()
    })
    setSpeaking(false)
  }

  async function askQuestion(i) {
    const s = S.current
    if (s.ended) return
    if (i + 1 >= s.questions.length) s.questions = extendQueue(s.questions, config.track)
    const q = s.questions[i]
    s.qIndex = i
    s.final = ''
    s.interim = ''
    go('asking')
    setQIndex(i)
    setQuestion(q)
    setTranscript({ final: '', interim: '' })

    const lead =
      i === 0
        ? persona.intro(
            config.name,
            describeFormat(config),
            describeRole(config),
            LEVELS.find((l) => l.id === config.level)?.line || '',
          ) +
          (config.resumeQuestions?.length
            ? " I've read through your resume, so some questions will be about your own experience."
            : '')
        : q.followUp
          ? followUpLead()
          : (s.nextLead ?? makeLead())
    const next = s.questions[i + 1]
    s.nextLead = makeLead()
    s.nudges = 0
    await say(`${lead} ${BREAK} ${q.text}`, () => {
      // Prefetch the next question's audio while this one plays → no gap later.
      if (next) fetchSpeech(`${s.nextLead} ${BREAK} ${next.text}`, voiceOpts).catch(() => {})
    })
    if (s.ended || s.qIndex !== i) return

    s.answerStart = Date.now()
    s.wpm = 0
    s.answering = true
    s.lastWordAt = 0
    s.simUsed = false
    s.interrupted = false
    s.transcriber.begin()
    s.meter.start()
    s.recorder = recordAnswer()
    go('listening')
  }

  // Lead-in before the next question. The reaction to your answer is spoken separately,
  // so this stays generic and the question audio can be prefetched while you answer.
  function makeLead() {
    return mann.acks === 'none' ? '' : pick(TRANSITIONS)
  }
  // Pauses the mic, says something, then hands the floor back.
  async function sayOver(text) {
    const s = S.current
    s.transcriber.pauseMic()
    s.meter.pause()
    s.recorder?.pause()
    go('asking')
    await say(text)
    if (s.ended) return
    go('listening')
    s.transcriber.resumeMic()
    s.meter.resume()
    s.recorder?.resume()
  }
  function followUpLead() {
    return mann.backchannel ? pick(BACKCHANNELS) : ''
  }

  async function interrupt() {
    const s = S.current
    if (s.stage !== 'listening' || s.sim || s.interrupted) return
    s.interrupted = true
    await sayOver(pick(INTERRUPTS))
  }

  // Nothing heard for a while → "what?"; still nothing after that → stop and ask for a restart.
  async function nudge() {
    const s = S.current
    if (s.ended || s.nudging) return
    if (s.nudges >= MAX_NUDGES) return silenceExit()
    s.nudging = true
    await sayOver(NUDGES[s.nudges++ % NUDGES.length])
    s.nudging = false
  }

  async function silenceExit() {
    const s = S.current
    if (s.ended) return
    s.ended = true
    s.answering = false
    stopSim(false)
    s.transcriber.end()
    s.meter.stop()
    s.recorder?.stop()
    go('ending')
    setSilentExit(true)
    say(SILENCE_GOODBYE)
  }

  function stopSim(resumeMic) {
    const s = S.current
    if (s.sim) clearInterval(s.sim)
    s.sim = null
    setSimulating(false)
    if (resumeMic && s.stage === 'listening' && !s.ended) {
      s.transcriber.resumeMic()
      s.meter.resume()
    }
  }

  async function finalizeAnswer() {
    const s = S.current
    if (!s.answering) return
    s.answering = false
    stopSim(false)
    s.meter.pause()
    await s.transcriber.flush() // wait for in-flight Scribe clips so the last words aren't lost
    const audioUrl = await s.recorder?.stop()
    s.recorder = null
    const { text, chunks } = s.transcriber.end()
    const vocal = s.meter.stop()
    const durationSec = (Date.now() - s.answerStart) / 1000
    const speakingSec = s.lastWordAt > s.answerStart ? (s.lastWordAt - s.answerStart) / 1000 + 0.5 : durationSec
    // Vocal scores only describe real mic audio, never a simulated answer.
    const answer = {
      question: s.questions[s.qIndex],
      text,
      chunks,
      durationSec,
      speakingSec,
      vocal: s.simUsed ? null : vocal,
      audioUrl: s.simUsed ? null : audioUrl,
    }
    s.answers.push(answer)
    s.pastFillers += liveMetrics(text, durationSec).fillers
    addLog('you', text || '(no answer heard)')
    return answer
  }

  async function endInterview(reason) {
    const s = S.current
    if (s.ended) return
    s.ended = true
    stopSpeaking()
    go('ending')
    await finalizeAnswer()
    say(persona.closing(config.name)) // keeps playing over the report
    onComplete({
      answers: s.answers,
      log: s.log,
      totalSec: (Date.now() - s.startTime) / 1000,
      reason,
      provider: s.provider,
      engine: s.transcriber.engine,
    })
  }

  async function nextQuestion() {
    const s = S.current
    if (s.stage !== 'listening') return
    go('thinking')
    const last = await finalizeAnswer()
    if (s.ended) return
    if (mann.followUps && !last.question.followUp && last.text) {
      const probe = followUpFor(liveMetrics(last.text, last.durationSec))
      if (probe) {
        const fu = { ...last.question, id: `${last.question.id}-fu`, text: probe, followUp: true }
        s.questions.splice(s.qIndex + 1, 0, fu)
        go('thinking')
        return askQuestion(s.qIndex + 1)
      }
    }
    const mainAnswers = s.answers.filter((a) => !a.question.followUp).length
    const done =
      (config.mode === 'count' && mainAnswers >= config.count) ||
      (config.mode === 'timed' && (Date.now() - s.startTime) / 1000 >= config.minutes * 60)
    if (done) return endInterview('complete')
    // React to what was actually said (never praise an empty answer).
    let reaction = reactTo(last, mann.acks)
    if (reaction && mann.backchannel && last.text) reaction = `${pick(BACKCHANNELS)} ${reaction}`
    if (reaction) {
      go('reacting')
      await say(reaction)
      if (s.ended) return
    }
    go('thinking')
    askQuestion(s.qIndex + 1)
  }

  async function repeatQuestion() {
    const s = S.current
    if (s.stage !== 'listening' || s.sim) return
    await sayOver(s.questions[s.qIndex].text)
  }

  function submitTyped(e) {
    e.preventDefault()
    const s = S.current
    const t = typed.trim()
    if (!t || s.stage !== 'listening') return
    s.transcriber.append(/[.!?]$/.test(t) ? t : t + '.')
    s.lastActivity = Date.now()
    s.nudges = 0
    setTyped('')
  }

  function simulateAnswer() {
    const s = S.current
    if (s.stage !== 'listening' || s.sim) return
    const words = SIM_ANSWERS[s.simCount++ % SIM_ANSWERS.length].split(/\s+/)
    s.transcriber.pauseMic()
    s.meter.pause()
    s.recorder?.pause()
    s.simUsed = true
    setSimulating(true)
    let k = 0
    s.sim = setInterval(() => {
      if (k >= words.length) return stopSim(true)
      s.transcriber.append(words[k++])
    }, 340) // ≈ 175 WPM
  }

  function updateMetrics() {
    const s = S.current
    if (s.stage !== 'listening') return
    const text = `${s.final} ${s.interim}`.trim()
    const m = liveMetrics(text, (Date.now() - s.answerStart) / 1000)
    if (m.words > 0) {
      s.conf = s.conf * 0.75 + m.confidence * 0.25 + (Math.random() - 0.5) * 2.4
      s.wpm = s.wpm ? s.wpm * 0.6 + m.wpm * 0.4 : m.wpm
    }
    const conf = Math.round(Math.max(1, Math.min(99, s.conf)))
    const vocal = s.simUsed ? null : s.meter.live()
    setMetrics({
      ...m,
      confidence: conf,
      wpm: Math.round(s.wpm),
      sessionFillers: s.pastFillers + m.fillers,
      tip: liveTip(m, s.wpm),
      vocal,
      level: s.meter.level(),
      simulated: s.simUsed,
    })
    if (++s.tick % 3 === 0) setHistory((h) => [...h.slice(-36), conf])
  }

  useEffect(() => {
    const s = S.current
    s.meter = createVoiceMeter(() => getAnalysers().mic)
    s.transcriber = createTranscriber({
      onUpdate: ({ final, interim, pending }) => {
        // Pace is measured from the first spoken word, not from when the mic opened.
        if (!s.final && !s.interim && (final || interim)) s.answerStart = Date.now() - 400
        if (final.length + interim.length > s.final.length + s.interim.length) {
          s.lastWordAt = Date.now()
          s.lastActivity = Date.now()
          s.nudges = 0
        }
        s.final = final
        s.interim = interim
        s.pending = pending
        setPending(pending)
        setTranscript({ final, interim })
      },
      onError: (err) => (err.startsWith('transcription') ? setSttError(err) : setMicStatus(err)),
      onEngine: setEngine,
    })
    initMic().then((ok) => setMicStatus(!ok ? 'denied' : s.transcriber.supported ? 'ready' : 'unsupported'))

    const clock = setInterval(() => {
      const el = (Date.now() - s.startTime) / 1000
      setElapsed(el)
      if (config.mode === 'timed' && el >= config.minutes * 60) endInterview('time')
      if (mann.interruptSec && s.stage === 'listening' && (Date.now() - s.answerStart) / 1000 > mann.interruptSec) interrupt()
      if (s.stage === 'listening' && !s.sim && !s.nudging && !s.ended) {
        // Your voice counts as activity even before the transcript catches up.
        if (s.meter.level() > 0.12 || s.pending) s.lastActivity = Date.now()
        const heard = `${s.final} ${s.interim}`.trim()
        if (!heard && Date.now() - s.lastActivity > NUDGE_AFTER_MS) nudge()
      }
    }, 250)
    const meter = setInterval(updateMetrics, 400)
    const keys = (e) => {
      if (e.target.tagName === 'INPUT') return
      if (e.key === 'n' || e.key === 'ArrowRight') nextQuestion()
      if (e.key === 's') simulateAnswer()
      if (e.key === 'r') repeatQuestion()
    }
    window.addEventListener('keydown', keys)
    askQuestion(0)

    return () => {
      clearInterval(clock)
      clearInterval(meter)
      window.removeEventListener('keydown', keys)
      if (s.sim) clearInterval(s.sim)
      s.ended = true
      s.transcriber.end()
      s.meter.stop()
      s.recorder?.stop()
    }
  }, [])

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [log, showLog])

  useEffect(() => {
    const el = transcriptRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [transcript])

  const listening = stage === 'listening'
  const qNumber = S.current.questions.slice(0, qIndex + 1).filter((x) => !x.followUp).length
  const total = config.mode === 'count' ? config.count : '∞'
  const remaining = config.minutes * 60 - elapsed
  const vizMode = speaking ? 'voice' : listening ? 'mic' : 'idle'
  const finalSegs = segmentText(transcript.final)

  return (
    <div className="interview">
      <header className="ibar">
        <Brand />
        <div className="ibar-mid">
          <span className={`rec ${listening ? 'on' : ''}`}>
            <i /> {listening ? 'REC' : 'PAUSED'}
          </span>
          <div className="stat">
            <span className="muted tiny">{config.mode === 'timed' ? 'REMAINING' : 'ELAPSED'}</span>
            <span className={`mono ${config.mode === 'timed' && remaining < 60 ? 'red' : ''}`}>
              {fmt(config.mode === 'timed' ? remaining : elapsed)}
            </span>
          </div>
          <div className="stat">
            <span className="muted tiny">QUESTION</span>
            <span className="mono">
              {String(qNumber).padStart(2, '0')} / {total}
            </span>
          </div>
          <div className="stat hide-sm">
            <span className="muted tiny">FORMAT</span>
            <span className="mono">{config.mode === 'endless' ? 'ENDLESS' : config.mode === 'timed' ? 'TIMED' : 'FIXED'}</span>
          </div>
        </div>
        <button className="btn danger" onClick={() => endInterview('manual')}>
          ■ End Interview
        </button>
      </header>

      <div className="ibody">
        <main className="stage">
          <div className="interviewer">
            <div className={`avatar ${speaking ? 'talking' : ''}`}>{persona.name[0]}</div>
            <div>
              <div className="who">
                {persona.name} <span className="muted tiny mono">· {persona.title}</span>
              </div>
              <div className="muted tiny mono">
                {provider === 'elevenlabs' && <span className="good">● ElevenLabs voice</span>}
                {provider === 'browser' && (
                  <span className="warn" title={ttsError || ''}>
                    ● Browser voice fallback{ttsError ? ` — ${ttsError}` : ''}
                  </span>
                )}
                {!provider && <span>● connecting voice…</span>}
              </div>
            </div>
            <span className="stage-label mono tiny">{STAGE_LABEL[stage]}</span>
          </div>

          <div className="question-card">
            <span className="mono tiny accent">
              {question?.followUp
                ? `Q${qNumber} · FOLLOW-UP`
                : question?.fromResume
                  ? `Q${qNumber} · FROM YOUR RESUME`
                  : `Q${qNumber}`}
            </span>
            <p key={question?.id}>{question ? question.text : 'Preparing your first question…'}</p>
          </div>

          <div className={`viz-wrap ${vizMode}`}>
            <Visualizer mode={vizMode} synthetic={speaking || simulating} />
            <span className="viz-caption mono tiny">
              {speaking
                ? `${persona.name.toUpperCase()} IS SPEAKING`
                : listening
                  ? simulating
                    ? 'SIMULATED ANSWER'
                    : 'MIC LIVE'
                  : 'STANDBY'}
            </span>
          </div>

          <div className="transcript" ref={transcriptRef}>
            {!transcript.final && !transcript.interim ? (
              <span className="muted">
                {pending
                  ? 'Transcribing…'
                  : listening
                    ? engine === 'scribe'
                      ? 'Start speaking. Your words appear here each time you pause.'
                      : 'Start speaking. Your words appear here in real time.'
                    : 'Listen to the question…'}
              </span>
            ) : (
              <>
                {finalSegs.map((seg, i) =>
                  seg.type === 'text' ? (
                    <span key={i}>{seg.text}</span>
                  ) : (
                    <mark key={i} className={`hl-${seg.type}`}>
                      {seg.text}
                    </mark>
                  ),
                )}{' '}
                <span className="interim">{transcript.interim}</span>
                {pending && <span className="interim"> transcribing…</span>}
              </>
            )}
          </div>

          <form className="typebox" onSubmit={submitTyped}>
            <input
              value={typed}
              onChange={(e) => {
                setTyped(e.target.value)
                S.current.lastActivity = Date.now()
              }}
              disabled={!listening || simulating}
              placeholder={
                listening ? 'Mic not working? Type your answer here and press Enter' : 'Typing opens when it’s your turn'
              }
              aria-label="Type your answer"
            />
            <button className="btn ghost" disabled={!listening || !typed.trim()}>
              Add
            </button>
          </form>

          {(micStatus === 'denied' || micStatus === 'not-allowed' || engine === 'none') && (
            <div className="notice">
              {engine === 'none'
                ? 'This browser can’t capture speech. Type your answers below, or switch to Chrome or Edge.'
                : 'Microphone access is blocked. Allow the mic in your browser’s address bar, or type your answers below.'}
            </div>
          )}
          {engine === 'scribe' && micStatus !== 'denied' && (
            <div className="notice info">
              {browserNote || 'Your browser’s speech service is blocked, so MockView transcribes with ElevenLabs Scribe instead.'}{' '}
              Words appear after each pause.
            </div>
          )}
          {sttError && <div className="notice">ElevenLabs Scribe: {sttError}. You can type your answer instead.</div>}

          <div className="controls">
            <button className="btn ghost" onClick={repeatQuestion} disabled={!listening || simulating}>
              ↻ Repeat <kbd>R</kbd>
            </button>
            <button className="btn ghost" onClick={simulateAnswer} disabled={!listening || simulating}>
              ✦ Simulate answer <kbd>S</kbd>
            </button>
            <button className="btn primary" onClick={nextQuestion} disabled={!listening}>
              {config.mode === 'count' && qNumber >= config.count && !mann.followUps ? 'Finish' : 'Next'} <kbd>N</kbd>
            </button>
          </div>

          <section className="convo">
            <button className="convo-head" onClick={() => setShowLog((v) => !v)}>
              <span className="mono tiny">CONVERSATION LOG · {log.length}</span>
              <span className="muted tiny mono">
                {ENGINE_LABEL[engine]} · {showLog ? 'hide' : 'show'}
              </span>
            </button>
            {showLog && (
              <ol className="convo-list" ref={logRef}>
                {log.length === 0 && <li className="muted tiny">Everything said in this session is logged here.</li>}
                {log.map((l, i) => (
                  <li key={i} className={`turn ${l.who}`}>
                    <span className="mono tiny who-tag">{l.who === 'you' ? 'YOU' : persona.name.toUpperCase()}</span>
                    <span className={l.text === '(no answer heard)' ? 'muted' : ''}>{l.text}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </main>

        <LiveSidebar metrics={metrics} history={history} stage={stage} coaching={config.coaching} />
      </div>

      {silentExit && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="silent-title">
          <div className="dialog">
            <h2 id="silent-title">We couldn’t hear you</h2>
            <p className="muted">
              {persona.name} didn’t hear an answer for a while, so the interview stopped. Check that your microphone is plugged in
              and allowed for this site, then restart. If voice still doesn’t work, you can type your answers.
            </p>
            <div className="row">
              <button className="btn primary" onClick={onRestart}>
                Restart interview
              </button>
              <button className="btn ghost" onClick={onExit}>
                Back to setup
              </button>
              {S.current.answers.some((a) => a.text) && (
                <button
                  className="btn ghost"
                  onClick={() =>
                    onComplete({
                      answers: S.current.answers,
                      log: S.current.log,
                      totalSec: (Date.now() - S.current.startTime) / 1000,
                      reason: 'silence',
                      provider: S.current.provider,
                      engine: S.current.transcriber.engine,
                    })
                  }
                >
                  See report so far
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
