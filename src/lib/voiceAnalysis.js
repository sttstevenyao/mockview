// Acoustic analysis of the candidate's microphone: how the answer *sounds*,
// independent of the words. Samples the mic AnalyserNode every 100 ms and
// tracks loudness (projection), pitch variation (monotone vs. expressive),
// volume steadiness, and pauses. Pure Web Audio math — no network calls.

const SAMPLE_MS = 100
const LONG_PAUSE_SEC = 1.2

const lerp = (x, x0, x1, y0, y1) => y0 + ((Math.min(Math.max(x, x0), x1) - x0) / (x1 - x0)) * (y1 - y0)
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0)
const std = (a) => {
  if (a.length < 2) return 0
  const m = mean(a)
  return Math.sqrt(mean(a.map((v) => (v - m) ** 2)))
}
const median = (a) => {
  if (!a.length) return 0
  const s = [...a].sort((x, y) => x - y)
  return s[Math.floor(s.length / 2)]
}

// Normalized autocorrelation pitch detector (75–400 Hz covers adult speech).
function detectPitch(buf, sampleRate, rms) {
  if (rms < 0.01) return 0
  const n = buf.length
  const minLag = Math.floor(sampleRate / 400)
  const maxLag = Math.min(Math.floor(sampleRate / 75), n - 1)
  let energy = 0
  for (let i = 0; i < n; i++) energy += buf[i] * buf[i]
  energy /= n
  let bestLag = 0
  let best = 0
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let c = 0
    for (let i = 0; i < n - lag; i += 2) c += buf[i] * buf[i + lag]
    c /= (n - lag) / 2
    if (c > best) {
      best = c
      bestLag = lag
    }
  }
  return bestLag && best / energy > 0.45 ? sampleRate / bestLag : 0
}

export function scoreVocal(v) {
  if (!v || v.voicedFrames < 15) return null
  // Projection: voiced loudness in dBFS. Quiet mumbling ≈ -50, confident ≈ -30..-18.
  const projection = Math.round(
    v.meanDb > -14 ? 78 : v.meanDb >= -32 ? lerp(v.meanDb, -32, -22, 82, 96) : lerp(v.meanDb, -55, -32, 20, 82),
  )
  // Expressiveness: pitch spread in semitones. <1.2 st sounds monotone.
  const s = v.pitchSt
  const expressiveness = Math.round(
    s < 1.2
      ? lerp(s, 0, 1.2, 15, 45)
      : s <= 2.5
        ? lerp(s, 1.2, 2.5, 45, 85)
        : s <= 5.5
          ? lerp(s, 2.5, 5.5, 85, 96)
          : lerp(s, 5.5, 9, 96, 70),
  )
  // Steadiness: how much loudness swings while speaking.
  const steadiness = Math.round(v.dbStd <= 6 ? lerp(v.dbStd, 2, 6, 95, 88) : lerp(v.dbStd, 6, 12, 88, 45))
  // Flow: share of time spent speaking, minus long dead-air gaps.
  const r = v.talkRatio
  const flow = Math.round(
    Math.max(10, (r < 0.55 ? lerp(r, 0.25, 0.55, 35, 85) : r <= 0.88 ? 92 : 80) - Math.max(0, v.longPauses - 1) * 6),
  )
  const score = Math.round(projection * 0.3 + expressiveness * 0.3 + steadiness * 0.15 + flow * 0.25)
  return {
    score,
    projection,
    expressiveness,
    steadiness,
    flow,
    labels: {
      volume: v.meanDb < -42 ? 'Too quiet' : v.meanDb > -14 ? 'Very loud' : 'Good projection',
      pitch: s < 1.2 ? 'Monotone' : s > 6 ? 'Very animated' : s < 2.5 ? 'Somewhat flat' : 'Expressive',
      flow: r < 0.5 ? 'Lots of dead air' : v.longPauses > 3 ? 'Choppy' : 'Smooth',
    },
  }
}

export function vocalNotes(v, s) {
  if (!s) return []
  const out = []
  if (s.projection < 60) out.push('Speak up — project as if the interviewer is across a conference table.')
  if (s.expressiveness < 65) out.push('Your pitch stayed flat. Lift your voice on key results and numbers.')
  else if (s.expressiveness >= 85) out.push('Great vocal variety — you sounded engaged.')
  if (s.steadiness < 65) out.push('Your volume trailed off and surged. Keep energy through the end of sentences.')
  if (s.flow < 60)
    out.push(`Long silences (${v.longPauses} pauses over ${LONG_PAUSE_SEC}s). Brief pauses are good — dead air isn’t.`)
  if (!out.length) out.push('Clear, steady, well-paced delivery.')
  return out
}

export function createVoiceMeter(getAnalyser) {
  let timer = null
  let buf = null
  let st = null
  let level = 0

  const reset = () => {
    st = {
      frames: 0,
      voicedFrames: 0,
      dbs: [],
      pitches: [],
      silentRun: 0,
      longPauses: 0,
      longest: 0,
      started: false,
      floor: 0.004,
    }
  }
  reset()

  const tick = () => {
    const an = getAnalyser()
    if (!an) return
    if (!buf || buf.length !== an.fftSize) buf = new Float32Array(an.fftSize)
    an.getFloatTimeDomainData(buf)
    let sum = 0
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
    const rms = Math.sqrt(sum / buf.length)
    level = level * 0.6 + Math.min(1, rms * 9) * 0.4

    // Adaptive noise floor so a noisy hackathon hall isn't counted as speech.
    st.floor = rms < st.floor ? st.floor * 0.9 + rms * 0.1 : st.floor * 0.995 + rms * 0.005
    const voiced = rms > Math.max(0.012, st.floor * 2.2)
    if (voiced) {
      st.started = true
      st.voicedFrames++
      st.dbs.push(20 * Math.log10(rms))
      const f0 = detectPitch(buf, an.context.sampleRate, rms)
      if (f0) st.pitches.push(f0)
      if (st.silentRun * SAMPLE_MS >= LONG_PAUSE_SEC * 1000) st.longPauses++
      st.silentRun = 0
    } else if (st.started) {
      st.silentRun++
      st.longest = Math.max(st.longest, (st.silentRun * SAMPLE_MS) / 1000)
    }
    if (st.started) st.frames++
  }

  const summary = () => {
    // Drop octave-jump outliers, then measure spread in semitones.
    const med = median(st.pitches)
    const clean = st.pitches.filter((p) => p > med / 1.8 && p < med * 1.8)
    const semis = clean.map((p) => 12 * Math.log2(p / (med || 1)))
    const v = {
      voicedFrames: st.voicedFrames,
      meanDb: Math.round(mean(st.dbs) * 10) / 10,
      dbStd: Math.round(std(st.dbs) * 10) / 10,
      pitchHz: Math.round(med),
      pitchSt: Math.round(std(semis) * 10) / 10,
      talkRatio: st.frames ? Math.round((st.voicedFrames / st.frames) * 100) / 100 : 0,
      longPauses: st.longPauses,
      longestPause: Math.round(st.longest * 10) / 10,
    }
    return { ...v, scores: scoreVocal(v) }
  }

  return {
    start() {
      reset()
      clearInterval(timer)
      timer = setInterval(tick, SAMPLE_MS)
    },
    pause() {
      clearInterval(timer)
      timer = null
    },
    resume() {
      if (!timer) timer = setInterval(tick, SAMPLE_MS)
    },
    stop() {
      clearInterval(timer)
      timer = null
      level = 0
      return summary()
    },
    level: () => level,
    live: summary,
  }
}
