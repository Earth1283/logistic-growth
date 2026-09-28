export const UNITS = {
  hour: { one: 'hour', many: 'hours' },
  day: { one: 'day', many: 'days' },
  week: { one: 'week', many: 'weeks' },
  year: { one: 'year', many: 'years' },
}

export const cap = (s) => s[0].toUpperCase() + s.slice(1)

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
    group: 'wild',
    button: () => 'Meteor strike',
    short: 'Meteor',
    what: () => 'Killed 95% of the population and wrecked half the habitat.',
    k: (k) => k * 0.5,
    n: (n) => n * 0.05,
  },
  plague: {
    group: 'wild',
    button: () => 'Plague',
    short: 'Plague',
    what: () =>
      'Disease spreads faster in crowds, so it killed up to 90% of the population in proportion to how full the habitat was.',
    n: (n, k) => n * (1 - 0.9 * Math.min(1, n / k)),
  },
  boom: {
    group: 'wild',
    button: () => 'Baby boom',
    short: 'Baby boom',
    what: (a, unit) =>
      `Tripled the growth rate r for ${fmt(a, 1)} ${UNITS[unit].many}, as if food suddenly became abundant.`,
  },
  predators: {
    group: 'wild',
    button: () => 'Release predators',
    short: 'Predators',
    what: () =>
      'Predators arrived and stayed. Each one can only eat so much, so they hit small populations hardest.',
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

export function sci(x) {
  if (x < 1e6) return { text: fmt(x) }
  const exp = Math.floor(Math.log10(x))
  return { mantissa: (x / 10 ** exp).toFixed(1), exp }
}
