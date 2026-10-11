import { useEffect, useState } from 'react'

// A short status message that drops in under the header, then lifts away.
export default function Toast({ text, onDone }) {
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    const a = setTimeout(() => setLeaving(true), 2400)
    const b = setTimeout(onDone, 2750)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [])
  return (
    <div className={`toast ${leaving ? 'out' : ''}`} role="status">
      {text}
    </div>
  )
}
