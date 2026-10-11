// MockView grading engine: deterministic, regex-driven, runs entirely in the
// browser with zero latency. Every score is explainable.

import { LINES } from '../data/i18n.js'

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
    '“Um” #{n}. I can hear the gears turning. I want to hear the answer.',
    'Another “um.” A one-second silent pause would sound so much more in control.',
    'That’s “um” #{n}. I’ve started tallying them in the margin of my notes.',
  ],
  uh: ['“Uh” #{n}. Silence is fine. I won’t fill it for you.', 'The “uh” is buying time, but it’s spending credibility.'],
  like: [
    '“Like” #{n}. Was it like that, or was it that?',
    'Every “like” makes the story sound less certain.',
    'I’m hearing “like” more than I’m hearing results.',
  ],
  'you know': ['I don’t know, actually. That’s why I asked.', '“You know”? Tell me.'],
  basically: ['“Basically” usually means the important details are about to get skipped.'],
  literally: ['“Literally” is doing a lot of figurative work here.'],
  actually: ['“Actually” adds nothing. Drop it and the sentence gets stronger.'],
  'I mean': ['“I mean…” Say what you mean the first time.'],
  'kind of': ['Kind of? Did it happen or not?', '“Kind of” softens a claim I wanted to hear stated plainly.'],
  'sort of': ['“Sort of.” Now I’m sort of unsure what you did.'],
}

const HEDGES = [
  {
    label: 'I think',
    re: /\bi think\b/gi,
    mono: ['“I think”? You were there. Say it like you know it.', 'Second-guessing your own story? That’s what I’ll remember.'],
  },
  { label: 'I guess', re: /\bi guess\b/gi, mono: ['“I guess” is doing real damage to an otherwise solid sentence.'] },
  { label: 'maybe', re: /\bmaybe\b/gi, mono: ['“Maybe” in a story about the past? Either it happened or it didn’t.'] },
  { label: 'probably', re: /\bprobably\b/gi, mono: ['“Probably” makes me wonder whether they actually checked.'] },
  { label: 'I feel like', re: /\bi feel like\b/gi, mono: ['Give me the fact. “I feel like” buries it.'] },
  { label: 'hopefully', re: /\bhopefully\b/gi, mono: ['“Hopefully” tells me there was no plan. What was it?'] },
  {
    label: 'not sure',
    re: /\bi'?m not (?:really |totally |entirely )?sure\b/gi,
    mono: ['If they’re not sure about their own story, I’m definitely not sure.'],
  },
  { label: 'I just', re: /\bi just\b/gi, mono: ['“I just…” shrinks your own contribution.'] },
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
    mono: ['“Not my fault.” I asked what you did.', 'Accountability check: failed.'],
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
    mono: ['“No idea.” Then what was the plan?'],
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
    mono: ['“Boring.” Will they call this job boring in six months?'],
    fix: 'Say “repetitive” and explain how you automated or improved it.',
  },
  {
    label: '“Honestly”',
    re: /\b(?:honestly|to be honest|tbh)\b/gi,
    mono: ['“Honestly”? Were the other answers dishonest?'],
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
    mono: ['“We got lucky.” Can they repeat it on purpose?'],
    fix: 'Credit the decision that made the outcome possible.',
  },
  {
    label: 'Gave up',
    re: /\b(?:i|we) (?:just )?gave up\b|\bi quit\b/gi,
    mono: ['“Gave up.” I’m listening for persistence.'],
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
      (m.type === 'filler' ? 'Replace it with a deliberate one-beat pause.' : 'Drop the qualifier and state it directly.')
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

// Words that place a sentence in an interview story (work, school, teams, outcomes).
const CONTEXT_RE =
  /\b(?:work|worked|job|intern|internship|team|teammates?|project|class|course|school|college|university|club|company|startup|manager|boss|supervisor|customers?|clients?|users?|deadlines?|code|data|reports?|meetings?|presentation|goals?|tasks?|role|problems?|issues?|solutions?|plans?|feedback|led|lead|built|created|learned|learn|improved?|results?|students?|patients?|products?|designs?|budget|sales|campaign|experience|skills?|strengths?|weakness|career|interview|hired|study|studied)\b/i

const questionStems = (questionText) =>
  new Set((questionText.toLowerCase().match(/[a-z']+/g) || []).filter((w) => w.length > 3 && !STOP.has(w)).map(stem))

// True when a sentence has nothing tying it to an interview answer.
function irrelevant(sentence, qStems) {
  if (countWords(sentence) < 4) return false
  if (CONTEXT_RE.test(sentence) || NUMBER_RE.test(sentence)) return false
  if (Object.values(STAR).some((re) => re.test(sentence))) return false
  const stems = (sentence.toLowerCase().match(/[a-z']+/g) || []).filter((w) => w.length > 3).map(stem)
  return !stems.some((x) => qStems.has(x))
}

// Sentences that don't answer the question: irrelevant, and either addressed to "you"
// or part of an answer that's mostly irrelevant.
// Basic questions ("What do you do for fun?") invite answers with no work context, so
// there only sentences addressed to "you" count.
export function nonsenseSentences(sentences, questionText = '', basic = false) {
  const qStems = questionStems(questionText)
  const flags = sentences.map((t) => irrelevant(t, qStems))
  const mostly = !basic && sentences.length > 0 && flags.filter(Boolean).length / sentences.length >= 0.5
  return sentences.filter((t, i) => flags[i] && (mostly || /\byou(?:r|'re)?\b/i.test(t.replace(/\byou know\b/gi, ''))))
}

export function contentQuality(text, questionText = '', basic = false) {
  const toks = text.toLowerCase().match(/[a-z']+/g) || []
  const words = toks.length
  const counts = {}
  for (const t of toks) counts[t] = (counts[t] || 0) + 1
  const unique = Object.keys(counts).length
  const topShare = words ? Math.max(...Object.values(counts)) / words : 0
  const repetitive = words >= 5 && (unique / words < 0.45 || topShare > 0.3)

  const qStems = questionStems(questionText)
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
  } else if (basic) {
    if (words < 8) {
      issues.push('Too short. Answer in two or three full sentences.')
      cap = 25
    }
  } else if (words < 12) {
    issues.push(`Only ${words} words. A strong behavioral answer runs 150 to 250 words (60 to 90 seconds).`)
    cap = 15
  } else if (words < 40) {
    issues.push(`Too short (${words} words). Aim for 60 to 90 seconds and walk through Situation, Task, Action and Result.`)
    cap = 30 + words
  }
  if (offTopic) {
    issues.push('This doesn’t clearly answer the question. Tie your story back to it.')
    cap = Math.min(cap, 35)
  }
  return { words, repetitive, offTopic, nonAnswer: !words || repetitive || words < (basic ? 5 : 12), issues, cap }
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

export function liveTip(m, wpm = m.wpm, basic = false) {
  if (m.words < 4) return 'Listening… open with the Situation: where were you, and when?'
  if (m.repetitive) return 'That doesn’t sound like a real answer yet. Tell one specific story.'
  if (m.flags > 0) return 'Red flag. Reframe it positively and focus on what you did.'
  if (m.words > 15 && (m.fillers / m.words) * 100 > 6) return 'Replace “um” with a short pause. Silence reads as confidence.'
  if (wpm > 180) return 'You’re rushing. Slow down and let key points land.'
  if (wpm && wpm < 100 && m.words > 20) return 'Pick up the pace to keep the energy up.'
  if (m.hedges > 2) return 'Drop “I think” and “maybe”. State it like you know it.'
  if (!basic && m.words > 35 && !m.star.action) return 'Say what you did, using “I”.'
  if (!basic && m.words > 60 && !m.star.result) return 'Land the plane: what was the measurable Result?'
  if (!basic && m.words > 40 && !m.hasNumber) return 'Add a number: a percentage, time saved, users, or dollars.'
  return 'Strong delivery. Keep going.'
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
  { re: /\b(?:honestly|to be honest|tbh)\b,?\s*/gi, to: '', why: 'Dropped “honestly”' },
  { re: /\bwhatever\b,?\s*/gi, to: '', why: 'Removed dismissive language' },
  { re: /\bboring\b/gi, to: 'repetitive', why: 'Replaced “boring” with a neutral descriptor' },
  { re: /\bgot lucky\b/gi, to: 'executed well', why: 'Credited the skill behind the outcome' },
  { re: /\bwinged it\b/gi, to: 'adapted quickly', why: 'Credited the skill behind the outcome' },
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
    changes.push('Added a quantified result. Swap in your real metric.')
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

// ───────────────────────── Answers in other languages ─────────────────────────
// The phrase lists above are English. For an answer in another language, grading sticks to
// what holds in any language: length, pace, that language's filler words, and the voice.
const segmenters = {}
export function countWordsIn(text, langId = 'en') {
  if (langId === 'en' || typeof Intl === 'undefined' || !Intl.Segmenter) return countWords(text)
  const seg = (segmenters[langId] ||= new Intl.Segmenter(langId, { granularity: 'word' }))
  let n = 0
  for (const w of seg.segment(text)) if (w.isWordLike) n++
  return n
}
const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Fillers: whole words where the language uses spaces, plain substrings for zh and ja.
function fillerCounts(text, langId) {
  const list = LINES[langId]?.fillers || []
  const spaced = !UNSPACED.includes(langId)
  const breakdown = {}
  let total = 0
  for (const f of list) {
    const re = spaced ? new RegExp(`(?<![\\p{L}])${escapeRe(f)}(?![\\p{L}])`, 'giu') : new RegExp(escapeRe(f), 'g')
    const n = (text.match(re) || []).length
    if (n) {
      breakdown[f] = n
      total += n
    }
  }
  return { fillers: total, fillerBreakdown: breakdown }
}
const UNSPACED = ['zh', 'ja']
const NO_STAR = { situation: false, task: false, action: false, result: false }

// The transcript with that language's filler words marked, in the same shape as segmentText().
function foreignSegments(text, langId) {
  const list = LINES[langId]?.fillers || []
  if (!text || !list.length) return text ? [{ type: 'text', text }] : []
  const spaced = !UNSPACED.includes(langId)
  const alt = [...list]
    .sort((a, b) => b.length - a.length)
    .map(escapeRe)
    .join('|')
  const re = spaced ? new RegExp(`(?<![\\p{L}])(?:${alt})(?![\\p{L}])`, 'giu') : new RegExp(alt, 'g')
  const segs = []
  let at = 0
  for (const m of text.matchAll(re)) {
    if (m.index > at) segs.push({ type: 'text', text: text.slice(at, m.index) })
    segs.push({
      type: 'filler',
      text: m[0],
      label: m[0].toLowerCase(),
      key: `${m.index}`,
      mono: 'A filler word. The answer reads stronger without it.',
      fix: 'Pause for a beat instead.',
    })
    at = m.index + m[0].length
  }
  if (at < text.length) segs.push({ type: 'text', text: text.slice(at) })
  return segs
}

export function foreignMetrics(text, seconds, langId) {
  const words = countWordsIn(text, langId)
  const { fillers, fillerBreakdown } = fillerCounts(text, langId)
  const wpm = seconds >= 2 && words ? Math.min(260, words / (seconds / 60)) : 0
  const hasNumber = /\d/.test(text)
  const rate = words ? (fillers / words) * 100 : 0
  let confidence = 0
  if (words >= 3) {
    confidence = 62 + Math.min(24, words / 4)
    confidence -= Math.min(25, rate * 3)
    // Word counts in zh and ja don't line up with English pace targets, so pace isn't judged there.
    if (wpm && !UNSPACED.includes(langId) && (wpm > 185 || wpm < 95)) confidence -= 10
    if (hasNumber) confidence += 5
  }
  return {
    repetitive: false,
    words,
    wpm,
    fillers,
    fillerBreakdown,
    hedges: 0,
    flags: 0,
    star: NO_STAR,
    starCount: 0,
    hasNumber,
    iCount: 0,
    weCount: 0,
    confidence: Math.round(clamp(confidence, 0, 96)),
  }
}

export function foreignTip(m, wpm = m.wpm, langId) {
  if (m.words < 4) return 'Listening…'
  if (m.words > 15 && (m.fillers / m.words) * 100 > 6) return 'Fewer filler words. A short pause works better.'
  if (UNSPACED.includes(langId)) return 'Good delivery. Keep going.'
  if (wpm > 180) return 'You’re rushing. Slow down.'
  if (wpm && wpm < 95 && m.words > 20) return 'Pick up the pace a little.'
  return 'Good delivery. Keep going.'
}

function analyzeForeign(answer, langId) {
  const text = answer.text || ''
  const metrics = foreignMetrics(text, answer.speakingSec || answer.durationSec || 0, langId)
  if (metrics.words < 15) metrics.wpm = 0
  const words = metrics.words
  const issues = []
  let cap = 100
  if (!words) {
    issues.push('No answer was recorded.')
    cap = 0
  } else if (words < 12) {
    issues.push(`Only ${words} words. Aim for 60 to 90 seconds.`)
    cap = 15
  } else if (words < 40) {
    issues.push(`Too short (${words} words). Aim for 60 to 90 seconds.`)
    cap = 30 + words
  }
  const confidence = Math.min(cap, metrics.confidence)
  metrics.confidence = confidence
  return {
    ...answer,
    text,
    metrics,
    quality: { words, repetitive: false, offTopic: false, nonAnswer: words < 5, issues, cap },
    sentences: [],
    weakest: null,
    rewrite: null,
    segments: foreignSegments(text, langId),
    confidence,
  }
}

export function analyzeAnswer(answer, langId = 'en') {
  if (langId !== 'en') return analyzeForeign(answer, langId)
  const text = answer.text || ''
  // Pace uses time actually spent speaking, not the idle time before clicking Next.
  const metrics = liveMetrics(text, answer.speakingSec || answer.durationSec || 0)
  if (metrics.words < 15) metrics.wpm = 0 // too few words for a meaningful pace
  const basic = Boolean(answer.question?.basic)
  const quality = contentQuality(text, answer.question?.text, basic)

  const sentences = splitSentences(answer).map((s) => ({ text: s, ...sentenceWeakness(s) }))
  const nonsense = nonsenseSentences(
    sentences.map((s) => s.text),
    answer.question?.text,
    basic,
  )
  if (nonsense.length) {
    quality.issues.push(
      nonsense.length === 1
        ? 'One sentence has nothing to do with the question.'
        : `${nonsense.length} sentences have nothing to do with the question.`,
    )
    quality.cap = Math.min(quality.cap, nonsense.length * 2 >= sentences.length ? 10 : 45)
  }
  const confidence = Math.min(quality.cap, metrics.confidence)
  metrics.confidence = confidence

  // A nonsense sentence always takes the rewrite slot: it gets cut, never "improved".
  const eligible = sentences.filter((s) => s.words >= 5)
  const weakest = nonsense.length
    ? sentences.find((s) => s.text === nonsense[0])
    : quality.nonAnswer
      ? null
      : (eligible.length ? eligible : sentences).reduce((w, s) => (!w || s.score > w.score ? s : w), null)
  const rewrite = !weakest
    ? null
    : nonsense.length
      ? { text: '', nonsense: true, changes: ['Cut it: this sentence doesn’t answer the question'] }
      : rewriteSentence(weakest.text, answer.question?.resultHint)
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

export function analyzeSession(answers, langId = 'en') {
  const foreign = langId !== 'en'
  const items = answers.map((a) => analyzeAnswer(a, langId))
  const words = items.reduce((s, a) => s + a.metrics.words, 0)
  const sum = (key) => items.reduce((s, a) => s + a.metrics[key], 0)

  // Every question counts equally, so a skipped or empty answer pulls the grade down.
  const score = items.length ? Math.round(items.reduce((s, a) => s + a.confidence, 0) / items.length) : 0
  const skipped = items.filter((a) => a.metrics.words < 3).length
  const paced = items.filter((a) => a.metrics.wpm > 0)
  const pacedWords = paced.reduce((s, a) => s + a.metrics.words, 0)
  const avgWpm = pacedWords ? Math.round(paced.reduce((s, a) => s + a.metrics.wpm * a.metrics.words, 0) / pacedWords) : 0
  const fillers = sum('fillers')
  const hedges = sum('hedges')
  const flags = sum('flags')
  // STAR and numbers only apply to story questions, not the Beginner level's basic ones.
  const stories = foreign ? [] : items.filter((a) => !a.question?.basic)
  const starCoverage = stories.length
    ? Math.round((stories.reduce((s, a) => s + a.metrics.starCount, 0) / (stories.length * 4)) * 100)
    : null
  const quantified = stories.filter((a) => a.metrics.hasNumber).length
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
    fillerRate < 3 ? 'Clean delivery with very few filler words' : `Cut filler words (${fillerRate.toFixed(1)} per 100 words)`,
  )
  if (avgWpm >= 115 && avgWpm <= 175) strengths.push(`Pace in the sweet spot (${avgWpm} WPM)`)
  else if (avgWpm) focus.push(avgWpm > 175 ? `Slow down: ${avgWpm} WPM reads as nervous` : `Pick up the pace from ${avgWpm} WPM`)
  if (starCoverage !== null)
    (starCoverage >= 75 ? strengths : focus).push(
      starCoverage >= 75 ? 'Well-structured STAR answers' : `Complete the STAR structure (${starCoverage}% coverage)`,
    )
  if (!foreign)
    (flags === 0 ? strengths : focus).push(
      flags === 0 ? 'No red flags, professional framing throughout' : `Reframe ${flags} red-flag phrase${flags > 1 ? 's' : ''}`,
    )
  if (stories.length && quantified === stories.length) strengths.push('You quantified your impact in every answer')
  else if (stories.length) focus.push('Quantify results: percentages, time saved, users, dollars')
  if (hedges > items.length * 2) focus.push('Drop hedges like “I think” and “maybe”')
  if (skipped) focus.unshift(`Answer every question (${skipped} had no answer)`)

  const voiced = items.filter((a) => a.vocal?.scores)
  const vocal = voiced.length ? Math.round(voiced.reduce((s, a) => s + a.vocal.scores.score, 0) / voiced.length) : null
  if (vocal !== null)
    (vocal >= 75 ? strengths : focus).unshift(
      vocal >= 75 ? 'Confident, expressive voice' : 'Work on vocal delivery: projection and pitch variety',
    )

  if (items.length && items.every((a) => a.quality.nonAnswer)) {
    strengths.length = 0
    focus.length = 0
    focus.push(
      foreign
        ? 'Give complete answers: 60 to 90 seconds each'
        : 'Give complete answers: 60 to 90 seconds each, using the STAR structure',
    )
  }

  return {
    lang: langId,
    answers: items,
    weakestIndex,
    strengths: strengths.slice(0, 3),
    focus: focus.slice(0, 3),
    overall: { score, grade: grade(score), words, avgWpm, fillers, hedges, flags, starCoverage, quantified, vocal },
  }
}
