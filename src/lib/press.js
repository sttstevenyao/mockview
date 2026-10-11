// Press feedback for buttons: a ripple from where you pressed (the scale-down is in CSS).
const PRESSABLE = '.btn, .persona, .tabs button, .seg-mini button, .ob-option, .qtab'

export function installPressRipples() {
  document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest?.(PRESSABLE)
    if (!el || el.disabled || document.documentElement.dataset.motion === 'reduce') return
    const r = el.getBoundingClientRect()
    const size = Math.max(r.width, r.height) * 2
    const dot = document.createElement('span')
    dot.className = 'ripple'
    dot.style.width = dot.style.height = `${size}px`
    dot.style.left = `${e.clientX - r.left - size / 2}px`
    dot.style.top = `${e.clientY - r.top - size / 2}px`
    el.appendChild(dot)
    dot.addEventListener('animationend', () => dot.remove())
  })
}
