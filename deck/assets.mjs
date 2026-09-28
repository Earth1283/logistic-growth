import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const URL = process.env.DEMO_URL ?? 'http://localhost:9092/'
const OUT = process.argv[2] ?? 'deck/out/img'
const VIEW = { width: 1440, height: 900 }

async function open(browser, { welcomed = true, dark = false } = {}) {
  const context = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2, colorScheme: dark ? 'dark' : 'light' })
  if (welcomed) await context.addInitScript(() => localStorage.setItem('welcomed', '1'))
  const page = await context.newPage()
  await page.clock.install({ time: new Date('2026-09-28T12:00:00') })
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.clock.pauseAt(new Date('2026-09-28T12:00:02'))
  await page.mouse.move(2, 2)
  return page
}

const run = (page, ms) => page.clock.runFor(ms)
const shot = (locator, name) => locator.screenshot({ path: join(OUT, name), animations: 'disabled' })
const button = (page, name) => page.getByRole('button', { name, exact: true })
const tab = (page, name) => page.getByRole('tab', { name })

async function preset(page, name) {
  await tab(page, 'Scenarios').click()
  await button(page, name).click()
  await page.mouse.move(2, 2)
  await run(page, 11000)
}

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch()

let page = await open(browser, { welcomed: false })
await shot(page.locator('dialog.welcome'), 'modal.png')
await page.close()

page = await open(browser)
await run(page, 11000)
await page.screenshot({ path: join(OUT, 'ui_classic.jpg'), quality: 90 })
await shot(page.locator('.chart-panel'), 'chart_classic.png')
await shot(page.locator('.plate-panel'), 'plate.png')
await shot(page.locator('.masthead'), 'masthead.png')
await shot(page.locator('.analysis .figure').nth(0), 'analysis_rate.png')
await shot(page.locator('.analysis .figure').nth(1), 'analysis_percap.png')
await tab(page, 'Basics').click()
await page.mouse.move(2, 2)
await shot(page.locator('.controls'), 'tab_basics.png')

await page.locator('.toolbar .btn-primary').click()
await run(page, 4000)
await tab(page, 'Disturb').click()
await button(page, 'Meteor strike').click()
await page.mouse.move(2, 2)
await run(page, 7000)
await shot(page.locator('.chart-panel'), 'chart_meteor.png')
await shot(page.locator('.controls'), 'tab_disturb.png')

for (const [name, file] of [
  ['Reindeer on an island', 'chart_reindeer.png'],
  ['Rare species released', 'chart_rare.png'],
  ['Fishery under pressure', 'chart_fishery.png'],
  ['Insects, one generation a year', 'chart_insects.png'],
  ['Pond algae through the seasons', 'chart_algae.png'],
  ['Yeast in a flask', 'chart_yeast.png'],
]) {
  await preset(page, name)
  await shot(page.locator('.chart-panel'), file)
}
await tab(page, 'Scenarios').click()
await page.mouse.move(2, 2)
await shot(page.locator('.controls'), 'tab_scenarios.png')

await preset(page, 'Reindeer on an island')
await tab(page, 'Realism').click()
await page.mouse.move(2, 2)
await shot(page.locator('.controls'), 'tab_realism.png')
await page.close()

page = await open(browser, { dark: true })
await page.locator('.theme-switch label', { hasText: 'Dark' }).click()
await preset(page, 'Reindeer on an island')
await page.evaluate(() => scrollTo(0, 0))
await page.screenshot({ path: join(OUT, 'ui_dark.jpg'), quality: 90 })

await browser.close()
console.log('assets written to', OUT)
