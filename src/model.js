export const UNITS = {
  hour: { one: 'hour', many: 'hours' },
  day: { one: 'day', many: 'days' },
  week: { one: 'week', many: 'weeks' },
  year: { one: 'year', many: 'years' },
  album: { one: 'Taylor Swift album', many: 'Taylor Swift albums' },
  microwave: { one: 'microwave minute', many: 'microwave minutes' },
  school: { one: 'school day', many: 'school days' },
}

export const cap = (s) => s[0].toUpperCase() + s.slice(1)

const span = (a, unit) => `${fmt(a, 1)} ${UNITS[unit].many}`

export const EVENT_KINDS = {
  harvest: {
    group: 'disturb',
    button: (a) => `Harvest ${fmt(a * 100)}%`,
    short: 'Harvest',
    what: (a) => `Removed ${fmt(a * 100)}% of the population at once, like a hunting season or a cull.`,
    n: (n, k, a) => n * (1 - a),
  },
  migrants: {
    group: 'disturb',
    button: (a) => `Add ${fmt(a)} migrants`,
    short: 'Migrants',
    what: (a) => `${fmt(a)} newcomers arrived from outside the habitat.`,
    n: (n, k, a) => n + a,
  },
  shrink: {
    group: 'disturb',
    button: (a) => `Destroy ${fmt(a * 100)}% of habitat`,
    short: 'Habitat lost',
    what: (a) => `${fmt(a * 100)}% of the habitat was lost, so the carrying capacity fell by the same share.`,
    k: (k, a) => k * (1 - a),
  },
  restore: {
    group: 'disturb',
    button: () => 'Restore habitat',
    short: 'Habitat restored',
    what: () => 'The habitat recovered, returning the carrying capacity to its original value.',
    k: (k, a, baseK) => baseK,
  },
  meteor: {
    group: 'catastrophe',
    button: () => 'Meteor strike',
    short: 'Meteor',
    what: () => 'Killed 95% of the population and wrecked half the habitat. A density-independent disaster.',
    k: (k) => k * 0.5,
    n: (n) => n * 0.05,
  },
  plague: {
    group: 'catastrophe',
    button: () => 'Plague',
    short: 'Plague',
    what: () =>
      'Disease spreads faster in crowds, so it killed up to 90% of the population in proportion to how full the habitat was.',
    n: (n, k) => n * (1 - 0.9 * Math.min(1, n / k)),
  },
  predators: {
    group: 'catastrophe',
    button: () => 'Release predators',
    short: 'Predators',
    what: () => 'Predators arrived and stayed. Each one can only eat so much, so they hit small populations hardest.',
  },
  tribbles: {
    group: 'weird',
    button: () => 'Tribble mode',
    short: 'Tribble mode',
    duration: (tMax, r) => Math.min(tMax / 10, 0.6 / r),
    what: (a, unit) =>
      `For ${span(a, unit)} everyone bred at double speed and ignored crowding completely. The population balloons past K, then crowding drags it back down.`,
    perCapita: (r) => 2 * r,
  },
  mood: {
    group: 'weird',
    button: () => 'Mood killer',
    short: 'Mood killer',
    duration: (tMax, r) => Math.min(tMax / 6, 3 / r),
    what: (a, unit) =>
      `Nobody was in the mood for ${span(a, unit)}. No babies, just the usual deaths, so numbers sagged. Then the dating scene recovered.`,
    perCapita: (r) => -0.15 * r,
  },
  clones: {
    group: 'weird',
    button: () => 'Cloning accident',
    short: 'Clones',
    what: () => 'A lab mishap copied every individual. Double the population, same habitat, so crowding sorts it out.',
    n: (n) => n * 2,
  },
  timewarp: {
    group: 'weird',
    button: () => 'Time warp',
    short: 'Time warp',
    duration: (tMax) => tMax / 10,
    what: (a, unit) => `The population snapped back to the size it had ${span(a, unit)} earlier. Nobody remembers why.`,
    rewind: true,
  },
  fertilizer: {
    group: 'weird',
    button: () => 'Fertilizer bloom',
    short: 'Fertilizer',
    duration: (tMax) => tMax / 6,
    what: (a, unit) =>
      `A fertilizer spill made the habitat 2.5 times richer for ${span(a, unit)}. The population booms, then has to shrink when it wears off.`,
    kShape: (u) => 1 + 1.5 * Math.min(1, 6 * u, 6 * (1 - u)),
  },
  iceAge: {
    group: 'weird',
    button: () => 'Mini ice age',
    short: 'Ice age',
    duration: (tMax) => tMax / 4,
    what: (a, unit) =>
      `The climate cooled gradually over ${span(a, unit)}, shrinking the carrying capacity by up to 65% before it thawed.`,
    kShape: (u) => 1 - 0.65 * Math.sin(Math.PI * u),
  },
  farming: {
    group: 'weird',
    button: () => 'Invent farming',
    short: 'Farming',
    what: () => 'They figured out agriculture. The habitat now feeds twice as many, permanently.',
    k: (k) => k * 2,
  },
}

export function growthPhase(n, k, rate) {
  if (n <= 0) return 'Extinct'
  const f = n / k
  if (f > 1.05) return rate < 0 ? 'Above capacity, declining' : 'Above capacity'
  if (rate < 0 && f < 0.95) return 'Shrinking'
  if (f < 0.1) return 'Early growth, nearly exponential'
  if (f < 0.5) return 'Accelerating'
  if (f < 0.95) return 'Slowing as resources tighten'
  return 'At carrying capacity'
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

export function sciFromLog10(log10) {
  if (log10 < 6) return { text: fmt(10 ** log10) }
  const exp = Math.floor(log10)
  return { mantissa: (10 ** (log10 - exp)).toFixed(1), exp }
}

export function fmtHuge(x) {
  if (!Number.isFinite(x) || x >= 1e9) {
    const s = sciFromLog10(Number.isFinite(x) ? Math.log10(x) : 308)
    return `${s.mantissa} × 10^${s.exp}`
  }
  return fmt(x)
}
