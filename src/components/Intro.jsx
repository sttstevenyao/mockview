import { useEffect } from 'react'

// Opening animation. The markup and CSS live in index.html (#boot) so it is on screen
// from the first paint, before the app loads. This times the hand-off to the page:
// onReveal fires as it starts fading (so the page can animate in underneath), onDone when it's gone.
// Its CSS clock starts at page load, so the timers subtract the time already spent loading.
export default function Intro({ onReveal, onDone }) {
  useEffect(() => {
    const el = document.getElementById('boot')
    if (!el) {
      onReveal()
      onDone()
      return
    }
    const spent = performance.now()
    // Reduced motion: a still logo that fades out sooner (see #boot.calm in index.html).
    const [revealAt, doneAt] = el.classList.contains('calm') ? [600, 900] : [1250, 1750]
    const finish = () => {
      el.remove()
      onDone()
    }
    const a = setTimeout(onReveal, Math.max(0, revealAt - spent))
    const b = setTimeout(finish, Math.max(0, doneAt - spent))
    let c
    const skip = () => {
      clearTimeout(a)
      clearTimeout(b)
      el.classList.add('skip')
      onReveal()
      c = setTimeout(finish, 300)
    }
    el.addEventListener('click', skip, { once: true })
    return () => {
      clearTimeout(a)
      clearTimeout(b)
      clearTimeout(c)
      el.removeEventListener('click', skip)
    }
  }, [])

  return null
}
