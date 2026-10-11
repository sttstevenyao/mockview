import { useEffect, useRef, useState } from 'react'
import Brand from './Brand.jsx'
import Visualizer from './Visualizer.jsx'
import LiveSidebar from './LiveSidebar.jsx'
import {
  ACK_STYLES,
  BACKCHANNELS,
  buildQueue,
  describeFormat,
  extendQueue,
  followUpFor,
  INTERRUPTS,
  PERSONAS,
  SIM_ANSWERS,
  TRANSITIONS,
} from '../data/questions.js'
import { liveMetrics, liveTip, segmentText } from '../lib/analysis.js'
import { fetchSpeech, speak, stopSpeaking } from '../lib/tts.js'
import { createTranscriber } from '../lib/transcriber.js'
import { getAnalysers, initMic } from '../lib/audio.js'
import { createVoiceMeter } from '../lib/voiceAnalysis.js'

const fmt = (s) => {
  s = Math.max(0, Math.floor(s))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
const pick = (a) => a[Math.floor(Math.random() * a.length)]
const BREAK = '<break time="0.6s" />' // ElevenLabs pause tag: a natural beat before the question

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
  ending: 'Wrapping up…',
}

export default function Interview({ config, onComplete }) {
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
  const transcriptRef = useRef(null)

  // Mutable session state read by timers and async flows (avoids stale closures).
  const S = useRef(null)
  if (!S.current)
    S.current = {
      questions: buildQueue(config.track),
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
    }

  const go = (stage) => {
    S.current.stage = stage
    setStage(stage)
  }

  const say = async (text, onBegin) => {
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
      i === 0 ? persona.intro(config.name, describeFormat(config)) : q.followUp ? followUpLead() : (s.nextLead ?? makeLead())
    const next = s.questions[i + 1]
    s.nextLead = makeLead()
    await say(`${lead} ${BREAK} ${q.text}`, () => {
      // Prefetch the next question's audio while this one plays → no gap later.
      if (next) fetchSpeech(`${s.nextLead} ${BREAK} ${next.text}`, voiceOpts).catch(() => {})
    })
    if (s.ended || s.qIndex !== i) return

    s.answerStart = Date.now()
    s.wpm = 0
    s.answering = true
    s.simUsed = false
    s.interrupted = false
    s.transcriber.begin()
    s.meter.start()
    go('listening')
  }

  // Interviewer mannerisms: acknowledgement + optional backchannel + transition.
  function makeLead() {
    const ack = pick(ACK_STYLES[mann.acks].lines)
    const parts = mann.backchannel ? [pick(BACKCHANNELS), ack, pick(TRANSITIONS)] : [ack]
    return parts.filter(Boolean).join(' ')
  }
  function followUpLead() {
    return mann.backchannel ? pick(BACKCHANNELS) : ''
  }

  async function interrupt() {
    const s = S.current
    if (s.stage !== 'listening' || s.sim || s.interrupted) return
    s.interrupted = true
    s.transcriber.pauseMic()
    s.meter.pause()
    go('asking')
    await say(pick(INTERRUPTS))
    if (s.ended) return
    go('listening')
    s.transcriber.resumeMic()
    s.meter.resume()
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

  function finalizeAnswer() {
    const s = S.current
    if (!s.answering) return
    s.answering = false
    stopSim(false)
    const { text, chunks } = s.transcriber.end()
    const vocal = s.meter.stop()
    const durationSec = (Date.now() - s.answerStart) / 1000
    // Vocal scores only describe real mic audio, never a simulated answer.
    s.answers.push({ question: s.questions[s.qIndex], text, chunks, durationSec, vocal: s.simUsed ? null : vocal })
    s.pastFillers += liveMetrics(text, durationSec).fillers
  }

  function endInterview(reason) {
    const s = S.current
    if (s.ended) return
    s.ended = true
    stopSpeaking()
    finalizeAnswer()
    go('ending')
    say(persona.closing(config.name)) // keeps playing over the report
    onComplete({ answers: s.answers, totalSec: (Date.now() - s.startTime) / 1000, reason, provider: s.provider })
  }

  function nextQuestion() {
    const s = S.current
    if (s.stage !== 'listening') return
    finalizeAnswer()
    const last = s.answers[s.answers.length - 1]
    if (mann.followUps && !last.question.followUp) {
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
    go('thinking')
    askQuestion(s.qIndex + 1)
  }

  async function repeatQuestion() {
    const s = S.current
    if (s.stage !== 'listening' || s.sim) return
    s.transcriber.pauseMic()
    s.meter.pause()
    go('asking')
    await say(s.questions[s.qIndex].text)
    if (s.ended) return
    go('listening')
    s.transcriber.resumeMic()
    s.meter.resume()
  }

  function simulateAnswer() {
    const s = S.current
    if (s.stage !== 'listening' || s.sim) return
    const words = SIM_ANSWERS[s.simCount++ % SIM_ANSWERS.length].split(/\s+/)
    s.transcriber.pauseMic()
    s.meter.pause()
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
      onUpdate: ({ final, interim }) => {
        // Pace is measured from the first spoken word, not from when the mic opened.
        if (!s.final && !s.interim && (final || interim)) s.answerStart = Date.now() - 400
        s.final = final
        s.interim = interim
        setTranscript({ final, interim })
      },
      onError: (err) => setMicStatus(err),
    })
    initMic().then((ok) => setMicStatus(!ok ? 'denied' : s.transcriber.supported ? 'ready' : 'unsupported'))

    const clock = setInterval(() => {
      const el = (Date.now() - s.startTime) / 1000
      setElapsed(el)
      if (config.mode === 'timed' && el >= config.minutes * 60) endInterview('time')
      if (mann.interruptSec && s.stage === 'listening' && (Date.now() - s.answerStart) / 1000 > mann.interruptSec) interrupt()
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
    }
  }, [])

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
                    ● Browser voice fallback
                  </span>
                )}
                {!provider && <span>● connecting voice…</span>}
              </div>
            </div>
            <span className="stage-label mono tiny">{STAGE_LABEL[stage]}</span>
          </div>

          <div className="question-card">
            <span className="mono tiny accent">{question?.followUp ? `Q${qNumber} · FOLLOW-UP` : `Q${qNumber}`}</span>
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
                {listening ? 'Start speaking — your words appear here in real time.' : 'Listen to the question…'}
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
              </>
            )}
          </div>

          {(micStatus === 'denied' || micStatus === 'not-allowed' || micStatus === 'unsupported') && (
            <div className="notice">
              Microphone or speech recognition unavailable ({micStatus}). Use Chrome/Edge and allow mic access — or press
              <b> Simulate answer</b> to demo.
            </div>
          )}

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
        </main>

        <LiveSidebar metrics={metrics} history={history} stage={stage} coaching={config.coaching} />
      </div>
    </div>
  )
}
