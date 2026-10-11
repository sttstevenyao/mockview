// Local MockView profile: a name, email, and saved interview preferences, kept in this
// browser's localStorage. There's no server-side account and no password; clearing site
// data (or "Sign out") removes it.
const KEY = 'mockview.profile.v1'

// The setup fields worth remembering between visits.
export const PREF_KEYS = ['name', 'track', 'role', 'level', 'mode', 'count', 'minutes', 'persona', 'mannerisms', 'voiceId', 'coaching']

export const pickPrefs = (cfg) => Object.fromEntries(PREF_KEYS.filter((k) => k in cfg).map((k) => [k, cfg[k]]))

export function loadProfile() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || 'null')
    return p && typeof p.name === 'string' ? p : null
  } catch {
    return null
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile))
    return true
  } catch {
    return false
  }
}

export function clearProfile() {
  try {
    localStorage.removeItem(KEY)
  } catch {}
}
