// Vercel serverless function: POST /api/tts  { text, voiceId, quality, speed, expressiveness } -> audio/mpeg
import { health, synthesize } from '../server/elevenlabs.js'

// Public URL guardrails so strangers can't burn the ElevenLabs credits:
// only our own pages may call this, and each visitor gets a request budget.
const WINDOW_MS = 10 * 60 * 1000
const MAX_REQUESTS = 80
const hits = new Map() // best effort: per warm serverless instance

function allowed(req) {
  const origin = req.headers.origin || req.headers.referer || ''
  const host = req.headers['x-forwarded-host'] || req.headers.host || ''
  if (origin && !origin.includes(host)) return false
  const ip =
    String(req.headers['x-forwarded-for'] || '')
      .split(',')[0]
      .trim() || 'unknown'
  const now = Date.now()
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  return recent.length <= MAX_REQUESTS
}

export default async function handler(req, res) {
  const apiKey = process.env.ELEVENLABS_API_KEY
  let out
  if (req.method === 'GET') out = health(apiKey)
  else if (req.method === 'POST') {
    if (!allowed(req)) return res.status(429).json({ error: 'Too many voice requests. Please wait a few minutes.' })
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
    out = await synthesize({ ...body, apiKey })
  } else {
    return res.status(405).end()
  }
  res.status(out.status).setHeader('Content-Type', out.contentType)
  res.send(out.body)
}
