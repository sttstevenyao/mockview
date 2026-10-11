import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { health, synthesize, transcribe } from './server/elevenlabs.js'

// Serves /api/tts and /api/stt from the Vite dev/preview server so `npm run dev` is all you need locally.
function elevenLabsApi(env) {
  const handler = async (req, res, next) => {
    const tts = req.url.startsWith('/api/tts')
    if (!tts && !req.url.startsWith('/api/stt')) return next()
    const apiKey = env.ELEVENLABS_API_KEY
    let out
    try {
      if (req.method === 'GET' && tts) out = health(apiKey)
      else if (req.method === 'POST') {
        let raw = ''
        for await (const chunk of req) raw += chunk
        const body = { ...JSON.parse(raw || '{}'), apiKey }
        out = tts ? await synthesize(body) : await transcribe(body)
      } else {
        res.statusCode = 405
        return res.end()
      }
    } catch (e) {
      out = { status: 500, contentType: 'application/json', body: JSON.stringify({ error: e.message }) }
    }
    res.statusCode = out.status
    res.setHeader('Content-Type', out.contentType)
    res.end(out.body)
  }
  return {
    name: 'elevenlabs-tts-api',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), '') }
  return { plugins: [react(), elevenLabsApi(env)] }
})
