// MockView grading engine: deterministic, regex-driven, runs entirely in the
// browser with zero latency. No LLM calls — every score is explainable.

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
export const countWords = (t) => (t.trim() ? t.trim().split(/\s+/).length : 0)

// ───────────────────────── Detection dictionaries ─────────────────────────

const FILLERS = [
  { label: 'um', re: /\b(?:u+h?m+|e+r+m+)\b/gi },
  { label: 'uh', re: /\b(?:u+h+|e+h)\b/gi },
  {
    label: 'like',
    re: /(?<!\b(?:would|i'd|we'd|you'd|they'd|feel|felt|feels|look|looks|looked|seem|seems|seemed|sound|sounds|sounded|something|nothing|anything|more|much)\s)\blike\b(?!\s+(?:to|working|this|that)\b)/gi,
  },
  { label: 'you know', re: /\byou know\b(?!\s+(?:what|how|that|the|when|where|why|if|who)\b)/gi },
  { label: 'basically', re: /\bbasically\b/gi },
  { label: 'literally', re: /\bliterally\b/gi },
  { label: 'actually', re: /\bactually\b/gi },
  { label: 'I mean', re: /\bi mean\b/gi },
  { label: 'kind of', re: /(?<!\b(?:what|which|this|that|the|a|any|some|every|same)\s)\bkind of\b/gi },
  { label: 'sort of', re: /(?<!\b(?:what|which|this|that|the|a|any|some|every|same)\s)\bsort of\b/gi },
]

const FILLER_MONO = {
  um: [
    '“Um” #{n}. I can hear the gears turning — I just want to hear the answer.',
    'Another “um.” A one-second silent pause would sound so much more in control.',
    'That’s “um” #{n}. I’ve started tallying them in the margin of my notes.',
  ],
  uh: [
    '“Uh” #{n}. Silence is fine — I promise I won’t fill it for you.',
    'The “uh” is buying time, but it’s spending credibility.',
  ],
  like: [
    '“Like” #{n}. Was it like that, or was it that?',
    'Every “like” makes the story sound less certain than it probably was.',
    'I’m hearing “like” more than I’m hearing results.',
  ],
  'you know': ['I don’t know, actually — that’s why I asked.', '“You know” — I’d rather you told me.'],
  basically: ['“Basically” usually means the important details are about to get skipped.'],
  literally: ['“Literally” is doing a lot of figurative work here.'],
  actually: ['“Actually” — was the rest not actual? Drop it and the sentence gets stronger.'],
  'I mean': ['“I mean…” — just say what you mean the first time.'],
  'kind of': ['Kind of? Did it happen or not?', '“Kind of” softens a claim I wanted to hear stated plainly.'],
  'sort of': ['“Sort of” — I’m now sort of unsure what you did.'],
}

const HEDGES = [
  {
    label: 'I think',
    re: /\bi think\b/gi,
    mono: [
      '“I think” — you were there. You know. Say it like you know it.',
      'Second-guessing your own story? That’s what I’ll remember.',
    ],
  },
  { label: 'I guess', re: /\bi guess\b/gi, mono: ['“I guess” is doing real damage to an otherwise solid sentence.'] },
  { label: 'maybe', re: /\bmaybe\b/gi, mono: ['“Maybe” in a story about the past? Either it happened or it didn’t.'] },
  { label: 'probably', re: /\bprobably\b/gi, mono: ['“Probably” makes me wonder whether they actually checked.'] },
  { label: 'I feel like', re: /\bi feel like\b/gi, mono: ['I don’t need the feeling — I need the fact.'] },
  { label: 'hopefully', re: /\bhopefully\b/gi, mono: ['Hope isn’t a strategy. What was the plan?'] },
  {
    label: 'not sure',
    re: /\bi'?m not (?:really |totally |entirely )?sure\b/gi,
    mono: ['If they’re not sure about their own story, I’m definitely not sure.'],
  },
  { label: 'I just', re: /\bi just\b/gi, mono: ['“I just…” — don’t shrink your own contribution.'] },
]

const RED_FLAGS = [
  {
    label: 'Bad-mouthing',
    re: /\b(?:my|our|the) (?:old |previous |former |last )?(?:boss|manager|team|teammates?|coworkers?|professor|company|lead) (?:was|were|is|are) (?:so |really |pretty |kind of )?(?:terrible|awful|bad|useless|incompetent|lazy|annoying|stupid|toxic|horrible|clueless)\b/gi,
    mono: [
      'Criticizing a former manager in an interview… what will they say about us?',
      'Noted: blames the environment. That’s going straight into the debrief.',
    ],
    fix: 'Describe the difference in working styles neutrally, then pivot to what you did.',
  },
  {
    label: 'Deflecting blame',
    re: /\b(?:it )?(?:was not|wasn'?t|isn'?t|not) (?:really )?my fault\b|\b(?:i|we) blamed\b/gi,
    mono: ['“Not my fault” — I asked what you did, not who to blame.', 'Accountability check: failed.'],
    fix: 'Own your part first: “I should have flagged it earlier, so I…”',
  },
  {
    label: '“I don’t know”',
    re: /\bi (?:don'?t|do not) know\b/gi,
    mono: [
      'They said “I don’t know” out loud. I’m writing that down.',
      'If they don’t know, why should I trust them to figure it out on the job?',
    ],
    fix: 'Replace with how you found out: “I wasn’t sure, so I dug into…”',
  },
  {
    label: 'No idea',
    re: /\bno idea\b/gi,
    mono: ['“No idea” — then what was the plan?'],
    fix: 'Say how you got from no answer to an answer.',
  },
  {
    label: 'Negativity',
    re: /\b(?:hate|hated|hating|sucked|sucks)\b/gi,
    mono: ['Strong negative language. I’m picturing them in our Monday stand-up.'],
    fix: 'Swap emotion for a neutral challenge: “I found X difficult because…”',
  },
  {
    label: 'Apathy',
    re: /\b(?:whatever|i don'?t care|didn'?t care)\b/gi,
    mono: ['“Whatever.” If they don’t care, why would I?'],
    fix: 'Cut it entirely.',
  },
  {
    label: 'Boredom',
    re: /\b(?:boring|bored)\b/gi,
    mono: ['“Boring” — will they call this job boring in six months?'],
    fix: 'Say “repetitive” and explain how you automated or improved it.',
  },
  {
    label: '“Honestly”',
    re: /\b(?:honestly|to be honest|tbh)\b/gi,
    mono: ['“Honestly” — wait, were the other answers not honest?'],
    fix: 'Drop it. Every answer should already be honest.',
  },
  {
    label: 'Cliché weakness',
    re: /\b(?:i'?m (?:a |too much of a )?perfectionist|i work too hard|i care too much)\b/gi,
    mono: ['The perfectionist answer. I’ve heard it four times today.'],
    fix: 'Name a real, specific weakness and the system you built to manage it.',
  },
  {
    label: 'Credit to luck',
    re: /\b(?:got lucky|winged it|wing it)\b/gi,
    mono: ['“We got lucky” — so it wasn’t a skill? Can they repeat it?'],
    fix: 'Credit the decision that made the outcome possible.',
  },
  {
    label: 'Gave up',
    re: /\b(?:i|we) (?:just )?gave up\b|\bi quit\b/gi,
    mono: ['“Gave up” — I’m listening for persistence, not surrender.'],
    fix: 'Frame it as a deliberate re-scope with a reason.',
  },
  {
    label: 'Fired',
    re: /\b(?:was|got) fired\b/gi,
    mono: ['Volunteering “fired” without context. Risky.'],
    fix: 'Lead with what you learned and changed afterwards.',
  },
  {
    label: 'Comp talk',
    re: /\b(?:salary|paycheck|the money)\b/gi,
    mono: ['Talking compensation mid-behavioral answer? Bold.'],
    fix: 'Save compensation for the recruiter conversation.',
  },
]

const STAR = {
  situation:
    /\b(?:when i was|at my (?:last|previous|old|first)|during (?:my|our|the|a)|last (?:year|summer|semester|spring|fall)|in my (?:role|internship|job|position|class)|we were (?:facing|dealing)|the situation|back in|at (?:my|the) (?:company|startup|internship|job))\b/i,
  task: /\b(?:my (?:role|job|task|goal|responsibility|assignment) was|i was (?:responsible|tasked|asked|assigned|in charge)|i needed to|i had to|we needed to|we had to|the goal was|our goal was|the challenge was|my task)\b/i,
  action:
    /\bi (?:led|built|created|designed|organized|implemented|decided|proposed|reached out|scheduled|wrote|analyzed|coordinated|set up|started|took|talked|met|developed|launched|reorganized|prioritized|delegated|refactored|automated|debugged|fixed|interviewed|mentored|negotiated|presented|researched|rewrote|tested|volunteered|drove|owned|initiated|restructured|asked|added|moved|split|ran)\b/i,
  result:
    /\b(?:as a result|resulted|resulting|which (?:led|meant|helped|cut|saved|increased|reduced|improved)|in the end|ultimately|the outcome|increased|decreased|reduced|improved|saved|grew|cut|boosted|shipped|delivered|launched|won|placed|i learned|we learned|by \d+|\d+\s?percent)\b|\d+\s?%/i,
}
const NUMBER_RE = /\d|\b(?:percent|twice|doubled|tripled|halved)\b/i

// ───────────────────────── Matching ─────────────────────────

const PRIORITY = { flag: 3, hedge: 2, filler: 1 }

export function findMatches(text) {
  const raw = []
  const scan = (type, defs) => {
    for (const d of defs)
      for (const m of text.matchAll(d.re))
        raw.push({ type, def: d, label: d.label, start: m.index, end: m.index + m[0].length, text: m[0] })
  }
  scan('flag', RED_FLAGS)
  scan('hedge', HEDGES)
  scan('filler', FILLERS)

  // Keep the most severe (then longest) match wherever matches overlap.
  raw.sort((a, b) => PRIORITY[b.type] - PRIORITY[a.type] || b.end - b.start - (a.end - a.start))
  const kept = []
  for (const m of raw) if (!kept.some((k) => m.start < k.end && k.start < m.end)) kept.push(m)
  kept.sort((a, b) => a.start - b.start)

  const seen = {}
  for (const m of kept) {
    const n = (seen[m.label] = (seen[m.label] || 0) + 1)
    const pool = m.type === 'filler' ? FILLER_MONO[m.label] || FILLER_MONO.um : m.def.mono
    m.n = n
    m.mono = pool[(n - 1) % pool.length].replace('{n}', n)
    m.fix =
      m.def.fix ||
      (m.type === 'filler' ? 'Replace it with a deliberate one-beat pause.' : 'State it directly — drop the qualifier.')
  }
  return kept
}

export function segmentText(text) {
  const segs = []
  let at = 0
  findMatches(text).forEach((m, i) => {
    if (m.start > at) segs.push({ type: 'text', text: text.slice(at, m.start) })
    segs.push({ ...m, key: `${m.start}-${i}` })
    at = m.end
  })
  if (at < text.length) segs.push({ type: 'text', text: text.slice(at) })
  return segs
}

export const detectStar = (text) => ({
  situation: STAR.situation.test(text),
  task: STAR.task.test(text),
  action: STAR.action.test(text),
  result: STAR.result.test(text),
})

// ───────────────────────── Scoring ─────────────────────────

function scoreConfidence({ words, fillers, hedges, flags, wpm, starCount, hasNumber, iCount, weCount }) {
  if (!words) return 50
  let s = 58
  s += starCount * 7
  if (hasNumber) s += 6
  s -= Math.min(28, (fillers / words) * 100 * 2.2)
  s -= Math.min(18, hedges * 3.5)
  s -= Math.min(30, flags * 9)
  if (wpm) {
    if (wpm >= 120 && wpm <= 170) s += 5
    else if (wpm < 95 || wpm > 195) s -= 7
  }
  if (iCount > 0 && iCount >= weCount) s += 3
  else if (weCount > 2 && weCount > iCount * 2) s -= 4
  if (words < 15) s = 50 + (s - 50) * (words / 15) // still calibrating
  return clamp(Math.round(s), 3, 98)
}

// ───────────────────────── Answer quality ─────────────────────────
// Catches non-answers ("blah blah blah"), answers that are far too short, and
// answers that never touch the question, so they can't score like real ones.

const STOP = new Set(
  'the a an and or but so to of in on at for with about time you your how did what when where why tell me describe give example situation had have has was were is are be been do does that this it its from as by i we they he she them our my their more most some any one can could would should will just really very something someone thing things'.split(
    ' ',
  ),
)
const stem = (w) => w.replace(/(ing|ed|es|s|ly|ment|ion|ive|al)$/, '').slice(0, 6)

export function contentQuality(text, questionText = '') {
  const toks = text.toLowerCase().match(/[a-z']+/g) || []
  const words = toks.length
  const counts = {}
  for (const t of toks) counts[t] = (counts[t] || 0) + 1
  const unique = Object.keys(counts).length
  const topShare = words ? Math.max(...Object.values(counts)) / words : 0
  const repetitive = words >= 5 && (unique / words < 0.45 || topShare > 0.3)

  const qStems = new Set(
    (questionText.toLowerCase().match(/[a-z']+/g) || []).filter((w) => w.length > 3 && !STOP.has(w)).map(stem),
  )
  const aStems = new Set(toks.filter((w) => w.length > 3).map(stem))
  const overlap = [...qStems].filter((x) => aStems.has(x)).length
  const starCount = Object.values(detectStar(text)).filter(Boolean).length
  const offTopic = !repetitive && words >= 25 && qStems.size > 0 && overlap === 0 && starCount <= 1

  const issues = []
  let cap = 100
  if (!words) {
    issues.push('No answer was captured.')
    cap = 0
  } else if (repetitive) {
    issues.push('This doesn’t sound like a real answer: the same words repeat over and over.')
    cap = 8
  } else if (words < 12) {
    issues.push(`Only ${words} words. A strong behavioral answer is usually 150–250 words (60–90 seconds).`)
    cap = 15
  } else if (words < 40) {
    issues.push(`Too short (${words} words). Aim for 60–90 seconds and walk through Situation, Task, Action and Result.`)
    cap = 30 + words
  }
  if (offTopic) {
    issues.push('This may not answer the question that was asked. Tie your story back to it explicitly.')
    cap = Math.min(cap, 35)
  }
  return { words, repetitive, offTopic, nonAnswer: !words || repetitive || words < 12, issues, cap }
}

export function liveMetrics(text, seconds) {
  const words = countWords(text)
  const matches = findMatches(text)
  const fillerBreakdown = {}
  let fillers = 0
  let hedges = 0
  let flags = 0
  for (const m of matches) {
    if (m.type === 'filler') {
      fillers++
      fillerBreakdown[m.label] = (fillerBreakdown[m.label] || 0) + 1
    } else if (m.type === 'hedge') hedges++
    else flags++
  }
  const wpm = seconds >= 2 && words ? Math.min(260, words / (seconds / 60)) : 0
  const star = detectStar(text)
  const starCount = Object.values(star).filter(Boolean).length
  const hasNumber = NUMBER_RE.test(text)
  const iCount = (text.match(/\bi\b/gi) || []).length
  const weCount = (text.match(/\bwe\b/gi) || []).length
  let confidence = scoreConfidence({ words, fillers, hedges, flags, wpm, starCount, hasNumber, iCount, weCount })
  const repetitive = contentQuality(text).repetitive
  if (repetitive) confidence = Math.min(confidence, 12)
  return {
    repetitive,
    words,
    wpm,
    fillers,
    fillerBreakdown,
    hedges,
    flags,
    star,
    starCount,
    hasNumber,
    iCount,
    weCount,
    confidence,
  }
}

export function liveTip(m, wpm = m.wpm) {
  if (m.words < 4) return 'Listening… open with the Situation: where were you, and when?'
  if (m.repetitive) return 'That doesn’t sound like a real answer yet. Tell one specific story.'
  if (m.flags > 0) return 'Red flag detected — reframe it positively and focus on what you did.'
  if (m.words > 15 && (m.fillers / m.words) * 100 > 6) return 'Pause instead of saying “um” — silence reads as confidence.'
  if (wpm > 180) return 'You’re rushing. Slow down and let key points land.'
  if (wpm && wpm < 100 && m.words > 20) return 'Pick up the pace a little — keep the energy up.'
  if (m.hedges > 2) return 'Drop “I think” and “maybe” — state it like you know it.'
  if (m.words > 35 && !m.star.action) return 'Say what YOU did — use “I”, not “we”.'
  if (m.words > 60 && !m.star.result) return 'Land the plane: what was the measurable Result?'
  if (m.words > 40 && !m.hasNumber) return 'Add a number — %, time saved, users, dollars.'
  return 'Strong delivery — keep going.'
}

// ───────────────────────── Post-interview analysis ─────────────────────────

export function splitSentences(answer) {
  const sources = answer.chunks?.length ? answer.chunks : [answer.text]
  const out = []
  for (const src of sources)
    for (const piece of src.split(/(?<=[.!?])\s+/)) {
      const w = piece.trim().split(/\s+/).filter(Boolean)
      if (!w.length) continue
      if (w.length <= 32) {
        out.push(w.join(' '))
        continue
      }
      // Speech recognition rarely punctuates; break long runs at conjunctions.
      let cur = []
      for (const word of w) {
        const conj = /^(and|but|so|because|then|which)$/i.test(word)
        if ((cur.length >= 14 && conj) || cur.length >= 26) {
          out.push(cur.join(' '))
          cur = []
        }
        cur.push(word)
      }
      if (cur.length) out.push(cur.join(' '))
    }
  return out
}

function sentenceWeakness(text) {
  const m = findMatches(text)
  const words = countWords(text)
  const f = m.filter((x) => x.type === 'filler').length
  const h = m.filter((x) => x.type === 'hedge').length
  const r = m.filter((x) => x.type === 'flag').length
  const score =
    f * 2.5 + h * 2 + r * 5 + (NUMBER_RE.test(text) ? 0 : 0.8) + (STAR.action.test(text) ? 0 : 0.6) + (words > 30 ? 1 : 0)
  return { words, fillers: f, hedges: h, flags: r, score }
}

const REWRITE_RULES = [
  { re: /^(?:(?:so|yeah|well|okay|ok|alright|um+|uh+)\b,?\s*)+/i, to: '', why: 'Cut the throat-clearing opener' },
  { re: /^i (?:don'?t|do not) know,?\s*/i, to: '', why: 'Cut the “I don’t know” opener' },
  {
    re: /\b(?:my|our|the) (?:old |previous |former |last )?(boss|manager|team|teammates?|coworkers?|professor|company|lead) (?:was|were|is|are) (?:so |really |pretty |kind of )?(?:terrible|awful|bad|useless|incompetent|lazy|annoying|stupid|toxic|horrible|clueless)\b/gi,
    to: 'my $1 and I had different working styles',
    why: 'Reframed criticism of others into neutral, professional language',
  },
  {
    re: /\b(?:it )?(?:was not|wasn'?t|isn'?t|not) (?:really )?my fault\b/gi,
    to: 'I owned my part of it',
    why: 'Replaced deflection with ownership',
  },
  { re: /\b(i|we) blamed\b/gi, to: '$1 raised the issue with', why: 'Replaced blame with ownership' },
  {
    re: /\bi (?:don'?t|do not) know\b,?/gi,
    to: 'I wasn’t certain at first, so I dug in',
    why: 'Turned “I don’t know” into initiative',
  },
  { re: /\bno idea\b/gi, to: 'no clear answer at first', why: 'Turned “no idea” into a starting point' },
  { re: /\bhated\b/gi, to: 'struggled with', why: 'Swapped negative emotion for a neutral challenge' },
  { re: /\bhate\b/gi, to: 'struggle with', why: 'Swapped negative emotion for a neutral challenge' },
  { re: /\bsucked\b/gi, to: 'was tough', why: 'Swapped negative emotion for a neutral challenge' },
  { re: /\b(?:honestly|to be honest|tbh)\b,?\s*/gi, to: '', why: 'Dropped “honestly” — every answer is honest' },
  { re: /\bwhatever\b,?\s*/gi, to: '', why: 'Removed dismissive language' },
  { re: /\bboring\b/gi, to: 'repetitive', why: 'Replaced “boring” with a neutral descriptor' },
  { re: /\bgot lucky\b/gi, to: 'executed well', why: 'Credited skill instead of luck' },
  { re: /\bwinged it\b/gi, to: 'adapted quickly', why: 'Credited skill instead of luck' },
  { re: /\b(i|we) (?:just )?gave up(?: on)?\b/gi, to: '$1 deliberately re-scoped', why: 'Framed the pivot as a decision' },
  { re: /\bi (?:think|guess|feel like)(?: that)?,?\s*/gi, to: '', why: 'Removed hedging (“I think”, “I guess”)' },
  { re: /\b(?:maybe|probably|hopefully)\b,?\s*/gi, to: '', why: 'Removed hedging (“maybe”, “probably”)' },
  { re: /\bi'?m not (?:really |totally |entirely )?sure(?: but| if)?,?\s*/gi, to: '', why: 'Removed hedging (“not sure”)' },
  { re: /\bi just\b/gi, to: 'I', why: 'Stopped minimizing your contribution (“I just”)' },
  { re: /\b(?:u+h?m+|e+r+m+|u+h+)\b,?\s*/gi, to: '', why: 'Removed filler words (“um”, “uh”)' },
  {
    re: /\byou know\b(?!\s+(?:what|how|that|the|when|where|why|if|who)\b),?\s*/gi,
    to: '',
    why: 'Removed filler words (“you know”)',
  },
  { re: /\b(?:basically|literally|actually)\b,?\s*/gi, to: '', why: 'Removed filler words (“basically”, “actually”)' },
  { re: /\bi mean\b,?\s*/gi, to: '', why: 'Removed filler words (“I mean”)' },
  {
    re: /(?<!\b(?:what|which|this|that|the|a|any|some|every|same)\s)\b(?:kind|sort) of\b\s*/gi,
    to: '',
    why: 'Removed softeners (“kind of”)',
  },
  {
    re: /(?<!\b(?:would|i'd|we'd|you'd|they'd|feel|felt|feels|look|looks|looked|seem|seems|seemed|sound|sounds|sounded|something|nothing|anything|more|much)\s)\blike\b(?!\s+(?:to|working|this|that)\b),?\s*/gi,
    to: '',
    why: 'Removed filler words (“like”)',
  },
  { re: /\bhelped (?:out )?with\b/gi, to: 'led', why: 'Upgraded passive verbs to ownership verbs' },
  { re: /\bworked on\b/gi, to: 'built', why: 'Upgraded passive verbs to ownership verbs' },
  { re: /\bwas involved in\b/gi, to: 'drove', why: 'Upgraded passive verbs to ownership verbs' },
  { re: /\bwas responsible for\b/gi, to: 'owned', why: 'Upgraded passive verbs to ownership verbs' },
  { re: /\bwe decided\b/gi, to: 'I proposed, and we decided', why: 'Claimed your individual contribution' },
  { re: /\ba lot of\b/gi, to: 'significant', why: 'Replaced vague quantities with precise language' },
  { re: /,?\s*(?:and )?(?:stuff|things) like that\b/gi, to: '', why: 'Cut vague trailing phrases' },
  { re: /\bstuff\b/gi, to: 'work', why: 'Replaced vague nouns with precise language' },
]

function tidy(s) {
  let t = s
    .replace(/\s+([,.!?;])/g, '$1')
    .replace(/,\s*,+/g, ',')
    .replace(/\b(and|but|so|the|a)\s*,\s*/gi, '$1 ')
    .replace(/^[\s,;]+/, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  t = t.replace(/\bi\b/g, 'I').replace(/\bi'(m|ve|d|ll)\b/gi, "I'$1")
  t = t.replace(/(^|[.!?]\s+)([a-z])/g, (_, p, c) => p + c.toUpperCase())
  t = t.replace(/[,;:\s]+$/, '')
  if (!/[.!?]$/.test(t)) t += '.'
  return t
}

export function rewriteSentence(sentence, resultHint) {
  let out = sentence
  const changes = []
  for (const r of REWRITE_RULES) {
    const next = out.replace(r.re, r.to)
    if (next !== out) {
      out = next
      if (!changes.includes(r.why)) changes.push(r.why)
    }
  }
  out = tidy(out)
  if (!NUMBER_RE.test(out) && resultHint && countWords(out) >= 6) {
    out = `${out} As a result, ${resultHint}.`
    changes.push('Added a quantified result — swap in your real metric')
  }
  return changes.length ? { text: out, changes } : null
}

// Word-level LCS diff, case/punctuation-insensitive (GitHub-style highlights).
export function diffWords(a, b) {
  const A = a.split(/\s+/).filter(Boolean)
  const B = b.split(/\s+/).filter(Boolean)
  const norm = (w) =>
    w
      .toLowerCase()
      .replace(/[^a-z0-9%']/g, '')
      .replace(/’/g, "'")
  const n = A.length
  const m = B.length
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = norm(A[i]) === norm(B[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const keepA = new Set()
  const keepB = new Set()
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (norm(A[i]) === norm(B[j])) {
      keepA.add(i++)
      keepB.add(j++)
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++
    else j++
  }
  return {
    left: A.map((text, k) => ({ text, removed: !keepA.has(k) })),
    right: B.map((text, k) => ({ text, added: !keepB.has(k) })),
    removed: n - keepA.size,
    added: m - keepB.size,
  }
}

export function analyzeAnswer(answer) {
  const text = answer.text || ''
  // Pace uses time actually spent speaking, not the idle time before clicking Next.
  const metrics = liveMetrics(text, answer.speakingSec || answer.durationSec || 0)
  if (metrics.words < 15) metrics.wpm = 0 // too few words for a meaningful pace
  const quality = contentQuality(text, answer.question?.text)
  const confidence = Math.min(quality.cap, metrics.confidence)
  metrics.confidence = confidence

  const sentences = splitSentences(answer).map((s) => ({ text: s, ...sentenceWeakness(s) }))
  const eligible = sentences.filter((s) => s.words >= 5)
  const weakest = quality.nonAnswer
    ? null
    : (eligible.length ? eligible : sentences).reduce((w, s) => (!w || s.score > w.score ? s : w), null)
  const rewrite = weakest ? rewriteSentence(weakest.text, answer.question?.resultHint) : null
  return { ...answer, text, metrics, quality, sentences, weakest, rewrite, segments: segmentText(text), confidence }
}

export function grade(score) {
  if (score >= 88) return 'A'
  if (score >= 82) return 'A-'
  if (score >= 77) return 'B+'
  if (score >= 70) return 'B'
  if (score >= 64) return 'B-'
  if (score >= 58) return 'C+'
  if (score >= 50) return 'C'
  return 'D'
}

export function analyzeSession(answers) {
  const items = answers.map(analyzeAnswer)
  const words = items.reduce((s, a) => s + a.metrics.words, 0)
  const weighted = (key) => (words ? items.reduce((s, a) => s + a.metrics[key] * a.metrics.words, 0) / words : 0)
  const sum = (key) => items.reduce((s, a) => s + a.metrics[key], 0)

  const score = Math.round(weighted('confidence'))
  const paced = items.filter((a) => a.metrics.wpm > 0)
  const pacedWords = paced.reduce((s, a) => s + a.metrics.words, 0)
  const avgWpm = pacedWords ? Math.round(paced.reduce((s, a) => s + a.metrics.wpm * a.metrics.words, 0) / pacedWords) : 0
  const fillers = sum('fillers')
  const hedges = sum('hedges')
  const flags = sum('flags')
  const starCoverage = items.length
    ? Math.round((items.reduce((s, a) => s + a.metrics.starCount, 0) / (items.length * 4)) * 100)
    : 0
  const quantified = items.filter((a) => a.metrics.hasNumber).length
  const fillerRate = words ? (fillers / words) * 100 : 0

  // Weakest answer = lowest score; ties go to the one with the worst sentence.
  let weakestIndex = 0
  items.forEach((a, i) => {
    const w = items[weakestIndex]
    if (a.confidence < w.confidence || (a.confidence === w.confidence && (a.weakest?.score || 0) > (w.weakest?.score || 0)))
      weakestIndex = i
  })

  const strengths = []
  const focus = []
  ;(fillerRate < 3 ? strengths : focus).push(
    fillerRate < 3 ? 'Clean delivery — very few filler words' : `Cut filler words (${fillerRate.toFixed(1)} per 100 words)`,
  )
  if (avgWpm >= 115 && avgWpm <= 175) strengths.push(`Pace in the sweet spot (${avgWpm} WPM)`)
  else if (avgWpm) focus.push(avgWpm > 175 ? `Slow down — ${avgWpm} WPM reads as nervous` : `Pick up the pace — ${avgWpm} WPM`)
  ;(starCoverage >= 75 ? strengths : focus).push(
    starCoverage >= 75 ? 'Well-structured STAR answers' : `Complete the STAR structure (${starCoverage}% coverage)`,
  )
  ;(flags === 0 ? strengths : focus).push(
    flags === 0 ? 'No red flags — professional framing throughout' : `Reframe ${flags} red-flag phrase${flags > 1 ? 's' : ''}`,
  )
  if (quantified === items.length && items.length) strengths.push('You quantified your impact in every answer')
  else focus.push('Quantify results — %, time saved, users, dollars')
  if (hedges > items.length * 2) focus.push('Drop hedges like “I think” and “maybe”')

  const voiced = items.filter((a) => a.vocal?.scores)
  const vocal = voiced.length ? Math.round(voiced.reduce((s, a) => s + a.vocal.scores.score, 0) / voiced.length) : null
  if (vocal !== null)
    (vocal >= 75 ? strengths : focus).unshift(
      vocal >= 75 ? 'Confident, expressive voice' : 'Work on vocal delivery — projection & pitch variety',
    )

  if (items.length && items.every((a) => a.quality.nonAnswer)) {
    strengths.length = 0
    focus.length = 0
    focus.push('Give complete answers: 60–90 seconds each, using the STAR structure')
  }

  return {
    answers: items,
    weakestIndex,
    strengths: strengths.slice(0, 3),
    focus: focus.slice(0, 3),
    overall: { score, grade: grade(score), words, avgWpm, fillers, hedges, flags, starCoverage, quantified, vocal },
  }
}
