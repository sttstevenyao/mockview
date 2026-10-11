// Server-side ElevenLabs Text-to-Speech call. Shared by the Vite dev server
// middleware (vite.config.js) and the Vercel serverless function (api/tts.js),
// so the API key never ships to the browser.

const DEFAULT_VOICE = 'JBFqnCBsd6RMkjVDRZzb' // George
const MODELS = {
  fast: process.env.ELEVENLABS_FAST_MODEL || 'eleven_flash_v2_5', // lowest latency
  high: process.env.ELEVENLABS_HQ_MODEL || 'eleven_multilingual_v2', // most natural, human-sounding
}

const json = (status, obj) => ({
  status,
  contentType: 'application/json',
  body: Buffer.from(JSON.stringify(obj)),
})

// The .env.example placeholder counts as "not set".
const hasKey = (apiKey) => Boolean(apiKey && apiKey.trim() && apiKey.trim() !== 'your_key_here')

export function health(apiKey) {
  return json(200, { configured: hasKey(apiKey) })
}

const num = (v, lo, hi, dflt) => (Number.isFinite(+v) ? Math.min(hi, Math.max(lo, +v)) : dflt)

export async function synthesize({ text, voiceId, quality, speed, expressiveness, apiKey }) {
  if (!hasKey(apiKey)) return json(503, { error: 'ELEVENLABS_API_KEY isn’t set in .env' })
  apiKey = apiKey.trim()
  if (typeof text !== 'string' || !text.trim() || text.length > 900) {
    return json(400, { error: 'text is required (max 900 chars)' })
  }
  const voice = /^[A-Za-z0-9]{10,40}$/.test(voiceId || '') ? voiceId : DEFAULT_VOICE
  const high = quality !== 'fast'
  // "Mannerisms" from the setup screen → ElevenLabs voice settings.
  // Higher expressiveness = lower stability + more style exaggeration (more human variation).
  const expr = num(expressiveness, 0, 1, 0.5)
  const voiceSettings = {
    stability: Math.round((0.78 - expr * 0.5) * 100) / 100,
    similarity_boost: 0.8,
    style: high ? Math.round(expr * 0.55 * 100) / 100 : 0,
    use_speaker_boost: true,
    speed: num(speed, 0.7, 1.2, 1),
  }

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: high ? MODELS.high : MODELS.fast,
      voice_settings: voiceSettings,
    }),
  })

  if (!res.ok) {
    let detail = `ElevenLabs returned HTTP ${res.status}`
    try {
      const err = await res.json()
      detail = err?.detail?.message || err?.detail?.status || detail
    } catch {}
    return json(res.status, { error: detail })
  }
  return { status: 200, contentType: 'audio/mpeg', body: Buffer.from(await res.arrayBuffer()) }
}

// Speech-to-text with ElevenLabs Scribe. `audio` is a base64 clip recorded in the browser.
export async function transcribe({ audio, mime, apiKey }) {
  if (!hasKey(apiKey)) return json(503, { error: 'ELEVENLABS_API_KEY isn’t set in .env' })
  if (typeof audio !== 'string' || !audio || audio.length > 3_000_000) {
    return json(400, { error: 'audio is required (max ~2 MB)' })
  }
  const type = /^audio\/[\w.+-]+(;[\w=.-]+)?$/.test(mime || '') ? mime : 'audio/webm'
  const form = new FormData()
  form.append('model_id', process.env.ELEVENLABS_STT_MODEL || 'scribe_v1')
  form.append('language_code', 'en')
  form.append('tag_audio_events', 'false') // no "(laughs)" / "(silence)" tags in the transcript
  form.append('file', new Blob([Buffer.from(audio, 'base64')], { type }), 'answer.' + (type.includes('mp4') ? 'mp4' : 'webm'))

  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey.trim() },
    body: form,
  })
  if (!res.ok) {
    let detail = `ElevenLabs returned HTTP ${res.status}`
    try {
      const err = await res.json()
      detail = err?.detail?.message || err?.detail?.status || detail
    } catch {}
    return json(res.status, { error: detail })
  }
  const data = await res.json()
  return json(200, { text: String(data.text || '').trim() })
}
