import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { health, synthesize } from './server/elevenlabs.js'

// Serves /api/tts from the Vite dev/preview server so `npm run dev` is all you need locally.
function elevenLabsApi(env) {
  const handler = async (req, res, next) => {
    if (!req.url.startsWith('/api/tts')) return next()
    const apiKey = env.ELEVENLABS_API_KEY
    let out
    try {
      if (req.method === 'GET') out = health(apiKey)
      else if (req.method === 'POST') {
        let raw = ''
        for await (const chunk of req) raw += chunk
        out = await synthesize({ ...JSON.parse(raw || '{}'), apiKey })
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
