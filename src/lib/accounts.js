// MockView accounts client. Accounts live on the server (/api/auth → private Vercel Blob
// store), so you can log in from any device. The session is an HttpOnly cookie the browser
// sends automatically; this file never sees the password after submitting it.

// The setup fields worth remembering between visits.
const PREF_KEYS = ['name', 'track', 'role', 'level', 'mode', 'count', 'minutes', 'persona', 'mannerisms', 'voiceId', 'settings']
export const pickPrefs = (cfg) => Object.fromEntries(PREF_KEYS.filter((k) => k in cfg).map((k) => [k, cfg[k]]))

// Returns { user } or { error }.
async function call(method, body) {
  try {
    const r = await fetch('/api/auth', {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) return { error: data.error || `Something went wrong (HTTP ${r.status}).` }
    return data
  } catch {
    return { error: 'Couldn’t reach the account server. Check your connection.' }
  }
}

export const signUp = ({ email, password, prefs }) => call('POST', { action: 'signup', email, password, prefs })

export const logIn = ({ email, password }) => call('POST', { action: 'login', email, password })

export async function currentUser() {
  const res = await call('GET')
  return res.user || null
}

export const logOut = () => call('POST', { action: 'logout' })

export async function savePrefs(prefs) {
  const res = await call('POST', { action: 'prefs', prefs })
  return res.user || null
}
