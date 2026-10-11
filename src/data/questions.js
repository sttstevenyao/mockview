// Local mock data: question banks, interviewer personas, ElevenLabs voices,
// scripted demo answers, and a sample session for the report view.
// resultHint completes “As a result, …” in rewrites — a placeholder metric to swap for a real one.
import { scoreVocal } from '../lib/voiceAnalysis.js'

export const TRACKS = [
  { id: 'general', label: 'General Behavioral' },
  { id: 'swe', label: 'Software Engineering' },
  { id: 'product', label: 'Product & Design' },
  { id: 'leadership', label: 'Leadership' },
]

const q = (id, track, text, resultHint) => ({ id, track, text, resultHint })

export const QUESTIONS = [
  q(
    'g1',
    'general',
    'Tell me about a time you faced a significant challenge at work or school. How did you handle it?',
    'the project was back on schedule within two weeks',
  ),
  q(
    'g2',
    'general',
    'Describe a situation where you disagreed with a teammate. What did you do?',
    'the whole team adopted the solution within a week',
  ),
  q('g3', 'general', 'Tell me about a time you failed. What did you learn from it?', 'I have since cut similar mistakes by half'),
  q(
    'g4',
    'general',
    'Give me an example of a goal you set and how you achieved it.',
    'I hit the goal three weeks ahead of the deadline',
  ),
  q(
    'g5',
    'general',
    'Tell me about a time you had to learn something new very quickly.',
    'I was contributing on my own within ten days',
  ),
  q(
    'g6',
    'general',
    'Describe a time you went above and beyond what was expected of you.',
    'the team saved roughly ten hours a week',
  ),
  q(
    'g7',
    'general',
    'Tell me about a time you had to juggle multiple deadlines at once.',
    'I delivered all three projects on time',
  ),
  q(
    'g8',
    'general',
    'What is your greatest weakness, and what are you doing about it?',
    'I have measurably closed that gap over the last six months',
  ),
  q(
    'g9',
    'general',
    'Tell me about a time you received critical feedback. How did you respond?',
    'my next review improved by a full rating point',
  ),
  q(
    'g10',
    'general',
    'Describe a time you had to persuade someone to see things your way.',
    'four of the five stakeholders bought in',
  ),

  q(
    's1',
    'swe',
    'Tell me about a time you debugged a difficult production issue.',
    'the error rate dropped by 90 percent within a day',
  ),
  q(
    's2',
    'swe',
    'Describe a technical decision where you had to make a tradeoff. How did you decide?',
    'page load time fell by 40 percent',
  ),
  q(
    's3',
    'swe',
    'Tell me about a time you disagreed with feedback in a code review.',
    'we merged a cleaner version two days later',
  ),
  q(
    's4',
    'swe',
    'Describe a project where the requirements were unclear. What did you do?',
    'we shipped the first version in three weeks',
  ),
  q(
    's5',
    'swe',
    'Tell me about a time you significantly improved the performance of a system.',
    'p95 latency dropped from 800 to 200 milliseconds',
  ),
  q(
    's6',
    'swe',
    'Tell me about a time you had to pick up an unfamiliar codebase or technology fast.',
    'I shipped my first feature in under a week',
  ),

  q('p1', 'product', 'Tell me about a time you used data to change a product decision.', 'conversion rose by 18 percent'),
  q('p2', 'product', 'Describe a time you had to say no to a stakeholder.', 'the launch stayed on schedule'),
  q(
    'p3',
    'product',
    'Tell me about a feature you shipped that did not land the way you expected.',
    'the redesign doubled weekly active usage',
  ),
  q(
    'p4',
    'product',
    'Describe how you prioritized when everything felt urgent.',
    'we cleared 80 percent of the backlog in one sprint',
  ),
  q(
    'p5',
    'product',
    'Tell me about a time you turned user feedback into a better experience.',
    'our satisfaction score rose from 3.6 to 4.5',
  ),

  q(
    'l1',
    'leadership',
    'Tell me about a time you led a team through a difficult situation.',
    'the team delivered on time with zero attrition',
  ),
  q(
    'l2',
    'leadership',
    'Describe a time you had to motivate someone who was disengaged.',
    'their output doubled over the next month',
  ),
  q(
    'l3',
    'leadership',
    'Tell me about a time you had to make an unpopular decision.',
    'the club saved 2,000 dollars that semester',
  ),
  q('l4', 'leadership', 'Describe a time you delegated something important.', 'the whole team freed up six hours a week'),
  q(
    'l5',
    'leadership',
    'Tell me about a conflict within a team you led and how you resolved it.',
    'we finished the project two days early',
  ),
]

const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function buildQueue(track) {
  const general = shuffle(QUESTIONS.filter((x) => x.track === 'general'))
  if (track === 'general') return general
  return [...shuffle(QUESTIONS.filter((x) => x.track === track)), ...general]
}

// Endless mode: append another shuffled round without repeating back-to-back.
export function extendQueue(queue, track) {
  let next = buildQueue(track)
  if (next[0]?.id === queue[queue.length - 1]?.id) next = [...next.slice(1), next[0]]
  return [...queue, ...next]
}

export const PERSONAS = {
  friendly: {
    id: 'friendly',
    name: 'Alex',
    title: 'Friendly Recruiter',
    desc: 'Warm, encouraging, gives you room to think.',
    intro: (name, fmt) =>
      `Hi ${name}! I'm Alex, and I'll be your interviewer today. This is a ${fmt} behavioral round. Take a breath, use specific examples, and let's begin.`,
    closing: (name) => `That wraps up our session, ${name}. Thanks so much — let's look at your feedback together.`,
    preview: "Hi there! I'm Alex. Ready when you are.",
    mannerisms: { speed: 1.0, expressiveness: 0.7, acks: 'warm', backchannel: true, followUps: false, interruptSec: 0 },
  },
  neutral: {
    id: 'neutral',
    name: 'Jordan',
    title: 'Hiring Manager',
    desc: 'Professional and even-toned. A realistic baseline.',
    intro: (name, fmt) =>
      `Hello ${name}, I'm Jordan, the hiring manager. This will be a ${fmt} behavioral interview. Let's get started.`,
    closing: (name) => `Thank you, ${name}. That concludes the interview. Your report is ready.`,
    preview: "Hello, I'm Jordan, the hiring manager. Let's begin.",
    mannerisms: { speed: 1.0, expressiveness: 0.45, acks: 'neutral', backchannel: false, followUps: true, interruptSec: 0 },
  },
  tough: {
    id: 'tough',
    name: 'Morgan',
    title: 'Bar Raiser',
    desc: 'Terse and skeptical. Pushes for specifics and numbers.',
    intro: (name, fmt) =>
      `${name}. I'm Morgan. This is a ${fmt} round and time is limited, so be concise and give me specifics. First question.`,
    closing: (name) => `We're done here, ${name}. Let's see how you did.`,
    preview: "I'm Morgan. Be specific, and be concise.",
    mannerisms: { speed: 1.08, expressiveness: 0.25, acks: 'curt', backchannel: false, followUps: true, interruptSec: 90 },
  },
}

// ── Interviewer mannerisms (customizable on the setup screen) ──
export const ACK_STYLES = {
  warm: {
    label: 'Warm',
    lines: [
      'Great, thanks for sharing that.',
      'I love that example.',
      'Thank you, that was really helpful.',
      'Nice, that’s a good one.',
    ],
  },
  neutral: { label: 'Neutral', lines: ['Thank you.', 'Okay, understood.', 'Alright.', 'Got it, thanks.'] },
  curt: { label: 'Curt', lines: ['Noted.', 'Hm. Okay.', 'Fine.', 'Moving on.'] },
  none: { label: 'Silent', lines: [''] },
}
export const BACKCHANNELS = ['Mm-hmm.', 'Okay…', 'Right, right.', 'Mm, okay.', 'Ah, I see.']
export const TRANSITIONS = ['So,', 'Alright, so…', 'Okay, next one.', 'Let me ask you this.', 'Next question.']
export const INTERRUPTS = [
  'Sorry to cut in — let’s get to the point. What was the result?',
  'Let me stop you there. In one sentence, what did you personally do?',
  'I’m going to jump in, we’re short on time. How did it end?',
]
export const INTERRUPT_OPTIONS = [
  { value: 0, label: 'Never' },
  { value: 60, label: 'After 60s' },
  { value: 90, label: 'After 90s' },
  { value: 120, label: 'After 2 min' },
]

// Picks a follow-up probe when an answer is missing something; null if it's solid.
export function followUpFor(metrics) {
  if (metrics.words < 12) return 'Can you expand on that with a specific example?'
  if (!metrics.star.action) return 'What did you personally do there — not the team, you?'
  if (!metrics.hasNumber) return 'Can you put a number on that? What was the measurable impact?'
  if (!metrics.star.result) return 'And how did it turn out in the end?'
  return null
}

// Premade ElevenLabs voices available on every account.
export const VOICES = [
  { id: 'JBFqnCBsd6RMkjVDRZzb', label: 'George — warm, British' },
  { id: 'EXAVITQu4vr4xnSDxMaL', label: 'Sarah — confident, American' },
  { id: 'nPczCjzI2devNBz1zQrb', label: 'Brian — deep, American' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', label: 'Alice — clear, British' },
]

export const DEFAULT_CONFIG = {
  name: 'Candidate',
  track: 'general',
  persona: 'friendly',
  voiceId: VOICES[0].id,
  voiceQuality: 'high',
  mannerisms: { speed: 1.0, expressiveness: 0.7, acks: 'warm', backchannel: true, followUps: false, interruptSec: 0 },
  mode: 'count',
  count: 3,
  minutes: 10,
  coaching: true,
}

export const describeFormat = (c) =>
  c.mode === 'count' ? `${c.count}-question` : c.mode === 'timed' ? `${c.minutes}-minute` : 'open-ended'

// Scripted answers for "Simulate answer" — keeps the demo working in a loud hall.
export const SIM_ANSWERS = [
  "So um, basically at my last internship my manager was kind of terrible, and uh, I think the project was like falling behind. Honestly it wasn't my fault, but I guess I helped with fixing the deployment stuff. I reorganized the sprint board and set up daily check-ins with the team. As a result we shipped the release on time and cut open bugs by 30 percent.",
  "Um, I think a time I failed was like my sophomore year when I was responsible for a group project. I don't know, I kind of tried to do everything myself and you know, it didn't go well. I learned to delegate earlier and now I schedule a kickoff meeting to split tasks.",
  'During my internship at a fintech startup, our onboarding flow had a 40 percent drop-off rate. My task was to find out why. I analyzed session recordings, interviewed six users, and proposed a shorter three-step form. As a result, completion rose to 72 percent within a month.',
  'Yeah so, uh, I was working on a hackathon project and we basically had like no idea how to deploy it. I hated the documentation honestly. We just gave up on the fancy version and, um, I built a simpler one with Flask. In the end it worked and we actually placed in the top ten.',
]

const byId = (id) => QUESTIONS.find((x) => x.id === id)

const mockVocal = (v) => ({ ...v, scores: scoreVocal(v) })

export function sampleResult() {
  const answers = [
    {
      question: byId('g1'),
      text: SIM_ANSWERS[0],
      durationSec: 27,
      vocal: mockVocal({
        voicedFrames: 190,
        meanDb: -37,
        dbStd: 8.4,
        pitchHz: 168,
        pitchSt: 1.6,
        talkRatio: 0.71,
        longPauses: 2,
        longestPause: 1.9,
      }),
    },
    {
      question: byId('g3'),
      text: SIM_ANSWERS[1],
      durationSec: 21,
      vocal: mockVocal({
        voicedFrames: 120,
        meanDb: -44,
        dbStd: 9.8,
        pitchHz: 161,
        pitchSt: 1.0,
        talkRatio: 0.52,
        longPauses: 4,
        longestPause: 3.2,
      }),
    },
    {
      question: byId('s6'),
      text: SIM_ANSWERS[3],
      durationSec: 24,
      vocal: mockVocal({
        voicedFrames: 170,
        meanDb: -31,
        dbStd: 6.1,
        pitchHz: 174,
        pitchSt: 3.4,
        talkRatio: 0.78,
        longPauses: 1,
        longestPause: 1.4,
      }),
    },
  ].map((a) => ({ ...a, chunks: a.text.split(/(?<=[.!?])\s+/) }))
  return { answers, totalSec: 142, reason: 'sample' }
}
