// MockView accounts: username + password, optional email, saved interview preferences.
// Stored in this browser's localStorage, so an account works on the device it was created on.
// Passwords are never stored: only a random salt and a PBKDF2-SHA-256 hash.
const USERS_KEY = 'mockview.accounts.v1'
const SESSION_KEY = 'mockview.session.v1'
const ITERATIONS = 150000

// The setup fields worth remembering between visits.
const PREF_KEYS = ['name', 'track', 'role', 'level', 'mode', 'count', 'minutes', 'persona', 'mannerisms', 'voiceId', 'coaching']
export const pickPrefs = (cfg) => Object.fromEntries(PREF_KEYS.filter((k) => k in cfg).map((k) => [k, cfg[k]]))

const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}
const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}
const users = () => read(USERS_KEY, [])
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const publicUser = ({ username, email, prefs, createdAt }) => ({ username, email, prefs, createdAt })

async function hashPassword(password, saltHex) {
  const salt = new Uint8Array(saltHex.match(/../g).map((h) => parseInt(h, 16)))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, key, 256)
  return hex(bits)
}

export const USERNAME_RULE = '3–24 letters, numbers, dots, dashes or underscores'
export const PASSWORD_RULE = 'at least 6 characters'
const USERNAME_RE = /^[A-Za-z0-9._-]{3,24}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Returns { user } or { error }.
export async function signUp({ username, password, email, prefs }) {
  username = username.trim()
  email = email.trim().toLowerCase()
  if (!USERNAME_RE.test(username)) return { error: `Username must be ${USERNAME_RULE}.` }
  if (password.length < 6) return { error: `Password must be ${PASSWORD_RULE}.` }
  if (email && !EMAIL_RE.test(email)) return { error: 'That email address doesn’t look right.' }
  const all = users()
  if (all.some((u) => u.username.toLowerCase() === username.toLowerCase())) return { error: 'That username is taken.' }
  if (email && all.some((u) => u.email === email)) return { error: 'An account already uses that email.' }
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)))
  const user = { username, email: email || null, salt, hash: await hashPassword(password, salt), prefs, createdAt: new Date().toISOString() }
  if (!write(USERS_KEY, [...all, user])) return { error: 'This browser blocked saving (private mode?).' }
  write(SESSION_KEY, username)
  return { user: publicUser(user) }
}

// `login` is a username or the email attached to the account.
export async function logIn(login, password) {
  const id = login.trim().toLowerCase()
  const user = users().find((u) => u.username.toLowerCase() === id || (u.email && u.email === id))
  // Same message either way, so the form doesn't reveal which usernames exist.
  if (!user || (await hashPassword(password, user.salt)) !== user.hash)
    return { error: 'Wrong username, email, or password.' }
  write(SESSION_KEY, user.username)
  return { user: publicUser(user) }
}

export function currentUser() {
  const name = read(SESSION_KEY, null)
  const user = name && users().find((u) => u.username === name)
  return user ? publicUser(user) : null
}

export function logOut() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {}
}

export function savePrefs(username, prefs) {
  const all = users()
  const user = all.find((u) => u.username === username)
  if (!user) return null
  user.prefs = prefs
  write(USERS_KEY, all)
  return publicUser(user)
}
