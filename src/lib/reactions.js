// What the interviewer says back after each answer, based on what was actually said.
// An empty or near-empty answer never gets praise — the interviewer says it heard nothing.
import { contentQuality, countWordsIn, liveMetrics } from './analysis.js'

const pick = (a) => a[Math.floor(Math.random() * a.length)]

// Spoken when nothing has been heard for a while ("what?" lines).
export const NUDGES = [
  'Sorry, what was that? I didn’t hear anything.',
  'Hm? I can’t hear you. Could you answer out loud?',
  'Are you still there? Take your time, then go ahead and answer.',
]
export const SILENCE_GOODBYE = 'I still can’t hear you, so let’s stop here. Check your microphone and restart when you’re ready.'

const LINES = {
  empty: {
    warm: ['I didn’t hear an answer there. That’s okay. Let’s try the next one.'],
    curt: ['I didn’t hear an answer. Moving on.'],
  },
  nonAnswer: {
    warm: ['Hm, that didn’t answer the question. Next time, tell me one specific story.'],
    curt: ['That didn’t answer the question.'],
  },
  short: {
    warm: [
      'Okay. That was pretty brief, so next time walk me through it in a bit more detail.',
      'Got it. I’d love more detail in the next one: what happened, and what did you do?',
    ],
    curt: ['That was short. I need more detail than that.'],
  },
  flag: {
    warm: ['Hm. I’d be careful with how you framed part of that. Keep the focus on what you did.'],
    curt: ['Careful. Part of that would worry an interviewer.'],
  },
  noResult: {
    warm: [
      'Good context. I didn’t quite hear how it turned out, though.',
      'Okay, I follow. What I was missing was the result: how did it end?',
    ],
    curt: ['You never told me the outcome.'],
  },
  fillers: {
    warm: ['Good example. Try to slow down a little and drop some of the filler words.'],
    curt: ['Decent example, but a lot of filler words.'],
  },
  rushed: {
    warm: ['Good. You were moving pretty fast there, so feel free to take a breath.'],
    curt: ['You’re rushing.'],
  },
  number: {
    warm: [
      'I like that you put a number on the result. That’s really strong.',
      'Nice, the concrete numbers make that convincing.',
    ],
    curt: ['Good. The numbers help.'],
  },
  strong: {
    warm: [
      'That’s a well-structured answer. Clear situation, what you did, and how it turned out.',
      'Really solid. That’s exactly the kind of example I’m looking for.',
    ],
    curt: ['Solid answer.'],
  },
  clear: {
    warm: ['That’s a clear answer. Nice.', 'Good, that tells me a lot about you.'],
    curt: ['Clear enough.'],
  },
  ok: {
    warm: ['Okay, thank you for walking me through that.', 'Got it, that makes sense.', 'Alright, thanks.'],
    curt: ['Okay.', 'Noted.'],
  },
}

// Which kind of reaction an answer earns. Answers in other languages only have
// length to go on (the phrase checks are English).
export function reactionKind(answer, langId = 'en') {
  const text = answer?.text || ''
  if (langId !== 'en') {
    const words = countWordsIn(text, langId)
    return words < 3 ? 'empty' : words < 25 ? 'short' : words >= 70 ? 'clear' : 'ok'
  }
  const m = liveMetrics(text, answer?.typed ? 0 : answer?.speakingSec || answer?.durationSec || 0)
  const basic = Boolean(answer?.question?.basic)
  const q = contentQuality(text, answer?.question?.text || '', basic)
  let kind
  if (m.words < 3) kind = 'empty'
  else if (q.repetitive || q.offTopic) kind = 'nonAnswer'
  else if (m.words < (basic ? 8 : 25)) kind = 'short'
  else if (basic) kind = m.flags ? 'flag' : (m.fillers / m.words) * 100 > 7 ? 'fillers' : m.words >= 25 ? 'clear' : 'ok'
  else if (m.flags > 0) kind = 'flag'
  else if (m.starCount >= 4 && m.hasNumber) kind = 'strong'
  else if (!m.star.result && m.words > 50) kind = 'noResult'
  else if ((m.fillers / m.words) * 100 > 7) kind = 'fillers'
  else if (m.wpm > 185) kind = 'rushed'
  else if (m.hasNumber) kind = 'number'
  else if (m.starCount >= 3) kind = 'strong'
  else kind = 'ok'
  return kind
}

// acks: the persona's acknowledgement style ('warm' | 'neutral' | 'curt' | 'none').
// say(kind) gives the line in another language; English lines come from the table above.
export function reactTo(answer, acks = 'warm', { langId = 'en', say } = {}) {
  const kind = reactionKind(answer, langId)
  // A silent interviewer still says when it heard nothing, but skips the rest.
  if (acks === 'none' && kind !== 'empty' && kind !== 'nonAnswer') return ''
  if (say) return say(kind)
  return pick(LINES[kind][acks === 'curt' ? 'curt' : 'warm'])
}
