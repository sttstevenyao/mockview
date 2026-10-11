// One shared Web Audio graph: the interviewer's ElevenLabs audio and the user's
// microphone each feed an AnalyserNode that the visualizer reads every frame.

let ctx = null
let player = null
let voiceAnalyser = null
let micAnalyser = null
let resolvePlayback = null

export function initAudio() {
  if (ctx) {
    ctx.resume()
    return
  }
  ctx = new (window.AudioContext || window.webkitAudioContext)()
  player = new Audio()
  const source = ctx.createMediaElementSource(player)
  voiceAnalyser = ctx.createAnalyser()
  voiceAnalyser.fftSize = 256
  voiceAnalyser.smoothingTimeConstant = 0.75
  source.connect(voiceAnalyser)
  voiceAnalyser.connect(ctx.destination)
}

export async function initMic() {
  if (micAnalyser) return true
  if (!ctx) initAudio()
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      // autoGainControl off so loudness analysis reflects how loud you really are.
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
    })
    micAnalyser = ctx.createAnalyser()
    micAnalyser.fftSize = 2048 // long enough window for pitch detection
    micAnalyser.smoothingTimeConstant = 0.7
    ctx.createMediaStreamSource(stream).connect(micAnalyser)
    return true
  } catch {
    return false
  }
}

export const getAnalysers = () => ({ voice: voiceAnalyser, mic: micAnalyser })

export function playUrl(url) {
  if (!player) initAudio()
  stopPlayback()
  return new Promise((resolve) => {
    resolvePlayback = resolve
    const done = () => {
      if (resolvePlayback === resolve) resolvePlayback = null
      resolve()
    }
    player.onended = done
    player.onerror = done
    player.src = url
    ctx.resume()
    player.play().catch(done)
  })
}

export function stopPlayback() {
  if (player) player.pause()
  const r = resolvePlayback
  resolvePlayback = null
  r?.()
}
