import pptxgen from 'pptxgenjs'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { simulate, valueAt } from '../src/sim.js'
import { PRESETS, paramsFor } from '../src/presets.js'

const IMG = process.env.IMG ?? 'deck/out/img'
const OUT = process.argv[2] ?? 'deck/out/deck.pptx'
const TRAILER = process.env.TRAILER ?? 'deck/out/trailer.mp4'

const C = {
  ink: '0E0D14',
  card: '1B1A26',
  card2: '25233A',
  line: '34314A',
  white: 'F5F4EF',
  muted: 'A6A3B8',
  saf: 'FF3D7F',
  vio: '8F74FF',
  agar: 'D6F25A',
}
const F = { display: 'Anton', serif: 'Instrument Serif', mono: 'JetBrains Mono', sans: 'Hanken Grotesk', math: 'STIX Two Text' }
const TOTAL = 31

const img = (name) => join(IMG, name)
const pad2 = (n) => String(n).padStart(2, '0')
const preset = (id) => paramsFor(PRESETS.find((p) => p.id === id))

const pres = new pptxgen()
pres.layout = 'LAYOUT_WIDE'
pres.title = 'Logistic Growth: an ecology assignment, taken too far'
pres.author = 'Logistic Growth Lab'

const T = (slide, text, o) => slide.addText(text, { isTextBox: true, margin: 0, valign: 'top', fontFace: F.sans, color: C.white, ...o })
const card = (slide, x, y, w, h, color = C.card) =>
  slide.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color }, line: { color, width: 0 } })

let count = 0
function frame(kicker, { bg = 'bg_grid.jpg', dark = true } = {}) {
  const slide = pres.addSlide()
  const n = count++
  slide.background = { path: img(bg) }
  const ink = dark ? C.white : C.ink
  if (kicker) T(slide, kicker.toUpperCase(), { x: 0.6, y: 0.42, w: 8.2, h: 0.3, fontFace: F.mono, fontSize: 11, bold: true, color: dark ? C.agar : C.ink, charSpacing: 3 })
  T(slide, `N = ${pad2(n + 1)} · K = ${TOTAL}`, { x: 8.9, y: 0.42, w: 2.1, h: 0.3, fontFace: F.mono, fontSize: 9, color: dark ? C.muted : C.ink, align: 'right' })
  slide.addImage({ path: img(`${dark ? 'motif' : 'motif_light'}_${pad2(n)}.png`), x: 11.15, y: 0.26, w: 1.6, h: 0.523 })
  slide.ink = ink
  return slide
}

const headline = (slide, text, o = {}) =>
  T(slide, text, { x: 0.6, y: 0.85, w: 12.1, h: 1.05, fontFace: F.display, fontSize: 54, color: slide.ink, lineSpacingMultiple: 0.88, ...o })
const voice = (slide, text, o = {}) => T(slide, text, { fontFace: F.serif, italic: true, fontSize: 24, color: C.saf, ...o })
const body = (slide, text, o = {}) => T(slide, text, { fontSize: 14, color: C.white, lineSpacingMultiple: 1.15, ...o })
const mono = (slide, text, o = {}) => T(slide, text, { fontFace: F.mono, fontSize: 10, color: C.muted, ...o })

function chartOpts(o = {}) {
  return {
    chartArea: { fill: { color: C.card } },
    plotArea: { fill: { color: C.card } },
    catAxisLabelColor: C.muted,
    valAxisLabelColor: C.muted,
    catAxisLabelFontFace: F.mono,
    valAxisLabelFontFace: F.mono,
    catAxisLabelFontSize: 10,
    valAxisLabelFontSize: 10,
    catAxisLineShow: false,
    valAxisLineShow: false,
    valGridLine: { color: C.line, size: 0.75 },
    catGridLine: { style: 'none' },
    showLegend: true,
    legendPos: 'b',
    legendFontFace: F.mono,
    legendFontSize: 10,
    legendColor: C.muted,
    lineDataSymbol: 'none',
    lineSize: 3,
    ...o,
  }
}

function sampled(params, times) {
  const sim = simulate(params, [])
  return times.map((t) => Math.round(valueAt(sim.det, t / sim.dt) * 10) / 10)
}
const range = (a, b, step = 1) => Array.from({ length: Math.floor((b - a) / step) + 1 }, (_, i) => +(a + i * step).toFixed(6))

function stat(slide, x, y, w, number, label, color = C.agar, size = 66) {
  T(slide, number, { x, y, w, h: size / 60, fontFace: F.display, fontSize: size, color })
  mono(slide, label, { x, y: y + size / 60 + 0.05, w, h: 0.5, fontSize: 10, color: C.muted })
}

// 1 · title
{
  const s = frame('An ecology assignment, taken too far', { bg: 'bg_title.jpg' })
  T(s, [{ text: 'd', options: {} }, { text: 'N', options: { color: C.agar } }, { text: '/d', options: {} }, { text: 't', options: {} }, { text: ' = ', options: {} }, { text: 'r', options: { color: C.vio } }, { text: 'N', options: { color: C.agar } }, { text: ' (1 − ', options: {} }, { text: 'N', options: { color: C.agar } }, { text: '/', options: {} }, { text: 'K', options: { color: C.saf } }, { text: ')', options: {} }], {
    x: 6.8, y: 1.02, w: 5.95, h: 0.6, fontFace: F.math, italic: true, fontSize: 30, align: 'right',
  })
  T(s, 'LOGISTIC\nGROWTH', { x: 0.6, y: 2.45, w: 9, h: 3.6, fontFace: F.display, fontSize: 132, lineSpacingMultiple: 0.8 })
  voice(s, 'or: everything eventually hits a ceiling.', { x: 0.62, y: 6.05, w: 8, h: 0.6, fontSize: 32, color: C.agar })
  mono(s, 'LOGISTIC GROWTH LAB · EARTH1283.GITHUB.IO/LOGISTIC-GROWTH', { x: 6.5, y: 6.95, w: 6.23, h: 0.3, align: 'right', color: C.white })
  s.addNotes('Title. The whole talk hangs on one equation: dN/dt = rN(1 − N/K). By the end we will know what every symbol means, where it came from, why real organisms obey it, and how our simulator breaks it on purpose.')
}

// 2 · the brief
{
  const s = frame('Specimen 01 · The brief')
  headline(s, 'WE WERE ASKED\nFOR TWO SLIDERS.', { h: 2.1, fontSize: 60 })
  voice(s, '“Create webpage controls to modify carrying capacity and intrinsic growth rate.”', { x: 0.6, y: 3.2, w: 5.6, h: 1.1, fontSize: 24, color: C.muted })
  mono(s, '— THE ASSIGNMENT', { x: 0.6, y: 4.35, w: 5, h: 0.3, color: C.muted })
  voice(s, 'We may have overdone it.', { x: 0.6, y: 5.9, w: 5.6, h: 0.6, fontSize: 30 })
  const stats = [
    ['14', 'SLIDERS', C.agar],
    ['6', 'REALISM SWITCHES', C.saf],
    ['7', 'REAL-WORLD SCENARIOS', C.vio],
    ['15', 'DISTURBANCE BUTTONS', C.agar],
    ['1', 'METEOR', C.saf],
    ['17', 'LINES OF HTML', C.vio],
  ]
  stats.forEach(([n, label, color], i) => {
    const x = 7.0 + (i % 3) * 1.95
    const y = 1.55 + Math.floor(i / 3) * 2.45
    card(s, x, y, 1.8, 2.15)
    stat(s, x + 0.2, y + 0.2, 1.5, n, label, color, 72)
  })
  s.addNotes('The brief asked for two sliders: carrying capacity and growth rate. We shipped fourteen sliders, six switches that break textbook assumptions, seven real scenarios, fifteen disturbance buttons, and a meteor. The HTML file itself is 17 lines; everything else is React.')
}

function section(num, title, tag, bg, dark) {
  const s = frame(null, { bg, dark })
  const ink = dark ? C.white : C.ink
  T(s, num, { x: 0.45, y: 0.6, w: 7, h: 4.6, fontFace: F.display, fontSize: 330, color: ink, lineSpacingMultiple: 0.8 })
  T(s, title, { x: 0.6, y: 4.75, w: 12, h: 1.4, fontFace: F.display, fontSize: 96, color: ink })
  T(s, tag, { x: 0.62, y: 6.25, w: 10, h: 0.6, fontFace: F.serif, italic: true, fontSize: 32, color: ink })
  return s
}

// 3 · section: math
section('01', 'THE MATH', 'the part that is actually on the test', 'bg_colonies_saf.jpg', false).addNotes('Section one: the mathematics of growth, from exponential to logistic.')

// 4 · exponential
{
  const s = frame('Specimen 02 · Exponential growth')
  headline(s, 'UNLIMITED GROWTH IS A LIE')
  T(s, [{ text: 'dN/dt = ', options: {} }, { text: 'r', options: { color: C.vio } }, { text: 'N', options: { color: C.agar } }], { x: 0.6, y: 2.05, w: 4.6, h: 0.8, fontFace: F.math, italic: true, fontSize: 40 })
  body(s, 'With unlimited food and space, every individual adds offspring at the same per-capita rate r. More parents make more babies, so the population doubles every ln 2 ÷ r. At r = 0.35 per day, that is every 2 days, forever.', { x: 0.6, y: 2.95, w: 4.6, h: 1.6 })
  stat(s, 0.6, 4.75, 4.6, '19,000,000', 'ELEPHANTS DESCENDED FROM ONE PAIR AFTER ~750 YEARS.\nDARWIN’S ESTIMATE FOR THE SLOWEST BREEDER HE KNEW\n(ORIGIN OF SPECIES, 6TH ED., 1872)', C.agar, 54)
  const days = range(0, 30)
  const classic = preset('classic')
  s.addChart(pres.charts.LINE, [
    { name: 'Exponential, dN/dt = rN', labels: days, values: days.map((t) => Math.min(1100, Math.round(classic.N0 * Math.exp(classic.r * t)))) },
    { name: 'Logistic, dN/dt = rN(1 − N/K)', labels: days, values: sampled(classic, days) },
  ], chartOpts({ x: 5.7, y: 2.05, w: 7.03, h: 4.9, chartColors: [C.saf, C.agar], valAxisMaxVal: 1000, valAxisMinVal: 0, catAxisLabelFrequency: 5, catAxisTitle: 'Days', showCatAxisTitle: true, catAxisTitleColor: C.muted, catAxisTitleFontFace: F.mono, catAxisTitleFontSize: 10 }))
  s.addNotes('Exponential growth assumes nothing ever runs out. Darwin used elephants, the slowest breeders he knew, to show that even they would cover the planet: about 19 million descendants from one pair in roughly 750 years. Real populations bend away from the exponential curve, which is the whole point of the logistic model.')
}

// 5 · equation anatomy
{
  const s = frame('Specimen 03 · Anatomy of an equation')
  headline(s, 'READ IT LIKE A SENTENCE')
  T(s, [
    { text: 'dN/dt', options: { color: C.white } },
    { text: '  =  ', options: { color: C.muted } },
    { text: 'r', options: { color: C.vio } },
    { text: ' ', options: {} },
    { text: 'N', options: { color: C.agar } },
    { text: ' (1 − N/K)', options: { color: C.saf } },
  ], { x: 0.6, y: 2.0, w: 12.13, h: 1.6, fontFace: F.math, italic: true, fontSize: 88, align: 'center' })
  const parts = [
    ['dN/dt', C.white, 'THE CHANGE', 'How fast the population is growing right now, in individuals per unit of time.'],
    ['r', C.vio, 'INTRINSIC GROWTH RATE', 'Births minus deaths per individual when nobody is crowded. Set by biology: litter size, generation time, lifespan.'],
    ['N', C.agar, 'POPULATION SIZE', 'More individuals means more parents, so more births. This is the part that makes growth snowball.'],
    ['1 − N/K', C.saf, 'THE BRAKE', 'The share of the habitat still unused. Empty habitat: 1, full speed. At N = K: 0, growth stops. Past K: negative.'],
  ]
  parts.forEach(([sym, color, tag, text], i) => {
    const x = 0.6 + i * 3.08
    card(s, x, 3.95, 2.9, 2.95)
    T(s, sym, { x: x + 0.25, y: 4.15, w: 2.4, h: 0.6, fontFace: F.math, italic: true, fontSize: 30, color })
    mono(s, tag, { x: x + 0.25, y: 4.85, w: 2.4, h: 0.3, bold: true, color })
    body(s, text, { x: x + 0.25, y: 5.2, w: 2.45, h: 1.6, fontSize: 12.5 })
  })
  s.addNotes('Read left to right: the rate of change equals the growth rate, times how many individuals there are, times the fraction of the habitat that is still free. The last term is the whole logistic idea: Pierre-François Verhulst added it in 1838 as a brake on Malthus’s runaway growth.')
}

// 6 · four acts
{
  const s = frame('Specimen 04 · The S curve')
  headline(s, 'FOUR ACTS OF THE S CURVE')
  const classic = preset('classic')
  const days = range(0, 50)
  s.addChart(pres.charts.LINE, [
    { name: 'Population N', labels: days, values: sampled(classic, days) },
    { name: 'Carrying capacity K = 600', labels: days, values: days.map(() => classic.K) },
  ], chartOpts({ x: 0.6, y: 2.0, w: 7.3, h: 4.95, chartColors: [C.agar, C.saf], valAxisMaxVal: 700, valAxisMinVal: 0, catAxisLabelFrequency: 10 }))
  const acts = [
    ['01', 'ESTABLISHMENT', 'A few founders, so few births. Growth looks slow even though each individual breeds at full speed.'],
    ['02', 'ACCELERATION', 'Nearly exponential. Resources still feel infinite.'],
    ['03', 'INFLECTION AT K/2', 'Fastest growth of all: rK/4 = 52.5 per day here. Every individual after this slows everyone down more than it adds.'],
    ['04', 'PLATEAU', 'Births equal deaths. N sits at K and stays there.'],
  ]
  acts.forEach(([n, tag, text], i) => {
    const y = 2.0 + i * 1.25
    T(s, n, { x: 8.3, y, w: 0.8, h: 0.7, fontFace: F.display, fontSize: 40, color: [C.vio, C.agar, C.saf, C.white][i] })
    mono(s, tag, { x: 9.15, y: y + 0.05, w: 3.6, h: 0.3, bold: true, color: C.white })
    body(s, text, { x: 9.15, y: y + 0.35, w: 3.6, h: 0.85, fontSize: 12 })
  })
  s.addNotes('The curve from our simulator with K = 600 and r = 0.35. It has four phases. The key exam fact: growth is fastest at half the carrying capacity, where the rate is rK/4. That is why fisheries try to hold stocks near K/2.')
}

// 7 · crowding is the brake
{
  const s = frame('Specimen 05 · Density dependence')
  headline(s, 'CROWDING IS THE BRAKE')
  const r = 0.35
  const K = 600
  const ns = range(0, 720, 40)
  s.addChart(pres.charts.LINE, [{ name: 'Per-individual growth r(1 − N/K)', labels: ns, values: ns.map((n) => +(r * (1 - n / K)).toFixed(3)) }],
    chartOpts({ x: 0.6, y: 2.0, w: 5.9, h: 3.6, chartColors: [C.vio], catAxisLabelFrequency: 3, valAxisLabelFormatCode: '0.00' }))
  s.addChart(pres.charts.LINE, [{ name: 'Whole-population growth rN(1 − N/K)', labels: ns, values: ns.map((n) => +(r * n * (1 - n / K)).toFixed(1)) }],
    chartOpts({ x: 6.83, y: 2.0, w: 5.9, h: 3.6, chartColors: [C.agar], catAxisLabelFrequency: 3 }))
  body(s, 'Each extra individual makes every other individual slightly worse at reproducing, so per-capita growth falls in a straight line and hits zero at K.', { x: 0.6, y: 5.85, w: 5.9, h: 1.1, fontSize: 13 })
  body(s, 'Multiply by N and you get a hill. Below K growth is positive and pushes N up; above K it is negative and pushes N down. That makes K a stable equilibrium, and N = 0 an unstable one.', { x: 6.83, y: 5.85, w: 5.9, h: 1.1, fontSize: 13 })
  s.addNotes('Left: growth per individual falls linearly with crowding. Right: total growth is a parabola that peaks at K/2 and crosses zero at K. Any population knocked off K gets pushed back toward it. That is what stability means, and the analysis panels in our app draw exactly these two charts live.')
}

// 8 · section: biology
section('02', 'THE BIOLOGY', 'what K is actually made of', 'bg_colonies_vio.jpg', true).addNotes('Section two: the math says there is a ceiling. Biology says why.')

// 9 · births meet deaths
{
  const s = frame('Specimen 06 · Where K comes from')
  headline(s, 'K IS WHERE BIRTHS MEET DEATHS')
  const x = range(0, 1.4, 0.1)
  s.addChart(pres.charts.LINE, [
    { name: 'Birth rate b(N)', labels: x.map((v) => `${v.toFixed(1)}K`), values: x.map((v) => +(0.5 - 0.25 * v).toFixed(3)) },
    { name: 'Death rate d(N)', labels: x.map((v) => `${v.toFixed(1)}K`), values: x.map((v) => +(0.15 + 0.1 * v).toFixed(3)) },
  ], chartOpts({ x: 6.1, y: 2.0, w: 6.63, h: 4.95, chartColors: [C.agar, C.saf], valAxisMinVal: 0, valAxisMaxVal: 0.55, valAxisLabelFormatCode: '0.00', catAxisLabelFrequency: 2 }))
  body(s, 'r is not a magic constant. It is the birth rate minus the death rate, and both depend on how crowded the habitat is.', { x: 0.6, y: 2.05, w: 5.1, h: 0.9, fontSize: 15 })
  body(s, 'As a habitat fills up, each individual gets less food, less shelter and less space. Fewer young are born or survive, so the birth rate falls. More individuals starve, sicken or get eaten, so the death rate rises.', { x: 0.6, y: 3.05, w: 5.1, h: 1.5, fontSize: 14 })
  voice(s, 'Where the lines cross, the population stops changing. That crossing is K.', { x: 0.6, y: 4.75, w: 5.1, h: 1.0, fontSize: 24, color: C.agar })
  mono(s, 'IF BOTH CHANGE LINEARLY WITH N:\nb(N) − d(N) = r(1 − N/K)', { x: 0.6, y: 6.2, w: 5.1, h: 0.6, color: C.muted })
  s.addNotes('This is the biological meaning of the logistic equation. At low density births far outnumber deaths. Crowding pushes births down and deaths up. K is simply the density where they are equal. Change the habitat and you move the lines, which moves K.')
}

// 10 · what runs out
{
  const s = frame('Specimen 07 · Limiting factors')
  headline(s, 'WHAT ACTUALLY RUNS OUT')
  const items = [
    ['FOOD & NUTRIENTS', C.agar, 'Scramble competition: everyone gets a smaller share, so everyone does a little worse.', 'Yeast burn through the sugar in their flask.'],
    ['SPACE & TERRITORY', C.vio, 'Contest competition: winners hold a territory and breed, losers get nothing.', 'Songbirds defend nest sites; barnacles fight for rock.'],
    ['WASTE & TOXINS', C.saf, 'Populations poison their own habitat as waste builds up.', 'Brewing yeast stall as their own ethanol accumulates.'],
    ['DISEASE', C.agar, 'Pathogens jump between hosts faster when hosts are packed together.', 'The Plague button kills in proportion to N/K.'],
    ['PREDATORS', C.vio, 'Abundant prey feeds and attracts more predators.', 'Lynx numbers track snowshoe hares.'],
    ['STRESS', C.saf, 'Crowding changes hormones and behaviour, and reproduction drops.', 'Calhoun’s crowded rat colonies (1962) stopped raising young.'],
  ]
  items.forEach(([title, color, text, eg], i) => {
    const x = 0.6 + (i % 3) * 4.1
    const y = 2.05 + Math.floor(i / 3) * 2.5
    card(s, x, y, 3.93, 2.3)
    T(s, title, { x: x + 0.25, y: y + 0.2, w: 3.5, h: 0.5, fontFace: F.display, fontSize: 24, color })
    body(s, text, { x: x + 0.25, y: y + 0.78, w: 3.45, h: 0.9, fontSize: 12.5 })
    mono(s, `e.g. ${eg}`, { x: x + 0.25, y: y + 1.68, w: 3.45, h: 0.5, fontSize: 9.5 })
  })
  s.addNotes('K is not one thing. It is whichever resource or hazard bites first. Justus von Liebig’s law of the minimum (1840) makes the same point for plants: growth is limited by the scarcest resource, not the total.')
}

// 11 · dependent vs independent
{
  const s = frame('Specimen 08 · Two kinds of disaster')
  headline(s, 'THE METEOR DOESN’T CARE\nHOW CROWDED YOU ARE', { h: 1.9, fontSize: 50 })
  const cols = [
    ['DENSITY-DEPENDENT', C.saf, 'Hits harder the more crowded the population is. These are the forces that create K and pull a population back to it.', 'Competition · disease · predation · waste · stress', 'In the sim: Plague kills up to 90%, scaled by N/K.'],
    ['DENSITY-INDEPENDENT', C.vio, 'Kills the same share no matter how many there are. It can knock a population down but cannot hold it at a ceiling.', 'Frost · drought · fire · floods · meteors', 'In the sim: Meteor kills 95% and wrecks half the habitat.'],
  ]
  cols.forEach(([title, color, text, list, sim], i) => {
    const x = 0.6 + i * 3.6
    T(s, title, { x, y: 3.0, w: 3.4, h: 0.6, fontFace: F.display, fontSize: 28, color })
    body(s, text, { x, y: 3.7, w: 3.3, h: 1.5, fontSize: 13 })
    mono(s, list.toUpperCase(), { x, y: 5.25, w: 3.3, h: 0.6, color: C.white })
    voice(s, sim, { x, y: 5.95, w: 3.3, h: 0.9, fontSize: 18, color })
  })
  card(s, 7.85, 2.95, 4.88, 3.98)
  s.addImage({ path: img('meteor.gif'), x: 8.0, y: 3.1, w: 4.58, h: 3.26 })
  mono(s, 'LIVE: METEOR AT DAY 23. N FALLS 95%, K HALVES, AND CROWDING STILL WINS.', { x: 8.0, y: 6.45, w: 4.58, h: 0.4, fontSize: 9 })
  s.addNotes('Ecologists split limiting factors by whether their effect depends on density. Only density-dependent factors can regulate a population around K. The GIF is our meteor: a density-independent disaster. The population recovers to the new, smaller K because crowding, not the meteor, sets the ceiling.')
}

// 12 · small populations
{
  const s = frame('Specimen 09 · Small-population biology')
  headline(s, 'SMALL IS DANGEROUS TOO')
  const halves = [
    ['THE ALLEE EFFECT', C.agar, 'Below a threshold, individuals cannot find mates, defend themselves or cooperate, so per-capita growth turns negative. Named after W. C. Allee (1930s).', 'African wild dogs need a pack to hunt and babysit. Sea urchins and corals that spawn into open water fail to fertilise when too sparse.', '× (N − A) / (N + A)'],
    ['THE PREDATOR PIT', C.saf, 'A predator can only catch and eat so fast (Holling’s type II functional response, 1959). A big prey population swamps its predators; a small one gets eaten faster than it can breed.', 'Released prey species often vanish before they establish, then thrive once numbers are high.', '− kill_max / (N + h)'],
  ]
  halves.forEach(([title, color, text, eg, term], i) => {
    const x = 0.6 + i * 3.55
    T(s, title, { x, y: 2.05, w: 3.35, h: 0.55, fontFace: F.display, fontSize: 28, color })
    body(s, text, { x, y: 2.7, w: 3.3, h: 1.95, fontSize: 12.5 })
    mono(s, eg, { x, y: 4.75, w: 3.3, h: 1.1, fontSize: 9.5, color: C.white })
    T(s, term, { x, y: 6.1, w: 3.3, h: 0.5, fontFace: F.math, italic: true, fontSize: 20, color })
    mono(s, 'TERM ADDED TO PER-CAPITA GROWTH IN THE SIM', { x, y: 6.6, w: 3.3, h: 0.3, fontSize: 8 })
  })
  card(s, 7.8, 2.05, 4.93, 4.88)
  s.addImage({ path: img('chart_rare.png'), x: 7.95, y: 2.2, w: 4.63, h: 3.42 })
  voice(s, 'Rare species released: eight runs, same settings, different luck. Some take off; some never escape the pit.', { x: 7.95, y: 5.8, w: 4.63, h: 1.0, fontSize: 17, color: C.agar })
  s.addNotes('The logistic model assumes growth is fastest when a population is tiny. Real small populations often do worse: they cannot find mates or defend themselves (the Allee effect), and predators hit them hardest. Conservation biologists call this a minimum viable population. The chart is our Rare species preset: eight simulated runs with random births and deaths.')
}

// 13 · r vs K
{
  const s = frame('Specimen 10 · Life-history strategies')
  headline(s, 'TWO WAYS TO LIVE')
  const cols = [
    ['r', C.vio, 'LIVE FAST', 'Many small offspring, little parental care, early maturity, short lives. Built to exploit empty habitats before anyone else arrives, so numbers boom and bust.', 'MICE · DANDELIONS · MOSQUITOES · YEAST'],
    ['K', C.saf, 'LIVE NEAR THE CEILING', 'Few large offspring, lots of care, late maturity, long lives. Built to compete in a habitat that is already full.', 'ELEPHANTS · WHALES · OAKS · HUMANS'],
  ]
  cols.forEach(([letter, color, tag, text, eg], i) => {
    const x = 0.6 + i * 6.15
    card(s, x, 2.05, 5.98, 4.9)
    T(s, letter, { x: x + 0.3, y: 1.95, w: 1.8, h: 2.6, fontFace: F.math, italic: true, fontSize: 170, color })
    T(s, `${letter}-SELECTED`, { x: x + 2.3, y: 2.4, w: 3.5, h: 0.6, fontFace: F.display, fontSize: 32, color })
    mono(s, tag, { x: x + 2.3, y: 3.1, w: 3.5, h: 0.3, bold: true, color: C.white })
    body(s, text, { x: x + 0.35, y: 4.55, w: 5.3, h: 1.3, fontSize: 14 })
    mono(s, eg, { x: x + 0.35, y: 6.2, w: 5.3, h: 0.4, color })
  })
  mono(s, 'MACARTHUR & WILSON, 1967. MODERN ECOLOGY TREATS THIS AS A SPECTRUM (LIFE-HISTORY THEORY), NOT TWO BOXES.', { x: 0.6, y: 7.02, w: 12.1, h: 0.3, fontSize: 9 })
  s.addNotes('The two parameters of the logistic equation became names for two evolutionary strategies. r-selected species maximise growth rate; K-selected species maximise competitive ability near carrying capacity. Most species sit somewhere between, and ecologists now prefer the broader framework of life-history trade-offs.')
}

// 14 · section: history
section('03', 'THE HISTORY', 'two centuries of people discovering ceilings', 'bg_colonies_agar.jpg', false).addNotes('Section three: how the idea developed, and the real populations that tested it.')

// 15 · timeline
{
  const s = frame('Specimen 11 · Timeline')
  headline(s, 'A SHORT HISTORY OF CEILINGS')
  s.addShape(pres.shapes.LINE, { x: 0.6, y: 4.45, w: 12.13, h: 0, line: { color: C.line, width: 2 } })
  const events = [
    ['1798', 'MALTHUS', 'Population grows geometrically, food only arithmetically. Misery follows.'],
    ['1838', 'VERHULST', 'Adds a brake term and writes the logistic equation.'],
    ['1913', 'CARLSON', 'Counts yeast in a flask every hour.'],
    ['1920', 'PEARL & REED', 'Rediscover the curve; fit it to the US census.'],
    ['1934', 'GAUSE', 'Paramecium in test tubes: alone, each species makes an S curve. Together, one wins.'],
    ['1948', 'HUTCHINSON', 'Adds a time lag. Populations overshoot and oscillate.'],
    ['1966', 'ST. MATTHEW', '6,000 reindeer crash to 42.'],
    ['1976', 'MAY', 'The simplest breeding-season models can be chaotic.'],
    ['1992', 'NORTHERN COD', 'Canada closes the fishery after the stock collapses.'],
  ]
  const colors = [C.agar, C.saf, C.vio]
  events.forEach(([year, who, text], i) => {
    const cx = 1.7 + i * 1.24
    const up = i % 2 === 0
    const color = colors[i % 3]
    s.addShape(pres.shapes.OVAL, { x: cx - 0.11, y: 4.34, w: 0.22, h: 0.22, fill: { color }, line: { color, width: 0 } })
    s.addShape(pres.shapes.LINE, { x: cx, y: up ? 3.95 : 4.56, w: 0, h: 0.39, line: { color, width: 1.5 } })
    const y = up ? 2.05 : 5.0
    T(s, year, { x: cx - 1.1, y, w: 2.2, h: 0.6, fontFace: F.display, fontSize: 30, color, align: 'center' })
    mono(s, who, { x: cx - 1.1, y: y + 0.62, w: 2.2, h: 0.25, bold: true, color: C.white, align: 'center', fontSize: 9 })
    body(s, text, { x: cx - 1.1, y: y + 0.9, w: 2.2, h: 0.95, fontSize: 10.5, align: 'center', color: C.muted })
  })
  s.addNotes('Malthus (1798) warned that unchecked growth outruns food. Verhulst (1838) wrote the equation and later named it logistique. Pearl and Reed rediscovered it in 1920. Gause showed it in protists and discovered competitive exclusion. Hutchinson added delays, Ricker (1954) and May (1976) discrete generations and chaos. St. Matthew Island and Newfoundland cod are the real-world cautionary tales.')
}

// 16 · Pearl & Reed
{
  const s = frame('Specimen 12 · Pearl & Reed, 1920')
  headline(s, 'THE CEILING THAT WASN’T')
  const years = range(1790, 2020, 10)
  const census = [3.93, 5.31, 7.24, 9.64, 12.87, 17.07, 23.19, 31.44, 38.56, 50.19, 62.98, 76.21, 92.23, 106.02, 123.2, 132.16, 151.33, 179.32, 203.3, 226.55, 248.71, 281.42, 308.75, 331.45]
  const model = years.map((y) => +(197.273 / (1 + Math.exp(-0.0313395 * (y - 1914.25)))).toFixed(1))
  s.addChart(pres.charts.LINE, [
    { name: 'US census (millions)', labels: years, values: census },
    { name: 'Pearl & Reed’s logistic fit (1920)', labels: years, values: model },
  ], chartOpts({ x: 0.6, y: 2.0, w: 7.6, h: 4.95, chartColors: [C.agar, C.saf], catAxisLabelFrequency: 4, valAxisMinVal: 0 }))
  stat(s, 8.6, 2.0, 4.13, '197,273,000', 'THE MAXIMUM US POPULATION PEARL & REED PREDICTED FROM THE 1790–1910 CENSUSES', C.saf, 50)
  body(s, 'Their curve matched 120 years of data almost perfectly. The US passed their ceiling in the late 1960s and has since gone past 330 million.', { x: 8.6, y: 3.9, w: 4.13, h: 1.3, fontSize: 13.5 })
  voice(s, 'K belongs to a habitat, not a species. Humans keep renovating the habitat: farming, fertiliser, sanitation, medicine.', { x: 8.6, y: 5.3, w: 4.13, h: 1.6, fontSize: 20, color: C.agar })
  s.addNotes('Raymond Pearl and Lowell Reed fitted the logistic curve to US census data in 1920 and predicted a ceiling of about 197 million. The fit to past data was excellent; the prediction failed because agriculture, industrial fertiliser and medicine kept raising the carrying capacity. Our Invent farming button does exactly this: it doubles K.')
}

// 17 · yeast
{
  const s = frame('Specimen 13 · Carlson’s yeast, 1913')
  headline(s, 'YEAST IN A FLASK')
  const yeast = PRESETS.find((p) => p.id === 'yeast')
  const hours = yeast.data.points.map((p) => p.t)
  const fit = sampled(preset('yeast'), hours)
  s.addChart([
    { type: pres.charts.LINE, data: [{ name: 'Logistic, K = 665, r = 0.54/h', labels: hours, values: fit }], options: { chartColors: [C.agar], lineSize: 3, lineDataSymbol: 'none' } },
    { type: pres.charts.LINE, data: [{ name: 'Carlson’s counts', labels: hours, values: yeast.data.points.map((p) => p.n) }], options: { chartColors: [C.saf], lineSize: 0, lineDataSymbol: 'circle', lineDataSymbolSize: 9 } },
  ], chartOpts({ x: 0.6, y: 2.0, w: 6.9, h: 4.95, catAxisLabelFrequency: 2, valAxisMinVal: 0, valAxisMaxVal: 700, catAxisTitle: 'Hours', showCatAxisTitle: true, catAxisTitleColor: C.muted, catAxisTitleFontFace: F.mono, catAxisTitleFontSize: 10 }))
  body(s, 'Saccharomyces cerevisiae reproduces by budding: a daughter cell swells out of its mother and pinches off. In fresh wort the culture doubled roughly every 1.3 hours.', { x: 7.9, y: 2.05, w: 4.83, h: 1.3, fontSize: 13.5 })
  body(s, 'Then two things close in at once. The sugar runs out, and fermentation fills the flask with the yeast’s own waste: ethanol and carbon dioxide. Both push births down and deaths up until the culture levels off.', { x: 7.9, y: 3.45, w: 4.83, h: 1.6, fontSize: 13.5 })
  voice(s, 'Real microbe cultures then enter a death phase, which the logistic model leaves out.', { x: 7.9, y: 5.2, w: 4.83, h: 0.9, fontSize: 19, color: C.agar })
  mono(s, 'DATA: CARLSON, BIOCHEM. Z. 1913 (AMOUNT OF YEAST). FITTED BY PEARL, 1927. SIM PRESET “YEAST IN A FLASK”.', { x: 7.9, y: 6.35, w: 4.83, h: 0.6, fontSize: 9 })
  s.addNotes('These are real measurements, still reprinted in ecology textbooks. The logistic curve fits them closely. The biology behind K here is sugar depletion plus toxic waste, mostly ethanol. Microbiologists describe lag, log, stationary and death phases; the logistic model captures the first three.')
}

// 18 · reindeer
{
  const s = frame('Specimen 14 · St. Matthew Island, 1944–1966')
  headline(s, '29 REINDEER. NO PREDATORS.\nWHAT COULD GO WRONG?', { h: 1.9, fontSize: 50 })
  const stats = [['29', 'RELEASED, 1944', C.agar], ['~6,000', 'PEAK, 1963', C.saf], ['42', 'SURVIVORS, 1966', C.vio]]
  stats.forEach(([n, label, color], i) => stat(s, 0.6 + i * 2.05, 2.95, 1.95, n, label, color, 44))
  body(s, 'Their winter food was lichen, which grows only a few millimetres a year. The herd ate it far faster than it regrew, so they did not just reach K, they destroyed it. The damage showed up years later: a time lag.', { x: 0.6, y: 4.2, w: 6.0, h: 1.3, fontSize: 13.5 })
  body(s, 'After the brutal winter of 1963–64, 42 were left: 41 females and one male that probably could not breed. By the 1980s the herd was gone.', { x: 0.6, y: 5.55, w: 6.0, h: 0.9, fontSize: 13.5 })
  mono(s, 'KLEIN, 1968, JOURNAL OF WILDLIFE MANAGEMENT. SIM: HUTCHINSON’S DELAYED LOGISTIC, τ = 6.5 YEARS.', { x: 0.6, y: 6.6, w: 6.0, h: 0.4, fontSize: 9 })
  card(s, 7.4, 2.95, 5.33, 4.0)
  s.addImage({ path: img('reindeer.gif'), x: 7.55, y: 3.1, w: 5.03, h: 3.58 })
  s.addNotes('A textbook overshoot. With no predators and plenty of lichen, the herd grew almost exponentially. Lichen regrows over decades, so the carrying capacity itself collapsed. Our simulator reproduces the shape with a time lag: crowding feedback arrives years late, so the population sails past K and crashes.')
}

// 19 · chaos
{
  const s = frame('Specimen 15 · Chaos, 1976')
  headline(s, 'ONE BREEDING SEASON A YEAR = CHAOS')
  const insects = simulate(preset('insects'), [])
  const years = range(0, 40)
  s.addChart(pres.charts.BAR, [{ name: 'Insects, r = 2.8', labels: years, values: years.map((y) => Math.round(insects.det[y])) }],
    chartOpts({ x: 0.6, y: 2.0, w: 7.2, h: 3.6, barDir: 'col', barGapWidthPct: 40, chartColors: [C.saf], showLegend: false, catAxisLabelFrequency: 5, valAxisMinVal: 0 }))
  T(s, [{ text: 'N', options: {} }, { text: 't+1', options: { subscript: true } }, { text: ' = N', options: {} }, { text: 't', options: { subscript: true } }, { text: ' · e', options: {} }, { text: 'r(1 − N/K)', options: { superscript: true } }], { x: 0.6, y: 5.85, w: 7.2, h: 0.7, fontFace: F.math, italic: true, fontSize: 30, color: C.agar })
  mono(s, 'THE RICKER MAP (1954). OUR “BREED ONCE A YEAR” SWITCH.', { x: 0.6, y: 6.6, w: 7.2, h: 0.3 })
  body(s, 'Insects that breed once a season cannot adjust mid-year. A boom year’s crowding only hits the next generation, all at once, so the population overcorrects.', { x: 8.2, y: 2.05, w: 4.53, h: 1.3, fontSize: 13 })
  const regimes = [['r < 1', 'settles smoothly'], ['1 – 2', 'overshoots, then settles'], ['2 – 2.53', 'boom, bust, boom, bust'], ['2.53 – 2.69', 'cycles of 4, 8, 16 years'], ['> 2.69', 'chaos: never repeats']]
  regimes.forEach(([r, what], i) => {
    const y = 3.5 + i * 0.44
    mono(s, r, { x: 8.2, y, w: 1.4, h: 0.35, fontSize: 11, color: i === 4 ? C.saf : C.agar, bold: true })
    body(s, what, { x: 9.65, y, w: 3.1, h: 0.35, fontSize: 12.5 })
  })
  body(s, 'Robert May showed this in 1976. In 1997 Costantino and colleagues found chaos in real flour-beetle (Tribolium) cultures.', { x: 8.2, y: 5.85, w: 4.53, h: 1.1, fontSize: 12.5, color: C.muted })
  s.addNotes('When generations do not overlap, the model becomes a difference equation. Past r of about 2.69 its behaviour is chaotic: fully deterministic, but tiny differences in starting size lead to completely different futures. The bars are our Insects preset at r = 2.8. The regime thresholds come straight from our simulator’s code.')
}

// 20 · cod
{
  const s = frame('Specimen 16 · Northern cod, 1992')
  headline(s, 'HARVEST THE CURVE, NOT THE STOCK')
  const efforts = range(0, 1, 0.05)
  s.addChart(pres.charts.LINE, [{ name: 'Sustainable catch per year (K = 1,000, r = 0.5)', labels: efforts.map((e) => e.toFixed(2)), values: efforts.map((e) => +(0.5 * 1000 * e * (1 - e)).toFixed(1)) }],
    chartOpts({ x: 0.6, y: 2.0, w: 6.9, h: 4.2, chartColors: [C.agar], catAxisLabelFrequency: 4, valAxisMinVal: 0, catAxisTitle: 'Fishing effort, as a share of r', showCatAxisTitle: true, catAxisTitleColor: C.muted, catAxisTitleFontFace: F.mono, catAxisTitleFontSize: 10 }))
  T(s, 'yield = rK · e(1 − e)', { x: 0.6, y: 6.35, w: 6.9, h: 0.6, fontFace: F.math, italic: true, fontSize: 24, color: C.agar })
  body(s, 'Fishing at a steady effort removes a fixed share of the stock every year. The biggest catch that can last forever comes from holding the stock at K/2, where it regrows fastest: the maximum sustainable yield.', { x: 7.9, y: 2.05, w: 4.83, h: 1.5, fontSize: 13 })
  body(s, 'Cod take around six years to mature, and big old females lay far more eggs than young ones. Decades of heavy fishing removed them faster than the stock could replace them.', { x: 7.9, y: 3.6, w: 4.83, h: 1.3, fontSize: 13 })
  stat(s, 7.9, 5.0, 4.83, 'JULY 2, 1992', 'CANADA CLOSES THE NORTHERN COD FISHERY. TENS OF THOUSANDS LOSE THEIR JOBS. THE STOCK HAS STILL NOT FULLY RECOVERED.', C.saf, 36)
  s.addNotes('With constant fishing effort the equilibrium stock is K times (1 − effort), so the long-run catch is a parabola in effort that peaks at half of r. Push effort to r and the equilibrium is zero. Real fisheries are worse than the model because biology is slow: late maturity and the loss of the most fertile old fish. Our Fishery preset shows the stock settling at K/2.')
}

// 21 · section: simulation
section('04', 'THE SIMULATION', 'we may have overdone it', 'bg_colonies_ink.jpg', true).addNotes('Section four: the thing we actually built.')

// 22 · trailer
{
  const s = frame('Specimen 17 · The trailer')
  headline(s, 'WE MADE A LAUNCH VIDEO\nFOR A HOMEWORK ASSIGNMENT', { h: 1.9, fontSize: 48 })
  const cover = 'data:image/png;base64,' + readFileSync(img('trailer_cover.png')).toString('base64')
  s.addMedia({ type: 'video', path: TRAILER, cover, x: 0.6, y: 2.95, w: 7.2, h: 4.05 })
  body(s, 'Sixty-six seconds, 60 frames per second. Headless Chrome drove the real app one frame at a time on a frozen clock; a Python renderer added the camera, cursor and captions; ffmpeg stitched it together.', { x: 8.2, y: 2.95, w: 4.53, h: 2.0, fontSize: 13.5 })
  stat(s, 8.2, 5.0, 4.53, '3,674', 'FRAMES CAPTURED, EVERY ONE DETERMINISTIC', C.agar, 48)
  s.addNotes('Click to play. The trailer is a real screen capture of the app, rendered frame by frame so animations are perfectly smooth.')
}

// 23 · tour
{
  const s = frame('Specimen 18 · The control panel')
  headline(s, 'FOUR TABS, ZERO CHILL')
  const tabs = [
    ['tab_scenarios_crop.png', 'SCENARIOS', '7 presets from real history, plus a random-world button.', C.agar],
    ['tab_basics_crop.png', 'BASICS', 'K, r, starting population and time span.', C.vio],
    ['tab_realism_crop.png', 'REALISM', '6 switches that break the textbook assumptions.', C.saf],
    ['tab_disturb_crop.png', 'DISTURB', '15 buttons, from harvests to meteors.', C.agar],
  ]
  tabs.forEach(([file, name, text, color], i) => {
    const x = 0.6 + i * 3.1
    card(s, x, 2.0, 2.93, 4.95)
    s.addImage({ path: img(file), x: x + 0.15, y: 2.15, w: 2.63, h: 3.63 })
    T(s, name, { x: x + 0.2, y: 5.92, w: 2.6, h: 0.45, fontFace: F.display, fontSize: 22, color })
    body(s, text, { x: x + 0.2, y: 6.38, w: 2.6, h: 0.55, fontSize: 11 })
  })
  s.addNotes('The requirement was controls for K and r. The Basics tab covers that. The other three tabs are where it gets out of hand.')
}

// 24 · watch it move
{
  const s = frame('Specimen 19 · Live updates')
  headline(s, 'DRAG K. THE CEILING MOVES.')
  card(s, 0.6, 2.0, 6.2, 4.3)
  s.addImage({ path: img('scurve.gif'), x: 0.75, y: 2.15, w: 5.9, h: 3.8 })
  mono(s, 'PLAYBACK: THE S CURVE DRAWS ITSELF IN REAL TIME.', { x: 0.75, y: 6.45, w: 5.9, h: 0.3 })
  card(s, 7.0, 2.0, 5.73, 2.9)
  s.addImage({ path: img('slider.gif'), x: 7.15, y: 2.15, w: 5.43, h: 2.5 })
  mono(s, 'DRAGGING K AND r REDRAWS EVERY CHART INSTANTLY.', { x: 7.15, y: 5.05, w: 5.43, h: 0.3 })
  voice(s, 'The assignment said “observe live updates to the S curve.” It updates about sixty times a second.', { x: 7.15, y: 5.55, w: 5.43, h: 1.2, fontSize: 20, color: C.agar })
  s.addNotes('Both clips are straight from the capture used for the trailer. Every slider recomputes the full simulation (tens of thousands of steps) on every drag.')
}

// 25 · weird science
{
  const s = frame('Specimen 20 · The buttons nature would never allow')
  headline(s, 'EVERY STUPID BUTTON IS A LESSON')
  const rows = [
    ['TRIBBLE MODE', C.agar, 'r doubles and crowding is ignored: overshoot, then correction.'],
    ['MOOD KILLER', C.vio, 'Births stop, so per-capita growth goes negative.'],
    ['CLONING ACCIDENT', C.saf, 'N doubles but K does not: crowding pulls it back.'],
    ['TIME WARP', C.agar, 'Rewinds N: K, not history, sets the endpoint.'],
    ['FERTILIZER BLOOM', C.vio, 'K × 2.5 for a while: a boom, then a bust (like algal blooms).'],
    ['MINI ICE AGE', C.saf, 'K shrinks by up to 65%: climate sets carrying capacity.'],
    ['INVENT FARMING', C.agar, 'K × 2, forever. What humans actually did.'],
    ['METEOR STRIKE', C.vio, 'Density-independent: 95% die and K halves.'],
    ['PLAGUE', C.saf, 'Density-dependent: deaths scale with N/K.'],
    ['RELEASE PREDATORS', C.agar, 'A type II predator pit that traps small populations.'],
  ]
  rows.forEach(([name, color, text], i) => {
    const x = 0.6 + (i % 2) * 6.1
    const y = 2.0 + Math.floor(i / 2) * 1.0
    card(s, x, y, 5.95, 0.85, C.card)
    T(s, name, { x: x + 0.2, y: y + 0.16, w: 2.45, h: 0.55, fontFace: F.display, fontSize: 20, color, valign: 'middle' })
    body(s, text, { x: x + 2.7, y: y + 0.1, w: 3.1, h: 0.65, fontSize: 11.5, valign: 'middle' })
  })
  s.addNotes('The buttons look like jokes, but each one changes exactly one term in the model: r, N or K. Watching the population respond is the fastest way to build intuition for which term does what.')
}

// 26 · section: methods
section('05', 'THE METHODS', 'how the simulator actually thinks', 'bg_colonies_saf.jpg', false).addNotes('Section five: the numerical methods behind the app.')

// 27 · protocol
{
  const s = frame('Specimen 21 · Protocol')
  headline(s, 'HOW THE SIMULATOR THINKS')
  const steps = [
    ['Slice time into 16,000–40,000 tiny steps, about 60 per day, hour or year on screen.'],
    ['Each step, compute growth per individual: g = r(1 − N(t−τ)/K(t)), then apply Allee, harvest and predator terms.'],
    ['Advance with Euler’s method, N ← N·(1 + g·Δt). Breed-once-a-year mode uses the Ricker map, N ← N·e^g.'],
    ['Random chance draws births and deaths from Poisson distributions, eight seeded runs at once, so luck is reproducible.'],
    ['Disturbances fire at the exact step where you pressed the button.'],
    ['Equilibria: scan dN/dt for sign changes, refine by bisection, and judge stability from the slope.'],
  ]
  steps.forEach(([text], i) => {
    const y = 2.0 + i * 0.82
    T(s, pad2(i + 1), { x: 0.6, y, w: 0.9, h: 0.7, fontFace: F.display, fontSize: 36, color: [C.agar, C.saf, C.vio][i % 3] })
    body(s, text, { x: 1.5, y: y + 0.08, w: 5.3, h: 0.72, fontSize: 13 })
  })
  card(s, 7.2, 2.0, 5.53, 4.95)
  s.addImage({ path: img('analysis_rate.png'), x: 7.35, y: 2.15, w: 5.23, h: 2.34 })
  s.addImage({ path: img('analysis_percap.png'), x: 7.35, y: 4.55, w: 5.23, h: 2.51 })
  s.addNotes('Everything runs in the browser in plain JavaScript. Forward Euler with a small step is accurate enough here and fast enough to rerun on every slider drag. The equilibrium finder powers the arrows and dots on the analysis charts at right.')
}

// 28 · six switches
{
  const s = frame('Specimen 22 · The six realism switches')
  headline(s, 'SIX WAYS TO BREAK THE TEXTBOOK')
  const sw = [
    ['TIME LAG', C.saf, 'dN/dt = rN(1 − N(t−τ)/K)', 'Hutchinson, 1948. Smooth if rτ < 1/e; overshoots and settles below π/2; cycles forever above it.'],
    ['RANDOM CHANCE', C.agar, 'births, deaths ~ Poisson', 'Demographic stochasticity: small populations can die out through sheer bad luck.'],
    ['ALLEE EFFECT', C.vio, 'g × (N − A)/(N + A)', 'Below A, too few to find mates: growth turns negative.'],
    ['SEASONS', C.saf, 'K(t) = K[1 + a·sin(2πt/P)] + noise', 'Carrying capacity rises and falls; the population chases it and always lags behind.'],
    ['ONE GENERATION A YEAR', C.agar, 'N′ = N·e^(r(1 − N/K))', 'Ricker map. Past r ≈ 2.69 it turns chaotic.'],
    ['HARVEST', C.vio, 'g − E·r', 'Constant-effort fishing. Maximum sustainable yield at E = ½, stock at K/2.'],
  ]
  sw.forEach(([name, color, eq, text], i) => {
    const x = 0.6 + (i % 3) * 4.1
    const y = 2.0 + Math.floor(i / 3) * 2.52
    card(s, x, y, 3.93, 2.35)
    T(s, name, { x: x + 0.25, y: y + 0.2, w: 3.5, h: 0.5, fontFace: F.display, fontSize: 22, color })
    T(s, eq, { x: x + 0.25, y: y + 0.78, w: 3.5, h: 0.45, fontFace: F.math, italic: true, fontSize: 15, color: C.white })
    body(s, text, { x: x + 0.25, y: y + 1.3, w: 3.45, h: 0.95, fontSize: 11.5, color: C.muted })
  })
  s.addNotes('Each switch removes one assumption of the classic model: instant feedback, no randomness, no mate limitation, constant K, overlapping generations and no harvest. The formulas are the exact terms the simulator adds.')
}

// 29 · build
{
  const s = frame('Specimen 23 · Build')
  headline(s, 'THE HTML FILE IS 17 LINES LONG')
  const stats = [['17', 'LINES OF HTML', C.agar], ['4,870', 'LINES OF REACT, JS & CSS', C.saf], ['20', 'SOURCE FILES', C.vio], ['0', 'BACKEND SERVERS', C.agar]]
  stats.forEach(([n, label, color], i) => stat(s, 0.6 + (i % 2) * 2.9, 2.05 + Math.floor(i / 2) * 1.75, 2.7, n, label, color, 56))
  mono(s, 'REACT 18 · VITE · GITHUB PAGES · CONTENT-HASHED CACHING\nTRAILER: PLAYWRIGHT · PILLOW · FFMPEG\nTHIS DECK: PPTXGENJS, CHARTS COMPUTED BY THE APP’S OWN SIM.JS', { x: 0.6, y: 5.75, w: 5.6, h: 1.0, color: C.white, lineSpacingMultiple: 1.3 })
  card(s, 6.55, 2.0, 6.18, 4.2)
  s.addImage({ path: img('ui_dark.jpg'), x: 6.7, y: 2.15, w: 5.88, h: 3.675 })
  voice(s, 'Dark mode. Obviously.', { x: 6.7, y: 6.35, w: 5.88, h: 0.6, fontSize: 24, color: C.agar })
  s.addNotes('The site is a static React app built with Vite and hosted on GitHub Pages. There is no server: every simulation runs in the browser. Even the charts in this presentation were computed by importing the simulator’s JavaScript directly.')
}

// 30 · references
{
  const s = frame('Specimen 24 · Sources')
  headline(s, 'SOURCES')
  const refs = [
    'Malthus, T. R. (1798). An Essay on the Principle of Population.',
    'Verhulst, P.-F. (1838). Notice sur la loi que la population suit dans son accroissement.',
    'Darwin, C. (1872). On the Origin of Species, 6th ed.',
    'Carlson, T. (1913). Über Geschwindigkeit und Grösse der Hefevermehrung in Würze. Biochem. Z.',
    'Pearl, R. & Reed, L. J. (1920). On the rate of growth of the population of the United States. PNAS 6.',
    'Pearl, R. (1927). The growth of populations. Q. Rev. Biol. 2.',
    'Gause, G. F. (1934). The Struggle for Existence.',
    'Hutchinson, G. E. (1948). Circular causal systems in ecology. Ann. N.Y. Acad. Sci. 50.',
    'Ricker, W. E. (1954). Stock and recruitment. J. Fish. Res. Board Can. 11.',
    'Holling, C. S. (1959). Some characteristics of simple types of predation and parasitism. Can. Entomol. 91.',
    'Calhoun, J. B. (1962). Population density and social pathology. Sci. Am. 206.',
    'MacArthur, R. H. & Wilson, E. O. (1967). The Theory of Island Biogeography.',
    'Klein, D. R. (1968). The introduction, increase, and crash of reindeer on St. Matthew Island. J. Wildl. Manage. 32.',
    'May, R. M. (1976). Simple mathematical models with very complicated dynamics. Nature 261.',
    'Costantino, R. F. et al. (1997). Chaotic dynamics in an insect population. Science 275.',
  ]
  const half = Math.ceil(refs.length / 2)
  ;[refs.slice(0, half), refs.slice(half)].forEach((col, i) => {
    T(s, col.map((text, j) => ({ text, options: { breakLine: j < col.length - 1 } })), { x: 0.6 + i * 6.15, y: 2.05, w: 5.95, h: 4.9, fontSize: 12.5, color: C.muted, paraSpaceAfter: 10 })
  })
  s.addNotes('Primary sources for every claim in the deck. Scenario parameters in the simulator are illustrative unless a source is given.')
}

// 31 · end
{
  const s = frame('Fin', { bg: 'bg_end.jpg' })
  T(s, 'EVERY POPULATION\nMEETS ITS K.', { x: 0.6, y: 2.4, w: 11, h: 3.2, fontFace: F.display, fontSize: 104, lineSpacingMultiple: 0.82 })
  voice(s, 'This project did not.', { x: 0.62, y: 5.6, w: 8, h: 0.7, fontSize: 36, color: C.agar })
  mono(s, 'TRY IT: EARTH1283.GITHUB.IO/LOGISTIC-GROWTH', { x: 0.6, y: 6.9, w: 8, h: 0.3, color: C.white, fontSize: 12 })
  s.addNotes('Thanks. The simulator is live at earth1283.github.io/logistic-growth. Questions welcome, especially about the meteor.')
}

if (count !== TOTAL) throw new Error(`deck has ${count} slides, expected ${TOTAL}`)
await pres.writeFile({ fileName: OUT })
console.log(`wrote ${OUT} (${count} slides)`)
