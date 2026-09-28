import { EVENT_KINDS, fmt } from './model.js'

const WINDOWS = [25, 50, 100, 200]

function Slider({ id, label, symbol, value, min, max, step, onChange, display, hint, tone }) {
  return (
    <div className={`slider tone-${tone}`}>
      <div className="slider-head">
        <label htmlFor={id}>
          {label} {symbol}
        </label>
        <output htmlFor={id}>{display}</output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <p className="hint">{hint}</p>
    </div>
  )
}

export default function Controls(props) {
  const {
    K, setK, r, setR, N0, setN0, tMax, setTMax, showExp, setShowExp,
    playing, atEnd, day, onTogglePlay, onRestart, onAddEvent, onClearEvents,
    eventCount, habitatReduced,
  } = props

  return (
    <section className="panel controls" aria-label="Model controls">
      <div className="playback">
        <button type="button" className="btn btn-primary" onClick={onTogglePlay}>
          {playing ? 'Pause' : atEnd ? 'Replay' : 'Play'}
        </button>
        <button type="button" className="btn" onClick={onRestart}>
          Restart
        </button>
        <span className="day" aria-live="off">
          Day <strong>{fmt(day, 1)}</strong>
        </span>
      </div>

      <Slider
        id="k"
        tone="k"
        label="Carrying capacity"
        symbol={<i className="v-k">K</i>}
        value={K}
        min={100}
        max={1000}
        step={10}
        onChange={setK}
        display={`${fmt(K)} individuals`}
        hint="How many individuals the habitat's food, space and shelter can sustain."
      />
      <Slider
        id="r"
        tone="n"
        label="Intrinsic growth rate"
        symbol={<i>r</i>}
        value={r}
        min={0.05}
        max={1.5}
        step={0.01}
        onChange={setR}
        display={`${fmt(r, 2)} per day`}
        hint="Births minus deaths per individual when resources are unlimited."
      />
      <Slider
        id="n0"
        tone="n"
        label="Starting population"
        symbol={
          <i>
            N<sub>0</sub>
          </i>
        }
        value={N0}
        min={1}
        max={100}
        step={1}
        onChange={setN0}
        display={`${fmt(N0)} individuals`}
        hint="Founders placed in the habitat on day 0."
      />

      <fieldset className="window">
        <legend>Time shown</legend>
        <div className="segmented">
          {WINDOWS.map((w) => (
            <label key={w} className={w === tMax ? 'is-on' : ''}>
              <input
                type="radio"
                name="window"
                id={`window-${w}`}
                value={w}
                checked={w === tMax}
                onChange={() => setTMax(w)}
              />
              {w} days
            </label>
          ))}
        </div>
      </fieldset>

      <label className="check" htmlFor="show-exp">
        <input
          id="show-exp"
          type="checkbox"
          checked={showExp}
          onChange={(e) => setShowExp(e.target.checked)}
        />
        Compare with unlimited exponential growth
      </label>

      <div className="disturb">
        <h2>Disturb the population</h2>
        <p className="hint">
          Each disturbance happens on the current day. Pause, or click the chart, to pick the moment.
        </p>
        <div className="disturb-buttons">
          {Object.entries(EVENT_KINDS).map(([kind, { label }]) => (
            <button
              key={kind}
              type="button"
              className="btn"
              disabled={atEnd || (kind === 'restore' && !habitatReduced)}
              onClick={() => onAddEvent(kind)}
            >
              {label}
            </button>
          ))}
        </div>
        {atEnd && <p className="hint">Replay or move the playhead back to add a disturbance.</p>}
        {eventCount > 0 && (
          <button type="button" className="btn-link" onClick={onClearEvents}>
            Clear {eventCount} {eventCount === 1 ? 'disturbance' : 'disturbances'}
          </button>
        )}
      </div>
    </section>
  )
}
