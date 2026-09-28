import { useRef, useState } from 'react'
import { useWidth } from './useWidth.js'
import { fmt, fmtRate } from './model.js'

const M = { top: 26, right: 22, bottom: 46, left: 58 }
const HEIGHT = 260
const X_SPAN = 1.3

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

function useFrame(k, yMin, yMax) {
  const wrapRef = useRef(null)
  const width = useWidth(wrapRef)
  const iw = Math.max(1, width - M.left - M.right)
  const ih = HEIGHT - M.top - M.bottom
  const xMax = k * X_SPAN
  const x = (n) => M.left + (n / xMax) * iw
  const y = (v) => M.top + ih - ((v - yMin) / (yMax - yMin)) * ih
  return { wrapRef, width, iw, ih, xMax, x, y }
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
  const flip = left > frame.width - 170
  return (
    <div
      className="tooltip"
      style={{
        left: flip ? undefined : left + 14,
        right: flip ? frame.width - left + 14 : undefined,
        top: M.top,
      }}
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
      {yTicks.map((v) => (
        <g key={v}>
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

function linePath(frame, f, samples = 140) {
  let d = ''
  for (let i = 0; i <= samples; i++) {
    const n = (frame.xMax * i) / samples
    d += `${i ? 'L' : 'M'}${frame.x(n).toFixed(1)},${frame.y(f(n)).toFixed(1)}`
  }
  return d
}

function chevron(cx, cy, dir) {
  return `M${cx - 4 * dir},${cy - 5}L${cx + 3 * dir},${cy}L${cx - 4 * dir},${cy + 5}`
}

export function GrowthRateChart({ r, k, n }) {
  const f = (N) => r * N * (1 - N / k)
  const peak = (r * k) / 4
  const yMax = peak * 1.3
  const yMin = f(k * X_SPAN) * 1.08
  const frame = useFrame(k, yMin, yMax)
  const [hoverN, handlers] = useHover(frame)
  const { wrapRef, width, x, y, iw, ih } = frame
  const nc = clamp(n, 0, frame.xMax)
  const zero = y(0)
  const narrow = iw < 380

  return (
    <div ref={wrapRef} className="chart-body small">
      {width > 0 && (
        <svg width={width} height={HEIGHT} className="svg">
          <Axes frame={frame} k={k} yTicks={[f(k * X_SPAN), 0, peak]} yTitle="Change per day" />
          <path className="line-n" d={linePath(frame, f)} />

          <path className="flow" d={chevron(x(k * 0.28), zero, 1)} />
          <path className="flow" d={chevron(x(k * 0.72), zero, 1)} />
          <path className="flow" d={chevron(x(k * 1.16), zero, -1)} />

          <text className="direct-label" x={x(k / 2)} y={y(peak) - 10} textAnchor="middle">
            Peak <tspan className="math">rK</tspan>/4 = {fmtRate(peak)} per day
          </text>
          <circle className="marker-unstable" cx={x(0)} cy={zero} r={4.5} />
          <text className="direct-label" x={x(0) + 10} y={zero + 18}>
            {narrow ? 'Unstable' : 'Extinction, unstable'}
          </text>
          <circle className="marker-k" cx={x(k)} cy={zero} r={5.5} />
          <text className="direct-label" x={x(k) - 10} y={zero + 18} textAnchor="end">
            {narrow ? 'Stable' : 'Stable equilibrium'}
          </text>

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
            ['Change per day', fmtRate(f(hoverN))],
            ['Direction', hoverN < k * 0.995 ? 'Rising toward K' : hoverN > k * 1.005 ? 'Falling toward K' : 'Holding at K'],
          ]}
        />
      )}
    </div>
  )
}

export function PerCapitaChart({ r, k, n }) {
  const g = (N) => r * (1 - N / k)
  const yMax = r * 1.25
  const yMin = g(k * X_SPAN) * 1.2
  const frame = useFrame(k, yMin, yMax)
  const [hoverN, handlers] = useHover(frame)
  const { wrapRef, width, x, y, iw, ih } = frame
  const nc = clamp(n, 0, frame.xMax)
  const resistance = n / k

  return (
    <>
      <div ref={wrapRef} className="chart-body small">
        {width > 0 && (
          <svg width={width} height={HEIGHT} className="svg">
            <Axes frame={frame} k={k} yTicks={[g(k * X_SPAN), 0, r]} yTitle="Per individual per day" />
            <polygon
              className="resistance"
              points={`${x(0)},${y(r)} ${x(nc)},${y(r)} ${x(nc)},${y(g(nc))}`}
            />
            <line className="line-exp" x1={M.left} x2={M.left + iw} y1={y(r)} y2={y(r)} />
            <text className="direct-label" x={M.left + iw} y={y(r) - 8} textAnchor="end">
              Without limits: <tspan className="math">r</tspan> = {fmt(r, 2)}
            </text>
            <path className="line-n" d={linePath(frame, g, 2)} />
            <circle className="marker-k" cx={x(k)} cy={y(0)} r={5.5} />
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
              ['Growth lost', `${fmt((hoverN / k) * 100)}%`],
            ]}
          />
        )}
      </div>
      <p className="figure-note">
        <span className="swatch swatch-resistance" />
        At the current population of {fmt(n)}, crowding removes {fmt(resistance * 100)}% of the
        growth each individual could achieve.
      </p>
    </>
  )
}
