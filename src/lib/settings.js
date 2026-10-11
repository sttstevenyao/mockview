// App settings (Settings tab). Saved in this browser, and in your account when logged in.
const KEY = 'mockview.settings.v1'

export const DEFAULT_SETTINGS = {
  theme: 'system', // 'system' | 'dark' | 'light'
  reduceMotion: false,
  skipIntro: false, // interviewer goes straight to the first question
  reactions: true, // interviewer responds to each answer
  silenceSec: 9, // seconds of silence before "Sorry, what was that?"; 0 turns prompts off
  coaching: true, // live tip in the feedback panel
  showTranscript: true, // live transcript while you answer
  voiceQuality: 'high', // 'high' (eleven_multilingual_v2) | 'fast' (eleven_flash_v2_5)
  voiceSpeed: 1, // multiplier on the persona's speaking pace
}

export const withDefaults = (s) => ({ ...DEFAULT_SETTINGS, ...(s && typeof s === 'object' ? s : {}) })

export function loadSettings() {
  try {
    return withDefaults(JSON.parse(localStorage.getItem(KEY)))
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings))
  } catch {}
}

// Theme and motion live on <html> so the whole stylesheet can respond.
export function applyAppearance({ theme, reduceMotion }) {
  const root = document.documentElement
  if (theme === 'light' || theme === 'dark') root.dataset.theme = theme
  else delete root.dataset.theme
  if (reduceMotion) root.dataset.motion = 'reduce'
  else delete root.dataset.motion
}
