// Wraps the Web Speech API (webkitSpeechRecognition) into a transcript buffer
// that also accepts injected text (used by "Simulate answer" for noisy demo halls).

const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
export const speechSupported = Boolean(SR)

export function createTranscriber({ onUpdate, onError }) {
  let rec = null
  let micOn = false
  let finalText = ''
  let interim = ''
  let chunks = []
  let injected = ''

  const emit = () => onUpdate({ final: finalText.trim(), interim: interim.trim() })

  const startRec = () => {
    if (!SR || !micOn) return
    rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'
    rec.onresult = (e) => {
      let live = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        const t = r[0].transcript.trim()
        if (r.isFinal) {
          if (t) {
            finalText += t + ' '
            chunks.push(t)
          }
        } else live += r[0].transcript
      }
      interim = live
      emit()
    }
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        micOn = false
        onError?.(e.error)
      }
    }
    // Chrome ends recognition after a few seconds of silence; keep it alive.
    rec.onend = () => {
      if (micOn) setTimeout(() => micOn && startRec(), 120)
    }
    try {
      rec.start()
    } catch {}
  }

  const stopRec = () => {
    micOn = false
    try {
      rec?.stop()
    } catch {}
    rec = null
    if (interim.trim()) {
      finalText += interim.trim() + ' '
      chunks.push(interim.trim())
    }
    interim = ''
  }

  return {
    supported: speechSupported,
    begin() {
      finalText = ''
      interim = ''
      chunks = []
      injected = ''
      micOn = true
      startRec()
      emit()
    },
    pauseMic: stopRec,
    resumeMic() {
      micOn = true
      startRec()
    },
    append(word) {
      finalText += word + ' '
      injected += word + ' '
      if (/[.!?]$/.test(word)) {
        chunks.push(injected.trim())
        injected = ''
      }
      emit()
    },
    end() {
      stopRec()
      if (injected.trim()) chunks.push(injected.trim())
      injected = ''
      emit()
      return { text: finalText.trim(), chunks: [...chunks] }
    },
  }
}
