import gsap from 'gsap'

/** Shared, non-React state for the film: the clock, the chapter, the frame. */
export const film = {
  time: 9 * 3600 + 58 * 60, // seconds since midnight
  chapter: '01 — Abertura',
  bar: { k: 1 }, // 1 = scope 2.39:1, 0 = full IMAX frame
}

export const hms = (s: number) => {
  const t = Math.max(0, Math.round(s))
  const h = Math.floor(t / 3600) % 24
  const m = Math.floor((t % 3600) / 60)
  const sec = t % 60
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(h)}:${p(m)}:${p(sec)}`
}

export const toSec = (hhmm: string) => {
  const [h, m, s = '0'] = hhmm.split(':')
  return +h * 3600 + +m * 60 + +s
}

/** Letterbox height for the current frame ratio. */
export function applyBars() {
  const w = window.innerWidth
  const h = window.innerHeight
  const scope = Math.max(0, (h - w / 2.39) / 2)
  const cap = w < h ? h * 0.065 : Math.min(h * 0.13, 120)
  const px = Math.min(w < h ? cap : scope, cap) * film.bar.k
  document.documentElement.style.setProperty('--bar', `${px.toFixed(1)}px`)
}

export function frameTo(k: number, duration = 1.4, ease = 'expo.inOut') {
  return gsap.to(film.bar, { k, duration, ease, onUpdate: applyBars, overwrite: true })
}
