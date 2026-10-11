import { useEffect, useRef, useState } from 'react'
import Brand from './Brand.jsx'
import Visualizer from './Visualizer.jsx'
import LiveSidebar from './LiveSidebar.jsx'
import {
  BACKCHANNELS,
  buildQueue,
  queueTrack,
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
import { countWordsIn, foreignMetrics, foreignTip, liveMetrics, liveTip, segmentText } from '../lib/analysis.js'
import { fetchSpeech, speak, stopSpeaking } from '../lib/tts.js'
import { createTranscriber, defaultEngine } from '../lib/transcriber.js'
import { getAnalysers, getMicStream, initMic } from '../lib/audio.js'
import { NUDGES, reactTo, SILENCE_GOODBYE } from '../lib/reactions.js'
import { translateQuestion } from '../data/translations.js'
import { lang as langInfo, LINES, localReaction } from '../data/i18n.js'
import { createVoiceMeter } from '../lib/voiceAnalysis.js'

const fmt = (s) => {
  s = Math.max(0, Math.floor(s))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
const pick = (a) => a[Math.floor(Math.random() * a.length)]
const BREAK = '<break time="0.6s" />' // ElevenLabs pause tag: a natural beat before the question
// Lead-in and question as one utterance, with a short ElevenLabs pause between them.
const line = (lead, text) => (lead ? `${lead} ${BREAK} ${text}` : text)
const plain = (t) =>
  t
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
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
  wpm: 0,
  fillers: 0,
  fillerBreakdown: {},
  star: { situation: false, task: false, action: false, result: false },
  tip: 'Your interviewer is about to ask the first question.',
}

const STAGE_LABEL = {
  asking: 'Interviewer speaking',
  listening: 'Your turn. Answer out loud.',
  thinking: 'Next question…',
  reacting: 'Interviewer responding',
  ending: 'Wrapping up…',
}

export default function Interview({ config, onComplete, onRestart, onExit }) {
  const persona = PERSONAS[config.persona]
  const mann = config.mannerisms
  const opts = config.settings // Settings tab
  // Interviewer language (OUT) and answer language (IN), chosen separately. LOCAL holds the non-English lines.
  const OUT = langInfo(opts.outLang) === langInfo('en') ? 'en' : opts.outLang
  const IN = langInfo(opts.inLang) === langInfo('en') ? 'en' : opts.inLang
  const LOCAL = LINES[OUT]
  // The question as the interviewer asks it. Resume questions are written on the fly, so they stay English.
  const ask = (q) => (q && LOCAL ? translateQuestion(q, OUT) || q.text : q?.text || '')
  const voiceOpts = {
    lang: OUT,
    voiceId: config.voiceId,
    quality: opts.voiceQuality,
    speed: Math.min(1.2, Math.max(0.7, mann.speed * opts.voiceSpeed)),
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
  const [simulating, setSimulating] = useState(false)
  const [micStatus, setMicStatus] = useState('pending')
  const [engine, setEngine] = useState(defaultEngine)
  const [sttError, setSttError] = useState(null)
  const [pending, setPending] = useState(false)
  const [typed, setTyped] = useState('')
  const [log, setLog] = useState([])
  const [showLog, setShowLog] = useState(true)
  const [silentExit, setSilentExit] = useState(false)
  const [caption, setCaption] = useState('') // what the interviewer is saying right now
  const transcriptRef = useRef(null)
  const logRef = useRef(null)

  // Mutable session state read by timers and async flows (avoids stale closures).
  const S = useRef(null)
  if (!S.current)
    S.current = {
      questions: buildQueue(queueTrack(config), config.resumeQuestions),
      answers: [],
      stage: 'asking',
      qIndex: 0,
      answering: false,
      ended: false,
      startTime: Date.now(),
      answerStart: 0,
      final: '',
      interim: '',
      wpm: 0,
      nextLead: null,
      sim: null,
      simCount: 0,
      transcriber: null,
      meter: null,
      simUsed: false,
      typedUsed: false,
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

  const say = async (text, onBegin, { log = true } = {}) => {
    if (!plain(text)) return
    if (log) addLog('interviewer', text)
    await speak(text, voiceOpts, (prov, err) => {
      S.current.provider = prov
      setProvider(prov)
      setTtsError(err || null)
      setSpeaking(true)
      setCaption(plain(text))
      onBegin?.()
    })
    setSpeaking(false)
    setCaption('')
  }

  async function askQuestion(i) {
    const s = S.current
    if (s.ended) return
    if (i + 1 >= s.questions.length) s.questions = extendQueue(s.questions, queueTrack(config))
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
        ? opts.skipIntro
          ? ''
          : LOCAL
            ? LOCAL.intro(config.name)
            : persona.intro(
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
    await say(line(lead, ask(q)), () => {
      // Prefetch the next question's audio while this one plays → no gap later.
      if (next) fetchSpeech(line(s.nextLead, ask(next)), voiceOpts).catch(() => {})
    })
    if (s.ended || s.qIndex !== i) return

    s.answerStart = Date.now()
    s.wpm = 0
    s.answering = true
    s.lastWordAt = 0
    s.simUsed = false
    s.typedUsed = false
    s.interrupted = false
    s.transcriber.begin()
    s.meter.start()
    s.recorder = recordAnswer()
    go('listening')
  }

  // Lead-in before the next question. The reaction to your answer is spoken separately,
  // so this stays generic and the question audio can be prefetched while you answer.
  function makeLead() {
    return mann.acks === 'none' ? '' : pick(LOCAL ? LOCAL.transitions : TRANSITIONS)
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
    return mann.backchannel && !LOCAL ? pick(BACKCHANNELS) : ''
  }

  async function interrupt() {
    const s = S.current
    if (s.stage !== 'listening' || s.sim || s.interrupted) return
    s.interrupted = true
    await sayOver(LOCAL ? LOCAL.interrupt : pick(INTERRUPTS))
  }

  // Nothing heard for a while → "what?"; still nothing after that → stop and ask for a restart.
  async function nudge() {
    const s = S.current
    if (s.ended || s.nudging) return
    if (s.nudges >= MAX_NUDGES) return silenceExit()
    s.nudging = true
    const lines = LOCAL ? LOCAL.nudges : NUDGES
    await sayOver(lines[s.nudges++ % lines.length])
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
    say(LOCAL ? LOCAL.goodbye : SILENCE_GOODBYE)
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
    // Pace and vocal scores only describe real speech, never a simulated or typed answer.
    const spoken = !s.simUsed && !s.typedUsed
    const answer = {
      question: s.questions[s.qIndex],
      text,
      chunks,
      durationSec,
      speakingSec,
      typed: s.typedUsed,
      vocal: spoken ? vocal : null,
      audioUrl: spoken ? audioUrl : null,
    }
    s.answers.push(answer)
    addLog('you', text || '(no answer heard)')
    return answer
  }

  async function endInterview(reason) {
    const s = S.current
    if (s.ended) return
    s.ended = true
    stopSpeaking()
    go('ending')
    const last = await finalizeAnswer()
    // Stopped before answering the current question: it was never answered, so it isn't graded as skipped.
    if (reason !== 'complete' && last && countWordsIn(last.text, IN) < 3) {
      s.answers.pop()
      s.log = s.log.slice(0, -1)
    }
    say(LOCAL ? LOCAL.closing(config.name) : persona.closing(config.name)) // keeps playing over the report
    onComplete({
      answers: s.answers,
      log: s.log,
      totalSec: (Date.now() - s.startTime) / 1000,
      reason,
      provider: s.provider,
      engine: s.transcriber.engine,
      lang: IN,
      outLang: OUT,
      planned: config.mode === 'count' ? config.count : null,
    })
  }

  async function nextQuestion() {
    const s = S.current
    if (s.stage !== 'listening') return
    go('thinking')
    const last = await finalizeAnswer()
    if (s.ended) return
    if (mann.followUps && !last.question.followUp && !last.question.basic && last.text) {
      const probe = IN === 'en' ? followUpFor(liveMetrics(last.text, last.durationSec)) : null
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
    let reaction = opts.reactions
      ? reactTo(last, mann.acks, { langId: IN, say: LOCAL ? (kind) => localReaction(OUT, kind) : null })
      : ''
    if (reaction && mann.backchannel && last.text && !LOCAL) reaction = `${pick(BACKCHANNELS)} ${reaction}`
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
    await sayOver(ask(s.questions[s.qIndex]))
  }

  function submitTyped(e) {
    e.preventDefault()
    const s = S.current
    const t = typed.trim()
    if (!t || !s.answering) return // works while the interviewer is mid-prompt too
    s.transcriber.append(/[.!?]$/.test(t) ? t : t + '.')
    s.typedUsed = true // typing speed isn't speaking pace
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
    const sec = s.typedUsed ? 0 : (Date.now() - s.answerStart) / 1000 // no pace for typed answers
    const m = IN === 'en' ? liveMetrics(text, sec) : foreignMetrics(text, sec, IN)
    // Smooth pace so the marker doesn't jump with every recognized word.
    if (s.typedUsed) s.wpm = 0
    else if (m.words > 0) s.wpm = s.wpm ? s.wpm * 0.6 + m.wpm * 0.4 : m.wpm
    const tip = IN === 'en' ? liveTip(m, s.wpm, s.questions[s.qIndex]?.basic) : foreignTip(m, s.wpm, IN)
    setMetrics({ ...m, wpm: Math.round(s.wpm), tip })
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
      lang: IN,
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
        if (opts.silenceSec && !heard && Date.now() - s.lastActivity > opts.silenceSec * 1000) nudge()
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
  const asked = ask(question)
  const rtl = langInfo(OUT).rtl
  // Typing stays open for the whole answer, even while the interviewer asks "what was that?".
  const canType = listening || (stage === 'asking' && S.current.answering)

  return (
    <div className="interview">
      <header className="ibar">
        <Brand
          onClick={() => {
            if (!window.confirm('Leave this interview? Your answers so far won’t be graded.')) return
            stopSpeaking()
            onExit()
          }}
        />
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
        </div>
        <button className="btn danger" onClick={() => endInterview('manual')}>
          End interview
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
                {provider === 'elevenlabs' && <span className="good">ElevenLabs voice</span>}
                {provider === 'browser' && (
                  <span className="warn" title={ttsError || ''}>
                    Browser voice fallback{ttsError ? `: ${ttsError}` : ''}
                  </span>
                )}
                {!provider && <span>Connecting voice…</span>}
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
            <p key={question?.id} lang={OUT} dir={rtl ? 'rtl' : undefined}>
              {question ? asked : 'Preparing your first question…'}
            </p>
            {question && asked !== question.text && (
              <p className="q-english" lang="en" key={`${question.id}-en`}>
                {question.text}
              </p>
            )}
          </div>

          <div className={`viz-wrap ${vizMode}`}>
            <Visualizer mode={vizMode} synthetic={speaking || simulating} />
            <span className="viz-caption mono tiny">
              {speaking ? 'INTERVIEWER' : listening ? (simulating ? 'SIMULATED' : 'MIC LIVE') : 'STANDBY'}
            </span>
            {opts.captions && caption && (
              <p className="caption" key={caption}>
                {caption}
              </p>
            )}
          </div>
          <div className="sr-only" aria-live="polite">
            {caption}
          </div>

          <div className="transcript" ref={transcriptRef}>
            {!opts.showTranscript ? (
              <span className="muted">{listening ? 'Transcript hidden' : 'Listen to the question…'}</span>
            ) : !transcript.final && !transcript.interim ? (
              <span className="muted">
                {pending ? 'Transcribing…' : listening ? 'Start speaking' : 'Listen to the question…'}
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
              disabled={!canType || simulating}
              placeholder="Or type your answer"
              aria-label="Type your answer"
            />
            <button className="btn ghost" disabled={!canType || !typed.trim()}>
              Add
            </button>
          </form>

          {(micStatus === 'denied' || micStatus === 'not-allowed' || engine === 'none') && (
            <div className="notice">
              {engine === 'none' ? 'Voice input isn’t available in this browser.' : 'Microphone blocked.'}
            </div>
          )}
          {sttError && <div className="notice">Transcription error: {sttError}</div>}

          <div className="controls">
            <button className="btn ghost" onClick={repeatQuestion} disabled={!listening || simulating}>
              Repeat <kbd>R</kbd>
            </button>
            <button className="btn ghost" onClick={simulateAnswer} disabled={!listening || simulating}>
              Simulate answer <kbd>S</kbd>
            </button>
            <button className="btn primary" onClick={nextQuestion} disabled={!listening}>
              {config.mode === 'count' && qNumber >= config.count && !mann.followUps ? 'Finish' : 'Next'} <kbd>N</kbd>
            </button>
          </div>
        </main>

        <LiveSidebar metrics={metrics} stage={stage} coaching={opts.coaching} star={!question?.basic && IN === 'en'}>
          <section className="convo">
            <button className="convo-head" onClick={() => setShowLog((v) => !v)}>
              <span className="mono tiny">CONVERSATION · {log.length}</span>
              <span className="muted tiny mono">{showLog ? 'hide' : 'show'}</span>
            </button>
            {showLog && (
              <ol className="convo-list" ref={logRef}>
                {log.map((l, i) => (
                  <li key={i} className={`turn ${l.who}`}>
                    <span className="mono tiny who-tag">{l.who === 'you' ? 'YOU' : 'INTERVIEWER'}</span>
                    <span className={l.text === '(no answer heard)' ? 'muted' : ''}>{l.text}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </LiveSidebar>
      </div>

      {silentExit && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="silent-title">
          <div className="dialog">
            <h2 id="silent-title">We couldn’t hear you</h2>
            <p className="muted">Check your microphone and try again.</p>
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
                      lang: IN,
                      outLang: OUT,
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
