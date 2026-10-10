import * as THREE from 'three'
import gsap from 'gsap'

/**
 * Cinema — one fixed full-screen WebGL "projector" behind the whole page.
 * Every section is a scene: it asks the projector for a clip, a time of day
 * and a few lens settings. The shader grades the footage from noon to
 * sunset to night, adds heat haze, chromatic aberration, gate weave, grain,
 * a procedural sun and an organic film-burn transition between clips.
 */

export type Lens = {
  day: number // 0 noon → .5 sunset → 1 night
  dim: number // master exposure
  video: number // how much footage is visible (0 = black stage)
  sunAmt: number
  sunY: number
  horizon: number // y of the horizon line (0..1)
  horizonAmt: number
  horizonW: number
  haze: number
  aberr: number
  flash: number
  grain: number
  zoom: number
}

const vert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }
`

const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tA; uniform sampler2D tB;
uniform vec2 uRes; uniform vec2 uSizeA; uniform vec2 uSizeB;
uniform float uMix, uTime, uDay, uDim, uVideo, uSunAmt, uSunY;
uniform float uHorizon, uHorizonAmt, uHorizonW, uHaze, uAberr, uFlash, uGrain, uZoom;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + 1.), f.x), f.y);
}
float fbm(vec2 p){ float v = 0., a = .5; for(int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.03; a *= .5; } return v; }

vec2 cover(vec2 uv, vec2 tex){
  float rs = uRes.x / uRes.y, rt = tex.x / tex.y;
  vec2 s = rs > rt ? vec2(1., rt / rs) : vec2(rs / rt, 1.);
  return (uv - .5) * s / uZoom + .5;
}
vec3 samp(sampler2D t, vec2 uv, vec2 size, float ab){
  vec2 c = cover(uv, size);
  vec2 d = (uv - .5) * ab;
  return vec3(texture2D(t, c + d).r, texture2D(t, c).g, texture2D(t, c - d).b);
}

void main(){
  vec2 uv = vUv;
  // projector gate weave
  uv += vec2(sin(uTime * 13.1) * .0005, cos(uTime * 8.7) * .0007);
  // heat haze — the air over hot sand
  float h = fbm(vec2(uv.x * 5., uv.y * 2.5 - uTime * .55));
  uv += vec2(h - .5, (h - .5) * .5) * .014 * uHaze;

  float ab = .007 * uAberr;
  vec3 a = samp(tA, uv, uSizeA, ab);
  vec3 b = samp(tB, uv, uSizeB, ab);

  // organic film-burn between clips
  float n = fbm(vUv * 2.6 + vec2(uTime * .04, 0.));
  float th = uMix * 1.5 - .25;
  float m = smoothstep(n - .045, n + .045, th);
  float burn = smoothstep(0., .5, m) * (1. - smoothstep(.5, 1., m));
  vec3 col = mix(a, b, m);
  col += vec3(1., .42, .1) * burn * 2.2 * step(.001, uMix) * step(uMix, .999);
  col *= uVideo;

  // time-of-day grade
  float l = dot(col, vec3(.299, .587, .114));
  vec3 noon = (col - .5) * 1.08 + .5;
  noon *= vec3(1.02, 1., .97);
  vec3 dusk = mix(col, l * vec3(1.35, .82, .5), .5) * 1.05;
  vec3 night = mix(col, l * vec3(.5, .66, 1.05), .55) * .85;
  col = uDay < .5 ? mix(noon, dusk, uDay * 2.) : mix(dusk, night, (uDay - .5) * 2.);

  // procedural sun, clipped by the horizon
  vec2 p = vUv - vec2(.5, uSunY); p.x *= uRes.x / uRes.y;
  float r = length(p) / min(1., uRes.x / uRes.y * 1.3);
  float disk = 1. - smoothstep(.11, .115, r);
  float glow = exp(-r * 4.2) * .55 + exp(-r * 14.) * .7;
  float above = uHorizonAmt > .001 ? smoothstep(uHorizon - .002, uHorizon + .002, vUv.y) : 1.;
  vec3 sunc = mix(vec3(1., .3, .06), vec3(1., .86, .62), disk);
  col += sunc * (disk * 1.25 * above + glow * mix(.35, 1., above)) * uSunAmt;

  // the horizon: one line of light
  float hx = abs(vUv.x - .5) * 2.;
  float line = exp(-abs(vUv.y - uHorizon) * uRes.y * .9) * (1. - smoothstep(uHorizonW * .7, uHorizonW + .0001, hx));
  col += vec3(1., .62, .32) * line * uHorizonAmt * 1.6;

  col += vec3(1., .78, .5) * uFlash;

  // lens vignette + exposure
  float v = 1. - smoothstep(.2, 1.25, length((vUv - .5) * vec2(1., .92)) * 1.2);
  col *= mix(1., v, .9);
  col *= uDim;

  // grain
  col += (hash(vUv * uRes + fract(uTime * 7.) * 91.) - .5) * .085 * uGrain;
  gl_FragColor = vec4(max(col, 0.), 1.);
}
`

type Clip = { video: HTMLVideoElement; tex: THREE.VideoTexture; size: THREE.Vector2 }

export class Cinema {
  lens: Lens = {
    day: 0.15,
    dim: 1,
    video: 0,
    sunAmt: 0,
    sunY: 0.3,
    horizon: 0.5,
    horizonAmt: 0,
    horizonW: 0,
    haze: 1,
    aberr: 1,
    flash: 0,
    grain: 1,
    zoom: 1,
  }
  current = ''
  private target = ''
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private mat: THREE.ShaderMaterial
  private clips = new Map<string, Clip>()
  private mix = { v: 0 }
  private mixTween?: gsap.core.Tween
  private raf = 0
  private clock = new THREE.Clock()
  private black: THREE.DataTexture
  private sources: Record<string, string>

  constructor(canvas: HTMLCanvasElement, sources: Record<string, string>) {
    this.sources = sources
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    this.black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1)
    this.black.needsUpdate = true
    this.mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: {
        tA: { value: this.black },
        tB: { value: this.black },
        uRes: { value: new THREE.Vector2(1, 1) },
        uSizeA: { value: new THREE.Vector2(16, 9) },
        uSizeB: { value: new THREE.Vector2(16, 9) },
        uMix: { value: 0 },
        uTime: { value: 0 },
        uDay: { value: 0 },
        uDim: { value: 1 },
        uVideo: { value: 0 },
        uSunAmt: { value: 0 },
        uSunY: { value: 0.3 },
        uHorizon: { value: 0.5 },
        uHorizonAmt: { value: 0 },
        uHorizonW: { value: 0 },
        uHaze: { value: 1 },
        uAberr: { value: 1 },
        uFlash: { value: 0 },
        uGrain: { value: 1 },
        uZoom: { value: 1 },
      },
      depthTest: false,
    })
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat))
    this.resize()
    window.addEventListener('resize', this.resize)
    document.addEventListener('visibilitychange', this.onVisibility)
    this.loop()
  }

  /** Make sure a clip exists and starts buffering. Resolves when it can play. */
  prepare(name: string): Promise<void> {
    const clip = this.getClip(name)
    if (clip.video.readyState >= 2) return Promise.resolve()
    return new Promise((res) => {
      const done = () => res()
      clip.video.addEventListener('canplay', done, { once: true })
      clip.video.addEventListener('loadeddata', done, { once: true })
      clip.video.addEventListener('error', done, { once: true })
      setTimeout(done, 5000)
    })
  }

  private getClip(name: string): Clip {
    let c = this.clips.get(name)
    if (c) return c
    const video = document.createElement('video')
    video.src = this.sources[name]
    video.muted = true
    video.loop = true
    video.playsInline = true
    video.setAttribute('playsinline', '')
    video.setAttribute('webkit-playsinline', '')
    video.crossOrigin = 'anonymous'
    video.preload = 'auto'
    video.load()
    const tex = new THREE.VideoTexture(video)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.minFilter = THREE.LinearFilter
    const size = new THREE.Vector2(16, 9)
    video.addEventListener('loadedmetadata', () => size.set(video.videoWidth || 16, video.videoHeight || 9))
    c = { video, tex, size }
    this.clips.set(name, c)
    return c
  }

  /** Cut to a clip with a film-burn. */
  show(name: string, duration = 1.1) {
    if (!this.sources[name] || name === this.target) return
    this.target = name
    const next = this.getClip(name)
    next.video.currentTime = 0
    next.video.play().catch(() => {})
    const u = this.mat.uniforms
    if (!this.current) {
      u.tA.value = next.tex
      u.uSizeA.value = next.size
      this.current = name
      return
    }
    // a transition already in flight: settle it before starting the next
    if (this.mixTween?.isActive()) this.mixTween.progress(1)
    u.tB.value = next.tex
    u.uSizeB.value = next.size
    this.mix.v = 0
    const prev = this.current
    this.mixTween = gsap.to(this.mix, {
      v: 1,
      duration,
      ease: 'power2.inOut',
      onComplete: () => {
        u.tA.value = next.tex
        u.uSizeA.value = next.size
        u.tB.value = this.black
        this.mix.v = 0
        this.current = name
        if (prev !== name && prev !== this.target) this.clips.get(prev)?.video.pause()
      },
    })
  }

  private onVisibility = () => {
    const c = this.clips.get(this.target)
    if (!c) return
    if (document.hidden) c.video.pause()
    else c.video.play().catch(() => {})
  }

  private resize = () => {
    const w = window.innerWidth
    const h = window.innerHeight
    this.renderer.setSize(w, h, false)
    const pr = this.renderer.getPixelRatio()
    this.mat.uniforms.uRes.value.set(w * pr, h * pr)
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop)
    const u = this.mat.uniforms
    const L = this.lens
    u.uTime.value = this.clock.getElapsedTime()
    u.uMix.value = this.mix.v
    u.uDay.value = L.day
    u.uDim.value = L.dim
    u.uVideo.value = L.video
    u.uSunAmt.value = L.sunAmt
    u.uSunY.value = L.sunY
    u.uHorizon.value = L.horizon
    u.uHorizonAmt.value = L.horizonAmt
    u.uHorizonW.value = L.horizonW
    u.uHaze.value = L.haze
    u.uAberr.value = L.aberr
    u.uFlash.value = L.flash
    u.uGrain.value = L.grain
    u.uZoom.value = L.zoom
    this.renderer.render(this.scene, this.camera)
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    window.removeEventListener('resize', this.resize)
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.clips.forEach((c) => {
      c.video.pause()
      c.tex.dispose()
    })
    this.renderer.dispose()
  }
}
