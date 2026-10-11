// Practice history: one small summary per finished session, newest last.
// Kept in this browser, and in your account (prefs.history) when logged in.
const KEY = 'mockview.history.v1'
const MAX = 40

export function loadHistory() {
  try {
    const h = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(h) ? h : []
  } catch {
    return []
  }
}

export function saveHistory(history) {
  try {
    localStorage.setItem(KEY, JSON.stringify(history))
  } catch {}
}

// Builds the summary stored for a session from analyzeSession()'s report.
export function summarize(report, config) {
  const o = report.overall
  return {
    at: new Date().toISOString(),
    score: o.score,
    grade: o.grade,
    fillers: o.words ? Math.round((o.fillers / o.words) * 1000) / 10 : 0, // per 100 words
    wpm: o.avgWpm || null,
    star: o.starCoverage,
    flags: o.flags,
    questions: report.answers.length,
    level: config.level,
    track: config.track,
  }
}

// Union of two histories (local + account), by timestamp, oldest first, capped.
export function mergeHistory(a = [], b = []) {
  const byAt = new Map([...a, ...b].map((s) => [s.at, s]))
  return [...byAt.values()].sort((x, y) => x.at.localeCompare(y.at)).slice(-MAX)
}

export const addSession = (history, entry) => mergeHistory(history, [entry])
