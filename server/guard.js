// Public URL guardrails so strangers can't burn the ElevenLabs credits:
// only our own pages may call the API, and each visitor gets a request budget.
const WINDOW_MS = 10 * 60 * 1000

export function createGuard(maxRequests) {
  const hits = new Map() // best effort: per warm serverless instance
  return function allowed(req) {
    const origin = req.headers.origin || req.headers.referer || ''
    const host = req.headers['x-forwarded-host'] || req.headers.host || ''
    if (origin && !origin.includes(host)) return false
    const ip =
      String(req.headers['x-forwarded-for'] || '')
        .split(',')[0]
        .trim() || 'unknown'
    const now = Date.now()
    const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS)
    recent.push(now)
    hits.set(ip, recent)
    return recent.length <= maxRequests
  }
}
