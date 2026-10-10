import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import Lenis from 'lenis'
import { Cinema, type Lens } from './gl/Cinema'
import { score } from './audio/Score'
import { film, applyBars, frameTo, toSec } from './film'
import { clips, gallery, hours, links, places } from './content'
import Intro from './components/Intro'
import Hud from './components/Hud'

gsap.registerPlugin(ScrollTrigger, SplitText)

const chars = (word: string) =>
  [...word].map((c, i) => (
    <span className="char" key={i}>
      {c}
    </span>
  ))

type Scene = { clip?: string; lens?: Partial<Lens>; bar?: number; chapter: string }

export default function App() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [cinema, setCinema] = useState<Cinema | null>(null)
  const [started, setStarted] = useState(false)
  const [sound, setSound] = useState(false)

  // projector + frame
  useEffect(() => {
    if (!canvas.current) return
    const c = new Cinema(canvas.current, clips)
    setCinema(c)
    ;(window as unknown as { __cinema: Cinema }).__cinema = c
    applyBars()
    window.addEventListener('resize', applyBars)
    document.body.classList.add('is-locked')
    window.scrollTo(0, 0)
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    return () => {
      window.removeEventListener('resize', applyBars)
      c.destroy()
    }
  }, [])

  // everything that happens on scroll, built once the intro hands over
  useEffect(() => {
    if (!started || !cinema) return
    document.body.classList.remove('is-locked')
    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 })
    lenis.on('scroll', ScrollTrigger.update)
    const raf = (t: number) => lenis.raf(t * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    const L = cinema.lens
    const scene = (s: Scene) => {
      if (s.clip) cinema.show(s.clip)
      if (s.lens) gsap.to(L, { ...s.lens, duration: 1.6, ease: 'power2.inOut', overwrite: 'auto' })
      if (s.bar !== undefined) frameTo(s.bar)
      film.chapter = s.chapter
    }
    const onScene = (trigger: Element, s: Scene, start = 'top 55%', end = 'bottom 45%') =>
      ScrollTrigger.create({
        trigger,
        start,
        end,
        onEnter: () => scene(s),
        onEnterBack: () => scene(s),
      })
    const clock = (trigger: Element, from: string, to: string, ease?: (p: number) => number) =>
      ScrollTrigger.create({
        trigger,
        start: 'top center',
        end: 'bottom center',
        onUpdate: (self) => {
          const p = ease ? ease(self.progress) : self.progress
          film.time = gsap.utils.interpolate(toSec(from), toSec(to), p)
        },
      })

    const ctx = gsap.context(() => {
      const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(s)!

      // ── 01 hero: the title drifts apart as the camera rises
      const hero = $('.hero')
      onScene(hero, { clip: 'hero', lens: { day: 0.28, dim: 1, sunAmt: 0, haze: 1 }, bar: 0, chapter: '01 — Abertura' }, 'top top', 'bottom 45%')
      clock(hero, '09:58:00', '09:59:00')
      const rows = gsap.utils.toArray<HTMLElement>('.hero__title > span')
      gsap
        .timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } })
        .to(rows[0], { xPercent: -18, ease: 'none' }, 0)
        .to(rows[1], { yPercent: -30, ease: 'none' }, 0)
        .to(rows[2], { xPercent: 18, ease: 'none' }, 0)
        .to('.hero__title', { opacity: 0, filter: 'blur(10px)', ease: 'power1.in' }, 0)
        .to('.hero__foot', { opacity: 0, y: -40, ease: 'none' }, 0)
        .to(L, { zoom: 1.18, ease: 'none' }, 0)

      // ── 02 manifesto: the rule
      const man = $('.manifesto')
      onScene(man, { clip: 'island', lens: { day: 0.12, dim: 0.62, zoom: 1, haze: 0.6 }, bar: 1, chapter: '02 — A regra' }, 'top 55%')
      clock(man, '09:59:00', '10:00:00')
      const words = gsap.utils.toArray<HTMLElement>('.manifesto__line .word')
      gsap
        .timeline({
          scrollTrigger: { trigger: man, start: 'top top', end: 'bottom bottom', scrub: 0.6, pin: '.manifesto__pin', pinSpacing: false },
        })
        .from(words, { opacity: 0, scale: 1.6, filter: 'blur(22px)', yPercent: 20, stagger: 0.35, duration: 1, ease: 'power3.out' })
        .from('.manifesto__bio', { opacity: 0, y: 30, duration: 0.8 }, '-=0.3')
        .to({}, { duration: 1 })
        .to('.manifesto__pin > *', { opacity: 0, scale: 0.94, filter: 'blur(8px)', duration: 0.8, ease: 'power2.in' })

      // ── 03 the day: horizontal track, each hour cuts the film
      const day = $('.day')
      const track = $('.day__track')
      const panels = gsap.utils.toArray<HTMLElement>('.day__panel')
      const dist = () => track.scrollWidth - window.innerWidth
      const horiz = gsap.to(track, {
        x: () => -dist(),
        ease: 'none',
        scrollTrigger: {
          trigger: day,
          start: 'top top',
          end: () => `+=${dist()}`,
          pin: '.day__pin',
          scrub: 0.8,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const times = ['10:00', ...hours.map((h) => h.time)].map((t) => toSec(t))
            const seg = self.progress * (times.length - 1)
            const i = Math.min(times.length - 2, Math.floor(seg))
            film.time = gsap.utils.interpolate(times[i], times[i + 1], seg - i)
          },
        },
      })
      onScene(day, { clip: 'islandpull', lens: { day: 0.14, dim: 0.7, haze: 1 }, bar: 1, chapter: '03 — O dia' }, 'top 55%')
      panels.forEach((panel, i) => {
        if (i === 0) return
        const h = hours[i - 1]
        ScrollTrigger.create({
          trigger: panel,
          containerAnimation: horiz,
          start: 'left 55%',
          end: 'right 45%',
          onEnter: () => scene({ clip: h.clip, lens: { day: 0.1 + i * 0.07, dim: 0.72 }, chapter: '03 — O dia' }),
          onEnterBack: () => scene({ clip: h.clip, lens: { day: 0.1 + i * 0.07, dim: 0.72 }, chapter: '03 — O dia' }),
          onLeaveBack: () => (i === 1 ? scene({ clip: 'islandpull', lens: { day: 0.14 }, chapter: '03 — O dia' }) : undefined),
        })
        gsap.from(panel.querySelector('.day__time'), {
          xPercent: 12,
          opacity: 0,
          ease: 'none',
          scrollTrigger: { trigger: panel, containerAnimation: horiz, start: 'left 75%', end: 'left 25%', scrub: true },
        })
        gsap.from(panel.querySelectorAll('.day__copy > *'), {
          y: 40,
          opacity: 0,
          stagger: 0.1,
          ease: 'none',
          scrollTrigger: { trigger: panel, containerAnimation: horiz, start: 'left 70%', end: 'left 20%', scrub: true },
        })
      })

      // ── 04 places: Tenet — the heading is inverted and runs back into order
      const pl = $('.places')
      onScene(pl, { clip: 'lagoon', lens: { day: 0.34, dim: 0.42, haze: 0.8 }, bar: 1, chapter: '04 — Lugares' }, 'top 55%')
      clock(pl, '17:10:00', '18:02:00')
      const headChars = gsap.utils.toArray<HTMLElement>('.places__head .char')
      gsap.fromTo(
        headChars,
        { rotationY: 180, yPercent: 8, opacity: 0.35 },
        {
          rotationY: 0,
          yPercent: 0,
          opacity: 1,
          ease: 'power2.inOut',
          stagger: { each: 0.08, from: 'end' },
          scrollTrigger: { trigger: '.places__head', start: 'top 90%', end: 'bottom 35%', scrub: 0.8 },
        },
      )
      gsap.utils.toArray<HTMLElement>('.place').forEach((row) => {
        gsap.from(row, {
          opacity: 0,
          y: 50,
          duration: 1.1,
          ease: 'expo.out',
          scrollTrigger: { trigger: row, start: 'top 88%', once: true },
        })
      })

      // ── 05 18:25 — time dilates: one minute stretched across four screens
      const dusk = $('.dusk')
      const clockEl = $('.dusk__clock')
      const secsEl = $('.dusk__secs')
      onScene(dusk, { clip: 'sunset', lens: { day: 0.32, dim: 0.95, haze: 1.4, zoom: 1 }, bar: 1, chapter: '05 — 18:25' }, 'top 55%')
      let flipped = false
      const dtl = gsap.timeline({
        scrollTrigger: {
          trigger: dusk,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.6,
          pin: '.dusk__pin',
          pinSpacing: false,
          onUpdate: (self) => {
            const p = self.progress
            const t = gsap.utils.interpolate(toSec('18:24:00'), toSec('18:25:00'), Math.min(1, p / 0.7))
            film.time = p > 0.7 ? gsap.utils.interpolate(toSec('18:25:00'), toSec('18:25:40'), (p - 0.7) / 0.3) : t
            const s = Math.round(t) % 60
            secsEl.textContent = `${String(s).padStart(2, '0')} s`
            const isAfter = p >= 0.7
            if (isAfter !== flipped) {
              flipped = isAfter
              clockEl.textContent = isAfter ? '18:25' : '18:24'
              if (isAfter) {
                gsap.fromTo(clockEl, { scale: 1.08, color: '#ff5a1f' }, { scale: 1, color: '#f1ebe2', duration: 1.4, ease: 'expo.out' })
                gsap.fromTo(L, { flash: 0.85 }, { flash: 0, duration: 1.6, ease: 'power3.out', overwrite: 'auto' })
                frameTo(0, 1.2)
                if (score.enabled) score.boom()
              } else frameTo(1, 1)
            }
          },
        },
      })
      dtl
        .from('.dusk__kicker', { opacity: 0, y: 20, duration: 0.3 })
        .from(clockEl, { opacity: 0, scale: 0.9, filter: 'blur(16px)', duration: 0.6 }, '<')
        .to(L, { day: 0.5, dim: 1.05, duration: 3 }, 0)
        .to('.dusk__lines span', { opacity: 1, y: 0, stagger: 0.55, duration: 0.5 }, 0.7)
        .to({}, { duration: 1.2 })
        .to('.dusk__rule', { opacity: 1, duration: 0.5 })
        .to('.dusk__pin > *', { opacity: 0, filter: 'blur(10px)', duration: 0.7, ease: 'power2.in' }, '+=0.4')
        .to(L, { dim: 0.25, duration: 0.7 }, '<')

      // ── 06 night: the reel
      const reel = $('.reel')
      onScene(reel, { clip: 'night', lens: { day: 0.86, dim: 0.5, haze: 0.4, flash: 0 }, bar: 1, chapter: '06 — Noite' }, 'top 60%')
      clock(reel, '18:25:40', '21:30:00')
      const strip = $('.reel__strip')
      gsap.fromTo(
        strip,
        { x: () => window.innerWidth * 0.25 },
        {
          x: () => -(strip.scrollWidth - window.innerWidth * 0.75),
          ease: 'none',
          scrollTrigger: { trigger: reel, start: 'top bottom', end: 'bottom top', scrub: 0.5, invalidateOnRefresh: true },
        },
      )
      const skew = gsap.quickTo(strip, 'skewX', { duration: 0.6, ease: 'power3.out' })
      ScrollTrigger.create({
        trigger: reel,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: (self) => skew(gsap.utils.clamp(-8, 8, self.getVelocity() / -260)),
      })
      gsap.utils.toArray<HTMLElement>('.reel__frame img').forEach((img) => {
        gsap.fromTo(
          img,
          { xPercent: -6 },
          { xPercent: 6, ease: 'none', scrollTrigger: { trigger: reel, start: 'top bottom', end: 'bottom top', scrub: true } },
        )
      })

      // ── 07 finale: 2027
      const fin = $('.finale')
      onScene(fin, { clip: 'mask', lens: { day: 0.92, dim: 0.42, haze: 0.5 }, bar: 1, chapter: '07 — 2027' }, 'top 60%')
      clock(fin, '21:30:00', '23:59:59')
      gsap.utils.toArray<HTMLElement>('.stat b').forEach((b) => {
        const to = Number(b.dataset.to)
        const pre = b.dataset.pre ?? ''
        const suf = b.dataset.suf ?? ''
        const o = { v: 0 }
        gsap.to(o, {
          v: to,
          duration: 2,
          ease: 'expo.out',
          scrollTrigger: { trigger: b, start: 'top 85%', once: true },
          onUpdate: () => (b.textContent = `${pre}${Math.round(o.v)}${suf}`),
        })
      })
      gsap.from('.finale__year .char', {
        yPercent: 100,
        opacity: 0,
        filter: 'blur(20px)',
        stagger: 0.08,
        duration: 1.6,
        ease: 'expo.out',
        scrollTrigger: { trigger: '.finale__year', start: 'top 80%', once: true },
      })
      gsap.from('.finale__line, .finale__ctas, .finale__note', {
        opacity: 0,
        y: 24,
        stagger: 0.1,
        duration: 1,
        ease: 'expo.out',
        scrollTrigger: { trigger: '.finale__line', start: 'top 90%', once: true },
      })
    })

    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener('load', refresh)
    ScrollTrigger.refresh()

    return () => {
      window.removeEventListener('load', refresh)
      ctx.revert()
      gsap.ticker.remove(raf)
      lenis.destroy()
    }
  }, [started, cinema])

  const toggleSound = async () => {
    if (sound) {
      score.disable()
      score.stopTick()
      setSound(false)
    } else {
      await score.enable()
      score.startDrone(0.09)
      score.tickRate = 1
      score.startTick()
      setSound(true)
    }
  }

  return (
    <>
      <canvas className="cinema" ref={canvas} aria-hidden="true" />
      <div className="bars" aria-hidden="true" />
      <Hud sound={sound} onToggleSound={toggleSound} />
      <Intro cinema={cinema} onSound={setSound} onDone={() => setStarted(true)} />

      <main id="top">
        {/* 01 */}
        <section className="hero" aria-label="Muzemba">
          <h1 className="hero__title" aria-label="Muzemba">
            <span aria-hidden="true">{chars('Mu')}</span>
            <span aria-hidden="true">{chars('zem')}</span>
            <span aria-hidden="true">{chars('ba')}</span>
          </h1>
          <div className="hero__foot">
            <p className="hero__sub">O único evento de dia em Luanda. Das 10h ao pôr do sol.</p>
            <span className="hero__cue mono">
              <i /> Desce
            </span>
          </div>
        </section>

        {/* 02 */}
        <section className="manifesto" aria-label="A regra">
          <div className="manifesto__pin">
            <p className="manifesto__line">
              <span className="word">Vai</span>
              <span className="word">quem</span>
              <span className="word is-ember">pode,</span>
              <br />
              <span className="word">não</span>
              <span className="word">quem</span>
              <span className="word">quer.</span>
            </p>
            <p className="manifesto__bio">
              Através dos nossos eventos, fizemos-te conhecer novos lugares. Um evento inteiro, de dia — música, gente e cultura até à última luz.
            </p>
          </div>
        </section>

        {/* 03 */}
        <section className="day" aria-label="O dia">
          <div className="day__pin">
            <div className="day__track">
              <div className="day__panel">
                <div className="day__intro">
                  <p className="day__kicker mono">Cena 03 — Um dia inteiro</p>
                  <h2 className="day__lead">
                    O relógio
                    <br />é o line-up.
                  </h2>
                  <p>Cada hora tem a sua luz. Segue o sol da manhã até ao momento.</p>
                </div>
              </div>
              {hours.map((h, i) => (
                <article className="day__panel" key={h.time}>
                  <span className="day__index mono">
                    {String(i + 1).padStart(2, '0')} / {String(hours.length).padStart(2, '0')}
                  </span>
                  <p className="day__time">{h.time}</p>
                  <div className="day__copy">
                    <h3>{h.title}</h3>
                    <p>{h.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 04 */}
        <section className="places" aria-label="Lugares">
          <h2 className="places__head" aria-label="Novos lugares">
            <span aria-hidden="true">{chars('Novos')}</span>
            <br />
            <span aria-hidden="true">{chars('lugares')}</span>
          </h2>
          <div className="places__intro">
            <span className="mono">Cena 04 — O tempo corre ao contrário</span>
            <p>O Muzemba nunca fica no mesmo sítio. Cada edição leva-te a um lugar onde nunca tinhas dançado de dia.</p>
          </div>
          <div className="places__list">
            {places.map((p, i) => (
              <div className="place" key={p.name}>
                <span className="place__n mono">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="place__name">{p.name}</h3>
                <p className="place__note">{p.note}</p>
                {p.img && <img className="place__img" src={p.img} alt={`Muzemba — ${p.name}`} loading="lazy" />}
              </div>
            ))}
          </div>
        </section>

        {/* 05 */}
        <section className="dusk" aria-label="18:25">
          <div className="dusk__pin">
            <p className="dusk__kicker mono">
              Cena 05 — O momento · <span className="dusk__secs">00 s</span>
            </p>
            <p className="dusk__clock" aria-label="18 e 25">
              18:24
            </p>
            <p className="dusk__lines">
              <span>Quando o relógio marcou 18h25,</span>
              <span>a luz do fim da tarde apareceu,</span>
              <span>e quem estava lá sentiu o momento.</span>
            </p>
            <p className="dusk__rule mono">Muzemba é para quem pode, não para quem quer.</p>
          </div>
        </section>

        {/* 06 */}
        <section className="reel" aria-label="Galeria">
          <div className="reel__head">
            <h2 className="reel__title">
              #Muzemba
              <br />
              lovers
            </h2>
            <p className="mono">Cena 06 — Quem foi, sabe. Quem não foi, vê.</p>
          </div>
          <div className="reel__strip">
            {[...gallery, ...gallery.slice(0, 3)].map((g, i) => (
              <figure className="reel__frame" key={i} style={{ aspectRatio: `${g.w} / ${g.h}` }}>
                <img src={g.src} alt="Público do Muzemba" loading="lazy" width={g.w} height={g.h} />
                <figcaption className="mono">{`F${String(i + 1).padStart(3, '0')}`}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* 07 */}
        <section className="finale" aria-label="Próxima edição">
          <div className="stats">
            <div className="stat">
              <b data-to="10" data-suf="h">
                10h
              </b>
              <span>A hora em que o Muzemba começa. Um evento inteiro de dia.</span>
            </div>
            <div className="stat">
              <b data-to="700" data-pre="+">
                +700
              </b>
              <span>Pessoas numa só edição, segundo a TV Belas.</span>
            </div>
            <div className="stat">
              <b data-to="12" data-suf="K+">
                12K+
              </b>
              <span>Na comunidade Muzemba no Instagram.</span>
            </div>
            <div className="stat">
              <b data-to="4" data-suf="">
                4
              </b>
              <span>Lugares onde já nos encontrámos. E contando.</span>
            </div>
          </div>

          <p className="finale__kicker mono">Próxima edição</p>
          <h2 className="finale__year" aria-label="2027">
            {chars('2027')}
          </h2>
          <p className="finale__line">Para os teimosos, a espera continua… até 2027.</p>
          <div className="finale__ctas">
            <a className="btn btn--solid" href={links.instagram} target="_blank" rel="noreferrer">
              Seguir no Instagram
            </a>
            <a className="btn" href={links.youtube} target="_blank" rel="noreferrer">
              Ver no YouTube
            </a>
          </div>
          <p className="finale__note mono">Ingressos e mesas na app Uzeka</p>
        </section>
      </main>

      <footer className="footer">
        <nav className="footer__links mono" aria-label="Redes">
          <a href={links.instagram} target="_blank" rel="noreferrer">
            Instagram
          </a>
          <a href={links.facebook} target="_blank" rel="noreferrer">
            Facebook
          </a>
          <a href={links.youtube} target="_blank" rel="noreferrer">
            YouTube
          </a>
          <a href={`tel:${links.phone}`}>{links.phoneLabel}</a>
        </nav>
        <p className="footer__credit mono">Imagens: filme de Anderson Ndele e arquivo Muzemba · Site por Expressers</p>
      </footer>
    </>
  )
}
