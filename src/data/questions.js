// Local mock data: question banks, interviewer personas, ElevenLabs voices,
// scripted demo answers, and a sample session for the report view.
// resultHint completes “As a result, …” in rewrites — a placeholder metric to swap for a real one.
import { scoreVocal } from '../lib/voiceAnalysis.js'

export const TRACKS = [
  { id: 'general', label: 'General Behavioral', role: '' },
  { id: 'swe', label: 'Software Engineering', role: 'software engineering' },
  { id: 'data', label: 'Data Science & Analytics', role: 'data' },
  { id: 'product', label: 'Product & Design', role: 'product' },
  { id: 'cyber', label: 'Cybersecurity & IT', role: 'cybersecurity' },
  { id: 'hardware', label: 'Mechanical & Hardware', role: 'engineering' },
  { id: 'finance', label: 'Finance & Banking', role: 'finance' },
  { id: 'consulting', label: 'Consulting', role: 'consulting' },
  { id: 'marketing', label: 'Marketing', role: 'marketing' },
  { id: 'sales', label: 'Sales', role: 'sales' },
  { id: 'healthcare', label: 'Healthcare & Nursing', role: 'healthcare' },
  { id: 'teaching', label: 'Teaching & Education', role: 'teaching' },
  { id: 'service', label: 'Customer Service & Retail', role: 'customer-facing' },
  { id: 'leadership', label: 'Leadership & Management', role: 'leadership' },
]

export const LEVELS = [
  { id: 'intern', label: 'Internship', line: 'Examples from classes, clubs, and projects are completely fine.' },
  { id: 'newgrad', label: 'New grad', line: 'Feel free to draw on internships, projects, or school.' },
  { id: 'experienced', label: 'Experienced', line: "I'll be looking for examples from your professional experience." },
]

// " for the Data Analyst Intern position" — spoken in the interviewer's intro.
export function describeRole(c) {
  if (c.role?.trim()) return ` for the ${c.role.trim()} position`
  const t = TRACKS.find((x) => x.id === c.track)
  return t?.role ? ` for a ${t.role} role` : ''
}

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

  q(
    'd1',
    'data',
    'Tell me about a time your analysis changed a decision someone was about to make.',
    'the team redirected 20 percent of its budget to the better option',
  ),
  q(
    'd2',
    'data',
    'Describe a time you worked with messy or incomplete data. How did you handle it?',
    'the report error rate dropped to under 1 percent',
  ),
  q(
    'd3',
    'data',
    'Tell me about a time you had to explain a technical finding to a non-technical audience.',
    'leadership approved the proposal in a single meeting',
  ),
  q(
    'd4',
    'data',
    'Describe a model or analysis that turned out to be wrong. What did you do?',
    'forecast accuracy improved by 15 percent',
  ),
  q('d5', 'data', 'Tell me about a time you automated a repetitive data task.', 'the team saved about eight hours every week'),

  q(
    'c1',
    'cyber',
    'Tell me about a time you identified a security risk others had missed.',
    'we closed the vulnerability within 48 hours with zero incidents',
  ),
  q('c2', 'cyber', 'Describe how you handled a stressful outage or incident.', 'we restored service in under an hour'),
  q(
    'c3',
    'cyber',
    'Tell me about a time you had to convince people to follow a security practice they found inconvenient.',
    'adoption went from 40 to 95 percent',
  ),
  q(
    'c4',
    'cyber',
    'Describe a time you had to learn a new tool or system under pressure.',
    'I resolved the ticket backlog in two days',
  ),

  q(
    'h1',
    'hardware',
    'Tell me about a design that failed testing. What did you do next?',
    'the second prototype passed every test',
  ),
  q(
    'h2',
    'hardware',
    'Describe a time you had to balance cost, quality, and schedule.',
    'we cut unit cost by 18 percent without missing the deadline',
  ),
  q('h3', 'hardware', 'Tell me about a hands-on project you are proud of.', 'it placed second out of 30 teams'),
  q(
    'h4',
    'hardware',
    'Describe a time you worked with people from another discipline to solve a problem.',
    'we eliminated the defect in the next production run',
  ),

  q(
    'f1',
    'finance',
    'Tell me about a time you caught an error in numbers or a financial model.',
    'we avoided a 50,000 dollar reporting mistake',
  ),
  q(
    'f2',
    'finance',
    'Describe a time you worked under a very tight deadline.',
    'the deliverable went out on time with zero revisions',
  ),
  q(
    'f3',
    'finance',
    'Tell me about a time you had to make a decision with incomplete information.',
    'the investment returned 12 percent that year',
  ),
  q(
    'f4',
    'finance',
    'Why finance? Tell me about an experience that sparked your interest.',
    'I grew my student investment club portfolio by 9 percent',
  ),

  q(
    'k1',
    'consulting',
    'Tell me about a time you solved an ambiguous problem with no clear answer.',
    'the client adopted two of our three recommendations',
  ),
  q(
    'k2',
    'consulting',
    'Describe a time you had to influence a stakeholder who disagreed with you.',
    'they signed off on the plan the following week',
  ),
  q(
    'k3',
    'consulting',
    'Tell me about a time you worked on a team with very different personalities.',
    'we delivered the final presentation a day early',
  ),
  q(
    'k4',
    'consulting',
    'Describe a time you had to quickly become an expert in an unfamiliar industry.',
    'my recommendation became the centerpiece of the pitch',
  ),

  q(
    'm1',
    'marketing',
    'Tell me about a campaign or project you launched. How did you measure success?',
    'engagement grew by 35 percent in a month',
  ),
  q(
    'm2',
    'marketing',
    'Describe a time a marketing idea did not work. What did you learn?',
    'the revised version doubled our click-through rate',
  ),
  q('m3', 'marketing', 'Tell me about a time you used customer insights to change your approach.', 'sign-ups rose 22 percent'),
  q(
    'm4',
    'marketing',
    'Describe a time you had to work with a very small budget.',
    'we reached 10,000 people for under 200 dollars',
  ),

  q('a1', 'sales', 'Tell me about a time you turned a "no" into a "yes".', 'we closed a 15,000 dollar deal'),
  q('a2', 'sales', 'Describe how you handled losing an important deal or customer.', 'I won the account back the next quarter'),
  q('a3', 'sales', 'Tell me about a time you exceeded a target.', 'I finished the quarter at 130 percent of quota'),
  q('a4', 'sales', 'Describe a time you built a relationship with a difficult client.', 'they renewed for two more years'),

  q(
    'n1',
    'healthcare',
    'Tell me about a time you cared for a patient or person in a difficult situation.',
    'the patient and family left with a clear care plan',
  ),
  q(
    'n2',
    'healthcare',
    'Describe a time you noticed something was wrong and spoke up.',
    'the error was caught before it reached the patient',
  ),
  q(
    'n3',
    'healthcare',
    'Tell me about a time you worked as part of a care team under pressure.',
    'we handled a record number of patients with no safety incidents',
  ),
  q(
    'n4',
    'healthcare',
    'Describe how you handled a conflict with a coworker or supervisor.',
    'our unit’s handoff errors dropped noticeably',
  ),

  q('t1', 'teaching', 'Tell me about a time you helped a struggling student or learner.', 'their grade improved from a D to a B'),
  q(
    't2',
    'teaching',
    'Describe a lesson or activity that did not go as planned. What did you change?',
    'participation doubled the next time',
  ),
  q(
    't3',
    'teaching',
    'Tell me about a time you managed a disruptive situation in a group.',
    'the group finished the activity on time',
  ),
  q(
    't4',
    'teaching',
    'Describe how you adapted your teaching for people with different needs.',
    'every student passed the final assessment',
  ),

  q('r1', 'service', 'Tell me about a time you dealt with an upset customer.', 'they left a five-star review'),
  q('r2', 'service', 'Describe a time you went out of your way to help a customer.', 'they became a regular customer'),
  q(
    'r3',
    'service',
    'Tell me about a time the store or team was short-staffed. What did you do?',
    'we kept wait times under five minutes',
  ),
  q(
    'r4',
    'service',
    'Describe a time you had to follow a policy a customer disagreed with.',
    'the customer still thanked me at the end',
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

export function buildQueue(track, resumeQuestions = []) {
  if (resumeQuestions.length) {
    // Alternate resume-based and job-field questions, starting with the resume.
    const base = buildQueue(track)
    const out = []
    for (let i = 0; i < Math.max(resumeQuestions.length, base.length); i++) {
      if (resumeQuestions[i]) out.push(resumeQuestions[i])
      if (base[i]) out.push(base[i])
    }
    return out
  }
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
    desc: 'Warm and encouraging. Says “mm-hmm”, never interrupts.',
    intro: (name, fmt, role, level) =>
      `Hi ${name}! I'm Alex, and I'll be interviewing you today${role}. This is a ${fmt} behavioral round. ${level} Take a breath, use specific examples, and let's begin.`,
    closing: (name) => `That wraps up our session, ${name}. Thanks so much — let's look at your feedback together.`,
    preview: "Hi there! I'm Alex. Ready when you are.",
    mannerisms: { speed: 1.0, expressiveness: 0.7, acks: 'warm', backchannel: true, followUps: false, interruptSec: 0 },
  },
  neutral: {
    id: 'neutral',
    name: 'Jordan',
    title: 'Hiring Manager',
    desc: 'Professional and even. Asks follow-ups when you’re vague.',
    intro: (name, fmt, role, level) =>
      `Hello ${name}, I'm Jordan, the hiring manager. This will be a ${fmt} behavioral interview${role}. ${level} Let's get started.`,
    closing: (name) => `Thank you, ${name}. That concludes the interview. Your report is ready.`,
    preview: "Hello, I'm Jordan, the hiring manager. Let's begin.",
    mannerisms: { speed: 1.0, expressiveness: 0.45, acks: 'neutral', backchannel: false, followUps: true, interruptSec: 0 },
  },
  tough: {
    id: 'tough',
    name: 'Morgan',
    title: 'Bar Raiser',
    desc: 'Terse and skeptical. Probes for numbers, cuts off long answers.',
    intro: (name, fmt, role) =>
      `${name}. I'm Morgan. This is a ${fmt} round${role}, and time is limited, so be concise and give me specifics. First question.`,
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
  role: '',
  level: 'intern',
  resume: null, // { fileName, questions, stats } — parsed locally, never uploaded
  useResume: true,
  resumeQuestions: [],
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
