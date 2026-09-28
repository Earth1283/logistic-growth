import { useRef, useState } from 'react'
import { useWidth } from './useWidth.js'
import { fmt, fmtRate } from './model.js'
import { equilibria } from './sim.js'

const M = { top: 26, right: 22, bottom: 46, left: 58 }
const HEIGHT = 260
const X_SPAN = 1.3
const SAMPLES = 160

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

function sample(f, xMax) {
  return Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const n = (xMax * i) / SAMPLES
    return { n, v: f(n) }
  })
}

function useFrame(k, pts, pad) {
  const wrapRef = useRef(null)
  const width = useWidth(wrapRef)
  const iw = Math.max(1, width - M.left - M.right)
  const ih = HEIGHT - M.top - M.bottom
  const xMax = k * X_SPAN
  const hi = Math.max(...pts.map((d) => d.v), pad.floorHi)
  const lo = Math.min(...pts.map((d) => d.v), -hi * 0.15)
  const yMax = hi * 1.3
  const yMin = lo * 1.12
  const x = (n) => M.left + (n / xMax) * iw
  const y = (v) => M.top + ih - ((clamp(v, yMin, yMax) - yMin) / (yMax - yMin)) * ih
  return { wrapRef, width, iw, ih, xMax, x, y, lo, hi }
}

function useHover(frame) {
  const [hoverN, setHoverN] = useState(null)
  const handlers = {
    onPointerMove: (e) => {
      const rect = e.currentTarget.ownerSVGElement.getBoundingClientRect()
      setHoverN(clamp(((e.clientX - rect.left - M.left) / frame.iw) * frame.xMax, 0, frame.xMax))
    },
    onPointerLeave: () => setHoverN(null),
  }
  return [hoverN, handlers]
}

function Tooltip({ frame, n, rows }) {
  const left = frame.x(n)
  const flip = left > frame.width - 190
  return (
    <div
      className="tooltip"
      style={{ left: flip ? undefined : left + 14, right: flip ? frame.width - left + 14 : undefined, top: M.top }}
    >
      <div className="tooltip-title">
        <i>N</i> = {fmt(n)}
      </div>
      {rows.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  )
}

function Axes({ frame, k, yTicks, yTitle }) {
  const { x, y, iw, ih } = frame
  return (
    <>
      {yTicks.map((v, i) => (
        <g key={i}>
          <line className={v === 0 ? 'axis' : 'grid'} x1={M.left} x2={M.left + iw} y1={y(v)} y2={y(v)} />
          <text className="tick" x={M.left - 10} y={y(v) + 4} textAnchor="end">{fmtRate(v)}</text>
        </g>
      ))}
      {[0, k / 2, k].map((v, i) => (
        <g key={i}>
          <line className="tick-mark" x1={x(v)} x2={x(v)} y1={M.top + ih} y2={M.top + ih + 5} />
          <text className="tick" x={x(v)} y={M.top + ih + 20} textAnchor="middle">
            {i === 0 ? '0' : i === 1 ? `K/2 = ${fmt(v)}` : `K = ${fmt(v)}`}
          </text>
        </g>
      ))}
      <text className="axis-title" x={M.left + iw / 2} y={HEIGHT - 6} textAnchor="middle">
        Population size
      </text>
      <text className="axis-title" transform={`translate(14 ${M.top + ih / 2}) rotate(-90)`} textAnchor="middle">
        {yTitle}
      </text>
    </>
  )
}

const pathOf = (frame, pts) =>
  pts.map((d, i) => `${i ? 'L' : 'M'}${frame.x(d.n).toFixed(1)},${frame.y(d.v).toFixed(1)}`).join('')

function chevron(cx, cy, dir) {
  return `M${cx - 4 * dir},${cy - 5}L${cx + 3 * dir},${cy}L${cx - 4 * dir},${cy + 5}`
}

function equilibriumLabel(eq, narrow) {
  if (eq.n === 0) return eq.stable ? 'Extinction trap' : narrow ? 'Unstable' : 'Extinction, unstable'
  if (eq.stable) return narrow ? 'Stable' : 'Stable equilibrium'
  return narrow ? 'Unstable' : 'Tipping point'
}

export function GrowthRateChart({ sim, k, n, t, lagTau, unit }) {
  const f = (N) => sim.model.change(N, N, k, t)
  const pts = sample(f, k * X_SPAN)
  const frame = useFrame(k, pts, { floorHi: 1e-6 })
  const [hoverN, handlers] = useHover(frame)
  const { wrapRef, width, x, y, iw, ih, xMax } = frame
  const nc = clamp(n, 0, xMax)
  const zero = y(0)
  const narrow = iw < 380
  const eqs = equilibria(f, xMax, sim.discrete, lagTau)
  const peak = pts.reduce((a, b) => (b.v > a.v ? b : a))
  const bounds = [...eqs.map((e) => e.n), xMax]
  const flows = bounds.slice(0, -1).map((a, i) => {
    const mid = (a + bounds[i + 1]) / 2
    return { mid, dir: Math.sign(f(mid)) }
  }).filter((d) => d.dir !== 0 && x(d.mid) - M.left > 14)
  let lastLabelX = -Infinity

  return (
    <div ref={wrapRef} className="chart-body small">
      {width > 0 && (
        <svg width={width} height={HEIGHT} className="svg">
          <Axes frame={frame} k={k} yTicks={[frame.lo, 0, peak.v > 0 ? peak.v : frame.hi]} yTitle={`Change per ${unit}`} />
          <path className="line-n" d={pathOf(frame, pts)} />

          {flows.map((d) => <path key={d.mid} className="flow" d={chevron(x(d.mid), zero, d.dir)} />)}

          {peak.v > 0 && (
            <text className="direct-label" x={clamp(x(peak.n), M.left + 90, M.left + iw - 90)} y={y(peak.v) - 10} textAnchor="middle">
              Fastest: {fmtRate(peak.v)} per {unit} at <tspan className="math">N</tspan> = {fmt(peak.n)}
            </text>
          )}
          {eqs.map((eq) => {
            const ex = x(eq.n)
            const showLabel = ex - lastLabelX > 110
            if (showLabel) lastLabelX = ex
            const end = ex > M.left + iw * 0.6
            return (
              <g key={eq.n}>
                <circle className={eq.stable ? 'marker-k' : 'marker-unstable'} cx={ex} cy={zero} r={eq.stable ? 5.5 : 4.5} />
                {showLabel && (
                  <text className="direct-label" x={end ? ex - 10 : ex + 10} y={zero + 18} textAnchor={end ? 'end' : 'start'}>
                    {equilibriumLabel(eq, narrow)}
                  </text>
                )}
              </g>
            )
          })}

          <circle className="marker-n" cx={x(nc)} cy={y(f(nc))} r={6} />

          {hoverN !== null && (
            <g pointerEvents="none">
              <line className="crosshair" x1={x(hoverN)} x2={x(hoverN)} y1={M.top} y2={M.top + ih} />
              <circle className="marker-hover" cx={x(hoverN)} cy={y(f(hoverN))} r={4.5} />
            </g>
          )}
          <rect className="hit" x={M.left} y={M.top} width={iw} height={ih} {...handlers} />
        </svg>
      )}
      {hoverN !== null && (
        <Tooltip
          frame={frame}
          n={hoverN}
          rows={[
            [`Change per ${unit}`, fmtRate(f(hoverN))],
            ['Direction', f(hoverN) > 0.01 ? 'Growing' : f(hoverN) < -0.01 ? 'Shrinking' : 'Holding steady'],
          ]}
        />
      )}
    </div>
  )
}

export function PerCapitaChart({ sim, k, n, t, unit }) {
  const g = (N) => sim.model.change(Math.max(N, 1e-6), Math.max(N, 1e-6), k, t) / Math.max(N, 1e-6)
  const r = sim.model.rAt(t)
  const rShown = sim.discrete ? Math.expm1(r) : r
  const pts = sample(g, k * X_SPAN)
  const frame = useFrame(k, pts, { floorHi: rShown })
  const [hoverN, handlers] = useHover(frame)
  const { wrapRef, width, x, y, iw, ih } = frame
  const nc = clamp(n, 0, frame.xMax)
  const lost = Math.max(0, (rShown - g(nc)) / rShown)
  const under = pts.filter((d) => d.n <= nc)
  const polygon = [
    [x(0), y(rShown)],
    [x(nc), y(rShown)],
    [x(nc), y(g(nc))],
    ...under.reverse().map((d) => [x(d.n), y(d.v)]),
  ]

  return (
    <>
      <div ref={wrapRef} className="chart-body small">
        {width > 0 && (
          <svg width={width} height={HEIGHT} className="svg">
            <Axes frame={frame} k={k} yTicks={[frame.lo, 0, rShown]} yTitle={`Per individual per ${unit}`} />
            <polygon className="resistance" points={polygon.map((d) => d.join(',')).join(' ')} />
            <line className="line-exp" x1={M.left} x2={M.left + iw} y1={y(rShown)} y2={y(rShown)} />
            <text className="direct-label" x={M.left + iw} y={y(rShown) - 8} textAnchor="end">
              Without limits: {fmt(rShown, 2)}
            </text>
            <path className="line-n" d={pathOf(frame, pts)} />
            <circle className="marker-n" cx={x(nc)} cy={y(g(nc))} r={6} />

            {hoverN !== null && (
              <g pointerEvents="none">
                <line className="crosshair" x1={x(hoverN)} x2={x(hoverN)} y1={M.top} y2={M.top + ih} />
                <circle className="marker-hover" cx={x(hoverN)} cy={y(g(hoverN))} r={4.5} />
              </g>
            )}
            <rect className="hit" x={M.left} y={M.top} width={iw} height={ih} {...handlers} />
          </svg>
        )}
        {hoverN !== null && (
          <Tooltip
            frame={frame}
            n={hoverN}
            rows={[
              ['Per individual', fmtRate(g(hoverN))],
              ['Growth lost', `${fmt(Math.max(0, (rShown - g(hoverN)) / rShown) * 100)}%`],
            ]}
          />
        )}
      </div>
      <p className="figure-note">
        <span className="swatch swatch-resistance" />
        At the current population of {fmt(n)}, the environment removes {fmt(lost * 100)}% of the
        growth each individual could achieve.
      </p>
    </>
  )
}
