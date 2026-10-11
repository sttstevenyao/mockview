// Practice history: one small summary per finished session, newest last.
// Kept in this browser, and in your account (prefs.history) when logged in.
const KEY = 'mockview.history.v1'
const MAX = 40
const MAX_DETAIL = 15 // the most recent sessions keep their full answers so the report can be reopened

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
  } catch {
    // Storage full: keep the summaries, drop the details.
    try {
      localStorage.setItem(KEY, JSON.stringify(history.map((s) => ({ ...s, detail: null }))))
    } catch {}
  }
}

// Builds the summary stored for a session from analyzeSession()'s report.
export function summarize(report, config, result = {}) {
  const o = report.overall
  const main = report.answers.filter((a) => !a.question?.followUp).length
  return {
    at: new Date().toISOString(),
    score: o.score,
    grade: o.grade,
    fillers: o.words ? Math.round((o.fillers / o.words) * 1000) / 10 : 0, // per 100 words
    wpm: o.avgWpm || null,
    star: o.starCoverage,
    flags: o.flags,
    questions: report.answers.length,
    planned: result.planned && main < result.planned ? result.planned : null, // set when ended early
    lang: report.lang || 'en',
    level: config.level,
    track: config.track,
    detail: detailOf(result, config),
  }
}

// What the report needs to be rebuilt later. Recorded audio can't be kept (it only lives in this tab).
function detailOf(result, config) {
  if (!result.answers) return null
  return {
    answers: result.answers.map(({ question, text, chunks, durationSec, speakingSec, vocal }) => ({
      question,
      text,
      chunks,
      durationSec,
      speakingSec,
      vocal,
    })),
    log: result.log || [],
    totalSec: result.totalSec,
    reason: result.reason,
    lang: result.lang || 'en',
    outLang: result.outLang || 'en',
    planned: result.planned || null,
    mode: config.mode,
  }
}

// Older sessions drop their details to keep storage small; their summaries stay.
const trimDetails = (list) => list.map((s, i) => (i < list.length - MAX_DETAIL && s.detail ? { ...s, detail: null } : s))

// Union of two histories (local + account), by timestamp, oldest first, capped.
export function mergeHistory(a = [], b = []) {
  const byAt = new Map()
  for (const s of [...a, ...b]) {
    const prev = byAt.get(s.at)
    byAt.set(s.at, prev ? { ...prev, ...s, detail: s.detail || prev.detail || null } : s)
  }
  return trimDetails([...byAt.values()].sort((x, y) => x.at.localeCompare(y.at)).slice(-MAX))
}

// Rebuilds a Feedback `result` from a saved session (null when its details were trimmed).
export function pastResult(history, at) {
  const i = history.findIndex((s) => s.at === at)
  const s = history[i]
  if (!s?.detail) return null
  return { ...s.detail, past: s.at, previous: i > 0 ? history[i - 1] : null }
}

export const addSession = (history, entry) => mergeHistory(history, [entry])
