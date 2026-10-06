import { fmt } from './model.js'

const PHASES = {
  start: [
    'In the beginning there were {n}. They did not ask to be counted.',
    '{n} of them, and every one of them already knows how this ends.',
    'We join the population at the start. The start is the only kind part.',
  ],
  early: [
    'They multiply without ceremony. Nothing has told them to stop yet.',
    'Growth, unchecked. The dish is vast. The dish is patient.',
    'Each one becomes two. Neither of them was consulted.',
  ],
  accelerating: [
    'The curve steepens. It does not feel joy. It feels momentum.',
    'Faster now. Somewhere, a resource has begun to sweat.',
    'They are doing it again, and again, and nobody is watching but us.',
  ],
  slowing: [
    'The walls of the dish are closing in. Nobody told them there were walls.',
    'Each birth now costs something. The ledger has begun to open.',
    'They sense the ceiling. They cannot name it. They feel it in their dots.',
  ],
  capacity: [
    'Equilibrium. They are not happy. They are merely balanced.',
    'Carrying capacity. A number that was always waiting for them.',
    'Stillness. Births equal deaths. The dish hums a single flat note.',
  ],
  over: [
    'More than the world can hold. The world has noticed.',
    'Above capacity. This is borrowed time, and the lender is patient.',
    'Too many. The dish exhales. Someone will pay.',
  ],
  shrinking: [
    'Something is taking them. The math says this is fine.',
    'Numbers fall. The survivors will not be told why.',
    'A decline. Gentle, procedural, and entirely without malice.',
  ],
  recovering: [
    'They rebuild. They remember nothing and begin again anyway.',
    'Slowly, the dots return. Hope is just exponential growth with good PR.',
    'The survivors multiply, unaware they are survivors.',
  ],
  extinct: [
    'Extinct. The dish is quiet. The dish was always going to be quiet.',
    'None remain. The graph continues without them, as graphs do.',
    'Zero. A very clean number. It asks for nothing.',
  ],
}

const EVENTS = {
  harvest: 'A harvest. The survivors will remember. They have no memory, but they will remember.',
  migrants: 'Strangers arrive. They were promised a habitat. They were lied to.',
  shrink: 'The habitat shrinks. The edges of the world are now closer than they were.',
  restore: 'The habitat returns. It does not apologize.',
  meteor: 'A meteor. The sky has opinions, and they are final.',
  plague: 'A plague, proportional to how crowded they were. Closeness was the crime.',
  predators: 'Predators released. They are not cruel. They are simply hungry, forever.',
  tribbles: 'Tribble mode. They have stopped caring about crowding. Crowding has not stopped caring about them.',
  mood: 'Nobody is in the mood. The population is, briefly, an idea instead of a plan.',
  clones: 'Everyone is duplicated. Every one of them is now somebody else’s copy.',
  timewarp: 'Time folds. The population is where it was. It feels like déjà vu, if dots could.',
  fertilizer: 'Fertilizer blooms. A feast with an expiry date printed on the underside.',
  iceAge: 'The ice comes slowly. It is in no hurry. It has never been in a hurry.',
  farming: 'They invented farming. This is how the long arguments begin.',
}

const UNIT_ASIDES = {
  album: [
    'Taylor Swift album {t}. Somewhere, a vault is quietly opened.',
    'Taylor Swift album {t}. They re-recorded themselves. It was not the same.',
    'Taylor Swift album {t}. The population has entered a new era. It was always going to.',
  ],
  microwave: [
    'Microwave minute {t}. Something inside is rotating, and it knows.',
    'Microwave minute {t}. The plate turns. Nobody opens the door.',
    'Microwave minute {t}. 0:03 remaining. It will beep. They will not be ready.',
  ],
  school: [
    'School day {t}. A bell rings. Nobody here can explain why.',
    'School day {t}. Attendance is mandatory and so, apparently, is mitosis.',
    'School day {t}. There will be a quiz on this. It will be about them.',
  ],
}

const RECENT = 0.04

const hash = (text) => {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

const pick = (list, seed) => list[hash(seed) % list.length]

const fill = (line, values) => line.replace(/\{(\w+)\}/g, (_, key) => values[key])

function phaseOf({ n, k, rate, t, tMax, peak }) {
  if (n <= 0) return 'extinct'
  if (t < tMax * 0.01) return 'start'
  const share = n / k
  if (share > 1.05) return 'over'
  if (rate < 0 && share < 0.95) return 'shrinking'
  if (share >= 0.95) return 'capacity'
  if (share < 0.1) return 'early'
  if (share < 0.5) return 'accelerating'
  return rate > 0 && peak > n * 1.5 ? 'recovering' : 'slowing'
}

export function narrate({ now, t, p, events, sceneKey, peak }) {
  const values = { n: fmt(now.n), t: fmt(t, 0) }
  const recent = [...events].reverse().find((e) => e.t <= t && t - e.t <= p.tMax * RECENT)
  const phase = phaseOf({ n: now.n, k: now.k, rate: now.rate, t, tMax: p.tMax, peak })

  const main = recent && phase !== 'extinct'
    ? EVENTS[recent.kind]
    : fill(pick(PHASES[phase], `${sceneKey}-${phase}`), values)

  const asides = UNIT_ASIDES[p.unit]
  const bucket = Math.floor((t / p.tMax) * 10)
  const aside = asides && now.n > 0 ? fill(pick(asides, `${sceneKey}-${bucket}`), values) : null

  return { main, aside }
}

export function peakCurve(sim) {
  const run = sim.runs[0]
  const out = new Float64Array(run.length)
  let peak = 0
  for (let i = 0; i < run.length; i++) {
    peak = Math.max(peak, run[i])
    out[i] = peak
  }
  return out
}
