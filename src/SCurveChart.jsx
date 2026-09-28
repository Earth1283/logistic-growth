import { useRef, useState } from 'react'
import { useSize } from './useWidth.js'
import { EVENT_KINDS, fmt, fmtRate, stateAt } from './model.js'

const Y_MAX = 1200
const Y_TICKS = [0, 200, 400, 600, 800, 1000, 1200]
const M = { top: 30, right: 76, bottom: 46, left: 58 }

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

export default function SCurveChart({
  points, segments, r, N0, tMax, tNow, showExp, events, inflection, onScrub,
}) {
  const wrapRef = useRef(null)
  const svgRef = useRef(null)
  const dragging = useRef(false)
  const [hoverT, setHoverT] = useState(null)
  const { width, height } = useSize(wrapRef)
  const iw = Math.max(1, width - M.left - M.right)
  const ih = height - M.top - M.bottom
  const x = (t) => M.left + (t / tMax) * iw
  const y = (n) => M.top + ih - (n / Y_MAX) * ih
  const path = (pts, key = 'n') =>
    pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p[key]).toFixed(1)}`).join('')

  const now = stateAt(segments, r, tNow)
  const observed = [...points.filter((p) => p.t <= tNow), { t: tNow, n: now.n }]
  const kEnd = points[points.length - 1]?.k ?? 0

  const expPts = []
  if (showExp) {
    for (let i = 0; i <= 240; i++) {
      const t = (tMax * i) / 240
      const n = N0 * Math.exp(r * t)
      expPts.push({ t, n })
      if (n > Y_MAX * 1.2) break
    }
  }
  const expExit = expPts.find((p) => p.n >= Y_MAX)

  const xStep = tMax / 5
  const xTicks = Array.from({ length: 6 }, (_, i) => i * xStep)

  const tFromEvent = (e) => {
    const rect = svgRef.current.getBoundingClientRect()
    return clamp(((e.clientX - rect.left - M.left) / iw) * tMax, 0, tMax)
  }

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragging.current = true
    onScrub(tFromEvent(e))
  }
  const onPointerMove = (e) => {
    const t = tFromEvent(e)
    setHoverT(t)
    if (dragging.current) onScrub(t)
  }
  const onPointerUp = () => {
    dragging.current = false
  }

  const onKeyDown = (e) => {
    const step = e.shiftKey ? tMax / 10 : tMax / 100
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onScrub(clamp(tNow + step, 0, tMax))
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onScrub(clamp(tNow - step, 0, tMax))
    else if (e.key === 'Home') onScrub(0)
    else if (e.key === 'End') onScrub(tMax)
    else return
    e.preventDefault()
  }

  const hover = hoverT === null ? null : { t: hoverT, ...stateAt(segments, r, hoverT) }
  const tipLeft = hover ? x(hover.t) : 0
  const tipFlip = tipLeft > width - 190

  return (
    <div className="chart">
      <div className="chart-head">
        <h2>Population over time</h2>
        <ul className="legend">
          <li><span className="swatch swatch-n" />Population <i>N</i></li>
          <li><span className="swatch swatch-k" />Carrying capacity <i>K</i></li>
          {showExp && <li><span className="swatch swatch-exp" />Exponential, no limit</li>}
        </ul>
      </div>
      <div
        ref={wrapRef}
        className="chart-body"
        tabIndex={0}
        role="slider"
        aria-label="Playhead day"
        aria-valuemin={0}
        aria-valuemax={tMax}
        aria-valuenow={Math.round(tNow * 10) / 10}
        aria-valuetext={`Day ${fmt(tNow, 1)}, ${fmt(now.n)} individuals`}
        onKeyDown={onKeyDown}
      >
        {width > 0 && height > 0 && (
          <svg ref={svgRef} width={width} height={height} className="svg">
            <defs>
              <clipPath id="plot-clip">
                <rect x={M.left} y={M.top - 2} width={iw} height={ih + 4} />
              </clipPath>
            </defs>

            {Y_TICKS.map((v) => (
              <g key={v}>
                <line className={v === 0 ? 'axis' : 'grid'} x1={M.left} x2={M.left + iw} y1={y(v)} y2={y(v)} />
                <text className="tick" x={M.left - 10} y={y(v) + 4} textAnchor="end">{fmt(v)}</text>
              </g>
            ))}
            {xTicks.map((v) => (
              <text key={v} className="tick" x={x(v)} y={M.top + ih + 20} textAnchor="middle">{fmt(v)}</text>
            ))}
            <text className="axis-title" x={M.left + iw / 2} y={height - 6} textAnchor="middle">Time (days)</text>
            <text className="axis-title" transform={`translate(14 ${M.top + ih / 2}) rotate(-90)`} textAnchor="middle">
              Individuals
            </text>

            {events.filter((e) => e.t <= tMax).map((e) => (
              <g key={e.id}>
                <line className="event-line" x1={x(e.t)} x2={x(e.t)} y1={M.top - 6} y2={M.top + ih} />
                <text className="event-label" x={x(e.t) + 4} y={M.top - 10}>{EVENT_KINDS[e.kind].short}</text>
              </g>
            ))}

            <g clipPath="url(#plot-clip)">
              {showExp && <path className="line-exp" d={path(expPts)} />}
              <path className="line-k" d={path(points, 'k')} />
              <path className="line-forecast" d={path(points)} />
              <path className="line-n" d={path(observed)} />
            </g>

            {showExp && expExit && (
              <text className="direct-label" x={x(expExit.t) + 6} y={M.top + 12}>
                Exponential passes 1,200 on day {fmt(expExit.t, 0)}
              </text>
            )}
            <text className="k-label" x={M.left + iw + 8} y={clamp(y(kEnd), M.top + 4, M.top + ih) + 4}>
              <tspan fontStyle="italic">K</tspan> = {fmt(kEnd)}
            </text>

            {inflection && (
              <g>
                <circle className="marker-inflection" cx={x(inflection.t)} cy={y(inflection.n)} r={5} />
                <text className="direct-label" x={x(inflection.t) + 10} y={y(inflection.n) + 16}>
                  Fastest growth, day {fmt(inflection.t, 1)}
                </text>
              </g>
            )}

            <line className="playhead" x1={x(tNow)} x2={x(tNow)} y1={M.top} y2={M.top + ih} />
            <circle className="marker-n" cx={x(tNow)} cy={y(clamp(now.n, 0, Y_MAX))} r={6} />

            {hover && (
              <g pointerEvents="none">
                <line className="crosshair" x1={x(hover.t)} x2={x(hover.t)} y1={M.top} y2={M.top + ih} />
                <circle className="marker-hover" cx={x(hover.t)} cy={y(clamp(hover.n, 0, Y_MAX))} r={4.5} />
              </g>
            )}

            <rect
              className="hit"
              x={M.left}
              y={M.top}
              width={iw}
              height={ih}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onPointerLeave={() => setHoverT(null)}
            />
          </svg>
        )}
        {hover && (
          <div
            className="tooltip"
            style={{
              left: tipFlip ? undefined : tipLeft + 14,
              right: tipFlip ? width - tipLeft + 14 : undefined,
              top: M.top + 8,
            }}
          >
            <div className="tooltip-title">Day {fmt(hover.t, 1)}</div>
            <div><span>Population</span><strong>{fmt(hover.n)}</strong></div>
            <div><span>Change per day</span><strong>{fmtRate(hover.rate)}</strong></div>
            <div><span>Share of <i>K</i></span><strong>{fmt((hover.n / hover.k) * 100)}%</strong></div>
            <div className="tooltip-hint">Click or drag to move the playhead</div>
          </div>
        )}
      </div>
    </div>
  )
}
