import { useMemo, useRef, useState } from 'react'
import { useSize } from './useWidth.js'
import { EVENT_KINDS, UNITS, cap, fmt, fmtHuge, fmtRate, growthPhase } from './model.js'
import { stateAt, stepAt, valueAt } from './sim.js'

const M = { top: 34, right: 76, bottom: 46, left: 58 }
const TARGET_POINTS = 900

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const cross = (cx, cy, r) => `M${cx - r},${cy - r}l${2 * r},${2 * r}m0,${-2 * r}l${-2 * r},${2 * r}`

export function niceStep(raw) {
  const pow = 10 ** Math.floor(Math.log10(raw))
  return [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw)
}

function sampleSteps(sim) {
  const stride = Math.max(1, Math.floor(sim.steps / TARGET_POINTS))
  const set = new Set()
  for (let i = 0; i < sim.steps; i += stride) set.add(i)
  set.add(sim.steps)
  for (const i of sim.eventSteps) {
    if (i > 0) set.add(i - 1)
    set.add(Math.min(i, sim.steps))
  }
  return [...set].sort((a, b) => a - b)
}

function yScale(sim, p) {
  let top = p.K
  for (const N of sim.runs) for (const v of N) top = Math.max(top, v)
  for (const v of sim.K) top = Math.max(top, v)
  const step = niceStep((top * 1.08) / 5)
  const max = Math.ceil((top * 1.08) / step) * step
  return { max, ticks: Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step) }
}

export default function SCurveChart({ sim, p, figures, tNow, showExp, data, sceneKey, onScrub }) {
  const wrapRef = useRef(null)
  const svgRef = useRef(null)
  const dragging = useRef(false)
  const [hoverT, setHoverT] = useState(null)
  const [hoverEvent, setHoverEvent] = useState(null)
  const { width, height } = useSize(wrapRef)
  const u = UNITS[p.unit]
  const { tMax } = p
  const iw = Math.max(1, width - M.left - M.right)
  const ih = height - M.top - M.bottom
  const Y = useMemo(() => yScale(sim, p), [sim, p])
  const x = (t) => M.left + (t / tMax) * iw
  const y = (n) => M.top + ih - (n / Y.max) * ih
  const line = (pts) => pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join('')

  const steps = useMemo(() => sampleSteps(sim), [sim])
  const seriesUpTo = (arr, t) => {
    const pts = []
    for (const i of steps) {
      if (i * sim.dt > t) break
      pts.push([x(i * sim.dt), y(arr[i])])
    }
    if (!sim.discrete) pts.push([x(t), y(valueAt(arr, stepAt(sim, t)))])
    return pts
  }

  const now = stateAt(sim, p, tNow)
  const multi = sim.runs.length > 1

  const expPts = []
  if (showExp) {
    for (let i = 0; i <= 240; i++) {
      const t = (tMax * i) / 240
      const n = p.N0 * Math.exp(p.r * t)
      expPts.push([x(t), y(n)])
      if (n > Y.max * 1.2) break
    }
  }
  const expExitT = Math.log(Y.max / p.N0) / p.r
  const kEnd = sim.K[sim.steps]
  const xTicks = Array.from({ length: 6 }, (_, i) => (i * tMax) / 5)
  const extinctions = sim.extinctions
    .map((te, j) => (te !== null && te <= tNow ? { t: te, main: j === 0 } : null))
    .filter(Boolean)
    .sort((a, b) => a.main - b.main)
  let lastLabelX = -Infinity
  const crashes = sim.crashes
    .filter((c) => c.t <= tNow)
    .map((c) => {
      const cx = x(c.t)
      const labelled = cx - lastLabelX > 56
      if (labelled) lastLabelX = cx
      return { ...c, cx, labelled }
    })
  const fastestNearEvent = sim.log.some((e) => e.t < figures.fastestT + tMax / 100)
  const rowEnds = [-Infinity, -Infinity]
  const flags = sim.log
    .filter((e) => e.t <= tMax)
    .map((e) => {
      const fx = x(e.t)
      const text = EVENT_KINDS[e.kind].short
      const row = rowEnds.findIndex((end) => fx > end + 6)
      if (row >= 0) rowEnds[row] = fx + 4 + text.length * 6.6
      return { ...e, fx, text, row }
    })
  const inflection =
    !multi && !p.lag.on && !p.discrete.on && !p.season.on && figures.fastestT !== null && !fastestNearEvent
      ? { t: figures.fastestT, n: valueAt(sim.det, stepAt(sim, figures.fastestT)) }
      : null

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

  const hover = hoverT === null ? null : { t: hoverT, ...stateAt(sim, p, hoverT) }
  const tipX = hover ? x(hover.t) : hoverEvent ? x(hoverEvent.t) : 0
  const tipFlip = tipX > width - 220

  return (
    <div className="chart">
      <div className="chart-head">
        <h2>Population over time</h2>
        <ul className="legend">
          <li><span className="swatch swatch-n" />Population <i>N</i></li>
          {multi && <li><span className="swatch swatch-ghost" />Other runs, same rules</li>}
          <li><span className="swatch swatch-k" />Carrying capacity <i>K</i></li>
          {showExp && <li><span className="swatch swatch-exp" />Exponential, no limit</li>}
          {data && <li><span className="swatch-dot" />{data.label}</li>}
          {(sim.crashes.length > 0 || sim.extinctions.some((e) => e !== null)) && (
            <li>
              <svg className="swatch-cross" viewBox="0 0 12 12" aria-hidden="true">
                <path className="marker-extinct" d={cross(6, 6, 4)} />
              </svg>
              Die-off or extinction
            </li>
          )}
        </ul>
      </div>
      <div
        ref={wrapRef}
        className="chart-body"
        tabIndex={0}
        role="slider"
        aria-label={`Playhead ${u.one}`}
        aria-valuemin={0}
        aria-valuemax={tMax}
        aria-valuenow={Math.round(tNow * 10) / 10}
        aria-valuetext={`${cap(u.one)} ${fmt(tNow, 1)}, ${fmt(now.n)} individuals`}
        onKeyDown={onKeyDown}
      >
        {width > 0 && height > 0 && (
          <svg ref={svgRef} width={width} height={height} className="svg">
            <defs>
              <clipPath id="plot-clip">
                <rect x={M.left} y={M.top - 2} width={iw} height={ih + 4} />
              </clipPath>
            </defs>

            {Y.ticks.map((v) => (
              <g key={v}>
                <line className={v === 0 ? 'axis' : 'grid'} x1={M.left} x2={M.left + iw} y1={y(v)} y2={y(v)} />
                <text className="tick" x={M.left - 10} y={y(v) + 4} textAnchor="end">{fmt(v)}</text>
              </g>
            ))}
            {xTicks.map((v) => (
              <text key={v} className="tick" x={x(v)} y={M.top + ih + 20} textAnchor="middle">{fmt(v)}</text>
            ))}
            <text className="axis-title" x={M.left + iw / 2} y={height - 6} textAnchor="middle">
              Time ({u.many})
            </text>
            <text className="axis-title" transform={`translate(14 ${M.top + ih / 2}) rotate(-90)`} textAnchor="middle">
              Individuals
            </text>

            <g key={sceneKey} className="scene" clipPath="url(#plot-clip)">
              {showExp && <path className="line-exp" d={line(expPts)} />}
              <path className="line-k" d={line(seriesUpTo(sim.K, tMax))} />
              {multi && sim.runs.slice(1).map((N, j) => <path key={j} className="line-ghost" d={line(seriesUpTo(N, tNow))} />)}
              <path className="line-forecast" d={line(seriesUpTo(sim.runs[0], tMax))} />
              <path className="line-n" d={line(seriesUpTo(sim.runs[0], tNow))} />
              {sim.discrete && sim.steps <= 300 &&
                seriesUpTo(sim.runs[0], tNow).map(([px, py], i) => <circle key={i} className="gen-dot" cx={px} cy={py} r={2.5} />)}
              {data?.points.filter((d) => d.t <= tMax).map((d) => (
                <circle key={d.t} className="data-dot" cx={x(d.t)} cy={y(d.n)} r={4} />
              ))}
            </g>

            {showExp && expExitT < tMax && (
              <text className="direct-label" x={x(expExitT) + 6} y={M.top + 12}>
                Exponential passes {fmt(Y.max)} at {u.one} {fmt(expExitT, 0)}
              </text>
            )}
            <text className="k-label" x={M.left + iw + 8} y={clamp(y(kEnd), M.top + 4, M.top + ih) + 4}>
              <tspan fontStyle="italic">K</tspan> = {fmt(kEnd)}
            </text>

            {inflection && (
              <g>
                <circle className="marker-inflection" cx={x(inflection.t)} cy={y(inflection.n)} r={5} />
                <text className="direct-label" x={x(inflection.t) + 10} y={y(inflection.n) + 16}>
                  Fastest growth, {u.one} {fmt(inflection.t, 1)}
                </text>
              </g>
            )}
            {crashes.map((c) => {
              const cy = y(c.to)
              const below = cy < M.top + ih - 24
              return (
                <g key={`crash-${c.t}`} className="dieoff">
                  <path className="marker-extinct" d={cross(c.cx, cy, 4.5)} />
                  {c.labelled && (
                    <text className="dieoff-label" x={c.cx} y={below ? cy + 18 : cy - 10} textAnchor="middle">
                      −{fmt((1 - c.to / c.from) * 100)}%
                    </text>
                  )}
                </g>
              )
            })}
            {extinctions.map((e, j) => (
              <g key={`extinct-${j}`} className={e.main ? 'dieoff' : 'dieoff is-ghost'}>
                <path className="marker-extinct" d={cross(x(e.t), y(0), e.main ? 6 : 4)} />
                {e.main && (
                  <text className="dieoff-label" x={x(e.t)} y={y(0) - 12} textAnchor="middle">Died out</text>
                )}
              </g>
            ))}

            <line className="playhead" x1={x(tNow)} x2={x(tNow)} y1={M.top} y2={M.top + ih} />
            <circle className="marker-n" cx={x(tNow)} cy={y(clamp(now.n, 0, Y.max))} r={6} />

            {hover && (
              <g pointerEvents="none">
                <line className="crosshair" x1={x(hover.t)} x2={x(hover.t)} y1={M.top} y2={M.top + ih} />
                <circle className="marker-hover" cx={x(hover.t)} cy={y(clamp(hover.n, 0, Y.max))} r={4.5} />
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

            {flags.map((e) => {
              const ly = e.row === 1 ? M.top - 24 : M.top - 10
              return (
                <g
                  key={e.id}
                  className="event-flag"
                  onPointerEnter={() => setHoverEvent(e)}
                  onPointerLeave={() => setHoverEvent(null)}
                >
                  <line className="event-line" x1={e.fx} x2={e.fx} y1={e.row === 1 ? M.top - 20 : M.top - 6} y2={M.top + ih} />
                  <rect className="event-hit" x={e.fx - 6} y={M.top - 34} width={e.row < 0 ? 12 : 12 + e.text.length * 6.6} height={32} />
                  {e.row >= 0 && (
                    <text className="event-label" x={e.fx + 4} y={ly}>{e.text}</text>
                  )}
                </g>
              )
            })}
          </svg>
        )}

        {hover && (
          <div
            className="tooltip"
            style={{ left: tipFlip ? undefined : tipX + 14, right: tipFlip ? width - tipX + 14 : undefined, top: M.top + 8 }}
          >
            <div className="tooltip-title">{cap(u.one)} {fmt(hover.t, 1)}</div>
            <div><span>Population</span><strong>{fmt(hover.n)}</strong></div>
            <div><span>Carrying capacity</span><strong>{fmt(hover.k)}</strong></div>
            <div><span>Change per {u.one}</span><strong>{fmtRate(hover.rate)}</strong></div>
            <div><span>Per individual</span><strong>{fmtRate(hover.perCapita)}</strong></div>
            <div><span>Share of <i>K</i></span><strong>{fmt((hover.n / hover.k) * 100)}%</strong></div>
            {showExp && (
              <div><span>If unlimited</span><strong>{fmtHuge(p.N0 * Math.exp(p.r * hover.t))}</strong></div>
            )}
            {multi && (
              <div>
                <span>Runs alive</span>
                <strong>
                  {hover.runsAlive} of {sim.runs.length}
                  {hover.runsAlive > 1 && `, ${fmt(hover.runsMin)} to ${fmt(hover.runsMax)}`}
                </strong>
              </div>
            )}
            <div className="tooltip-phase">{growthPhase(hover.n, hover.k, hover.rate)}</div>
            <div className="tooltip-hint">Click or drag to move the playhead</div>
          </div>
        )}
        {!hover && hoverEvent && (
          <div
            className="tooltip tooltip-event"
            style={{ left: tipFlip ? undefined : tipX + 10, right: tipFlip ? width - tipX + 10 : undefined, top: M.top + 4 }}
          >
            <div className="tooltip-title">
              {EVENT_KINDS[hoverEvent.kind].short}, {u.one} {fmt(hoverEvent.t, 1)}
            </div>
            <p>{EVENT_KINDS[hoverEvent.kind].what(hoverEvent.amount, p.unit)}</p>
            {hoverEvent.after !== hoverEvent.before && (
              <div><span>Population</span><strong>{fmt(hoverEvent.before)} to {fmt(hoverEvent.after)}</strong></div>
            )}
            {Math.abs(hoverEvent.kAfter - hoverEvent.kBefore) > 1 && (
              <div><span>Carrying capacity</span><strong>{fmt(hoverEvent.kBefore)} to {fmt(hoverEvent.kAfter)}</strong></div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
