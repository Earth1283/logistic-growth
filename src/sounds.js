import { useEffect, useState } from 'react'

const BASE = import.meta.env.BASE_URL

export const CLIPS = {
  extinct: 'windows-xp-error.mp3',
  meteor: 'metal-pipe-falling.mp3',
  hit: 'oof-sound-effect.mp3',
  klonk: 'klonk.mp3',
  yay: 'yay.mp3',
  sus: 'among-us-role-reveal-sound.mp3',
  pay: 'applepay.mp3',
  click: 'click-nice.mp3',
}

const EVENT_CLIPS = {
  meteor: 'meteor',
  harvest: 'hit',
  plague: 'hit',
  mood: 'hit',
  predators: 'sus',
  shrink: 'klonk',
  clones: 'klonk',
  restore: 'yay',
  farming: 'yay',
  fertilizer: 'pay',
  migrants: 'click',
}

const urls = new Map()
const listeners = new Set()
const fractions = Object.fromEntries(Object.keys(CLIPS).map((name) => [name, 0]))
let started = false

const progress = () => {
  const values = Object.values(fractions)
  return values.reduce((sum, f) => sum + f, 0) / values.length
}

const report = () => listeners.forEach((fn) => fn(progress()))

async function load(name) {
  try {
    const res = await fetch(`${BASE}sounds/${CLIPS[name]}`)
    if (!res.ok || !res.body) throw new Error(res.statusText)
    const total = Number(res.headers.get('content-length')) || 0
    const reader = res.body.getReader()
    const chunks = []
    let loaded = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      loaded += value.length
      if (total) {
        fractions[name] = Math.min(0.99, loaded / total)
        report()
      }
    }
    urls.set(name, URL.createObjectURL(new Blob(chunks, { type: 'audio/mpeg' })))
  } catch {
    urls.delete(name)
  }
  fractions[name] = 1
  report()
}

export function preloadSounds() {
  if (started) return
  started = true
  Object.keys(CLIPS).forEach(load)
}

export function usePreloadProgress() {
  const [value, setValue] = useState(progress)
  useEffect(() => {
    listeners.add(setValue)
    preloadSounds()
    setValue(progress())
    return () => listeners.delete(setValue)
  }, [])
  return value
}

const SETTLE_MS = 1250

export function useSoundsReady() {
  const done = usePreloadProgress() >= 1
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (!done) return
    const id = setTimeout(() => setReady(true), SETTLE_MS)
    return () => clearTimeout(id)
  }, [done])
  return ready
}

export function playClip(name) {
  const audio = new Audio(urls.get(name) ?? `${BASE}sounds/${CLIPS[name]}`)
  audio.play().catch(() => {})
}

export function playEventClip(kind) {
  if (EVENT_CLIPS[kind]) playClip(EVENT_CLIPS[kind])
}
