// Server-side MockView accounts, shared by the Vercel function (api/auth.js) and the Vite
// dev server. Accounts live in a private Vercel Blob store:
//   accounts/<sha256(email)>.json   { email, salt, hash, prefs, createdAt }
// One account per email address.
// Passwords are hashed with scrypt; sessions are stateless HMAC-signed tokens in an
// HttpOnly cookie, so a login works on any device.
import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { get, put } from '@vercel/blob'

const COOKIE = 'mv_session'
const SESSION_DAYS = 30
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const reply = (status, obj, setCookie) => ({
  status,
  contentType: 'application/json',
  body: Buffer.from(JSON.stringify(obj)),
  setCookie,
})
const publicUser = ({ email, prefs, createdAt }) => ({ email, prefs: prefs || null, createdAt })

// Accounts are keyed by a hash of the email, so paths never contain the address itself.
const accountId = (email) => createHash('sha256').update(email).digest('hex')
const accountPath = (id) => `accounts/${id}.json`

async function readJson(path, token) {
  try {
    const r = await get(path, { access: 'private', useCache: false, token })
    if (!r || r.statusCode !== 200) return null
    return JSON.parse(await new Response(r.stream).text())
  } catch (e) {
    if (e?.name === 'BlobNotFoundError') return null
    throw e
  }
}
const writeJson = (path, data, token, overwrite) =>
  put(path, JSON.stringify(data), {
    access: 'private',
    token,
    addRandomSuffix: false,
    allowOverwrite: overwrite,
    contentType: 'application/json',
  })

const hashPassword = (password, salt) =>
  new Promise((resolve, reject) =>
    scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, key) => (err ? reject(err) : resolve(key.toString('hex')))),
  )
const sameHex = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))

// ── Sessions ─────────────────────────────────────
const b64 = (s) => Buffer.from(s).toString('base64url')
const sign = (data, secret) => createHmac('sha256', secret).update(data).digest('base64url')

function makeCookie(id, secret, secure) {
  const payload = b64(JSON.stringify({ u: id, exp: Date.now() + SESSION_DAYS * 864e5 }))
  const token = `${payload}.${sign(payload, secret)}`
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure ? '; Secure' : ''}`
}
const clearCookie = (secure) => `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`

function sessionUser(cookieHeader, secret) {
  const raw = String(cookieHeader || '')
    .split(/;\s*/)
    .find((c) => c.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1)
  if (!raw) return null
  const [payload, sig] = raw.split('.')
  if (!payload || !sig) return null
  const expected = sign(payload, secret)
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  try {
    const { u, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return exp > Date.now() ? u : null
  } catch {
    return null
  }
}

// ── Actions ──────────────────────────────────────
// env: { secret, blobToken, secure }.  Returns { status, contentType, body, setCookie? }.
export async function handleAuth({ method, body = {}, cookie, env, allowed }) {
  const { secret, blobToken: token, secure } = env
  if (!secret || !token) return reply(503, { error: 'Accounts aren’t configured on this server yet.' })

  if (method === 'GET') {
    const id = sessionUser(cookie, secret)
    const user = id && (await readJson(accountPath(id), token))
    return reply(200, { user: user ? publicUser(user) : null })
  }
  if (method !== 'POST') return reply(405, { error: 'Method not allowed' })

  const action = body.action
  if (action === 'logout') return reply(200, { ok: true }, clearCookie(secure))

  if (action === 'prefs') {
    const id = sessionUser(cookie, secret)
    if (!id) return reply(401, { error: 'Not logged in.' })
    const prefs = body.prefs && typeof body.prefs === 'object' ? body.prefs : null
    if (!prefs || JSON.stringify(prefs).length > 16000) return reply(400, { error: 'Invalid preferences.' })
    const user = await readJson(accountPath(id), token)
    if (!user) return reply(401, { error: 'Account not found.' })
    user.prefs = prefs
    await writeJson(accountPath(id), user, token, true)
    return reply(200, { user: publicUser(user) })
  }

  if (!allowed()) return reply(429, { error: 'Too many attempts. Please wait a few minutes and try again.' })
  const email = String(body.email || '')
    .trim()
    .toLowerCase()
  const password = typeof body.password === 'string' ? body.password : ''
  if (!EMAIL_RE.test(email) || email.length > 120) return reply(400, { error: 'Enter a valid email address.' })
  const id = accountId(email)

  if (action === 'signup') {
    if (password.length < 6 || password.length > 200) return reply(400, { error: 'Password must be at least 6 characters.' })
    if (await readJson(accountPath(id), token)) return reply(409, { error: 'An account already uses that email.' })
    const salt = randomBytes(16).toString('hex')
    const prefs = body.prefs && typeof body.prefs === 'object' && JSON.stringify(body.prefs).length <= 16000 ? body.prefs : null
    const user = { email, salt, hash: await hashPassword(password, salt), prefs, createdAt: new Date().toISOString() }
    try {
      await writeJson(accountPath(id), user, token, false) // fails if the same email signed up a moment ago
    } catch {
      return reply(409, { error: 'An account already uses that email.' })
    }
    return reply(200, { user: publicUser(user) }, makeCookie(id, secret, secure))
  }

  if (action === 'login') {
    const user = await readJson(accountPath(id), token)
    // One message for every failure, so the form doesn't reveal which emails have accounts.
    if (!user || !sameHex(await hashPassword(password, user.salt), user.hash))
      return reply(401, { error: 'Wrong email or password.' })
    return reply(200, { user: publicUser(user) }, makeCookie(id, secret, secure))
  }

  return reply(400, { error: 'Unknown action.' })
}
