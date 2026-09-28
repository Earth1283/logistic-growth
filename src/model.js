export const EVENT_KINDS = {
  harvest: {
    label: 'Harvest 60%',
    short: 'Harvest',
    apply: (s) => ({ ...s, n: s.n * 0.4 }),
  },
  migrants: {
    label: 'Add migrants',
    short: 'Migrants',
    apply: (s) => ({ ...s, n: s.n + 0.5 * s.k }),
  },
  shrink: {
    label: 'Shrink habitat',
    short: 'Habitat lost',
    apply: (s) => ({ ...s, k: s.k * 0.6 }),
  },
  restore: {
    label: 'Restore habitat',
    short: 'Habitat restored',
    apply: (s, baseK) => ({ ...s, k: baseK }),
  },
}

export function logisticAt(n0, k, r, dt) {
  if (n0 <= 0) return 0
  return k / (1 + ((k - n0) / n0) * Math.exp(-r * dt))
}

export function buildSegments({ K, r, N0, events }) {
  const sorted = [...events].sort((a, b) => a.t - b.t)
  const segments = []
  let state = { t: 0, n: N0, k: K }
  for (const event of sorted) {
    segments.push({ ...state, end: event.t })
    const n = logisticAt(state.n, state.k, r, event.t - state.t)
    state = { ...EVENT_KINDS[event.kind].apply({ n, k: state.k }, K), t: event.t }
  }
  segments.push({ ...state, end: Infinity })
  return segments
}

export function stateAt(segments, r, t) {
  let seg = segments[0]
  for (const s of segments) if (s.t <= t) seg = s
  const n = logisticAt(seg.n, seg.k, r, t - seg.t)
  return { n, k: seg.k, rate: r * n * (1 - n / seg.k) }
}

export function sampleTrajectory(segments, r, tMax, count = 480) {
  const points = []
  for (const seg of segments) {
    if (seg.t > tMax) break
    const end = Math.min(seg.end, tMax)
    const steps = Math.max(2, Math.ceil(((end - seg.t) / tMax) * count))
    for (let i = 0; i <= steps; i++) {
      const t = seg.t + ((end - seg.t) * i) / steps
      points.push({ t, n: logisticAt(seg.n, seg.k, r, t - seg.t), k: seg.k })
    }
  }
  return points
}

export function keyFigures({ K, r, N0, tMax }) {
  const ratio = (K - N0) / N0
  return {
    peakRate: (r * K) / 4,
    halfK: K / 2,
    inflectionT: ratio > 1 ? Math.log(ratio) / r : null,
    doublingT: Math.LN2 / r,
    t95: ratio > 0 ? Math.max(0, Math.log(19 * ratio) / r) : 0,
    recoveryT: 1 / r,
    expAtEnd: N0 * Math.exp(r * tMax),
  }
}

export function growthPhase(n, k) {
  const f = n / k
  if (f < 0.1) return 'Early growth, nearly exponential'
  if (f < 0.5) return 'Accelerating'
  if (f < 0.95) return 'Slowing as resources tighten'
  if (f <= 1.05) return 'At carrying capacity'
  return 'Above capacity, declining'
}

export function fmt(x, digits = 0) {
  return x.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function fmtRate(x) {
  const a = Math.abs(x)
  const digits = a >= 100 ? 0 : a >= 10 ? 1 : 2
  const sign = x > 0.005 ? '+' : x < -0.005 ? '−' : ''
  return sign + fmt(a, digits)
}

export function sci(x) {
  if (x < 1e6) return { text: fmt(x) }
  const exp = Math.floor(Math.log10(x))
  return { mantissa: (x / 10 ** exp).toFixed(1), exp }
}
