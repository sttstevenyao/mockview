// Resume → interview questions, entirely in the browser (the file is never uploaded).
// 1. Extract text from a PDF (pdf.js) or .txt file.
// 2. Heuristically split it into sections, entries (role + org), bullets, projects and skills.
// 3. Turn those into personalized behavioral questions with templates.

const SECTIONS = [
  ['experience', /^(?:work |professional |relevant |industry |research )?(?:experience|employment|work history)s?$/],
  ['projects', /^(?:personal |academic |technical |selected )?projects?$/],
  [
    'leadership',
    /^(?:leadership|activities|involvement|extracurriculars?|campus involvement|leadership (?:&|and) activities|volunteer(?:ing)?(?: experience)?)$/,
  ],
  ['skills', /^(?:technical )?skills(?: (?:&|and) (?:interests|tools|technologies))?$|^technologies$|^tools$/],
  ['education', /^education$|^relevant coursework$|^coursework$/],
  ['other', /^(?:awards|honors|awards (?:&|and) honors|certifications?|publications|interests|summary|objective|profile)$/],
]

const BULLET_RE = /^[•●▪◦▸►‣∙·*\-–]\s*/
const ACTION_VERBS =
  /^(?:led|built|developed|designed|created|implemented|managed|organized|launched|improved|increased|reduced|analyzed|automated|coordinated|founded|co-founded|mentored|taught|tutored|wrote|researched|engineered|optimized|collaborated|spearheaded|directed|established|initiated|streamlined|delivered|presented|conducted|trained|supervised|assisted|handled|resolved|maintained|deployed|architected|planned|raised|grew|won|served|volunteered|programmed|prototyped|tested|integrated|migrated|refactored)\b/i
const TITLE_WORDS =
  /\b(?:intern(?:ship)?|engineer|developer|analyst|assistant|president|vice president|founder|co-founder|lead|leader|manager|coordinator|researcher|tutor|teacher|teaching assistant|associate|consultant|director|officer|chair|captain|volunteer|member|fellow|specialist|technician|representative|cashier|server|treasurer|secretary|ambassador|mentor|scientist|designer|head|counselor|editor|organizer)\b/i
const LEADER_WORDS =
  /\b(?:president|vice president|founder|co-founder|lead|leader|captain|chair|director|head|manager|officer|treasurer|organizer)\b/i
const DATE_RE =
  /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*\d{2,4}|\b(?:spring|summer|fall|winter)\s+\d{4}|\b(?:19|20)\d{2}\b|\bpresent\b|\bcurrent\b/gi
const LOCATION_RE = /\b[A-Z][a-zA-Z.]+(?: [A-Z][a-zA-Z.]+)*,\s*(?:[A-Z]{2}|USA|United States)\b|\bremote\b/g

const clean = (s) =>
  s
    .replace(DATE_RE, ' ')
    .replace(LOCATION_RE, ' ')
    .replace(/\s*[–—-]\s*$|^\s*[–—-]\s*/g, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,|–—-]+|[\s,|–—-]+$/g, '')
    .trim()

function sectionOf(line) {
  const t = line.toLowerCase().replace(/[:•|]/g, '').trim()
  if (t.length > 45) return null
  for (const [id, re] of SECTIONS) if (re.test(t)) return id
  return null
}

// Splits "Software Engineering Intern | Google | June 2025 – Aug 2025" into { title, org }.
function parseEntryHeader(line) {
  const parts = line
    .split(/\s+[|–—]\s+|\s{2,}|\t|\s+-\s+|,\s+(?=[A-Z])|\s+at\s+/)
    .map(clean)
    .filter((p) => p && p.length > 1 && !/^\d+$/.test(p))
  const title = parts.find((p) => TITLE_WORDS.test(p))
  const org = parts.find((p) => p !== title)
  return { title: title || '', org: org || '', raw: clean(line) }
}

export function parseResume(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/, ''))
    .filter((l) => l.trim())
  const entries = []
  const skills = []
  const bullets = []
  let section = null
  let current = null

  for (const raw of lines) {
    const line = raw.trim()
    const sec = sectionOf(line)
    if (sec) {
      section = sec
      current = null
      continue
    }
    if (!section || section === 'education' || section === 'other') continue

    if (section === 'skills') {
      const body = line.replace(/^[^:]{1,30}:\s*/, '') // drop "Languages:" style labels
      for (const s of body.split(/[,;|•●·]|\s{2,}/)) {
        const k = s
          .replace(BULLET_RE, '')
          .replace(/\(.*?\)/g, '')
          .trim()
        if (k.length >= 1 && k.length <= 28 && !/^(and|etc\.?)$/i.test(k)) skills.push(k)
      }
      continue
    }

    const isBullet = BULLET_RE.test(line) || ACTION_VERBS.test(line)
    if (isBullet) {
      const b = line.replace(BULLET_RE, '').trim()
      if (current) current.bullets.push(b)
      bullets.push({ text: b, section })
      continue
    }
    // A wrapped bullet continues the previous one.
    if (current?.bullets.length && (/^[a-z(%,.;:)]/.test(line) || line.length <= 3)) {
      const glue = line.length <= 3 || /^[%,.;:)]/.test(line) ? '' : ' ' // re-join mid-word wraps like "40" + "%"
      current.bullets[current.bullets.length - 1] += glue + line
      bullets[bullets.length - 1].text += glue + line
      continue
    }
    if (line.length > 140) continue
    const head = parseEntryHeader(line)
    if (!head.raw) continue
    // Two-line headers: "Google  New York, NY" followed by "Software Engineering Intern  June 2025".
    if (current && !current.bullets.length && (!current.title || !current.org)) {
      if (!current.title && head.title) current.title = head.title
      else if (!current.org && head.org) current.org = head.org
      continue
    }
    current = { section, title: head.title, org: head.org || (head.title ? '' : head.raw), bullets: [] }
    entries.push(current)
  }

  return {
    experiences: entries.filter((e) => e.section === 'experience' && (e.title || e.org)),
    projects: entries.filter((e) => e.section === 'projects' && (e.org || e.title)),
    leadership: entries.filter((e) => e.section === 'leadership' && (e.title || e.org)),
    skills: [...new Set(skills)].slice(0, 30),
    bullets,
  }
}

const short = (s, n = 60) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') : s)

export function resumeQuestions(parsed, max = 6) {
  const qs = []
  const add = (text, resultHint) => qs.push({ id: `resume-${qs.length}`, track: 'resume', fromResume: true, text, resultHint })

  const exp = parsed.experiences.slice(0, 2)
  for (const e of exp) {
    const where = e.title && e.org ? `as a ${short(e.title)} at ${short(e.org)}` : `at ${short(e.org || e.title)}`
    add(
      qs.length === 0
        ? `I see you worked ${where}. Tell me about the most challenging problem you faced there and how you handled it.`
        : `Your resume also mentions your time ${where}. Tell me about something you accomplished there that you're proud of.`,
      'the work shipped on time and the team adopted it',
    )
  }

  const metric = parsed.bullets.find((b) => /\d/.test(b.text) && b.text.length > 25)
  if (metric) {
    add(
      `On your resume you wrote: ${short(metric.text, 150)}. Walk me through how you actually did that, step by step.`,
      'we hit the numbers you see on my resume',
    )
  }

  for (const p of parsed.projects.slice(0, 2)) {
    const name = short(p.org || p.title, 50)
    add(
      `Tell me about your project, ${name}. What was your specific role, and what would you do differently next time?`,
      'the project reached its first real users',
    )
  }

  const lead =
    parsed.leadership.find((l) => LEADER_WORDS.test(l.title)) || parsed.experiences.find((l) => LEADER_WORDS.test(l.title))
  if (lead) {
    add(
      `As ${short(lead.title)}${lead.org ? ` of ${short(lead.org)}` : ''}, tell me about a time you had to get your team behind a decision.`,
      'the team hit its goal for the semester',
    )
  } else if (parsed.leadership[0]) {
    const l = parsed.leadership[0]
    add(
      `Tell me about your involvement with ${short(l.org || l.title)}. What impact did you have?`,
      'the group grew noticeably that year',
    )
  }

  const skill = parsed.skills.find((s) => s.length > 1 && !/^(english|spanish|mandarin|french|microsoft office)$/i.test(s))
  if (skill)
    add(
      `Your resume lists ${skill}. Tell me about a time you used it to solve a real problem.`,
      'the fix cut the time it took in half',
    )

  if (!qs.length)
    add(
      'Walk me through your resume. Which experience best prepared you for this role, and why?',
      'I came out of it with results I can point to',
    )
  return qs.slice(0, max)
}

// ───────────────────────── File extraction ─────────────────────────

async function pdfText(file) {
  const pdfjs = await import('pdfjs-dist')
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  let out = ''
  for (let p = 1; p <= Math.min(doc.numPages, 4); p++) {
    const page = await doc.getPage(p)
    const { items } = await page.getTextContent()
    // Rebuild lines from glyph positions: small gaps are spaces, big gaps are column breaks.
    let lastY = null
    let prevEnd = null
    for (const it of items) {
      if (!it.str) continue
      const [fs0, , , fs1, x, y] = it.transform
      const size = Math.abs(fs1 || fs0) || 10
      if (lastY !== null && Math.abs(y - lastY) > size * 0.6) {
        out += '\n'
        prevEnd = null
      } else if (prevEnd !== null) {
        const gap = x - prevEnd
        if (gap > size * 1.5) out += '   '
        else if (gap > size * 0.12 && !out.endsWith(' ') && !it.str.startsWith(' ')) out += ' '
      }
      out += it.str
      prevEnd = x + it.width
      lastY = y
    }
    out += '\n'
  }
  return out
}

export async function readResumeFile(file) {
  if (file.size > 5 * 1024 * 1024) throw new Error('That file is over 5 MB. Please upload a normal resume PDF.')
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
  const text = isPdf ? await pdfText(file) : await file.text()
  if (text.replace(/\s/g, '').length < 80)
    throw new Error('Couldn’t find any text in that file. If it’s a scanned image, paste your resume text instead.')
  return text
}
