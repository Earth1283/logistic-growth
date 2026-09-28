import { EVENT_KINDS } from './model.js'

export const RUNS = 8
const STEPS_CONTINUOUS = 16000
const EXTINCT_BELOW = 0.5
const BOOM_FACTOR = 3

export function mulberry32(seed) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function gaussian(rand) {
  return Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand())
}

function poisson(rand, lambda) {
  if (lambda <= 0) return 0
  if (lambda > 30) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * gaussian(rand)))
  const floor = Math.exp(-lambda)
  let k = 0
  let product = rand()
  while (product > floor) {
    k++
    product *= rand()
  }
  return k
}

export const delayRegimes = (r) => [
  { to: 1 / Math.E / r, tone: 0, label: 'Smooth rise', note: 'Crowding responds fast enough to stop growth right at K.' },
  { to: Math.PI / 2 / r, tone: 1, label: 'Overshoots, then settles', note: 'The population sails past K, then swings back in shrinking waves.' },
  { to: Infinity, tone: 3, label: 'Boom and bust forever', note: 'The swings never die down. Deep crashes can wipe the population out.' },
]

export const discreteRegimes = [
  { to: 1, tone: 0, label: 'Settles smoothly', note: 'Each generation lands a little closer to K.' },
  { to: 2, tone: 1, label: 'Overshoots, then settles', note: 'Generations bounce above and below K, but the bounces shrink.' },
  { to: 2.526, tone: 2, label: 'Alternates between two sizes', note: 'A boom year is always followed by a bust year, forever.' },
  { to: 2.692, tone: 2, label: 'Cycles of 4, 8, 16 years', note: 'The cycle keeps doubling in length as r rises.' },
  { to: Infinity, tone: 3, label: 'Chaos: never repeats', note: 'Tiny differences in starting size lead to completely different futures.' },
]

export const regimeFor = (regimes, x) => regimes.find((b) => x < b.to) ?? regimes[regimes.length - 1]

export const predatorPressure = (K, r) => ({ maxKill: 0.22 * r * K, halfSaturation: 0.1 * K })

export function growthModel(p, events) {
  const booms = events.filter((e) => e.kind === 'boom')
  const predatorsFrom = Math.min(...events.filter((e) => e.kind === 'predators').map((e) => e.t))
  const A = p.allee.on ? p.allee.A : 0
  const harvest = p.harvest.on ? p.harvest.effort * p.r : 0
  const { maxKill, halfSaturation } = predatorPressure(p.K, p.r)

  const rAt = (t) => (booms.some((e) => t >= e.t && t < e.t + e.amount) ? p.r * BOOM_FACTOR : p.r)

  const perCapita = (n, nLag, k, t) => {
    let g = rAt(t) * (1 - nLag / k)
    if (A > 0) {
      const allee = (n - A) / (n + A)
      g = g >= 0 ? g * allee : g * Math.abs(allee)
    }
    g -= harvest
    if (t >= predatorsFrom) g -= maxKill / (n + halfSaturation)
    return g
  }

  const change = p.discrete.on
    ? (n, nLag, k, t) => n * Math.expm1(perCapita(n, nLag, k, t))
    : (n, nLag, k, t) => n * perCapita(n, nLag, k, t)

  return { perCapita, change, rAt, predatorsFrom }
}

function eventsByStep(events, dt, steps) {
  const map = new Map()
  for (const e of [...events].sort((a, b) => a.t - b.t || a.id - b.id)) {
    const i = Math.round(e.t / dt)
    if (i > steps) continue
    if (!map.has(i)) map.set(i, [])
    map.get(i).push(e)
  }
  return map
}

function capacityTimeline(p, byStep, dt, steps) {
  const K = new Float64Array(steps + 1)
  const base = new Float64Array(steps + 1)
  const season = p.season.on ? p.season : null
  const spacing = season ? season.period / 2 : 1
  const rand = mulberry32(p.seed * 7919 + 13)
  const knots =
    season && season.noise > 0
      ? Array.from({ length: Math.ceil((steps * dt) / spacing) + 2 }, () => rand() * 2 - 1)
      : null

  let k = p.K
  for (let i = 0; i <= steps; i++) {
    for (const e of byStep.get(i) ?? []) {
      const kind = EVENT_KINDS[e.kind]
      if (kind.k) k = kind.k(k, e.amount, p.K)
    }
    let factor = 1
    if (season) {
      const t = i * dt
      factor += season.amp * Math.sin((2 * Math.PI * t) / season.period)
      if (knots) {
        const x = t / spacing
        const j = Math.floor(x)
        const blend = (1 - Math.cos(Math.PI * (x - j))) / 2
        factor += season.noise * (knots[j] * (1 - blend) + knots[j + 1] * blend)
      }
    }
    base[i] = k
    K[i] = k * Math.max(0.05, factor)
  }
  return { K, base }
}

export function simulate(p, events) {
  const discrete = p.discrete.on
  const dt = discrete ? 1 : p.tMax / STEPS_CONTINUOUS
  const steps = Math.round(p.tMax / dt)
  const visible = events.filter((e) => e.t <= p.tMax)
  const model = growthModel(p, visible)
  const byStep = eventsByStep(visible, dt, steps)
  const { K, base } = capacityTimeline(p, byStep, dt, steps)
  const lagSteps = p.lag.on ? Math.round(p.lag.tau / dt) : 0
  const turnover = p.chance.on ? p.chance.level * (discrete ? 2 : 5 * p.r) * dt : 0
  const log = []

  const run = (rand, record) => {
    const N = new Float64Array(steps + 1)
    let n = p.N0
    for (let i = 0; i <= steps; i++) {
      for (const e of byStep.get(i) ?? []) {
        const kind = EVENT_KINDS[e.kind]
        const before = n
        if (kind.n) n = kind.n(n, K[i], e.amount)
        if (rand) n = Math.round(n)
        if (n < EXTINCT_BELOW) n = 0
        if (record) log.push({ ...e, before, after: n, kBefore: K[Math.max(0, i - 1)], kAfter: K[i] })
      }
      N[i] = n
      if (i === steps) break

      const t = i * dt
      const nLag = i >= lagSteps ? N[i - lagSteps] : p.N0
      const g = model.perCapita(n, nLag, K[i], t)
      const net = discrete ? Math.expm1(g) : g * dt
      if (rand) {
        const births = poisson(rand, n * (turnover + Math.max(net, 0)))
        const deaths = Math.min(n, poisson(rand, n * (turnover + Math.max(-net, 0))))
        n += births - deaths
      } else {
        n = Math.max(0, n * (1 + net))
      }
      if (n < EXTINCT_BELOW) n = 0
    }
    return N
  }

  const det = run(null, !p.chance.on)
  const runs = p.chance.on
    ? Array.from({ length: RUNS }, (_, j) => run(mulberry32(p.seed * 104729 + j * 7 + 1), j === 0))
    : [det]

  return { dt, steps, discrete, lagSteps, K, baseK: base, runs, det, log, model, eventSteps: [...byStep.keys()] }
}

export function valueAt(arr, x) {
  const i = Math.min(Math.floor(x), arr.length - 1)
  const j = Math.min(i + 1, arr.length - 1)
  return arr[i] + (arr[j] - arr[i]) * (x - i)
}

export function stepAt(sim, t) {
  const x = Math.min(sim.steps, Math.max(0, t / sim.dt))
  return sim.discrete ? Math.floor(x + 1e-9) : x
}

export function stateAt(sim, p, t) {
  const x = stepAt(sim, t)
  const n = valueAt(sim.runs[0], x)
  const k = valueAt(sim.K, x)
  const nLag = x >= sim.lagSteps ? valueAt(sim.runs[0], x - sim.lagSteps) : p.N0
  const alive = sim.runs.map((N) => valueAt(N, x)).filter((v) => v > 0)
  return {
    n,
    k,
    baseK: sim.baseK[Math.floor(x)],
    perCapita: sim.model.perCapita(n, nLag, k, t),
    rate: n > 0 ? sim.model.change(n, nLag, k, t) : 0,
    runsAlive: alive.length,
    runsMin: alive.length ? Math.min(...alive) : 0,
    runsMax: alive.length ? Math.max(...alive) : 0,
  }
}

export function figures(sim, p) {
  const { det: N, K, dt, steps } = sim
  const jumps = new Set(sim.eventSteps)
  let peak = 0
  let peakT = 0
  let fastest = 0
  let fastestT = null
  let reach95T = null
  for (let i = 0; i <= steps; i++) {
    if (N[i] > peak) {
      peak = N[i]
      peakT = i * dt
    }
    if (reach95T === null && N[i] >= 0.95 * K[i]) reach95T = i * dt
    if (i < steps && !jumps.has(i + 1) && N[i + 1] - N[i] > fastest) {
      fastest = N[i + 1] - N[i]
      fastestT = (i + 0.5) * dt
    }
  }

  const tailStart = Math.floor(steps * 0.75)
  let min = Infinity
  let max = 0
  let sum = 0
  for (let i = tailStart; i <= steps; i++) {
    min = Math.min(min, N[i])
    max = Math.max(max, N[i])
    sum += N[i]
  }
  const mean = sum / (steps - tailStart + 1)

  let extinctT = null
  if (N[steps] === 0) {
    let i = steps
    while (i > 0 && N[i - 1] === 0) i--
    extinctT = i * dt
  }

  let outcome
  if (extinctT !== null) outcome = { kind: 'extinct', t: extinctT }
  else if (N[steps] < 0.9 * K[steps] && min >= N[tailStart] * 0.999 && max <= N[steps] * 1.001) outcome = { kind: 'climbing' }
  else if ((max - min) / Math.max(mean, 1) < 0.06) outcome = { kind: 'settles', n: mean }
  else outcome = { kind: 'swings', min, max }

  return {
    peak,
    peakT,
    fastestT,
    fastestRate: fastest / dt,
    reach95T,
    outcome,
    doublingT: Math.LN2 / p.r,
    recoveryT: 1 / p.r,
    expAtEnd: p.N0 * Math.exp(p.r * p.tMax),
    extinctRuns: sim.runs.filter((R) => R[steps] === 0).length,
    runCount: sim.runs.length,
  }
}

export function equilibria(change, xMax, discrete, lagTau) {
  const samples = 600
  const found = []
  const slope = (n) => (change(n + xMax * 1e-5) - change(Math.max(0, n - xMax * 1e-5))) / (xMax * 2e-5)
  const stable = (n) => {
    const s = slope(n)
    if (discrete) return Math.abs(1 + s) < 1
    return s < 0 && -s * lagTau < Math.PI / 2
  }
  let prevN = xMax / samples / 10
  let prevF = change(prevN)
  for (let i = 1; i <= samples; i++) {
    const n = (xMax * i) / samples
    const f = change(n)
    if (Math.sign(f) !== Math.sign(prevF) && prevF !== 0) {
      let lo = prevN
      let hi = n
      for (let j = 0; j < 40; j++) {
        const mid = (lo + hi) / 2
        if (Math.sign(change(mid)) === Math.sign(prevF)) lo = mid
        else hi = mid
      }
      const root = (lo + hi) / 2
      found.push({ n: root, stable: stable(root) })
    }
    prevN = n
    prevF = f
  }
  const zeroTrap = change(xMax * 1e-4) < 0
  return [{ n: 0, stable: zeroTrap }, ...found]
}
