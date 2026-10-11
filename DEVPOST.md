# Devpost submission: MockView

Copy each section into the matching Devpost field.

**Project name:** MockView

**Tagline (≤ 200 chars):**
Practice behavioral interviews out loud with an ElevenLabs-voiced interviewer, get live feedback while you speak, then hear exactly how your weakest answer should sound.

**Try it out:**
- Live demo: https://mockview-ruddy.vercel.app
- Sample report: https://mockview-ruddy.vercel.app/#sample
- Code: https://github.com/sttstevenyao/mockview

**Track:** Education
**Superlatives:** Best Newbie Hack · Use of ElevenLabs
**Built with:** `react` `vite` `javascript` `elevenlabs` `elevenlabs-scribe` `web-speech-api` `web-audio-api` `vercel` `vercel-blob` `node.js` `css`

**Image gallery** (upload in this order, from `docs/screenshots/`):
1. `interview.png`: live interview with the feedback panel
2. `report.png`: feedback report with the rewrite diff
3. `report-monologue.png`: clicking a red flag shows the interviewer's inner monologue
4. `practice.png`: practice page
5. `onboarding.png`: first-visit questions

---

## Inspiration

All three of us are first-time hackers heading into internship season. Our first real interviews taught us something uncomfortable: the hard part is saying the answer well. We rambled, said "um" constantly, forgot to mention results, and never got honest feedback, because practicing out loud with a friend is awkward and recruiters rarely tell you why you didn't move forward.

Career centers can't sit with every student for unlimited mock interviews, and reading "use the STAR method" doesn't teach you what a strong answer *sounds like*. We wanted a coach you could practice with at 2 AM before an interview: one that talks to you like a real interviewer, reacts to how you speak in real time, and then shows you, and plays for you, how to say it better. That became MockView.

## What it does

MockView is a behavioral interview simulator with live feedback and an analytical report.

**1. Set up in 30 seconds.** On your first visit, a few quick pop-up questions ask your name, experience level, field (14 to choose from, from software engineering to nursing to teaching), target role, and session length: a fixed number of questions, a timed session, or **Endless Mode**. Upload a resume and some questions are generated from your own projects and jobs. Pick an interviewer: a warm Friendly Recruiter, an even Hiring Manager who asks follow-ups, or a terse Bar Raiser who interrupts long answers. Sign up with your email to keep your setup across devices.

**2. Interview out loud.** An **ElevenLabs** voice asks each question while a waveform pulses with it. You answer into your mic, your words appear as you speak, and a live feedback panel shows only what you can act on mid-sentence:
- a **coaching tip** ("Land the plane: what was the measurable Result?")
- a **STAR checklist** that ticks off Situation, Task, Action and Result as you cover them
- a **pace bar** with the ideal 115 to 175 words-per-minute range marked
- a **filler-word counter** showing which fillers you lean on

The interviewer **reacts to what you actually said**. A quantified STAR answer earns "I like that you put a number on the result"; a missing outcome gets "I didn't quite hear how it turned out." If it hears nothing it asks **"Sorry, what was that?"**, and after repeated silence it stops and asks you to check your mic. It never praises an empty answer. Every line is logged in a live conversation transcript, and each answer is recorded.

**3. Get your report.** Your transcript appears with **red pills** for red flags and **amber pills** for fillers and hedges. Click one to read the **interviewer's inner monologue**, like *"'Honestly'? Were the other answers dishonest?"* A **GitHub-style diff** rewrites your weakest sentence: it cuts fillers and hedges, turns blame into ownership, upgrades passive verbs, and adds a measurable result. Press **Hear ideal delivery** and ElevenLabs reads the improved sentence in a confident voice, next to your original. You also get a grade, strengths, focus areas, a "How you sounded" vocal breakdown, playback of your own recording, and a downloadable transcript.

**Accessibility and language support.** Larger text, high contrast, reduced motion, and captions for everything the interviewer says, with a screen-reader live region and full keyboard control. For non-native speakers, every question can be shown and read aloud in **Spanish, Chinese, Hindi, Korean or Portuguese** by the same ElevenLabs voice (Multilingual v2), so you understand the question in your own language and practice answering in English.

**Settings** also cover theme, skipping the introduction, reactions, silence prompts, live tips, the live transcript, and the voice model and speed.

## How we built it

- **Frontend:** React 18 + Vite with a hand-built design system (no UI library), light and dark themes, SVG and canvas visualizations.
- **ElevenLabs Text to Speech** is the interviewer's voice. Every line goes through `/v1/text-to-speech/{voice_id}`. Each persona's mannerisms map onto voice settings (pace to `speed`, expressiveness to lower `stability` and higher `style`), so the Bar Raiser *sounds* terse and the recruiter sounds warm. `<break time="0.6s"/>` tags add human pauses. Users choose `eleven_multilingual_v2` (most realistic) or `eleven_flash_v2_5` (lowest latency); "Hear ideal delivery" always uses Multilingual v2. The same voice reads each question's translation in Spanish, Chinese, Hindi, Korean or Portuguese, from a hand-translated bank of all 71 questions and follow-ups.
- **No dead air:** while one question plays, the next question's audio is prefetched, and audio is cached per sentence.
- **ElevenLabs Speech to Text (Scribe)** handles the other direction where browsers can't. Brave blocks the built-in recognizer and Firefox doesn't ship one, so there we record the mic in pause-to-pause clips, detected from the live loudness level, and transcribe each clip with `scribe_v1` as soon as you pause. Clips without detected speech are never sent, so silence can't turn into invented words.
- **Speech in elsewhere:** the browser's Web Speech API gives zero-latency transcripts. We wrapped it to restart after Chrome's silence timeouts and pause it while the interviewer talks, so it never transcribes the interviewer's own voice.
- **Grading engine:** a deterministic rules engine in the browser: regex dictionaries for fillers, hedges and 13 kinds of red flags, STAR detection, a confidence formula, a rule-based sentence rewriter, and a longest-common-subsequence word diff. Scoring is instant, and every point can be explained.
- **Vocal analysis:** the Web Audio API feeds our own autocorrelation pitch detector, loudness meter and adaptive noise floor to score projection, pitch variety, steadiness and pauses.
- **Backend:** Vercel serverless functions keep the ElevenLabs key off the client. Accounts live in a private Vercel Blob store, with scrypt password hashes and an HMAC-signed HttpOnly session cookie, so you can log in from any device.

## Challenges we ran into

- **The interviewer heard itself.** With laptop speakers, speech recognition transcribed the interviewer's ElevenLabs voice as the user's answer. We made the flow strict turn-taking: the mic pauses while the interviewer speaks.
- **Chrome stops listening after a few seconds of silence**, which cut answers off mid-thought. Our transcriber restarts silently and stitches the results together.
- **Brave blocks speech recognition.** The API exists but fails with a network error, because Brave won't send audio to Google. We detect Brave and that error and switch to ElevenLabs Scribe automatically.
- **Transcripts have no punctuation**, so "find the weakest sentence" had no sentences. We used the recognizer's pause-delimited chunks as boundaries and split long runs at conjunctions.
- **A blank answer got an A.** While testing what happens when the mic hears nothing, a session with one real answer and one empty one scored 95/100. The grade was weighted by word count, so an empty answer counted for nothing. Every question now counts equally, and that session scores a D with "Answer every question" as the top fix.
- **Rule-based rewrites can break grammar.** Deleting "tried to" left "I do everything myself." We tested rules against messy real answers and rewrote the ones that broke tense.
- **Latency vs. realism.** Flash is fast; Multilingual v2 sounds more human. Prefetching the next question let us default to the realistic model without gaps.

## Accomplishments that we're proud of

- Shipping a complete product as **three first-time hackers**: onboarding, accounts, a live interview, a feedback report, and settings, deployed and usable by anyone with a browser.
- **Accessibility built in**: captions, larger text, high contrast, reduced motion, keyboard control, and questions in five languages for non-native speakers.
- Using ElevenLabs for **both sides of the conversation**: Text to Speech for the interviewer, and Speech to Text so the app works in any modern browser.
- The **"Hear ideal delivery"** moment, where a student hears what a strong version of their own sentence sounds like.
- An interviewer that **listens**: reactions grounded in what you said, and honest handling of silence.
- Our own **pitch and loudness analysis** from raw audio samples, and a grading engine that scores instantly in the browser and explains every point.

## What we learned

- How stability, style and speed change how a synthetic voice is perceived, and how much natural pauses matter for realism.
- How the Web Speech and Web Audio APIs work underneath: analyser nodes, time-domain data, autocorrelation.
- Good feedback is specific. A diff with a reason for each change teaches more than a score.
- Test the empty cases. Our worst bug only appeared when the user said nothing.

## What's next for MockView

- Practice history on your account, so you can watch your filler rate and scores improve across sessions.
- **ElevenLabs Agents** for fully conversational interviews with adaptive follow-ups.
- Company- and role-specific question packs.
- A career-center mode where advisors assign practice sets and review reports.
- Full interviews in other languages, with grading rules for each language.

---

## Submission checklist (delete before posting)

- [ ] Every teammate has a Devpost account and has **accepted the invite** to the project (required: each member listed as a contributor)
- [ ] Track: **Education** only (more than one track = disqualification)
- [ ] Superlatives: **Best Newbie Hack** and **Use of ElevenLabs** (max 2)
- [ ] Repository link: https://github.com/sttstevenyao/mockview
- [ ] Gallery images uploaded from `docs/screenshots/`
- [ ] Submitted before **10:00 AM ET, Sunday Oct 11**
- [ ] Whole team at the table for judging at **1:00 PM ET**; rehearse with `DEMO.md`
- [ ] Back for prizes at **3:30 PM ET** (winners must be present to sign)
- [ ] Optional: demo video (not required by HackRU)
