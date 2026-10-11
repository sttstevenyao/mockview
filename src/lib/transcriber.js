// Turns the candidate's voice into a transcript buffer. Two engines:
//  • webspeech — the browser's built-in recognizer (Chrome/Edge/Safari): zero latency, live interim words.
//  • scribe    — ElevenLabs Scribe via /api/stt, for browsers where the built-in recognizer is
//                missing or blocked (Brave blocks it on purpose; Firefox doesn't ship it). The mic is
//                recorded in pause-to-pause clips and each clip is transcribed as soon as you pause.
// Typed answers and "Simulate answer" words are injected through append().
// In Scribe mode, real-time streaming (scribe_v2_realtime) is tried first; the clip
// approach below is the fallback.
import { LANGS } from '../data/i18n.js'
import { getAnalysers, getMicStream } from './audio.js'

const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
const isBrave = typeof navigator !== 'undefined' && Boolean(navigator.brave)
const canRecord =
  typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)

export const defaultEngine = SR && !isBrave ? 'webspeech' : canRecord ? 'scribe' : 'none'
export const speechSupported = defaultEngine !== 'none'
export const browserNote = isBrave
  ? 'Brave blocks built-in speech recognition, so MockView transcribes with ElevenLabs Scribe instead.'
  : !SR && canRecord
    ? 'This browser has no built-in speech recognition, so MockView transcribes with ElevenLabs Scribe instead.'
    : ''
export const ENGINE_LABEL = { webspeech: 'Browser speech recognition', scribe: 'ElevenLabs Scribe', none: 'Unavailable' }

// Scribe clip segmentation (mic RMS, noise-suppressed input).
const VOICE_RMS = 0.01
const PAUSE_MS = 700 // a pause this long ends a clip…
const MIN_CLIP_MS = 1200 // …once the clip is at least this long
const MAX_CLIP_MS = 14000
const MIN_SPEECH_MS = 300 // clips with less voiced audio than this are dropped, never sent

const pickMime = () =>
  ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) => window.MediaRecorder?.isTypeSupported?.(t)) || ''

const toBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] || '')
    r.onerror = reject
    r.readAsDataURL(blob)
  })

export function createTranscriber({ onUpdate, onError, onEngine, lang = 'en' }) {
  const L = LANGS[lang] || LANGS.en
  let engine = defaultEngine
  let micOn = false
  let finalText = ''
  let interim = ''
  let chunks = []
  let injected = ''
  let gen = 0 // bumps on every begin() so late results from an old answer are ignored

  // Scribe state
  let pending = 0
  let seq = 0
  let nextSeq = 0
  let ready = {}
  let waiters = []

  const emit = () => onUpdate({ final: finalText.trim(), interim: interim.trim(), pending: pending > 0 })
  const addFinal = (t) => {
    t = t.trim()
    if (!t) return
    finalText += t + ' '
    chunks.push(t)
  }

  // ── Web Speech engine ──────────────────────────
  let rec = null
  const startRec = () => {
    if (!SR || !micOn) return
    rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = L.speech
    rec.onresult = (e) => {
      let live = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) addFinal(r[0].transcript)
        else live += r[0].transcript
      }
      interim = live
      emit()
    }
    rec.onerror = (e) => {
      if (e.error === 'not-allowed') {
        micOn = false
        onError?.(e.error)
      } else if ((e.error === 'network' || e.error === 'service-not-allowed') && canRecord && engine === 'webspeech') {
        // The recognizer exists but its service is blocked (e.g. Brave Shields) → switch to Scribe.
        stopRec()
        engine = 'scribe'
        onEngine?.(engine)
        micOn = true
        startMic()
      }
    }
    // Chrome ends recognition after a few seconds of silence; keep it alive.
    rec.onend = () => {
      if (micOn && engine === 'webspeech') setTimeout(() => micOn && engine === 'webspeech' && startRec(), 120)
    }
    try {
      rec.start()
    } catch {}
  }
  const stopRec = () => {
    const r = rec
    rec = null
    try {
      r?.stop()
    } catch {}
    if (interim.trim()) addFinal(interim)
    interim = ''
  }

  // ── Scribe engine ──────────────────────────────
  let recorder = null
  let monitor = null
  let clip = null // { start, speechMs, lastVoice }
  const buf = new Float32Array(2048)

  const settle = () => {
    if (pending === 0) {
      waiters.forEach((w) => w())
      waiters = []
    }
  }
  const deliver = () => {
    while (nextSeq in ready) {
      addFinal(ready[nextSeq])
      delete ready[nextSeq++]
    }
    emit()
  }

  async function send(blob, mime, mySeq, myGen) {
    try {
      const audio = await toBase64(blob)
      const r = await fetch('/api/stt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio, mime, lang: L.scribe }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`)
      if (myGen === gen)
        ready[mySeq] = String(data.text || '')
          .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
          .replace(/\s+/g, ' ')
    } catch (e) {
      if (myGen === gen) {
        ready[mySeq] = ''
        onError?.(`transcription failed: ${e.message}`)
      }
    } finally {
      if (myGen === gen) {
        pending--
        deliver()
      }
      settle()
    }
  }

  const startClip = () => {
    if (!micOn || engine !== 'scribe') return
    const stream = getMicStream()
    if (!stream) return setTimeout(startClip, 300) // mic permission still pending
    const mime = pickMime()
    const parts = []
    const myClip = { start: Date.now(), speechMs: 0, lastVoice: Date.now() }
    const r = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
    r.ondataavailable = (e) => e.data?.size && parts.push(e.data)
    r.onstop = () => {
      // Silence is never sent: a clip without real speech can't turn into invented words.
      if (myClip.speechMs < MIN_SPEECH_MS || !parts.length) return settle()
      pending++
      emit()
      send(new Blob(parts, { type: r.mimeType || mime }), r.mimeType || mime, seq++, gen)
    }
    recorder = r
    clip = myClip
    r.start()
    if (!monitor) monitor = setInterval(watch, 100)
  }

  const cutClip = (restart) => {
    const r = recorder
    recorder = null
    clip = null
    try {
      if (r?.state === 'recording') r.stop()
    } catch {}
    if (restart) startClip()
  }

  function watch() {
    const an = getAnalysers().mic
    if (!clip || !an) return
    an.getFloatTimeDomainData(buf)
    let sum = 0
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
    const now = Date.now()
    if (Math.sqrt(sum / buf.length) > VOICE_RMS) {
      clip.speechMs += 100
      clip.lastVoice = now
    }
    const len = now - clip.start
    const paused = clip.speechMs >= MIN_SPEECH_MS && now - clip.lastVoice > PAUSE_MS && len > MIN_CLIP_MS
    if (paused || len > MAX_CLIP_MS) cutClip(true)
  }

  const stopScribe = () => {
    clearInterval(monitor)
    monitor = null
    cutClip(false)
  }

  // ── Real-time Scribe (scribe_v2_realtime) ──────
  // Streams the mic over a WebSocket and returns words while you talk. Opened per answer
  // with a single-use token from /api/stt. Falls back to pause-to-pause clips if it fails.
  let rt = null
  let rtFailed = false
  const rtFallback = () => {
    rtFailed = true
    if (micOn && engine === 'scribe') startClip()
  }
  const closeRt = (entry) => {
    entry.closed = true
    try {
      entry.conn?.close()
    } catch {}
  }

  async function startRealtime() {
    const myGen = gen
    let conn, events
    try {
      const r = await fetch('/api/stt', { cache: 'no-store' })
      const { token } = await r.json()
      if (!token) throw new Error('no token')
      if (!micOn || myGen !== gen || engine !== 'scribe') return
      const sdk = await import('@elevenlabs/client')
      if (!micOn || myGen !== gen) return
      events = sdk.RealtimeEvents
      conn = sdk.Scribe.connect({
        token,
        modelId: 'scribe_v2_realtime',
        languageCode: L.scribe,
        commitStrategy: sdk.CommitStrategy.VAD,
        microphone: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
    } catch {
      return rtFallback()
    }
    const entry = { conn, gen: myGen, started: false, closed: false }
    rt = entry
    const fail = () => {
      clearTimeout(timer)
      if (entry.started || entry.closed) return
      closeRt(entry)
      if (rt === entry) rt = null
      rtFallback()
    }
    const timer = setTimeout(fail, 5000)
    conn.on(events.SESSION_STARTED, () => {
      entry.started = true
      clearTimeout(timer)
    })
    conn.on(events.PARTIAL_TRANSCRIPT, (d) => {
      if (entry.gen !== gen) return
      interim = d?.text || ''
      emit()
    })
    conn.on(events.COMMITTED_TRANSCRIPT, (d) => {
      if (entry.gen !== gen) return
      addFinal(d?.text || '')
      interim = ''
      emit()
      entry.onCommit?.()
    })
    for (const ev of [events.ERROR, events.AUTH_ERROR, events.CLOSE]) conn.on(ev, fail)
  }

  // Commits what's been said, waits for the final text (max 1.5 s), then closes.
  function stopRealtime() {
    const entry = rt
    rt = null
    if (!entry) return
    if (!entry.started) return closeRt(entry)
    pending++
    emit()
    let t
    const finish = () => {
      if (entry.finished) return
      entry.finished = true
      clearTimeout(t)
      if (entry.gen === gen) {
        if (interim.trim()) addFinal(interim)
        interim = ''
        pending = Math.max(0, pending - 1)
        emit()
      }
      closeRt(entry)
      settle()
    }
    entry.onCommit = finish
    t = setTimeout(finish, 1500)
    try {
      entry.conn.commit()
    } catch {
      finish()
    }
  }

  // ── Shared controls ────────────────────────────
  const startMic = () =>
    engine === 'webspeech' ? startRec() : engine === 'scribe' ? (rtFailed ? startClip() : startRealtime()) : null
  const stopMic = () => {
    micOn = false
    stopRec()
    stopScribe()
    stopRealtime()
  }

  return {
    get engine() {
      return engine
    },
    supported: speechSupported,
    begin() {
      gen++
      finalText = ''
      interim = ''
      chunks = []
      injected = ''
      pending = 0
      seq = 0
      nextSeq = 0
      ready = {}
      micOn = true
      startMic()
      emit()
    },
    pauseMic: stopMic,
    resumeMic() {
      micOn = true
      startMic()
    },
    append(text) {
      finalText += text + ' '
      injected += text + ' '
      if (/[.!?]$/.test(text)) {
        chunks.push(injected.trim())
        injected = ''
      }
      emit()
    },
    // Resolves once in-flight Scribe clips are transcribed (max 6 s), so nothing said right
    // before "Next" is lost. Instant for the Web Speech engine.
    flush() {
      stopMic()
      return new Promise((resolve) => {
        // onstop fires asynchronously, so give a just-stopped recorder a beat to queue its clip.
        setTimeout(() => {
          if (pending === 0) return resolve()
          const t = setTimeout(resolve, 6000)
          waiters.push(() => {
            clearTimeout(t)
            resolve()
          })
        }, 150)
      })
    },
    end() {
      stopMic()
      if (injected.trim()) chunks.push(injected.trim())
      injected = ''
      emit()
      return { text: finalText.trim(), chunks: [...chunks] }
    },
  }
}
