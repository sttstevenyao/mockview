# Devpost submission: MockView

Paste each section into the matching Devpost field.

**Project name:** MockView

**Tagline:**
Practice behavioral interviews out loud with an ElevenLabs-voiced interviewer, get feedback while you talk, then hear how your weakest answer should sound.

**Try it out:**
- https://mockview-ruddy.vercel.app
- https://mockview-ruddy.vercel.app/#sample (sample report)
- https://github.com/sttstevenyao/mockview

**Track:** Education
**Superlatives:** Best Newbie Hack, Use of ElevenLabs
**Built with:** `javascript` `react` `vite` `css` `node.js` `elevenlabs` `web-speech-api` `web-audio-api` `vercel` `vercel-blob`

**Gallery** (upload in this order, from `docs/screenshots/`): `interview.png`, `report.png`, `report-monologue.png`, `settings.png`, `practice.png`, `onboarding-levels.png`, `onboarding.png`

---

## Inspiration

We're all heading into internship season. Knowing your stories is one thing; saying them well with someone watching is another. Practicing out loud with a friend is awkward, career centers can't do unlimited mock interviews, and "use the STAR method" doesn't tell you what a good answer sounds like. We wanted something you could practice with at 2 AM that talks back, notices when you ramble, and shows you the fix.

## What it does

**Setup.** A few pop-up questions: name, language, experience level, field, role, session length. Beginner gets basic warm-up questions ("Tell me about yourself"). The other levels get behavioral questions for one of 14 fields. Upload a resume and some questions come from your own projects. Pick an interviewer: friendly recruiter, hiring manager who asks follow-ups, or a bar raiser who cuts you off after 90 seconds.

**Interview.** The interviewer asks each question out loud with an ElevenLabs voice. You answer into the mic and your words show up as you talk. The side panel tracks four things: a coaching tip, a STAR checklist, your pace (115 to 175 wpm is the target) and filler words. After each answer the interviewer reacts to what you actually said: credit for a quantified result, a callout when the result is missing, never praise for an empty answer. If it hears nothing it asks "Sorry, what was that?".

**Report.** Your transcript with red flags and fillers highlighted. Click one to read what the interviewer was thinking ("'Honestly'? Were the other answers dishonest?"). A diff rewrites your weakest sentence: fillers and hedges out, blame turned into ownership, a measurable result added. Sentences that have nothing to do with the question get crossed out instead. **Hear ideal delivery** plays the rewrite in the same voice, next to your original. You also get a grade, vocal analysis, your recording and a transcript download.

**Accessibility.** Larger text, high contrast, reduced motion, captions for everything the interviewer says, screen-reader announcements and keyboard shortcuts. For non-native speakers, every question can be shown and read aloud in Spanish, Chinese, Hindi, Korean or Portuguese while you practice answering in English.

## How we built it

- **ElevenLabs Text to Speech** for every interviewer line. Persona pace and expressiveness map to `speed`, `stability` and `style`, and `<break>` tags add pauses. `eleven_multilingual_v2` by default, `eleven_flash_v2_5` as a faster option. The same voice reads question translations from a hand-translated bank of 81 questions and follow-ups.
- **ElevenLabs Speech to Text.** Chrome, Edge and Safari use the browser's own recognizer. Brave and Firefox stream the mic to real-time Scribe (`scribe_v2_realtime`) over a WebSocket, using a single-use token from our server, so words appear while you speak. If that fails it falls back to sending pause-to-pause clips to the batch API.
- **Grading** is a rules engine in the browser: regex dictionaries for fillers, hedges and 13 kinds of red flags, STAR detection, a relevance check for off-topic sentences, rule-based rewrites and a word diff. It scores instantly and every point traces back to a phrase.
- **Voice analysis** with the Web Audio API: our own autocorrelation pitch detector, loudness meter and adaptive noise floor.
- **Frontend:** React + Vite, hand-written CSS, light and dark themes.
- **Backend:** Vercel serverless functions keep the ElevenLabs key off the client. Accounts live in a private Vercel Blob store with scrypt-hashed passwords and a signed HttpOnly session cookie.

## Accomplishments that we're proud of

- A full product from three first-time hackers: setup, a live interview, a report, accounts and settings, deployed and usable in any modern browser.
- ElevenLabs on both sides of the conversation: the interviewer's voice, and real-time transcription where the browser can't do it.
- Hearing your own weakest sentence read back the way a confident candidate would say it.
- An interviewer that listens: reactions based on what you said, honest handling of silence, and nonsense called out instead of polished.
- Accessibility and five languages built in from the start.

## What we learned

- How stability, style and speed change the way a synthetic voice comes across, and how much a half-second pause matters.
- How the Web Speech and Web Audio APIs work underneath: analyser nodes, time-domain data, autocorrelation.
- Specific feedback beats a score. A diff with a reason for each change teaches more than "72/100".

## What's next for MockView

- Practice history on your account, so you can watch your filler rate drop over time.
- ElevenLabs Agents for fully conversational interviews.
- Company- and role-specific question packs.
- A career-center mode where advisors assign practice and review reports.
- Full interviews in other languages, with grading rules for each.

---

## Checklist (delete before posting)

- [ ] Every teammate has a Devpost account and accepted the invite (all members must be listed as contributors)
- [ ] Track: Education only
- [ ] Superlatives: Best Newbie Hack, Use of ElevenLabs
- [ ] Repo link: https://github.com/sttstevenyao/mockview
- [ ] Gallery images uploaded
- [ ] Submitted before 10:00 AM ET, Sunday Oct 11
- [ ] At the table for judging at 1:00 PM (script in `DEMO.md`)
- [ ] Back for prizes at 3:30 PM
