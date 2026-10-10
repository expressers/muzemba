import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import type { Cinema } from '../gl/Cinema'
import { score } from '../audio/Score'
import { film, frameTo, hms } from '../film'

type Props = {
  cinema: Cinema | null
  onSound: (on: boolean) => void
  onDone: () => void
}

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The opening. Black frame, a line of light, a sun rising through it,
 * four hard cuts on the tick of a watch, silence — then the island.
 */
export default function Intro({ cinema, onSound, onDone }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const counter = useRef<HTMLElement>(null)
  const bar = useRef<HTMLElement>(null)
  const [ready, setReady] = useState(false)
  const [gone, setGone] = useState(false)
  const tl = useRef<gsap.core.Timeline | null>(null)

  // ── preload: footage + type, shown as running timecode
  useEffect(() => {
    if (!cinema) return
    const L = cinema.lens
    L.video = 0
    L.horizon = 0.5
    L.horizonAmt = 0.55
    L.horizonW = 0
    L.sunAmt = 0
    const prog = { p: 0, shown: 0 }
    let alive = true
    const jobs = [cinema.prepare('hero'), cinema.prepare('islandpull'), document.fonts.ready]
    let done = 0
    jobs.forEach((j) =>
      Promise.resolve(j).then(() => {
        done++
        prog.p = done / jobs.length
      }),
    )
    const minDelay = new Promise((r) => setTimeout(r, 1600))
    Promise.all([Promise.all(jobs), minDelay]).then(() => {
      if (!alive) return
      prog.p = 1
      prog.shown = 1
      paint()
      setReady(true)
    })
    const paint = () => {
      L.horizonW = 0.08 + prog.shown * 0.62
      if (bar.current) bar.current.style.transform = `scaleX(${prog.shown})`
      if (counter.current) {
        const frames = Math.floor(prog.shown * 24 * 10)
        const s = Math.floor(frames / 24)
        const f = frames % 24
        counter.current.textContent = `00:00:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`
      }
    }
    const tick = () => {
      prog.shown += (prog.p - prog.shown) * 0.12
      paint()
    }
    gsap.ticker.add(tick)
    return () => {
      alive = false
      gsap.ticker.remove(tick)
    }
  }, [cinema])

  useEffect(() => {
    if (!ready || !root.current) return
    gsap.to(root.current.querySelector('.intro__choices'), { autoAlpha: 1, y: 0, duration: 0.8, ease: 'expo.out' })
    gsap.to(root.current.querySelector('.intro__counter b'), { opacity: 0.5, duration: 0.6 })
  }, [ready])

  const begin = async (withSound: boolean) => {
    if (!cinema || !root.current || tl.current) return
    if (withSound) {
      await score.enable()
      score.startDrone(0.09)
      score.startShepard(0.11)
      score.tickRate = 0.5
      score.startTick()
    }
    onSound(withSound)
    const q = gsap.utils.selector(root)
    const L = cinema.lens
    const chars = document.querySelectorAll<HTMLElement>('.hero__title .char')
    const heroFoot = document.querySelectorAll<HTMLElement>('.hero__foot > *')
    const hud = document.querySelector<HTMLElement>('.hud')
    gsap.set(chars, { yPercent: 105, opacity: 0, filter: 'blur(14px)' })
    gsap.set(heroFoot, { y: 24, opacity: 0 })

    const t = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      onComplete: () => {
        setGone(true)
        if (withSound) {
          score.tickRate = 1
          score.startTick()
        }
        onDone()
      },
    })
    tl.current = t

    t.to(q('.intro__gate'), { autoAlpha: 0, duration: 0.5, ease: 'power2.out' }, 0)
      .to(q('.intro__skip'), { autoAlpha: 1, duration: 0.4 }, 0.6)
      // the line of light widens, the sun climbs through it
      .to(L, { horizonW: 1.25, horizonAmt: 1, duration: 2.6, ease: 'power3.inOut' }, 0.1)
      .fromTo(L, { sunAmt: 0, sunY: 0.36 }, { sunAmt: 1, sunY: 0.58, duration: 4.4, ease: 'power1.inOut' }, 0.2)

    // four hard cuts, each on a tick
    const cards = q('.intro__card')
    const at = [1.5, 2.5, 3.5, 4.5]
    cards.forEach((c, i) => {
      t.set(c, { opacity: 1, scale: 1.04 }, at[i])
        .to(c, { scale: 1, duration: 0.9, ease: 'expo.out' }, at[i])
        .set(c, { opacity: 0 }, at[i] + 0.92)
    })

    // silence — Nolan's cut
    t.call(() => score.stopShepard(true), [], 5.45)
      .call(() => score.stopTick(), [], 5.45)
      .set(L, { sunAmt: 0, horizonAmt: 0, dim: 0 }, 5.45)
      .set(q('.intro__skip'), { autoAlpha: 0 }, 5.45)

    // the island, full IMAX frame
    t.call(
      () => {
        score.boom()
        cinema.show('hero', 0.01)
        film.chapter = '01 — Abertura'
        film.time = 9 * 3600 + 58 * 60
      },
      [],
      5.8,
    )
      .set(L, { video: 1, day: 0.28, dim: 1, haze: 1, aberr: 2.4, zoom: 1.12 }, 5.8)
      .fromTo(L, { flash: 1.1 }, { flash: 0, duration: 1.4, ease: 'power3.out', immediateRender: false }, 5.8)
      .to(L, { aberr: 1, zoom: 1, duration: 3.2, ease: 'expo.out' }, 5.8)
      .add(frameTo(0, 1.8), 5.9)
      .to(chars, { yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: 1.5, ease: 'expo.out', stagger: 0.05 }, 6.0)
      .to(heroFoot, { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.08 }, 6.7)
      .to(hud, { opacity: 1, duration: 1.2, ease: 'power2.out' }, 6.9)

    if (reduced()) t.progress(1, false)
  }

  const skip = () => {
    if (!tl.current) return
    score.stopShepard(true)
    score.stopTick()
    tl.current.progress(1, false)
  }

  useEffect(() => {
    if (counter.current) counter.current.textContent = '00:00:00:00'
  }, [])

  if (gone) return null

  return (
    <div className="intro" ref={root} aria-live="polite">
      <div className="intro__cards" aria-hidden="true">
        <div className="intro__card">
          Luanda.<small>Angola</small>
        </div>
        <div className="intro__card">Um dia.</div>
        <div className="intro__card">
          Das dez<small>{hms(10 * 3600).slice(0, 5)} — 18:25</small>
        </div>
        <div className="intro__card">Ao pôr do sol.</div>
      </div>

      <div className="intro__gate">
        <p className="intro__counter">
          <b ref={counter}>00:00:00:00</b>
        </p>
        <span className="intro__line">
          <i ref={bar} />
        </span>
        <div className="intro__choices" style={{ transform: 'translateY(12px)' }}>
          <button className="btn btn--solid" onClick={() => begin(true)} disabled={!ready}>
            Entrar com som
          </button>
          <button className="btn" onClick={() => begin(false)} disabled={!ready}>
            Sem som
          </button>
        </div>
        <p className="intro__hint mono">{ready ? 'Melhor com auscultadores.' : 'A preparar a película'}</p>
      </div>

      <button className="intro__skip mono" onClick={skip}>
        Saltar intro
      </button>
    </div>
  )
}
