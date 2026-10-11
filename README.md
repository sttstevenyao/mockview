# MockView 🎙️

**Practice the interview before it counts.** MockView is a customizable behavioral interview simulator with a realistic, ElevenLabs-voiced interviewer, a live grading sidebar, and an analytical feedback dashboard. It shows you what to fix and lets you *hear* how a better answer sounds.

> Built in 24 hours at **HackRU Fall 2026** (Rutgers University) · **Education Track** · Submitted for **Best Newbie Hack** and **Use of ElevenLabs**

![MockView feedback report](docs/cover.png)

---

## ✨ Features

| | |
|---|---|
| 🗣️ **ElevenLabs-voiced interviewer** | Three personas (Friendly Recruiter, Hiring Manager, Bar Raiser) and four premade ElevenLabs voices. Choose **Realistic** (`eleven_multilingual_v2`) or **Low latency** (`eleven_flash_v2_5`). |
| 🎭 **Custom mannerisms** | Speaking pace, expressiveness, reaction style (warm / neutral / curt / silent), natural backchannel ("Mm-hmm…"), **follow-up probing** for vague answers, and **interruptions** for answers that run long. |
| 👋 **Guided onboarding + accounts** | Pop-up questions on first visit (name, experience level, field, role, session length), then an optional account (username + password, email optional) that saves your preferences. Log in with your username or email. Accounts live in the browser, with passwords stored only as salted PBKDF2 hashes. |
| 💬 **Reactive interviewer** | After each answer the interviewer responds to what you actually said: praise for a quantified STAR answer, "I didn't hear how it turned out" when the result is missing, and never praise for an empty answer. |
| 🤫 **Silence handling** | If it hears nothing, the interviewer asks "Sorry, what was that?". After repeated silence it stops and asks you to check your mic and restart. |
| 🌐 **Works in Brave & Firefox** | Where built-in speech recognition is missing or blocked, answers are transcribed with **ElevenLabs Scribe** instead. You can also type answers. |
| 🧾 **Recorded & transcribed** | A live conversation log of every line, a recording of each answer you can replay on the report, and a downloadable transcript. |
| ⏱️ **Flexible sessions** | Fixed number of questions, a timed session, or **Endless Mode** that runs until you stop. |
| 📊 **Live grading sidebar** | A filler-word counter, a WPM pace gauge, a shifting confidence score with a sparkline, a STAR structure tracker, and a live coach tip. All of it updates while you speak. |
| 🔊 **Vocal delivery analysis** | Scores how you *sound*, not just what you say: projection (loudness), pitch variety (monotone vs. expressive), volume steadiness, and pauses, computed from the raw mic signal. |
| 📝 **Feedback report** | Your transcript with **red** (red flag) and **amber** (filler / hedge) pills. Click one to read the *interviewer's inner monologue*. |
| 🔁 **Rewrite + Hear Ideal Delivery** | A GitHub-style diff rewrites your weakest sentence, then ElevenLabs reads the improved version aloud so you can compare it with your original. |

## 🔌 How we use ElevenLabs

ElevenLabs is the voice of the whole product:

1. **Interviewer speech**: every intro, question, acknowledgement, follow-up and interruption is generated with the ElevenLabs Text-to-Speech API (`POST /v1/text-to-speech/{voice_id}`).
2. **Mannerisms → voice settings**: the setup screen's pace slider maps to `voice_settings.speed`, and expressiveness maps to lower `stability` plus higher `style`. Personas therefore *sound* different, not just read different scripts.
3. **Natural pacing**: `<break time="0.6s" />` tags put a human beat between "Mm-hmm, thanks." and the next question.
4. **Ideal Delivery playback**: the rewritten sentence is voiced with `eleven_multilingual_v2` (the most expressive model), side by side with the original.
5. **Zero dead air**: the next question's audio is prefetched while the current one plays, and responses are cached per sentence.
6. **Live visualizer**: ElevenLabs audio is routed through a Web Audio `AnalyserNode` that drives the waveform.
7. **Speech-to-Text (Scribe)**: in browsers that block the built-in recognizer (Brave) or don't have one (Firefox), the mic is recorded in pause-to-pause clips and transcribed with the ElevenLabs Speech-to-Text API (`POST /v1/speech-to-text`, `scribe_v1`). Clips with no detected speech are never sent, so silence can't turn into invented words.

The API key stays server-side, behind a small proxy ([`server/elevenlabs.js`](server/elevenlabs.js)). If ElevenLabs is unreachable, MockView falls back to the browser's best built-in voice so the demo never breaks.

## 🧱 Tech stack

- **Frontend:** React 18 + Vite, hand-written CSS (dark "terminal" design system)
- **Voice out:** ElevenLabs Text-to-Speech API
- **Voice in:** Web Speech API (`webkitSpeechRecognition`) for zero-latency transcripts, with ElevenLabs Speech-to-Text (Scribe) as the fallback
- **Audio analysis:** Web Audio API, with autocorrelation pitch detection, RMS loudness and an adaptive noise floor
- **Grading engine:** a deterministic local rules engine ([`src/lib/analysis.js`](src/lib/analysis.js)) with regex dictionaries for fillers, hedges and red flags, STAR detection, rule-based rewrites, and an LCS word diff. No LLM calls, so scoring is instant and every point can be explained.
- **Hosting:** Vercel (static site + two serverless functions, [`api/tts.js`](api/tts.js) and [`api/stt.js`](api/stt.js))

## 🚀 Getting started

**Requirements:** Node 18+, a modern browser (Chrome or Edge give live word-by-word transcripts; Brave and Firefox use ElevenLabs Scribe), and an [ElevenLabs API key](https://elevenlabs.io/app/settings/api-keys).

```bash
git clone https://github.com/YOUR-ORG/mockview.git
cd mockview
npm install
cp .env.example .env        # then paste your key into ELEVENLABS_API_KEY
npm run dev                 # → http://localhost:5173
```

Allow microphone access when Chrome asks. Tips:

- Open **`/#sample`** to jump straight to a sample feedback report.
- During an interview, press **S** (*Simulate answer*) to stream a scripted answer. This is useful in a noisy room or for a quick demo.
- Keyboard: **N** next question · **R** repeat question · **S** simulate answer.

### Deploy to Vercel

```bash
npm i -g vercel
vercel                       # accept the detected Vite defaults
vercel env add ELEVENLABS_API_KEY
vercel --prod
```

## 🗂️ Project structure

```
mockview/
├── api/tts.js                 # Vercel serverless proxy → ElevenLabs Text-to-Speech
├── api/stt.js                 # Vercel serverless proxy → ElevenLabs Speech-to-Text (Scribe)
├── server/elevenlabs.js       # shared ElevenLabs TTS + STT calls (dev + prod)
├── server/guard.js            # same-origin check + per-IP rate limit
├── vite.config.js             # serves /api/tts and /api/stt during `npm run dev`
├── src/
│   ├── App.jsx                # onboarding → setup → interview → feedback, credits tab
│   ├── components/
│   │   ├── Onboarding.jsx     # pop-up setup questions + account step
│   │   ├── AuthForm.jsx       # sign up / log in form
│   │   ├── Setup.jsx          # interview summary, persona, voice, resume
│   │   ├── Credits.jsx        # team and acknowledgements
│   │   ├── Interview.jsx      # interview flow, timers, follow-ups, interruptions
│   │   ├── LiveSidebar.jsx    # real-time grading widgets
│   │   ├── Visualizer.jsx     # Web Audio waveform
│   │   └── Feedback.jsx       # transcript pills, diff, Hear Ideal Delivery, vocal report
│   ├── lib/
│   │   ├── analysis.js        # content grading + rewrite + diff
│   │   ├── voiceAnalysis.js   # pitch / loudness / pause analysis
│   │   ├── tts.js             # ElevenLabs client, cache, fallback
│   │   ├── transcriber.js     # Web Speech API + ElevenLabs Scribe engines
│   │   ├── reactions.js       # interviewer reactions and silence prompts
│   │   ├── accounts.js        # username/password accounts (PBKDF2 hashes, localStorage)
│   │   └── audio.js           # shared AudioContext + analysers
│   └── data/questions.js      # question banks, personas, mannerisms, sample data
└── showcase/                  # ready-to-copy files for the ElevenLabs Showcase PR
```

## 👥 Team

| Name | Role |
|---|---|
| **Zexing Yao** | TODO: e.g. frontend & UI design |
| **Soham Bajaj** | TODO: e.g. ElevenLabs integration |
| **Kevin Wang** | TODO: e.g. grading engine |
| **Daniel Kim** | TODO: e.g. audio analysis & pitch |

All four of us are first-time hackers at HackRU Fall 2026.

## 🏆 Hackathon submission

- **Event:** HackRU Fall 2026, Rutgers University (Oct 10–11, 2026)
- **Track:** Education
- **Superlatives:** Best Newbie Hack · Use of ElevenLabs
- Built from scratch during the hacking period (12:00 PM Oct 10 – 10:00 AM Oct 11). See the commit history.

## 🌟 ElevenLabs Showcase

This repository is open source (MIT) and ready to submit to the [ElevenLabs Showcase](https://showcase.elevenlabs.io/). The [`showcase/`](showcase) folder mirrors their repo layout:

```
showcase/authors/<name>.yml        → copy to  elevenlabs/showcase/authors/
showcase/projects/mockview.mdx     → copy to  elevenlabs/showcase/projects/
showcase/projects/images/mockview.png → copy to elevenlabs/showcase/projects/images/
```

See [CONTRIBUTING.md](https://github.com/elevenlabs/showcase/blob/main/.github/CONTRIBUTING.md) for their PR process.

## 📄 License

[MIT](LICENSE) © 2026 Zexing Yao, Soham Bajaj, Kevin Wang, Daniel Kim
