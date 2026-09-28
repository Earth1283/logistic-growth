import { useState } from 'react'
import { Info } from './Tip.jsx'
import { regimeFor } from './sim.js'

const LOG_STEPS = 1000

const linear = (min, max) => ({
  toPos: (v) => (v - min) / (max - min),
  fromPos: (p) => min + p * (max - min),
})

const logarithmic = (min, max) => ({
  toPos: (v) => Math.log(v / min) / Math.log(max / min),
  fromPos: (p) => min * (max / min) ** p,
})

const clamp01 = (x) => Math.min(1, Math.max(0, x))

function Mark({ pos, label }) {
  const align = pos < 0.15 ? 'start' : pos > 0.85 ? 'end' : 'middle'
  return (
    <span className={`range-mark align-${align}`} style={{ '--at': pos }}>
      {label}
    </span>
  )
}

function ValueField({ id, label, display, value, min, max, step, log, editScale, onChange }) {
  const [draft, setDraft] = useState(null)
  const shown = (v) => Number((v * editScale).toFixed(4))

  const commit = () => {
    const parsed = Number(draft) / editScale
    setDraft(null)
    if (!Number.isFinite(parsed) || draft === '') return
    const clamped = Math.min(max, Math.max(min, parsed))
    onChange(log ? Math.round(clamped) : Math.round(clamped / step) * step)
  }

  if (draft === null) {
    return (
      <button
        type="button"
        className="value-pill"
        aria-label={`${label}: ${display}. Click to type a value`}
        onClick={() => setDraft(String(shown(value)))}
      >
        {display}
      </button>
    )
  }
  return (
    <input
      id={`${id}-exact`}
      className="value-input"
      type="number"
      inputMode="decimal"
      aria-label={`${label}, exact value`}
      min={shown(min)}
      max={shown(max)}
      step={log ? 1 : shown(step)}
      value={draft}
      autoFocus
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') setDraft(null)
      }}
    />
  )
}

export default function Slider({
  id, label, symbol, info, value, min, max, step = 1, onChange, display,
  tone = 'n', log = false, bands, marks = [], ends, hint, compact = false, editScale = 1,
}) {
  const scale = log ? logarithmic(min, max) : linear(min, max)
  const pos = clamp01(scale.toPos(value))
  const regime = bands && regimeFor(bands, value)

  const inputProps = log
    ? {
        min: 0,
        max: LOG_STEPS,
        step: 1,
        value: Math.round(pos * LOG_STEPS),
        onChange: (e) => onChange(Math.round(scale.fromPos(Number(e.target.value) / LOG_STEPS))),
      }
    : {
        min,
        max,
        step,
        value: Math.min(max, value),
        onChange: (e) => onChange(Number(e.target.value)),
      }

  let bandStart = 0
  const bandEls = bands?.map((b, i) => {
    const from = bandStart
    const to = clamp01(scale.toPos(Math.min(b.to, max)))
    bandStart = to
    if (to <= from) return null
    return (
      <span
        key={i}
        className={`range-band band-${b.tone}${b === regime ? ' is-active' : ''}`}
        style={{ '--from': from, '--to': to }}
      />
    )
  })

  return (
    <div className={`slider tone-${tone}${compact ? ' is-compact' : ''}`}>
      <div className="slider-head">
        <label htmlFor={id}>
          {label} {symbol}
        </label>
        {info && <Info label={label}>{info}</Info>}
        <ValueField
          id={id}
          label={label}
          display={display}
          value={value}
          min={min}
          max={max}
          step={step}
          log={log}
          editScale={editScale}
          onChange={onChange}
        />
      </div>
      <div className="range" style={{ '--p': pos }}>
        <div className={`range-rail${bands ? ' is-banded' : ''}`}>
          {bands ? bandEls : <span className="range-fill" />}
        </div>
        {marks.map((m) => (
          <span key={m.label} className="range-tick" style={{ '--at': clamp01(scale.toPos(m.at)) }} />
        ))}
        <input id={id} type="range" aria-valuetext={display} {...inputProps} />
      </div>
      {(marks.length > 0 || ends) && (
        <div className="range-under">
          {marks.map((m) => (
            <Mark key={m.label} pos={clamp01(scale.toPos(m.at))} label={m.label} />
          ))}
          {ends && marks.length === 0 && (
            <>
              <span>{ends[0]}</span>
              <span>{ends[1]}</span>
            </>
          )}
        </div>
      )}
      {regime && (
        <p className="regime" aria-live="polite">
          <span className={`regime-dot band-${regime.tone}`} aria-hidden="true" />
          <span>
            <strong>{regime.label}.</strong> {regime.note}
          </span>
        </p>
      )}
      {hint && <p className="hint">{hint}</p>}
    </div>
  )
}
