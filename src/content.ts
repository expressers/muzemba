const m = (f: string) => `/media/${f}`

export const clips: Record<string, string> = {
  hero: m('hero.mp4'),
  island: m('island.mp4'),
  islandpull: m('islandpull.mp4'),
  lagoon: m('lagoon.mp4'),
  crowd: m('crowd.mp4'),
  crowd2: m('crowd2.mp4'),
  dance: m('dance.mp4'),
  mask: m('mask.mp4'),
  sunset: m('sunset.mp4'),
  night: m('night.mp4'),
}

export const links = {
  instagram: 'https://www.instagram.com/_muzemba_/',
  youtube: 'https://www.youtube.com/@muzemba',
  facebook: 'https://www.facebook.com/100076172653411/',
  phone: '+244923472565',
  phoneLabel: '923 472 565',
}

export const hours = [
  {
    time: '10:00',
    clip: 'islandpull',
    title: 'Portas abertas',
    text: 'O dia começa cedo. Chegas com o sol a subir e o mar ainda calmo.',
  },
  {
    time: '12:30',
    clip: 'crowd',
    title: 'Sol a pino',
    text: 'Bar aberto de bebidas frescas, mesas cheias e o DJ a ler a pista.',
  },
  {
    time: '15:00',
    clip: 'dance',
    title: 'Cultura',
    text: 'Música, arte e encontro de culturas. Festa, vida, cultura — tudo ao mesmo tempo.',
  },
  {
    time: '17:10',
    clip: 'mask',
    title: 'A máscara',
    text: 'O palco olha para ti. A luz começa a mudar e ninguém quer ir embora.',
  },
]

export const places = [
  { name: 'Ilha', note: 'Um banco de areia no meio do mar.', img: m('island.jpg') },
  { name: 'Alto Mar', note: 'O 2.º aniversário, a bordo.', img: '' },
  { name: 'Museu da Escravatura', note: 'Memória, chão e música.', img: '' },
  { name: 'Buraco 19', note: '12 de Setembro. A rede voltou.', img: m('poster-12set.jpg') },
]

export const gallery = [
  { src: m('photo-04.jpg'), w: 1813, h: 2418 },
  { src: m('photo-03.jpg'), w: 2040, h: 1360 },
  { src: m('photo-02.jpg'), w: 1787, h: 2382 },
  { src: m('photo-05.jpg'), w: 2040, h: 1360 },
  { src: m('photo-08.jpg'), w: 2040, h: 1976 },
  { src: m('photo-06.jpg'), w: 2040, h: 1703 },
  { src: m('photo-07.jpg'), w: 2040, h: 1301 },
]
