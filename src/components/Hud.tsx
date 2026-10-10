import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { film, hms } from '../film'

type Props = { sound: boolean; onToggleSound: () => void }

/** Camera HUD: the clock that runs the whole page, chapter, sound, progress. */
export default function Hud({ sound, onToggleSound }: Props) {
  const time = useRef<HTMLSpanElement>(null)
  const chapter = useRef<HTMLSpanElement>(null)
  const progress = useRef<HTMLElement>(null)

  useEffect(() => {
    let lastT = ''
    let lastC = ''
    const update = () => {
      const t = hms(film.time)
      if (t !== lastT && time.current) time.current.textContent = lastT = t
      if (film.chapter !== lastC && chapter.current) chapter.current.textContent = lastC = film.chapter
      const max = document.documentElement.scrollHeight - window.innerHeight
      const p = max > 0 ? window.scrollY / max : 0
      if (progress.current) progress.current.style.transform = `scaleX(${p})`
    }
    gsap.ticker.add(update)
    return () => gsap.ticker.remove(update)
  }, [])

  return (
    <div className="hud">
      <div className="hud__row hud__row--top">
        <a className="hud__brand" href="#top" aria-label="Muzemba — início">
          <img src="/media/logo.webp" alt="" width={800} height={652} />
        </a>
        <div className="hud__clock">
          <span className="hud__chapter mono" ref={chapter} />
          <span className="hud__time" aria-label="Hora do dia no filme">
            <i className="hud__rec" aria-hidden="true" />
            <span ref={time}>09:58:00</span>
          </span>
        </div>
      </div>
      <div className="hud__row hud__row--bottom">
        <button className={`hud__sound mono${sound ? ' is-on' : ''}`} onClick={onToggleSound} aria-pressed={sound}>
          <span className="hud__eq" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          Som {sound ? 'on' : 'off'}
        </button>
        <span className="hud__loc mono">Luanda · Angola · Evento de dia</span>
      </div>
      <div className="hud__progress" aria-hidden="true">
        <i ref={progress} />
      </div>
    </div>
  )
}
