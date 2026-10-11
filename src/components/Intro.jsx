import { useEffect } from 'react'

const BARS = [0.34, 0.62, 1, 0.7, 0.3]

// Opening animation: the logo's waveform rises, the wordmark slides in, then the app.
// onReveal fires as it starts fading (so the page can animate in underneath), onDone when it's gone.
export default function Intro({ onReveal, onDone }) {
  useEffect(() => {
    const a = setTimeout(onReveal, 1250)
    const b = setTimeout(onDone, 1750)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [])

  const skip = () => {
    onReveal()
    onDone()
  }

  return (
    <div className="intro" onClick={skip} aria-hidden="true">
      <div className="intro-mark">
        <div className="intro-bars">
          {BARS.map((h, i) => (
            <i key={i} className={i === 2 ? 'accent' : ''} style={{ '--h': h, '--d': `${i * 70}ms` }} />
          ))}
        </div>
        <div className="intro-word">
          <span>
            Mock<b>View</b>
          </span>
        </div>
      </div>
    </div>
  )
}
