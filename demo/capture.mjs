import { chromium } from 'playwright'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const URL = process.env.DEMO_URL ?? 'http://localhost:9092/'
const OUT = process.argv[2] ?? 'demo/out/frames'
const FPS = 60
const VIEW = { width: 1440, height: 900 }

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

function syncAnimations() {
  const seen = (window.__demoAnims ??= new WeakMap())
  const now = performance.now()
  for (const a of document.getAnimations()) {
    if (!seen.has(a)) {
      seen.set(a, now)
      a.pause()
    }
    const elapsed = now - seen.get(a)
    const end = a.effect?.getComputedTiming().endTime ?? 0
    if (elapsed >= end) a.finish()
    else a.currentTime = elapsed
  }
  return { x: scrollX, y: scrollY }
}

function afterReact() {
  return new Promise((resolve) => {
    const a = new MessageChannel()
    a.port1.onmessage = () => {
      const b = new MessageChannel()
      b.port1.onmessage = resolve
      b.port2.postMessage(0)
    }
    a.port2.postMessage(0)
  })
}

class Director {
  constructor(page, cdp) {
    this.page = page
    this.cdp = cdp
    this.frame = 0
    this.cursor = { x: VIEW.width * 0.82, y: VIEW.height * 1.08 }
    this.down = false
    this.cam = null
    this.frames = []
    this.events = []
  }

  async box(target) {
    if (!Array.isArray(target) && (await target.count()) > 1) target = await target.all()
    if (Array.isArray(target)) {
      const boxes = (await Promise.all(target.map((t) => this.box(t)))).filter(Boolean)
      if (!boxes.length) return null
      const x = Math.min(...boxes.map((b) => b.x))
      const y = Math.min(...boxes.map((b) => b.y))
      const r = Math.max(...boxes.map((b) => b.x + b.width))
      const bt = Math.max(...boxes.map((b) => b.y + b.height))
      return { x, y, width: r - x, height: bt - y }
    }
    return target.boundingBox()
  }

  async shoot() {
    await this.page.clock.runFor(1000 / FPS)
    await this.page.evaluate(afterReact)
    const scroll = await this.page.evaluate(syncAnimations)
    let cam = null
    if (this.cam) {
      const b = await this.box(this.cam.target)
      if (b) cam = { ...b, pad: this.cam.pad, maxZoom: this.cam.maxZoom }
    }
    const { data } = await this.cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 93, optimizeForSpeed: true, clip: { ...scroll, ...VIEW, scale: 2 } })
    await writeFile(join(OUT, `${String(this.frame).padStart(5, '0')}.jpg`), Buffer.from(data, 'base64'))
    this.frames.push({ x: this.cursor.x, y: this.cursor.y, down: this.down, cam })
    this.frame++
  }

  async wait(ms) {
    const n = Math.round((ms / 1000) * FPS)
    for (let i = 0; i < n; i++) await this.shoot()
  }

  camera(target, { pad = 48, maxZoom = 2.1 } = {}) {
    this.cam = target === 'full' ? null : { target, pad, maxZoom }
  }

  caption(eyebrow, text) {
    this.events.push({ frame: this.frame, type: 'caption', eyebrow, text })
  }

  hideCaption() {
    this.events.push({ frame: this.frame, type: 'caption', eyebrow: null, text: null })
  }

  async point(target, { fx = 0.5, fy = 0.5 } = {}) {
    if ('x' in target) return target
    const b = await this.box(target)
    return { x: b.x + b.width * fx, y: b.y + b.height * fy }
  }

  async glide(to, ms) {
    const from = { ...this.cursor }
    const dx = to.x - from.x
    const dy = to.y - from.y
    const bend = 0.12
    const ctrl = { x: from.x + dx / 2 - dy * bend, y: from.y + dy / 2 + dx * bend }
    const n = Math.max(1, Math.round((ms / 1000) * FPS))
    for (let i = 1; i <= n; i++) {
      const t = ease(i / n)
      const u = 1 - t
      this.cursor = {
        x: u * u * from.x + 2 * u * t * ctrl.x + t * t * to.x,
        y: u * u * from.y + 2 * u * t * ctrl.y + t * t * to.y,
      }
      await this.page.mouse.move(this.cursor.x, this.cursor.y)
      await this.shoot()
    }
  }

  async moveTo(target, ms = 700, where) {
    await this.glide(await this.point(target, where), ms)
  }

  async click(target, { ms = 700, where } = {}) {
    if (target) await this.moveTo(target, ms, where)
    this.down = true
    await this.page.mouse.down()
    this.events.push({ frame: this.frame, type: 'click', x: this.cursor.x, y: this.cursor.y })
    await this.wait(90)
    await this.page.mouse.up()
    this.down = false
    await this.wait(60)
  }

  async thumb(input) {
    return input.evaluate((el) => {
      const r = el.getBoundingClientRect()
      const thumb = parseFloat(getComputedStyle(el).getPropertyValue('--thumb')) || 20
      const at = (v) => r.left + thumb / 2 + ((v - el.min) / (el.max - el.min)) * (r.width - thumb)
      return { y: r.top + r.height / 2, x: at(Number(el.value)), left: at(Number(el.min)), right: at(Number(el.max)) }
    })
  }

  async drag(input, fractions, ms = 1400) {
    const t = await this.thumb(input)
    await this.glide({ x: t.x, y: t.y }, 650)
    this.down = true
    await this.page.mouse.down()
    this.events.push({ frame: this.frame, type: 'click', x: this.cursor.x, y: this.cursor.y })
    for (const f of fractions) await this.glide({ x: t.left + f * (t.right - t.left), y: t.y }, ms / fractions.length)
    await this.page.mouse.up()
    this.down = false
    await this.wait(120)
  }

  async scrollTo(top, ms = 1200) {
    const from = await this.page.evaluate(() => scrollY)
    const n = Math.round((ms / 1000) * FPS)
    for (let i = 1; i <= n; i++) {
      const y = from + (top - from) * ease(i / n)
      await this.page.evaluate((v) => window.scrollTo({ top: v, behavior: 'instant' }), y)
      await this.shoot()
    }
  }
}

async function script(d, page) {
  const button = (name) => page.getByRole('button', { name, exact: true })
  const tab = (name) => page.getByRole('tab', { name })
  const chart = page.locator('.chart-panel')
  const controls = page.locator('.controls')
  const dialog = page.locator('dialog.welcome')

  d.camera('full')
  await d.wait(700)
  d.caption('Logistic Growth Lab', 'An ecology assignment, taken slightly too far.')
  d.camera(dialog.locator('h2, .welcome-lede'), { pad: 70 })
  await d.moveTo(dialog.locator('.welcome-lede'), 1100, { fx: 0.75, fy: 1.4 })
  await d.wait(900)

  const sliders = dialog.locator('.requirements li').nth(3)
  d.camera(sliders, { pad: 90, maxZoom: 2.2 })
  d.caption('The brief', 'Two sliders were requested.')
  await d.moveTo(sliders, 900, { fx: 1.03, fy: 0.8 })
  await d.wait(1100)
  d.caption('What we shipped', 'Fourteen sliders, six switches and a meteor.')
  await d.wait(1800)

  const start = button('Start exploring')
  d.camera(dialog.locator('.welcome-tips, .welcome-start'), { pad: 80, maxZoom: 1.9 })
  d.hideCaption()
  await d.click(start, { ms: 900 })
  d.camera('full')
  await d.wait(700)

  d.camera(chart, { pad: 36 })
  d.caption('01 · The model', 'Growth slows as the habitat fills up.')
  await d.moveTo(chart, 1200, { fx: 0.86, fy: 0.8 })
  await d.wait(3300)
  d.caption('01 · The model', 'The curve levels off at the carrying capacity, K.')
  await d.wait(3200)

  const kInput = page.locator('#k')
  const kRow = kInput.locator('xpath=ancestor::div[contains(@class,"slider")][1]')
  d.hideCaption()
  d.camera(kRow, { pad: 60, maxZoom: 2.2 })
  await d.moveTo(kInput, 900, { fx: 0.6, fy: 0.5 })
  d.caption('02 · Carrying capacity', 'Drag K and the ceiling moves with it.')
  d.camera([controls.locator('.tab-panel'), chart], { pad: 24 })
  await d.drag(kInput, [0.92, 0.3, 0.72], 3000)
  await d.wait(500)

  const rInput = page.locator('#r')
  const rRow = rInput.locator('xpath=ancestor::div[contains(@class,"slider")][1]')
  d.camera(rRow, { pad: 60, maxZoom: 2.2 })
  d.caption('02 · Growth rate', 'r sets how steep the climb is.')
  await d.moveTo(rInput, 700)
  d.camera([controls.locator('.tab-panel'), chart], { pad: 24 })
  await d.drag(rInput, [0.3, 0.06, 0.18], 2600)
  await d.wait(400)

  const replay = page.locator('.toolbar .btn-primary')
  d.camera(chart, { pad: 36 })
  d.caption('02 · Replay', 'Every change redraws live.')
  await d.click(replay, { ms: 1000 })
  await d.wait(1300)

  d.hideCaption()
  d.camera(controls, { pad: 40 })
  await d.click(tab('Disturb'), { ms: 800 })
  await d.scrollTo(await chart.evaluate((el) => el.getBoundingClientRect().top + scrollY - 16), 700)
  d.caption('03 · Disturb', 'Press buttons nature would never allow.')
  await d.moveTo(button('Meteor strike'), 900)
  await d.wait(300)
  d.camera([controls, chart], { pad: 20 })
  await d.click(button('Meteor strike'), { ms: 200 })
  await d.wait(1600)
  d.camera(chart, { pad: 36 })
  d.caption('03 · Disturb', 'Crowding pulls it back to K anyway.')
  await d.moveTo(chart, 1000, { fx: 0.5, fy: 1.012 })
  await d.wait(3200)

  d.hideCaption()
  d.camera(controls, { pad: 40 })
  await d.click(tab('Scenarios'), { ms: 900 })
  await d.wait(250)
  d.caption('04 · Real history', 'St. Matthew Island reindeer, 1944 to 1966.')
  await d.click(button('Reindeer on an island'), { ms: 800 })
  await d.wait(500)
  d.camera(chart, { pad: 36 })
  await d.moveTo(chart, 1000, { fx: 0.5, fy: 1.012 })
  await d.wait(2600)
  d.caption('04 · Real history', 'A time lag makes them overshoot K, then crash.')
  await d.wait(4300)

  d.hideCaption()
  d.camera('full')
  await d.moveTo({ x: VIEW.width * 0.66, y: VIEW.height * 0.62 }, 700)
  const analysis = page.locator('.analysis')
  const top = await analysis.evaluate((el) => el.getBoundingClientRect().top + scrollY - 24)
  await d.scrollTo(top, 1500)
  d.caption('05 · Analysis', 'Why it stops at K, worked out live.')
  d.camera(page.locator('.analysis .figure').first(), { pad: 30 })
  await d.moveTo(page.locator('.analysis .figure svg').first(), 1000, { fx: 0.62, fy: 0.5 })
  await d.wait(3600)

  d.hideCaption()
  d.camera('full')
  await d.scrollTo(0, 1300)
  const dark = page.locator('.theme-switch label', { hasText: 'Dark' })
  d.camera(page.locator('.masthead-side'), { pad: 60, maxZoom: 1.8 })
  await d.click(dark, { ms: 900 })
  d.caption('One more thing', 'Dark mode. Obviously.')
  await d.wait(900)
  d.camera('full')
  await d.moveTo({ x: VIEW.width * 0.9, y: VIEW.height * 1.1 }, 1200)
  await d.wait(1600)
  d.hideCaption()
  await d.wait(700)
}

await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2, colorScheme: 'light', reducedMotion: 'no-preference' })
const page = await context.newPage()
await page.clock.install({ time: new Date('2026-09-28T12:00:00') })
await page.goto(URL, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.clock.pauseAt(new Date('2026-09-28T12:00:02'))
const cdp = await context.newCDPSession(page)

const d = new Director(page, cdp)
const began = Date.now()
await script(d, page)
await writeFile(join(OUT, '..', 'timeline.json'), JSON.stringify({ fps: FPS, view: VIEW, scale: 2, frames: d.frames, events: d.events }))
console.log(`${d.frame} frames in ${((Date.now() - began) / 1000).toFixed(0)}s`)
await browser.close()
