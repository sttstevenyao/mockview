import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { health, scribeToken, synthesize, transcribe } from './server/elevenlabs.js'
import { handleAuth } from './server/auth.js'
import { createGuard } from './server/guard.js'

// Serves /api/tts, /api/stt and /api/auth from the Vite dev/preview server so `npm run dev` is all you need locally.
function elevenLabsApi(env) {
  const authGuard = createGuard(30)
  const handler = async (req, res, next) => {
    if (req.url.startsWith('/api/auth')) {
      let raw = ''
      for await (const chunk of req) raw += chunk
      const out = await handleAuth({
        method: req.method,
        body: raw ? JSON.parse(raw) : {},
        cookie: req.headers.cookie,
        env: { secret: env.AUTH_SECRET, blobToken: env.BLOB_READ_WRITE_TOKEN, secure: false },
        allowed: () => authGuard(req),
      }).catch((e) => ({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: e.message }) }))
      if (out.setCookie) res.setHeader('Set-Cookie', out.setCookie)
      res.statusCode = out.status
      res.setHeader('Content-Type', out.contentType)
      return res.end(out.body)
    }
    const tts = req.url.startsWith('/api/tts')
    if (!tts && !req.url.startsWith('/api/stt')) return next()
    const apiKey = env.ELEVENLABS_API_KEY
    let out
    try {
      if (req.method === 'GET' && tts) out = health(apiKey)
      else if (req.method === 'GET') out = await scribeToken({ apiKey })
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
