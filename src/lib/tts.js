// ElevenLabs TTS client. Calls our own /api/tts proxy (the key stays server-side),
// caches audio per sentence so repeats are instant, and falls back to the
// browser's built-in voice if ElevenLabs is unreachable so a live demo never dies.
import { playUrl, stopPlayback } from './audio.js'

const cache = new Map()

export async function checkTtsHealth() {
  try {
    const r = await fetch('/api/tts')
    if (!r.ok) return { reachable: false, configured: false }
    return { reachable: true, ...(await r.json()) }
  } catch {
    return { reachable: false, configured: false }
  }
}

export function fetchSpeech(text, { voiceId, quality = 'high', speed = 1, expressiveness = 0.5, lang = 'en' } = {}) {
  const key = `${voiceId}|${quality}|${speed}|${expressiveness}|${lang}|${text}`
  if (!cache.has(key)) {
    const job = (async () => {
      const r = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId, quality, speed, expressiveness, lang }),
      })
      if (!r.ok) {
        let msg = `HTTP ${r.status}`
        try {
          msg = (await r.json()).error || msg
        } catch {}
        throw new Error(msg)
      }
      return URL.createObjectURL(await r.blob())
    })()
    job.catch(() => cache.delete(key))
    cache.set(key, job)
  }
  return cache.get(key)
}

// onStart(provider, errorMessage?) fires right before audio begins.
export async function speak(text, opts = {}, onStart) {
  try {
    const url = await fetchSpeech(text, opts)
    onStart?.('elevenlabs')
    await playUrl(url)
    return 'elevenlabs'
  } catch (e) {
    console.warn('[MockView] ElevenLabs unavailable, using browser voice:', e.message)
    onStart?.('browser', e.message)
    await browserSpeak(text, opts.speed, opts.lang)
    return 'browser'
  }
}

// Prefer the most natural-sounding voice the OS ships with.
function bestBrowserVoice(lang = 'en') {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith(lang))
  const rank = (v) =>
    (/natural|neural|premium|enhanced/i.test(v.name) ? 4 : 0) +
    (/google/i.test(v.name) ? 2 : 0) +
    (/samantha|ava|allison|daniel|aria|jenny|guy/i.test(v.name) ? 2 : 0) +
    (v.lang === 'en-US' ? 1 : 0)
  return voices.sort((a, b) => rank(b) - rank(a))[0]
}

function browserSpeak(text, speed = 1, lang = 'en') {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) return resolve()
    const u = new SpeechSynthesisUtterance(text.replace(/<[^>]+>/g, ' '))
    const voice = bestBrowserVoice(lang)
    if (voice) u.voice = voice
    u.lang = voice?.lang || lang
    u.rate = speed
    u.onend = resolve
    u.onerror = resolve
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  })
}

export function stopSpeaking() {
  stopPlayback()
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
}
