/**
 * Score — a tiny generative soundtrack, no audio files.
 * - a pocket-watch tick (the clock that runs the whole day)
 * - a Shepard tone: a pitch that seems to rise forever
 * - a low drone, and one "boom" for the hard cut
 * Everything is optional: nothing plays until the visitor asks for sound.
 */
export class Score {
  private ctx?: AudioContext
  private master?: GainNode
  private bus?: GainNode
  private shepard?: { oscs: OscillatorNode[]; gains: GainNode[]; out: GainNode }
  private shepardTimer = 0
  private tickTimer = 0
  private drone?: { osc: OscillatorNode; gain: GainNode }
  private noiseBuf?: AudioBuffer
  enabled = false
  tickRate = 0.5 // seconds per tick

  private ensure() {
    if (this.ctx) return this.ctx
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = 0
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.ratio.value = 4
    this.master.connect(comp).connect(ctx.destination)
    this.bus = ctx.createGain()
    this.bus.connect(this.master)
    const len = ctx.sampleRate * 2
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = this.noiseBuf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    return ctx
  }

  async enable() {
    const ctx = this.ensure()
    if (ctx.state === 'suspended') await ctx.resume()
    this.enabled = true
    this.master!.gain.cancelScheduledValues(ctx.currentTime)
    this.master!.gain.setTargetAtTime(0.9, ctx.currentTime, 0.2)
  }

  disable() {
    this.enabled = false
    if (!this.ctx || !this.master) return
    this.master.gain.cancelScheduledValues(this.ctx.currentTime)
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15)
  }

  /** Start the watch. */
  startTick() {
    if (!this.ctx) return
    window.clearTimeout(this.tickTimer)
    let alt = false
    const loop = () => {
      this.tick(alt)
      alt = !alt
      this.tickTimer = window.setTimeout(loop, this.tickRate * 1000)
    }
    loop()
  }

  stopTick() {
    window.clearTimeout(this.tickTimer)
  }

  private tick(alt: boolean) {
    const ctx = this.ctx!
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf!
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = alt ? 3400 : 4200
    bp.Q.value = 9
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.002)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045)
    src.connect(bp).connect(g).connect(this.bus!)
    src.start(t, Math.random())
    src.stop(t + 0.06)
  }

  /** The endless rise. */
  startShepard(level = 0.12) {
    const ctx = this.ctx
    if (!ctx || this.shepard) return
    const out = ctx.createGain()
    out.gain.value = 0
    out.gain.setTargetAtTime(level, ctx.currentTime, 1.2)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 2400
    out.connect(lp).connect(this.bus!)
    const N = 7
    const oscs: OscillatorNode[] = []
    const gains: GainNode[] = []
    for (let i = 0; i < N; i++) {
      const o = ctx.createOscillator()
      o.type = 'sine'
      const g = ctx.createGain()
      g.gain.value = 0
      o.connect(g).connect(out)
      o.start()
      oscs.push(o)
      gains.push(g)
    }
    this.shepard = { oscs, gains, out }
    const base = 55
    const period = 9 // seconds per octave
    const t0 = performance.now()
    const step = () => {
      const s = (performance.now() - t0) / 1000
      const phase = (s / period) % 1
      const now = ctx.currentTime
      for (let i = 0; i < N; i++) {
        const pos = (i + phase) / N // 0..1 across the spectrum
        const f = base * Math.pow(2, pos * N)
        const amp = Math.pow(Math.sin(Math.PI * pos), 2)
        oscs[i].frequency.setTargetAtTime(f, now, 0.03)
        gains[i].gain.setTargetAtTime(amp * 0.22, now, 0.03)
      }
      this.shepardTimer = window.setTimeout(step, 30)
    }
    step()
  }

  stopShepard(cut = false) {
    const ctx = this.ctx
    const s = this.shepard
    if (!ctx || !s) return
    window.clearTimeout(this.shepardTimer)
    const t = ctx.currentTime
    s.out.gain.cancelScheduledValues(t)
    if (cut) s.out.gain.setValueAtTime(0, t)
    else s.out.gain.setTargetAtTime(0, t, 0.6)
    const oscs = s.oscs
    window.setTimeout(() => oscs.forEach((o) => o.stop()), cut ? 50 : 3000)
    this.shepard = undefined
  }

  startDrone(level = 0.08) {
    const ctx = this.ctx
    if (!ctx || this.drone) return
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = 41.2
    const gain = ctx.createGain()
    gain.gain.value = 0
    gain.gain.setTargetAtTime(level, ctx.currentTime, 2)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 180
    osc.connect(lp).connect(gain).connect(this.bus!)
    osc.start()
    this.drone = { osc, gain }
  }

  /** One hit. The cut. */
  boom() {
    const ctx = this.ctx
    if (!ctx) return
    const t = ctx.currentTime
    const out = ctx.createGain()
    out.gain.setValueAtTime(0.0001, t)
    out.gain.exponentialRampToValueAtTime(0.85, t + 0.03)
    out.gain.exponentialRampToValueAtTime(0.0001, t + 4.2)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(1400, t)
    lp.frequency.exponentialRampToValueAtTime(90, t + 3.5)
    out.connect(lp).connect(this.bus!)
    ;[41.2, 41.6, 82.4, 61.7].forEach((f, i) => {
      const o = ctx.createOscillator()
      o.type = i === 3 ? 'sine' : 'sawtooth'
      o.frequency.setValueAtTime(f, t)
      o.frequency.exponentialRampToValueAtTime(f * 0.92, t + 4)
      o.connect(out)
      o.start(t)
      o.stop(t + 4.3)
    })
    const n = ctx.createBufferSource()
    n.buffer = this.noiseBuf!
    const ng = ctx.createGain()
    ng.gain.setValueAtTime(0.4, t)
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
    n.connect(ng).connect(lp)
    n.start(t)
    n.stop(t + 0.6)
  }
}

export const score = new Score()
