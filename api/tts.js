// Vercel serverless function: POST /api/tts  { text, voiceId, quality } -> audio/mpeg
import { health, synthesize } from '../server/elevenlabs.js'

export default async function handler(req, res) {
  const apiKey = process.env.ELEVENLABS_API_KEY
  let out
  if (req.method === 'GET') out = health(apiKey)
  else if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
    out = await synthesize({ ...body, apiKey })
  } else {
    return res.status(405).end()
  }
  res.status(out.status).setHeader('Content-Type', out.contentType)
  res.send(out.body)
}
