# MockView demo script

Judging is in person at your table from 1:00 PM ET. Judges score **functionality**, **creativity** and **technical difficulty**. This runs about 3 minutes; the Q&A section covers what they're likely to ask.

## Before judges arrive

- Open https://mockview-ruddy.vercel.app in **Chrome** on the demo laptop. Allow the microphone.
- Log in, so the pop-up questions don't appear mid-demo.
- In **Settings**, turn on **Skip the introduction** so the first question comes right away.
- Click **Preview voice** once to warm up audio.
- Have a second tab open on https://mockview-ruddy.vercel.app/#sample in case the hall is too loud for the mic.
- If the room is loud, use headphones for audio, or use **Simulate answer** (press S) for one answer.

## Script

**1. Hook (15 s).** "Most students know their stories. They lose the interview in how they tell them: rambling, saying 'um', forgetting the result. MockView is a practice interviewer you talk to out loud that tells you exactly how to say it better."

**2. Setup (20 s).** On Practice: "You tell it your level and field, pick an interviewer, and optionally upload a resume so it asks about your own projects." Point at the three personas: "The Bar Raiser interrupts long answers. Each persona's mannerisms map to ElevenLabs voice settings, so they sound different."

**3. Live interview (60 s).** Click **Start interview**. The ElevenLabs voice asks the question.
- Answer badly on purpose for 15 seconds: "So um, basically my manager was kind of terrible, and honestly it wasn't my fault…"
- Point at the right column as it updates: "Filler counter jumps. The tip flags the red flag. The STAR checklist shows I never gave a result."
- Press **Next**. The interviewer reacts to what you said. "It responds to the actual content. If you say nothing, it asks 'Sorry, what was that?' and never praises an empty answer."

**4. Report (60 s).** Click **End interview**.
- Click a red pill: "Every flagged phrase has the interviewer's inner monologue and a fix."
- Point at the diff: "It rewrites your weakest sentence: cuts fillers, turns blame into ownership, adds a measurable result."
- Click **Hear ideal delivery**. Let it play. "That's the moment we built this for: hearing what a strong version of *your* sentence sounds like."

**4b. Accessibility (15 s, optional).** In Settings, set Translate questions to Español and start again: the question appears in Spanish under the English, and the button reads it aloud in the same voice. "For students interviewing in their second language."

**5. Technical close (25 s).** "ElevenLabs runs both directions: Text to Speech for the interviewer, and Speech to Text with Scribe when the browser can't transcribe, like in Brave. Grading is a rules engine in the browser, so it's instant and every point is explainable. Accounts sync across devices. We're three first-time hackers, and it's live right now at mockview-ruddy.vercel.app."

## Likely questions

- **Why rule-based grading?** Instant feedback while you talk, no network latency, and every score traces back to a specific phrase, so you know exactly which word cost you points.
- **How does it use ElevenLabs?** TTS for every interviewer line with persona-specific voice settings and pause tags; Multilingual v2 for the ideal-delivery playback; Scribe speech-to-text as the fallback transcriber; next-question audio prefetched to avoid gaps.
- **How do you detect STAR?** Phrase patterns for each part, like "my task was", "I led", "as a result", plus a check for numbers in the result.
- **How do you analyze the voice?** Web Audio API: autocorrelation pitch detection for pitch variety, loudness in dB for projection, and talk-time ratio for pauses.
- **What happens if the mic fails?** You can type answers; in Brave or Firefox it switches to ElevenLabs Scribe automatically.
- **Is the resume uploaded?** No. It's parsed in the browser with PDF.js.
- **Who is it for?** Students preparing for internship and new-grad interviews, career centers, and non-native speakers working on delivery. (Education track.)

## Optional video (2 minutes)

HackRU doesn't require one. If you record it anyway (QuickTime: File > New Screen Recording), follow the script above in order: hook, setup, a bad answer with the panel reacting, the interviewer's reaction, the report, clicking a red pill, **Hear ideal delivery**, and the technical close. Upload to YouTube as unlisted and add the link to Devpost and to `videoUrl` in `showcase/projects/mockview.mdx`.
