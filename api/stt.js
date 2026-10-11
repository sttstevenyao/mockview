// Vercel serverless function:
//   GET  /api/stt                     -> { token }  single-use token for real-time Scribe
//   POST /api/stt  { audio, mime }    -> { text }   one recorded clip (fallback)
// ElevenLabs Scribe transcription, used when the browser's own speech recognition
// is missing or blocked (Brave, Firefox).
import { scribeToken, transcribe } from '../server/elevenlabs.js'
import { createGuard } from '../server/guard.js'

const allowed = createGuard(300) // answers are sent in short pause-to-pause clips

export default async function handler(req, res) {
  if (!allowed(req)) return res.status(429).json({ error: 'Too many transcription requests. Please wait a few minutes.' })
  if (req.method === 'GET') {
    // GET /api/stt → { token } for real-time Scribe
    const out = await scribeToken({ apiKey: process.env.ELEVENLABS_API_KEY })
    res.setHeader('Cache-Control', 'no-store')
    return res.status(out.status).setHeader('Content-Type', out.contentType).send(out.body)
  }
  if (req.method !== 'POST') return res.status(405).end()
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  const out = await transcribe({ ...body, apiKey: process.env.ELEVENLABS_API_KEY })
  res.status(out.status).setHeader('Content-Type', out.contentType)
  res.send(out.body)
}
