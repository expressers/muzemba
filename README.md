# Muzemba — homepage

O único evento de dia em Luanda. Homepage cinematográfica: a página inteira é um dia — o relógio do HUD corre das 09:58 às 23:59 com o scroll, e a luz passa do meio-dia ao pôr do sol (18:25) e à noite.

## Stack
React + Vite + TypeScript + Bun · GSAP (ScrollTrigger, SplitText) · Lenis · Three.js (um único projector WebGL com grading por hora do dia, heat haze, aberração cromática, grão, sol procedural e transições "film burn") · banda sonora generativa em WebAudio (tic-tac, tom de Shepard, boom) — sem ficheiros de áudio.

## Desenvolvimento
```
bun install
bun run dev
bun run build
```

## Media
`public/media` — clips cortados do aftermovie de Anderson Ndele e fotos do Instagram @_muzemba_. Clips 1280px H.264 sem áudio, `faststart`.

## Deploy
Render static site (`render.yaml`).
