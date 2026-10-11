// Vercel serverless function: GET /api/auth → current user; POST /api/auth { action, ... }
// actions: signup, login, logout, prefs. See server/auth.js.
import { handleAuth } from '../server/auth.js'
import { createGuard } from '../server/guard.js'

const allowed = createGuard(30) // sign-up / log-in attempts per IP per 10 minutes

export default async function handler(req, res) {
  let out
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
    out = await handleAuth({
      method: req.method,
      body,
      cookie: req.headers.cookie,
      env: { secret: process.env.AUTH_SECRET, blobToken: process.env.BLOB_READ_WRITE_TOKEN, secure: true },
      allowed: () => allowed(req),
    })
  } catch (e) {
    console.error('[auth]', e)
    out = {
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Account server error. Please try again.' }),
    }
  }
  if (out.setCookie) res.setHeader('Set-Cookie', out.setCookie)
  res.setHeader('Cache-Control', 'no-store')
  res.status(out.status).setHeader('Content-Type', out.contentType)
  res.send(out.body)
}
