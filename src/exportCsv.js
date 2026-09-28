import { UNITS } from './model.js'

const MAX_ROWS = 2000

export function toCSV(sim, p) {
  const stride = Math.max(1, Math.ceil(sim.steps / MAX_ROWS))
  const runHeaders = sim.runs.slice(1).map((_, j) => `run_${j + 2}`)
  const header = [UNITS[p.unit].one, 'population', 'carrying_capacity', 'exponential_no_limit', ...runHeaders]
  const rows = [header.join(',')]
  for (let i = 0; i <= sim.steps; i += stride) {
    const t = i * sim.dt
    rows.push(
      [
        t.toFixed(3),
        sim.runs[0][i].toFixed(2),
        sim.K[i].toFixed(2),
        (p.N0 * Math.exp(p.r * t)).toPrecision(6),
        ...sim.runs.slice(1).map((N) => N[i].toFixed(0)),
      ].join(','),
    )
  }
  return rows.join('\n')
}

export function downloadCSV(sim, p) {
  const blob = new Blob([toCSV(sim, p)], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `logistic-growth-K${p.K}-r${p.r}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
