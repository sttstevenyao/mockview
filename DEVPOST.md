# Devpost submission: MockView

**Tagline (≤ 200 chars):**
Practice behavioral interviews with a realistic ElevenLabs-voiced interviewer, live grading of what you say and how you sound, and an "ideal delivery" you can actually hear.

**Track:** Education
**Superlatives:** Best Newbie Hack · Use of ElevenLabs
**Built with:** `react` `vite` `javascript` `elevenlabs` `elevenlabs-scribe` `web-speech-api` `web-audio-api` `vercel` `css`

---

## Inspiration

All four of us are first-time hackers and students heading into internship season. Our first real interviews taught us something uncomfortable: knowing the answer isn't the problem, *saying it well* is. We rambled, said "um" constantly, forgot to mention results, and never got honest feedback, because practicing out loud with a friend is awkward and recruiters rarely tell you why you didn't move forward.

Career centers can't sit with every student for unlimited mock interviews, and reading "use the STAR method" doesn't teach you what a strong answer *sounds like*. We wanted a coach you could practice with at 2 AM before an interview. It should talk to you like a real interviewer, react to how you speak in real time, and then show you, and play for you, exactly how to say it better. That became MockView.

## What it does

MockView is a customizable behavioral interview simulator with an analytical feedback dashboard.

**1. Set up your interview.** When you open MockView, a few quick pop-up questions ask your name, experience level, field, target role, and how long you want to practice. You can create an account (username and password, with an optional email) so your answers load automatically when you log in with your username or email. From there you can choose a focus area (General, Software Engineering, Product, Leadership), an interviewer persona (Friendly Recruiter, Hiring Manager, or Bar Raiser), and a session format: a fixed number of questions, a timed session, or **Endless Mode**, which runs until you stop. You can also customize the interviewer's **mannerisms**: speaking pace, expressiveness, how they react to your answers (warm, neutral, curt, or silent), natural backchannel ("Mm-hmm… okay, so…"), whether they **probe with follow-ups** when you're vague ("Can you put a number on that?"), and whether they **interrupt** answers that run too long.

**2. Interview out loud.** An **ElevenLabs** voice asks each question while an audio-wave visualizer pulses with the voice. When it's your turn, you answer into your mic and a **Live Grading Sidebar** updates in real time:
- **Filler Word Counter** ("um", "like", "you know"…) with a per-word breakdown
- **Speaking Pace gauge** (WPM), with slow, ideal and fast zones
- **Confidence Score**, which shifts as you hedge, add numbers, or hit STAR beats
- **STAR tracker** that lights up Situation, Task, Action and Result as you cover them
- **Vocal Delivery meter**, which scores how you *sound*: projection, pitch variety (monotone vs. expressive) and pauses
- **Live coach** tips such as "Land the plane: what was the measurable Result?"

The interviewer **reacts to what you actually said** after each answer. A quantified STAR answer earns "I like that you put a number on the result", while a missing outcome gets "I didn't quite hear how it turned out." If it hears nothing, it asks **"Sorry, what was that?"**, and after repeated silence it stops and asks you to check your mic and restart. It never praises an empty answer. Everything said is logged in a live conversation transcript, and each answer is recorded so you can replay it on the report or download the full transcript.

**3. Get your report.** A split-screen feedback view shows your transcript with inline **red pills (red flags)** and **amber pills (fillers and hedges)**. Click any pill to read the **Interviewer's Inner Monologue**, e.g. *"'Honestly' — wait, were the other answers not honest?"* On the right, a **GitHub-style diff** rewrites your weakest sentence: it removes fillers and hedges, reframes blame into ownership, upgrades passive verbs, and adds a quantified result. Then you press **Hear Ideal Delivery**, and ElevenLabs reads the improved sentence aloud in a natural, confident voice, right next to a playback of your original. You also get an overall grade, strengths and focus areas, and a "How you sounded" vocal breakdown.

## How we built it

- **Frontend:** React 18 + Vite with a hand-built dark "terminal" design system (no UI library), SVG gauges and rings, and a canvas waveform visualizer.
- **ElevenLabs Text-to-Speech** is the voice of the product. Every interviewer line is generated through `/v1/text-to-speech/{voice_id}`. We mapped our setup screen's "mannerisms" directly onto ElevenLabs voice settings: pace → `speed`, expressiveness → lower `stability` + higher `style`, so a Bar Raiser actually *sounds* terse and a Friendly Recruiter sounds warm. We use `<break time="0.6s"/>` tags to add human pauses, let users pick **`eleven_multilingual_v2`** (most realistic) or **`eleven_flash_v2_5`** (lowest latency), and always use Multilingual v2 for the "Ideal Delivery" playback.
- **No dead air:** while one question plays, we prefetch the next question's ElevenLabs audio, and we cache audio per sentence.
- **Secure key handling:** a tiny proxy (`server/elevenlabs.js`) runs as Vite middleware locally and as a Vercel serverless function in production, so the API key never reaches the browser.
- **Speech in:** the browser's Web Speech API gives us zero-latency transcripts. We wrapped it to auto-restart after Chrome's silence timeouts, and we mute it while the interviewer talks so it doesn't transcribe the AI's own voice.
- **ElevenLabs Speech-to-Text (Scribe)** covers browsers where that doesn't work. Brave blocks the built-in recognizer and Firefox doesn't have one, so in those browsers we record the mic in pause-to-pause clips (detected from the live RMS level) and transcribe each clip through `/v1/speech-to-text` with `scribe_v1` as soon as you pause. Clips with no detected speech are never sent, so silence can't become invented words.
- **Grading engine:** instead of waiting on an LLM, we wrote a deterministic local rules engine: regex dictionaries for fillers, hedges and 13 categories of red flags; STAR-structure detection; a confidence formula; a rule-based sentence rewriter; and a longest-common-subsequence word diff. Scoring is instant, works offline, and every point can be explained to the user.
- **Vocal analysis:** we tap the microphone with the Web Audio API and run our own **autocorrelation pitch detector**, RMS loudness meter, and adaptive noise floor (for a noisy hackathon hall) to score projection, pitch variety, steadiness and pauses.

## Challenges we ran into

- **Speakers + microphone = the AI hears itself.** With laptop speakers, speech recognition would transcribe the interviewer's ElevenLabs voice as the user's answer. We built the flow as strict turn-taking: the mic pauses while the interviewer speaks and resumes automatically after.
- **Chrome's speech recognition stops after a few seconds of silence**, which ended answers mid-thought. We wrapped it in a transcriber that silently restarts and stitches results together.
- **Transcripts have no punctuation**, so "find the weakest sentence" had no sentences. We used the recognizer's pause-delimited chunks as sentence boundaries and split long runs at conjunctions.
- **Rule-based rewrites can produce broken grammar.** Deleting "tried to" left "I do everything myself." We tested rules against messy real answers and removed or rewrote the ones that broke tense.
- **Latency vs. realism.** Flash is fast and Multilingual v2 sounds more human. Prefetching the next question let us default to the more realistic model without awkward gaps.
- **Pitch detection is hard.** Octave errors and room noise made early "expressiveness" scores jumpy. We added outlier filtering around the median pitch and an adaptive noise floor.
- **Brave blocks speech recognition.** The API exists in Brave but fails with a network error because Brave won't send audio to Google. Rather than tell judges to switch browsers, we detect Brave (and that error) and switch to ElevenLabs Scribe automatically.
- **Being first-timers.** None of us had shipped a full web app in 24 hours before. <!-- TODO: add a real moment from your night here -->

## Accomplishments that we're proud of

- Shipping a complete, polished product as **four first-time hackers**: setup, live interview, and a feedback dashboard that looks like an enterprise tool.
- A sidebar that **genuinely reacts while you talk**. Saying "um" makes the counter jump, and the gauge needle swings with your pace.
- Using ElevenLabs for **both directions of the conversation**: Text-to-Speech for the interviewer and Speech-to-Text (Scribe) for the candidate wherever the browser can't transcribe.
- Using **ElevenLabs as more than a voice-over**: personas, mannerisms mapped to voice settings, natural pauses, prefetching, and the "Hear Ideal Delivery" moment where a student finally *hears* what a strong answer sounds like.
- Building our own **pitch and loudness analysis** from raw audio samples in the browser.
- A grading engine with **zero LLM latency** that explains every score.

## What we learned

- How text-to-speech settings like stability, style and speed change how a voice is perceived, and how much natural pauses matter for realism.
- How the Web Speech and Web Audio APIs work under the hood (analyser nodes, time-domain vs. frequency data, autocorrelation).
- That good feedback is specific and actionable. A diff with a reason for each change teaches more than a score.
- How to scope ruthlessly: we had a working end-to-end demo early and polished from there.

## What's next for MockView

- Practice history saved to your account, so you can watch your filler-word rate and scores improve across sessions.
- **ElevenLabs Agents** for fully conversational interviews with adaptive, context-aware follow-ups.
- Company- and role-specific question packs, plus progress tracking across sessions so students can watch their filler rate drop.
- A career-center mode where advisors assign practice sets and review students' reports.
- Multilingual interviews, since ElevenLabs supports 32 languages, for international students practicing in English or in their target market's language.

---

## Submission checklist (delete before posting)

- [ ] Devpost: every team member added to the project (max 4) and registered for HackRU
- [ ] Track: **Education** only (selecting more than one track = disqualification)
- [ ] Superlatives: **Best Newbie Hack** + **Use of ElevenLabs** (max 2)
- [ ] Public GitHub repo link + demo video (~2 min) + screenshots (`docs/cover.png`)
- [ ] Submitted **before 10:00 AM ET Sunday, Oct 11**
- [ ] All four members at the judging table at **1:00 PM ET** and back for prizes at **3:30 PM ET**
- [ ] ElevenLabs: PR to `elevenlabs/showcase` + their submission form + feedback form (links in the ElevenLabs hacker guide)
