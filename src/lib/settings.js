// App settings (Settings tab). Saved in this browser, and in your account when logged in.
const KEY = 'mockview.settings.v1'

export const DEFAULT_SETTINGS = {
  theme: 'light', // 'light' | 'dark' | 'system'
  reduceMotion: false,
  textSize: 'default', // 'default' | 'large' | 'larger'
  highContrast: false,
  captions: true, // show what the interviewer is saying
  helpLang: 'off', // translate each question into this language (see data/translations.js)
  readTranslation: false, // also read the translation aloud after each question
  skipIntro: false, // interviewer goes straight to the first question
  reactions: true, // interviewer responds to each answer
  silenceSec: 9, // seconds of silence before "Sorry, what was that?"; 0 turns prompts off
  coaching: true, // live tip in the feedback panel
  showTranscript: true, // live transcript while you answer
  voiceQuality: 'high', // 'high' (eleven_v4) | 'fast' (eleven_flash_v2_5)
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
export function applyAppearance({ theme, reduceMotion, textSize, highContrast }) {
  const root = document.documentElement
  const flag = (name, value) => (value ? (root.dataset[name] = value) : delete root.dataset[name])
  flag('theme', theme === 'light' || theme === 'dark' ? theme : '')
  flag('motion', reduceMotion ? 'reduce' : '')
  flag('text', textSize && textSize !== 'default' ? textSize : '')
  flag('contrast', highContrast ? 'high' : '')
}
