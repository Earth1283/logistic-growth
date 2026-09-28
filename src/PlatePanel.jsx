import { useEffect, useRef } from 'react'
import { useWidth } from './useWidth.js'
import { UNITS, fmt, fmtRate, growthPhase } from './model.js'
import { mulberry32 } from './sim.js'
import { Term } from './Tip.jsx'

const MAX_DOTS = 4000
const MIN_CAPACITY = 1000
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

const SITES = (() => {
  const rand = mulberry32(7)
  return Array.from({ length: MAX_DOTS }, (_, i) => {
    const angle = i * GOLDEN_ANGLE + (rand() - 0.5) * 0.5
    const radius = Math.sqrt(i + 0.5) + (rand() - 0.5) * 0.7
    return { cos: Math.cos(angle), sin: Math.sin(angle), radius: Math.max(0, radius) }
  })
})()

function Plate({ n, k }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const width = useWidth(wrapRef)
  const size = Math.min(width, 340)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || size <= 0) return
    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = size * dpr
      canvas.height = size * dpr
      const ctx = canvas.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, size, size)

      const css = getComputedStyle(canvas)
      const token = (name) => css.getPropertyValue(name).trim()
      const c = size / 2
      const R = c - 4
      const unit = (R * 0.8) / Math.sqrt(Math.max(MIN_CAPACITY, n, k))

      ctx.beginPath()
      ctx.arc(c, c, R, 0, Math.PI * 2)
      ctx.fillStyle = token('--agar')
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = token('--rule-strong')
      ctx.stroke()

      const whole = Math.min(MAX_DOTS, Math.floor(n))
      const partial = n - Math.floor(n)
      ctx.fillStyle = token('--accent')
      const dotR = unit * 0.62
      for (let i = 0; i <= whole && i < MAX_DOTS; i++) {
        if (i === whole) {
          if (partial <= 0 || whole >= MAX_DOTS) break
          ctx.globalAlpha = partial
        }
        const s = SITES[i]
        const d = s.radius * unit
        ctx.beginPath()
        ctx.arc(c + d * s.cos, c + d * s.sin, dotR, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      ctx.beginPath()
      ctx.setLineDash([5, 4])
      ctx.lineWidth = 2
      ctx.strokeStyle = token('--safranin')
      ctx.arc(c, c, Math.sqrt(k) * unit, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
    }
    draw()
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const observer = new MutationObserver(draw)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    media.addEventListener('change', draw)
    return () => {
      observer.disconnect()
      media.removeEventListener('change', draw)
    }
  }, [n, k, size])

  return (
    <div ref={wrapRef} className="plate-wrap">
      <canvas
        ref={canvasRef}
        className="plate"
        style={{ width: size, height: size }}
        role="img"
        aria-label={`Habitat with ${fmt(n)} individuals; the dashed ring marks room for ${fmt(k)}.`}
      />
    </div>
  )
}

export default function PlatePanel({ n, k, rate, day, unit }) {
  const share = n / k
  const u = UNITS[unit]
  return (
    <section className="panel plate-panel" aria-label="Habitat view">
      <Plate n={n} k={k} />
      <div className="plate-side">
        <h2>Habitat, {u.one} {fmt(day, 1)}</h2>
        <p className="plate-caption">
          Each dot is one individual. The dashed ring encloses the space the habitat can support, its{' '}
          <Term id="carryingCapacity">carrying capacity</Term>.
        </p>
        <dl className="readouts">
          <div>
            <dt>Population <i className="v-n">N</i></dt>
            <dd className="big">{fmt(n)}</dd>
          </div>
          <div>
            <dt>Share of <i className="v-k">K</i></dt>
            <dd className="big">{fmt(share * 100)}%</dd>
          </div>
          <div>
            <dt>Change per {u.one}</dt>
            <dd className="big">{fmtRate(rate)}</dd>
          </div>
        </dl>
        <div className="fill-meter" aria-hidden="true">
          <span style={{ width: `${Math.min(100, share * 100)}%` }} />
        </div>
        <p className="phase">{growthPhase(n, k, rate)}</p>
      </div>
    </section>
  )
}
