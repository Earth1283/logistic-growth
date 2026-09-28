export const DEFAULT_PARAMS = {
  K: 600,
  r: 0.35,
  N0: 10,
  tMax: 50,
  unit: 'day',
  seed: 1,
  lag: { on: false, tau: 2 },
  chance: { on: false, level: 0.5 },
  allee: { on: false, A: 40 },
  season: { on: false, amp: 0.3, period: 20, noise: 0.2 },
  discrete: { on: false },
  harvest: { on: false, effort: 0.5 },
}

const CARLSON_1913 = [
  9.6, 18.3, 29.0, 47.2, 71.1, 119.1, 174.6, 257.3, 350.7, 441.0, 513.3, 559.7, 594.8, 629.4,
  640.8, 651.1, 655.9, 659.6, 661.8,
].map((n, t) => ({ t, n }))

export const PRESETS = [
  {
    id: 'classic',
    name: 'Classic S curve',
    blurb: 'The textbook logistic model: one species, steady conditions, no surprises.',
    params: {},
  },
  {
    id: 'yeast',
    name: 'Yeast in a flask',
    blurb:
      'In 1913 the biologist Carlson measured yeast growing in a flask every hour. Raymond Pearl later fitted the logistic curve to those numbers, and they still appear in ecology textbooks. The dots are the real measurements.',
    params: { K: 665, r: 0.54, N0: 10, tMax: 25, unit: 'hour' },
    data: { label: 'Carlson’s 1913 measurements', points: CARLSON_1913 },
  },
  {
    id: 'reindeer',
    name: 'Reindeer on an island',
    blurb:
      'In 1944, 29 reindeer were released on St. Matthew Island, Alaska. With no predators they reached about 6,000 by 1963, stripped the lichen they lived on, and crashed to 42 by 1966. The numbers here are scaled down, but a time lag produces the same overshoot and crash.',
    params: { K: 800, r: 0.3, N0: 29, tMax: 50, unit: 'year', lag: { on: true, tau: 6.5 } },
  },
  {
    id: 'rare',
    name: 'Rare species released',
    blurb:
      'A small group is released into a reserve. Below the Allee threshold they struggle to find mates, and chance decides whether the group takes off or disappears. Reroll to see other outcomes.',
    params: {
      K: 300,
      r: 0.3,
      N0: 22,
      tMax: 50,
      seed: 4,
      unit: 'year',
      allee: { on: true, A: 15 },
      chance: { on: true, level: 0.6 },
    },
  },
  {
    id: 'fishery',
    name: 'Fishery under pressure',
    blurb:
      'Fishing removes a steady share of the stock each year. Moderate effort gives the biggest catch that can last. Push harder and the stock collapses, as Atlantic cod off Newfoundland did in the early 1990s.',
    params: { K: 1000, r: 0.5, N0: 1000, tMax: 50, unit: 'year', harvest: { on: true, effort: 0.5 } },
  },
  {
    id: 'insects',
    name: 'Insects, one generation a year',
    blurb:
      'When a population breeds in one burst each season, a high growth rate makes it overshoot every year. Past r ≈ 2.7 the swings never repeat. Robert May made this chaos famous in 1976.',
    params: { K: 500, r: 2.8, N0: 50, tMax: 50, unit: 'year', discrete: { on: true } },
  },
  {
    id: 'algae',
    name: 'Pond algae through the seasons',
    blurb:
      'Light and nutrients rise and fall over the year, so the carrying capacity does too. The population chases a moving target and always lags a little behind it.',
    params: {
      K: 800,
      r: 0.9,
      N0: 20,
      tMax: 200,
      unit: 'week',
      season: { on: true, amp: 0.6, period: 52, noise: 0.2 },
    },
  },
]

export function randomWorld(rand = Math.random) {
  const between = (lo, hi) => lo + rand() * (hi - lo)
  const coin = (odds) => rand() < odds
  const discrete = coin(0.25)
  const r = Number(between(0.15, discrete ? 2.95 : 1.4).toFixed(2))
  const K = Math.round(between(150, 1000) / 10) * 10
  return {
    ...DEFAULT_PARAMS,
    K,
    r,
    N0: Math.round(between(2, 80)),
    tMax: [50, 100, 200, 500][Math.floor(rand() * 4)],
    unit: ['hour', 'day', 'week', 'year'][Math.floor(rand() * 4)],
    seed: Math.floor(rand() * 1e6),
    discrete: { on: discrete },
    lag: { on: !discrete && coin(0.4), tau: Number(between(0.3, 2.4 / r).toFixed(1)) },
    chance: { on: coin(0.4), level: Number(between(0.2, 1).toFixed(2)) },
    allee: { on: coin(0.3), A: Math.round(between(5, 60)) },
    season: {
      on: coin(0.35),
      amp: Number(between(0.1, 0.7).toFixed(2)),
      period: Math.round(between(8, 60)),
      noise: Number(between(0, 0.4).toFixed(2)),
    },
    harvest: { on: coin(0.25), effort: Number(between(0.1, 0.9).toFixed(2)) },
  }
}

export function paramsFor(preset) {
  const merged = { ...DEFAULT_PARAMS }
  for (const [key, value] of Object.entries(preset.params)) {
    merged[key] = typeof value === 'object' ? { ...DEFAULT_PARAMS[key], ...value } : value
  }
  return merged
}
